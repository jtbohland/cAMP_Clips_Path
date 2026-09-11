import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/** Badge tiers — adjusted for 15 successful questions (3 levels × 5) */
const DEARR_BADGES = [
  { min: -100, max: -1,  badgeId: "dearr_road_hazard",       name: "Road Hazard",       emoji: "🚧" },
  { min: 0,    max: 14,  badgeId: "dearr_fawn_walker",       name: "Fawn Walker",       emoji: "🦌" },
  { min: 15,   max: 29,  badgeId: "dearr_trail_crosser",     name: "Trail Crosser",     emoji: "🌲" },
  { min: 30,   max: 39,  badgeId: "dearr_dearr_navigator",   name: "DEARR Navigator",   emoji: "🧭" },
  { min: 40,   max: 999, badgeId: "dearr_summit_stag",       name: "Summit Stag",       emoji: "🏔️" },
];

function getBadgeTier(netXp: number) {
  return DEARR_BADGES.find((b) => netXp >= b.min && netXp <= b.max) ?? DEARR_BADGES[0];
}

export default api({
  name: "CompleteDEARRGame",
  description: "Finalizes a DEARR Crossing session, awards badge/XP, marks clip complete",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string().uuid(),
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    isReplay: z.boolean(),
  }),

  output: z.object({
    netXp: z.number(),
    badge: z.object({
      badgeId: z.string(),
      name: z.string(),
      emoji: z.string(),
    }),
    totalXp: z.number(),
    correctCount: z.number(),
    totalCount: z.number(),
    levelBreakdown: z.array(z.object({
      level: z.coerce.number(),
      correct: z.coerce.number(),
      total: z.coerce.number(),
      attempts: z.coerce.number(),
    })),
    anteAccuracy: z.number(),
  }),

  async run(ctx, { sessionId, viewerId, clipId, isReplay }) {
    // Get all responses for this session
    const ResponseSchema = z.object({
      question_id: z.string(),
      level_number: z.coerce.number(),
      is_correct: z.boolean(),
      xp_change: z.coerce.number(),
      antler_ante: z.coerce.number(),
    });
    const responses = await ctx.integrations.apps_db.query(
      `SELECT question_id, level_number, is_correct, xp_change, antler_ante
       FROM cliptracker_v2_dearr_responses
       WHERE session_id = $1
       ORDER BY answered_at`,
      ResponseSchema,
      [sessionId],
      { label: "Get DEARR session responses" }
    );

    const netXp = responses.reduce((sum, r) => sum + r.xp_change, 0);
    const correctCount = responses.filter((r) => r.is_correct).length;
    const totalCount = responses.length;

    // Ante accuracy: % of high-confidence (level 3) answers that were correct
    const highAnte = responses.filter((r) => r.antler_ante === 3);
    const highAnteCorrect = highAnte.filter((r) => r.is_correct).length;
    const anteAccuracy = highAnte.length > 0
      ? Math.round((highAnteCorrect / highAnte.length) * 100)
      : -1; // -1 = no max-ante wagers made

    // Level breakdown — how many attempts per level, correct/total
    const LevelSchema = z.object({
      level: z.coerce.number(),
      correct: z.coerce.number(),
      total: z.coerce.number(),
    });
    const levelBreakdown = await ctx.integrations.apps_db.query(
      `SELECT level_number as level,
              COUNT(*) FILTER (WHERE is_correct)::int as correct,
              COUNT(*)::int as total
       FROM cliptracker_v2_dearr_responses
       WHERE session_id = $1
       GROUP BY level_number
       ORDER BY level_number`,
      LevelSchema,
      [sessionId],
      { label: "Get DEARR level breakdown" }
    );

    // Calculate attempts per level (total answers / 5 questions per successful pass, plus failed attempts)
    const levelBreakdownWithAttempts = levelBreakdown.map(lb => ({
      ...lb,
      // Each failed attempt adds wrong answers; successful attempt adds 5 correct
      // attempts = ceil(total / 5) gives us roughly how many times the level was tried
      attempts: Math.ceil(lb.total / 5),
    }));

    // Determine badge
    const badge = getBadgeTier(netXp);

    // Update session with results
    await ctx.integrations.apps_db.execute(
      `UPDATE cliptracker_v2_dearr_sessions
       SET net_xp = $1, badge_key = $2, badge_label = $3, completed_at = NOW()
       WHERE id = $4`,
      [netXp, badge.badgeId, badge.name, sessionId],
      { label: "Finalize DEARR session" }
    );

    // Only award XP and badge for real games (not replays)
    if (!isReplay) {
      // Check if viewer is admin
      const AdminCheck = z.object({ is_admin: z.boolean() });
      const adminCheck = await ctx.integrations.apps_db.query(
        "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
        AdminCheck, [viewerId], { label: "Check if admin" }
      );
      const isAdmin = adminCheck[0]?.is_admin ?? false;

      if (!isAdmin) {
        // Insert individual XP events for each response
        for (const r of responses) {
          if (r.xp_change !== 0) {
            await ctx.integrations.apps_db.execute(
              `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
              [viewerId, clipId, "dearr_game", `dearr_${sessionId}_${r.question_id}`, r.xp_change],
              { label: `DEARR XP: ${r.xp_change > 0 ? "+" : ""}${r.xp_change}` }
            );
          }
        }

        // Award badge
        await ctx.integrations.apps_db.execute(
          `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
          [viewerId, badge.badgeId, clipId],
          { label: `Award DEARR badge: ${badge.name}` }
        );

        // Also award Swiss Army Knife XP (+10) that reflection used to handle
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_xp_events
           SET xp_amount = 10
           WHERE viewer_id = $1 AND clip_id = $2 AND event_type = 'swiss_army_knife' AND xp_amount = 0`,
          [viewerId, clipId],
          { label: "Upgrade Swiss Army Knife to +10 XP" }
        );
      }

      // Mark Day 5 clip as completed for pacing (same pattern as Ridge/Price)
      await ctx.integrations.apps_db.execute(
        `INSERT INTO cliptracker_v2_sessions (clip_id, viewer_id, completed, ended_at, engagement_score)
         SELECT $1, $2, true, NOW(), 100
         WHERE NOT EXISTS (
           SELECT 1 FROM cliptracker_v2_sessions
           WHERE clip_id = $1 AND viewer_id = $2 AND completed = true
         )`,
        [clipId, viewerId],
        { label: "Mark Day 5 clip completed for pacing" }
      );

      // Unlock next clip (find clip after this one by sort_order)
      const CurrentClip = z.object({ sort_order: z.coerce.number() });
      const currentClipRows = await ctx.integrations.apps_db.query(
        "SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1",
        CurrentClip, [clipId], { label: "Get current clip sort order" }
      );

      if (currentClipRows.length > 0) {
        const NextClip = z.object({ id: z.string() });
        const nextClips = await ctx.integrations.apps_db.query(
          "SELECT id FROM cliptracker_v2_clips WHERE sort_order > $1 AND status = 'live' ORDER BY sort_order LIMIT 1",
          NextClip, [currentClipRows[0].sort_order], { label: "Find next clip to unlock" }
        );

        if (nextClips.length > 0) {
          await ctx.integrations.apps_db.execute(
            `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason)
             VALUES ($1, $2, 'system', 'Completed DEARR Crossing game')
             ON CONFLICT (viewer_id, clip_id) DO NOTHING`,
            [viewerId, nextClips[0].id],
            { label: "Unlock next clip via DEARR Crossing" }
          );
          ctx.log.info("Next clip unlocked via DEARR Crossing", { viewerId, clipId, nextClipId: nextClips[0].id });
        }
      }
    }

    // Get updated total XP
    const TotalSchema = z.object({ total_xp: z.coerce.number() });
    const [total] = await ctx.integrations.apps_db.query(
      `SELECT COALESCE(SUM(xp_amount), 0)::int as total_xp
       FROM cliptracker_v2_xp_events WHERE viewer_id = $1`,
      TotalSchema, [viewerId], { label: "Get updated total XP" }
    );

    return {
      netXp,
      badge: { badgeId: badge.badgeId, name: badge.name, emoji: badge.emoji },
      totalXp: total.total_xp,
      correctCount,
      totalCount,
      levelBreakdown: levelBreakdownWithAttempts,
      anteAccuracy,
    };
  },
});
