import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time backfill: re-evaluate all non-admin learners' completed sessions
 * against the current AwardXP badge rules and insert any missing badges.
 * Also normalises old XP source_id names to current format.
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 */

// Map xp_events source_id → badge_id (only source_ids that earn a badge)
const SOURCE_TO_BADGE: Record<string, { badgeId: string; name: string; emoji: string }> = {
  perfect_hiker:         { badgeId: "perfect_hiker",         name: "Perfect Hiker",       emoji: "🌲" },
  speed_hiker:           { badgeId: "speed_hiker",           name: "Speed Hiker",         emoji: "🥾" },
  search_and_rescue_hero:{ badgeId: "search_and_rescue_hero",name: "S&R Hero",            emoji: "🚁" },
  storm_chaser:          { badgeId: "storm_chaser",          name: "Storm Chaser",        emoji: "⛈️" },
  no_detours:            { badgeId: "no_detours",            name: "No Detours",          emoji: "🧭" },
  leave_no_trace:        { badgeId: "leave_no_trace",        name: "Leave No Trace",      emoji: "🌱" },
  first_step:            { badgeId: "first_step",            name: "First Step",          emoji: "🎬" },
  halfway:               { badgeId: "halfway",               name: "Halfway Up",          emoji: "🏔️" },
  week_4_entry:          { badgeId: "week_4_entry",          name: "Into the Summit Push",emoji: "🪢" },
  summit:                { badgeId: "summit",                name: "Summit Reached",      emoji: "🏔️✨" },
  mystery:               { badgeId: "mystery",               name: "The Ranger's Secret", emoji: "🌲" },
  double_summit:         { badgeId: "double_summit",         name: "Double Summit",       emoji: "⛰️" },
  on_the_trail_week2:    { badgeId: "on_the_trail",          name: "On the Trail",        emoji: "🗓️" },
  on_the_trail_week3:    { badgeId: "on_the_trail",          name: "On the Trail",        emoji: "🗓️" },
  on_the_trail_week4:    { badgeId: "on_the_trail",          name: "On the Trail",        emoji: "🗓️" },
  the_ascent:            { badgeId: "the_ascent",            name: "The Ascent",          emoji: "🧗" },
};

const XpEventRow = z.object({
  viewer_id: z.string(),
  clip_id: z.string(),
  source_id: z.string(),
});

const SessionRow = z.object({
  session_id: z.string(),
  viewer_id: z.string(),
  clip_id: z.string(),
  sort_order: z.coerce.number(),
  completed: z.boolean(),
  is_recovery_attempt: z.boolean(),
  question_score: z.string().nullable(),
  total_time_seconds: z.coerce.number(),
  trail_correct: z.coerce.number(),
  trail_total: z.coerce.number(),
  sr_correct: z.coerce.number(),
  sr_total: z.coerce.number(),
});

