import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/** Badge tiers determined by net XP change (same scale as Ridge Runner) */
const PRICE_BADGES = [
  { min: -20, max: -1,  badgeId: "price_busted_deal",     name: "Busted Deal",       emoji: "💸" },
  { min: 0,   max: 9,   badgeId: "price_window_shopper",  name: "Window Shopper",    emoji: "🪟" },
  { min: 10,  max: 19,  badgeId: "price_pricing_prodigy",  name: "Pricing Prodigy",   emoji: "🏷️" },
  { min: 20,  max: 26,  badgeId: "price_deal_architect",   name: "Deal Architect",    emoji: "📐" },
  { min: 27,  max: 30,  badgeId: "price_jackpot_genius",   name: "Jackpot Genius",    emoji: "🎰" },
];

function getBadgeTier(netXp: number) {
  return PRICE_BADGES.find((b) => netXp >= b.min && netXp <= b.max) ?? PRICE_BADGES[0];
}

export default api({
  name: "CompletePriceGame",
  description: "Finalizes a Price is Right session, awards badge and XP",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string(),
    viewerId: z.string(),
    clipId: z.string(),
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
    sectionBreakdown: z.array(z.object({
      section: z.string(),
      correct: z.number(),
      total: z.number(),
    })),
    gameTypeBreakdown: z.array(z.object({
      game_type: z.string(),
      correct: z.number(),
      total: z.number(),
    })),
    cruxAccuracy: z.number(),
  }),

  async run(ctx, { sessionId, viewerId, clipId, isReplay }) {
    // Get all responses for this session
    const ResponseSchema = z.object({
      scenario_id: z.string(),
      is_correct: z.boolean(),
      xp_change: z.coerce.number(),
      crux_level: z.coerce.number(),
    });
    const responses = await ctx.integrations.apps_db.query(
      `SELECT scenario_id, is_correct, xp_change, crux_level
       FROM cliptracker_v2_price_responses
       WHERE session_id = $1
       ORDER BY answered_at`,
      ResponseSchema,
      [sessionId],
      { label: "Get Price session responses" }
    );

    const netXp = responses.reduce((sum, r) => sum + r.xp_change, 0);
    const correctCount = responses.filter((r) => r.is_correct).length;
    const totalCount = responses.length;

    // Crux accuracy: % of high-confidence (level 3) answers that were correct
    const highConfidence = responses.filter((r) => r.crux_level === 3);
    const highConfidenceCorrect = highConfidence.filter((r) => r.is_correct).length;
    const cruxAccuracy = highConfidence.length > 0
      ? Math.round((highConfidenceCorrect / highConfidence.length) * 100)
      : -1;

    // Section breakdown (Amplitude Pricing, Add-On Uplift, PS, Statsig WHN, Statsig Cloud)
    const SectionSchema = z.object({
      section: z.string(),
      correct: z.coerce.number(),
      total: z.coerce.number(),
    });
    const sectionBreakdown = await ctx.integrations.apps_db.query(
      `SELECT s.section,
              COUNT(*) FILTER (WHERE r.is_correct)::int as correct,
              COUNT(*)::int as total
       FROM cliptracker_v2_price_responses r
       JOIN cliptracker_v2_price_scenarios s ON s.id = r.scenario_id
       WHERE r.session_id = $1
       GROUP BY s.section
       ORDER BY s.section`,
      SectionSchema,
      [sessionId],
      { label: "Get Price section breakdown" }
    );

    // Game type breakdown
    const GameTypeSchema = z.object({
      game_type: z.string(),
      correct: z.coerce.number(),
      total: z.coerce.number(),
    });
    const gameTypeBreakdown = await ctx.integrations.apps_db.query(
      `SELECT s.game_type,
              COUNT(*) FILTER (WHERE r.is_correct)::int as correct,
              COUNT(*)::int as total
       FROM cliptracker_v2_price_responses r
       JOIN cliptracker_v2_price_scenarios s ON s.id = r.scenario_id
       WHERE r.session_id = $1
       GROUP BY s.game_type
       ORDER BY s.game_type`,
      GameTypeSchema,
      [sessionId],
      { label: "Get Price game type breakdown" }
    );

    // Determine badge
    const badge = getBadgeTier(netXp);

    // Update session with results
    await ctx.integrations.apps_db.execute(
      `UPDATE cliptracker_v2_price_sessions
       SET net_xp = $1, badge_key = $2, badge_label = $3, completed_at = NOW()
       WHERE id = $4`,
      [netXp, badge.badgeId, badge.name, sessionId],
      { label: "Finalize Price session" }
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
              [viewerId, clipId, "price_game", `price_${sessionId}_${r.scenario_id}`, r.xp_change],
              { label: `Price XP: ${r.xp_change > 0 ? "+" : ""}${r.xp_change}` }
            );
          }
        }

        // Award badge
        await ctx.integrations.apps_db.execute(
          `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
          [viewerId, badge.badgeId, clipId],
          { label: `Award Price badge: ${badge.name}` }
        );
      }
    }

    // Mark Day 9 clip as completed for pacing (same pattern as Ridge Runner)
    await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_sessions (clip_id, viewer_id, completed, ended_at, engagement_score)
       SELECT $1, $2, true, NOW(), 100
       WHERE NOT EXISTS (
         SELECT 1 FROM cliptracker_v2_sessions
         WHERE clip_id = $1 AND viewer_id = $2 AND completed = true
       )`,
      [clipId, viewerId],
      { label: "Mark Day 9 clip completed for pacing" }
    );

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
      sectionBreakdown,
      gameTypeBreakdown,
      cruxAccuracy,
    };
  },
});
