import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: Sets is_recovery_attempt = true on sessions that went through
 * Search & Rescue or Weather the Storm, identified by having corresponding
 * XP events (pass_search_rescue or weather_storm_complete).
 *
 * This fixes a bug in CompleteClipPath where is_recovery_attempt was never set.
 */
export default api({
  name: "FixRecoveryFlags",
  description: "Backfills is_recovery_attempt on sessions with S&R or WtS XP events",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    sessionsFixed: z.number(),
    details: z.array(z.object({
      sessionId: z.string(),
      viewerId: z.string(),
      clipId: z.string(),
      sourceId: z.string(),
    })),
  }),

  async run(ctx) {
    // Find sessions that have S&R or WtS XP events but is_recovery_attempt = false
    const MismatchSchema = z.object({
      session_id: z.string(),
      viewer_id: z.string(),
      clip_id: z.string(),
      source_id: z.string(),
    });

    const mismatched = await ctx.integrations.db.query(
      `SELECT DISTINCT s.id AS session_id, s.viewer_id, s.clip_id, xe.source_id
       FROM cliptracker_v2_xp_events xe
       JOIN cliptracker_v2_sessions s ON s.viewer_id = xe.viewer_id AND s.clip_id = xe.clip_id
       WHERE xe.source_id IN ('pass_search_rescue', 'weather_storm_complete')
         AND s.is_recovery_attempt = false
       LIMIT 100`,
      MismatchSchema,
      [],
      { label: "Find sessions with recovery XP but no flag" }
    );

    if (mismatched.length === 0) {
      ctx.log.info("No mismatched sessions found");
      return { sessionsFixed: 0, details: [] };
    }

    const sessionIds = mismatched.map(m => m.session_id);

    // Fix them
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions
       SET is_recovery_attempt = true
       WHERE id = ANY($1::uuid[])`,
      [sessionIds],
      { label: "Set is_recovery_attempt = true on mismatched sessions" }
    );

    ctx.log.info(`Fixed ${mismatched.length} sessions`, { sessionIds });

    return {
      sessionsFixed: mismatched.length,
      details: mismatched.map(m => ({
        sessionId: m.session_id,
        viewerId: m.viewer_id,
        clipId: m.clip_id,
        sourceId: m.source_id,
      })),
    };
  },
});
