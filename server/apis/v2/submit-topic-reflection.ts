import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const VALID_TOPIC_DAYS = ["day5", "day9"] as const;

export default api({
  name: "SubmitTopicReflection",
  description: "Submits topic day reflection answers for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    topicDay: z.enum(VALID_TOPIC_DAYS),
    question1: z.string().min(1),
    answer1: z.string().min(1),
    question2: z.string().min(1),
    answer2: z.string().min(1),
  }),

  output: z.object({
    success: z.boolean(),
    alreadySubmitted: z.boolean(),
    xpAwarded: z.number(),
  }),

  async run(ctx, { viewerId, topicDay, question1, answer1, question2, answer2 }) {
    const CountSchema = z.object({ count: z.coerce.number() });

    // Check if already submitted
    const existing = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_topic_reflections
       WHERE viewer_id = $1 AND topic_day = $2`,
      CountSchema,
      [viewerId, topicDay],
      { label: "Check existing topic reflection" }
    );

    if (existing[0].count > 0) {
      return { success: true, alreadySubmitted: true, xpAwarded: 0 };
    }

    // Insert reflection
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_topic_reflections
        (viewer_id, topic_day, question_1, answer_1, question_2, answer_2)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (viewer_id, topic_day) DO NOTHING`,
      [viewerId, topicDay, question1, answer1, question2, answer2],
      { label: "Insert topic reflection" }
    );

    // Award +10 XP for completing the reflection (the Swiss Army Knife badge
    // was already recorded when all resources were clicked — now add the XP)
    let xpAwarded = 0;

    const AdminCheck = z.object({ is_admin: z.boolean() });
    const adminCheck = await ctx.integrations.db.query(
      "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
      AdminCheck,
      [viewerId],
      { label: "Check if viewer is admin" }
    );
    const isAdmin = adminCheck[0]?.is_admin ?? false;

    if (!isAdmin) {
      // Find the clip_id for this topic day to link the XP event
      const DayMap: Record<string, string> = { day5: "Day 5", day9: "Day 9" };
      const dayLabel = DayMap[topicDay];
      const ClipIdSchema = z.object({ id: z.string() });
      const clipRows = await ctx.integrations.db.query(
        "SELECT id FROM cliptracker_v2_clips WHERE day_label = $1 LIMIT 1",
        ClipIdSchema,
        [dayLabel],
        { label: "Find clip for topic day" }
      );

      if (clipRows.length > 0) {
        // Update the existing swiss_army_knife badge event to add XP,
        // or insert if it doesn't exist yet
        const updated = await ctx.integrations.db.query(
          `UPDATE cliptracker_v2_xp_events
           SET xp_amount = 10
           WHERE viewer_id = $1 AND clip_id = $2 AND event_type = 'swiss_army_knife' AND xp_amount = 0
           RETURNING id`,
          z.object({ id: z.string() }),
          [viewerId, clipRows[0].id],
          { label: "Update Swiss Army Knife XP to +10" }
        );

        if (updated.length > 0) {
          xpAwarded = 10;
        } else {
          // Badge event doesn't exist or already has XP — insert as fallback
          const ExistCheck = z.object({ cnt: z.coerce.number() });
          const existCheck = await ctx.integrations.db.query(
            `SELECT COUNT(*)::int as cnt FROM cliptracker_v2_xp_events
             WHERE viewer_id = $1 AND clip_id = $2 AND event_type = 'swiss_army_knife'`,
            ExistCheck,
            [viewerId, clipRows[0].id],
            { label: "Check if Swiss Army Knife XP exists" }
          );
          if (existCheck[0].cnt === 0) {
            await ctx.integrations.db.execute(
              `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, xp_amount, source_id)
               VALUES ($1, $2, 'swiss_army_knife', 10, 'swiss_army_knife')
               ON CONFLICT (viewer_id, source_id, clip_id) DO UPDATE SET xp_amount = 10`,
              [viewerId, clipRows[0].id],
              { label: "Insert Swiss Army Knife XP event" }
            );
            xpAwarded = 10;
          }
        }
      }
    }

    // === UNLOCK NEXT CLIP after reflection is submitted ===
    // The next clip only unlocks once the learner submits their reflection,
    // not when they click all resources (badge only at that point).
    if (!isAdmin) {
      const DayMapUnlock: Record<string, string> = { day5: "Day 5", day9: "Day 9" };
      const dayLabelUnlock = DayMapUnlock[topicDay];
      const UnlockClipSchema = z.object({ id: z.string(), sort_order: z.coerce.number() });
      const topicClipRows = await ctx.integrations.db.query(
        "SELECT id, sort_order FROM cliptracker_v2_clips WHERE day_label = $1 LIMIT 1",
        UnlockClipSchema,
        [dayLabelUnlock],
        { label: "Find topic day clip for unlock" }
      );

      if (topicClipRows.length > 0) {
        const nextSortOrder = topicClipRows[0].sort_order + 1;
        const NextClipSchema = z.object({ id: z.string() });
        const nextClips = await ctx.integrations.db.query(
          "SELECT id FROM cliptracker_v2_clips WHERE sort_order = $1 AND status = 'live'",
          NextClipSchema,
          [nextSortOrder],
          { label: "Find next clip to unlock" }
        );

        if (nextClips.length > 0) {
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason)
             VALUES ($1, $2, 'system', 'Completed topic day reflection')
             ON CONFLICT (viewer_id, clip_id) DO NOTHING`,
            [viewerId, nextClips[0].id],
            { label: "Unlock next clip via reflection submission" }
          );
          ctx.log.info("Next clip unlocked via reflection", { viewerId, topicDay, nextClipId: nextClips[0].id });
        }
      }
    }

    // === HALFWAY UP MILESTONE: Award when Day 9 resource day reflection is submitted ===
    // Day 9 is the natural halfway point of The Ascent (Topic 9 of 15).
    // Moved here from AwardXP (was at clip sort_order 9) to tie to resource day completion.
    if (!isAdmin && topicDay === "day9") {
      const HalfwayClipSchema = z.object({ id: z.string() });
      const halfwayClipRows = await ctx.integrations.db.query(
        "SELECT id FROM cliptracker_v2_clips WHERE day_label = 'Day 9' LIMIT 1",
        HalfwayClipSchema,
        [/* no params */],
        { label: "Find Day 9 clip for Halfway Up milestone" }
      );
      if (halfwayClipRows.length > 0) {
        const halfwayClipId = halfwayClipRows[0].id;
        // Check if already awarded (idempotent)
        const HalfwayCheckSchema = z.object({ count: z.coerce.number() });
        const existingHalfway = await ctx.integrations.db.query(
          `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
           WHERE viewer_id = $1 AND source_id = 'halfway'`,
          HalfwayCheckSchema,
          [viewerId],
          { label: "Check existing Halfway Up milestone" }
        );
        if (existingHalfway[0].count === 0) {
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, xp_amount, source_id)
             VALUES ($1, $2, 'milestone', 15, 'halfway')
             ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
            [viewerId, halfwayClipId],
            { label: "Award Halfway Up +15 XP" }
          );
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
             VALUES ($1, 'halfway', $2)
             ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
            [viewerId, halfwayClipId],
            { label: "Award Halfway Up badge" }
          );
          xpAwarded += 15;
          ctx.log.info("Halfway Up milestone awarded on Day 9 reflection", { viewerId });
        }
      }
    }

    ctx.log.info("Topic reflection submitted", { viewerId, topicDay, xpAwarded });
    return { success: true, alreadySubmitted: false, xpAwarded };
  },
});