export default api({
  name: "BackfillBadges",
  description: "One-time backfill of missing badges from pre-update sessions",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    badgesInserted: z.number(),
    xpEventsInserted: z.number(),
    details: z.array(z.object({
      viewerName: z.string(),
      badgeId: z.string(),
      clipTitle: z.string(),
      action: z.string(),
    })),
  }),

  async run(ctx) {
    const details: Array<{ viewerName: string; badgeId: string; clipTitle: string; action: string }> = [];
    let badgesInserted = 0;
    let xpEventsInserted = 0;

    // --- STEP 1: Sync badges from existing xp_events ---
    // Any xp_event with a badge-earning source_id should have a matching badge row
    const xpEvents = await ctx.integrations.db.query(
      `SELECT xe.viewer_id, xe.clip_id, xe.source_id
       FROM cliptracker_v2_xp_events xe
       JOIN cliptracker_v2_viewers v ON v.id = xe.viewer_id
       WHERE v.is_admin = false
       ORDER BY xe.created_at ASC
       LIMIT 2000`,
      XpEventRow,
      undefined,
      { label: "Get all xp_events for badge sync" }
    );

    for (const evt of xpEvents) {
      const mapping = SOURCE_TO_BADGE[evt.source_id];
      if (!mapping) continue;

      // Check if badge already exists
      const CountSchema = z.object({ count: z.coerce.number() });
      const existing = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
         WHERE viewer_id = $1 AND badge_id = $2 AND clip_id = $3`,
        CountSchema,
        [evt.viewer_id, mapping.badgeId, evt.clip_id],
        { label: `Check badge: ${mapping.badgeId}` }
      );

      if (existing[0]?.count === 0) {
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
          [evt.viewer_id, mapping.badgeId, evt.clip_id],
          { label: `Backfill badge: ${mapping.badgeId}` }
        );
        badgesInserted++;

        // Get names for the report
        const NameSchema = z.object({ name: z.string() });
        const viewer = await ctx.integrations.db.query(
          "SELECT name FROM cliptracker_v2_viewers WHERE id = $1",
          NameSchema, [evt.viewer_id], { label: "Get viewer name" }
        );
        const TitleSchema = z.object({ title: z.string() });
        const clip = await ctx.integrations.db.query(
          "SELECT title FROM cliptracker_v2_clips WHERE id = $1",
          TitleSchema, [evt.clip_id], { label: "Get clip title" }
        );

        details.push({
          viewerName: viewer[0]?.name ?? "Unknown",
          badgeId: mapping.badgeId,
          clipTitle: clip[0]?.title ?? "Unknown",
          action: "badge_from_existing_xp_event",
        });
      }
    }

    // --- STEP 2: Re-evaluate completed sessions for missing XP events + badges ---
    // Focus on badges that come from session data (not just xp_events)
    const sessions = await ctx.integrations.db.query(
      `SELECT
        s.id AS session_id, s.viewer_id, s.clip_id, c.sort_order,
        s.completed, s.is_recovery_attempt, s.question_score::text,
        COALESCE(s.total_time_seconds, 0) AS total_time_seconds,
        COALESCE((SELECT COUNT(*) FILTER (WHERE r.is_correct = true)
                  FROM cliptracker_v2_responses r
                  JOIN cliptracker_v2_questions q ON q.id = r.question_id
                  WHERE r.session_id = s.id AND q.is_recovery = false), 0)::int AS trail_correct,
        COALESCE((SELECT COUNT(*)
                  FROM cliptracker_v2_responses r
                  JOIN cliptracker_v2_questions q ON q.id = r.question_id
                  WHERE r.session_id = s.id AND q.is_recovery = false), 0)::int AS trail_total,
        COALESCE((SELECT COUNT(*) FILTER (WHERE r.is_correct = true)
                  FROM cliptracker_v2_responses r
                  JOIN cliptracker_v2_questions q ON q.id = r.question_id
                  WHERE r.session_id = s.id AND q.is_recovery = true), 0)::int AS sr_correct,
        COALESCE((SELECT COUNT(*)
                  FROM cliptracker_v2_responses r
                  JOIN cliptracker_v2_questions q ON q.id = r.question_id
                  WHERE r.session_id = s.id AND q.is_recovery = true), 0)::int AS sr_total
       FROM cliptracker_v2_sessions s
       JOIN cliptracker_v2_clips c ON c.id = s.clip_id
       JOIN cliptracker_v2_viewers v ON v.id = s.viewer_id
       WHERE v.is_admin = false AND s.completed = true
       ORDER BY c.sort_order ASC, s.started_at ASC
       LIMIT 500`,
      SessionRow,
      undefined,
      { label: "Get completed sessions for re-evaluation" }
    );

    for (const sess of sessions) {
      const srTriggered = sess.sr_total > 0;
      const srPassed = srTriggered && sess.sr_total > 0 && (sess.sr_correct / sess.sr_total) >= 0.8;

      // --- search_and_rescue_hero: S&R triggered AND perfect S&R score ---
      if (srTriggered && sess.sr_correct === sess.sr_total && sess.sr_total > 0) {
        // Check if xp_event exists
        const CountSchema = z.object({ count: z.coerce.number() });
        const existingXp = await ctx.integrations.db.query(
          `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
           WHERE viewer_id = $1 AND source_id = 'search_and_rescue_hero' AND clip_id = $2`,
          CountSchema,
          [sess.viewer_id, sess.clip_id],
          { label: "Check S&R Hero xp_event" }
        );

        if (existingXp[0]?.count === 0) {
          // Insert the missing XP event
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
             VALUES ($1, $2, 'performance', 'search_and_rescue_hero', 8)
             ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
            [sess.viewer_id, sess.clip_id],
            { label: "Backfill S&R Hero XP" }
          );
          xpEventsInserted++;

          const NameSchema = z.object({ name: z.string() });
          const viewer = await ctx.integrations.db.query(
            "SELECT name FROM cliptracker_v2_viewers WHERE id = $1",
            NameSchema, [sess.viewer_id], { label: "Viewer name" }
          );
          const TitleSchema = z.object({ title: z.string() });
          const clip = await ctx.integrations.db.query(
            "SELECT title FROM cliptracker_v2_clips WHERE id = $1",
            TitleSchema, [sess.clip_id], { label: "Clip title" }
          );

          details.push({
            viewerName: viewer[0]?.name ?? "Unknown",
            badgeId: "search_and_rescue_hero",
            clipTitle: clip[0]?.title ?? "Unknown",
            action: "xp_event_created",
          });
        }

        // Also ensure badge exists
        const existingBadge = await ctx.integrations.db.query(
          `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
           WHERE viewer_id = $1 AND badge_id = 'search_and_rescue_hero' AND clip_id = $2`,
          z.object({ count: z.coerce.number() }),
          [sess.viewer_id, sess.clip_id],
          { label: "Check S&R Hero badge" }
        );

        if (existingBadge[0]?.count === 0) {
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
             VALUES ($1, 'search_and_rescue_hero', $2)
             ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
            [sess.viewer_id, sess.clip_id],
            { label: "Backfill S&R Hero badge" }
          );
          badgesInserted++;

          const NameSchema = z.object({ name: z.string() });
          const viewer = await ctx.integrations.db.query(
            "SELECT name FROM cliptracker_v2_viewers WHERE id = $1",
            NameSchema, [sess.viewer_id], { label: "Viewer name" }
          );
          const TitleSchema = z.object({ title: z.string() });
          const clip = await ctx.integrations.db.query(
            "SELECT title FROM cliptracker_v2_clips WHERE id = $1",
            TitleSchema, [sess.clip_id], { label: "Clip title" }
          );

          details.push({
            viewerName: viewer[0]?.name ?? "Unknown",
            badgeId: "search_and_rescue_hero",
            clipTitle: clip[0]?.title ?? "Unknown",
            action: "badge_from_session_reevaluation",
          });
        }
      }
    }

    return { badgesInserted, xpEventsInserted, details };
  },
});
