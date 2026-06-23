import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Marks a clip as "completed" — the SOLE gatekeeper for completion.
 * Called from all three valid pass paths:
 * - first_pass: trail markers ≥ 80% engagement
 * - search_rescue: S&R recovery score ≥ 80%
 * - weather_storm: WtS timer expiry
 *
 * Sets completed=true on the session and inserts an unlock override for the NEXT clip.
 * EndSession no longer sets completed=true — it only saves metrics.
 */
export default api({
  name: "CompleteClipPath",
  description: "Sole gatekeeper: marks clip completed and unlocks next clip",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    path: z.enum(["first_pass", "search_rescue", "weather_storm"]),
    sessionId: z.string().uuid().optional(),
  }),

  output: z.object({
    success: z.boolean(),
    nextClipUnlocked: z.boolean(),
    newEngagementScore: z.number().nullable(),
  }),

  async run(ctx, { viewerId, clipId, path, sessionId: inputSessionId }) {
    // Get the sort_order of this clip to find the next one
    const SortSchema = z.object({ sort_order: z.coerce.number() });
    const currentClips = await ctx.integrations.db.query(
      "SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1",
      SortSchema,
      [clipId],
      { label: "Get current clip sort order" }
    );

    if (currentClips.length === 0) {
      throw new Error("Clip not found");
    }

    const currentSort = currentClips[0].sort_order;

    // Find the next clip
    const NextClipSchema = z.object({ id: z.string() });
    const nextClips = await ctx.integrations.db.query(
      "SELECT id FROM cliptracker_v2_clips WHERE sort_order = $1 AND status = 'live'",
      NextClipSchema,
      [currentSort + 1],
      { label: "Find next clip" }
    );

    let nextClipUnlocked = false;

    if (nextClips.length > 0) {
      // Insert unlock override for the next clip
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (viewer_id, clip_id) DO NOTHING`,
        [viewerId, nextClips[0].id, "system", `Completed via ${path}`],
        { label: "Insert unlock override for next clip" }
      );
      nextClipUnlocked = true;
    }

    // Recalculate engagement score with combined trail marker + S&R quiz results.
    // Focus and time scores stay the same (from EndSession). Only the quiz
    // component is recomputed to include all responses on this session.
    const sessionQuery = inputSessionId
      ? `SELECT id, focus_score, time_score FROM cliptracker_v2_sessions WHERE id = $1 LIMIT 1`
      : `SELECT id, focus_score, time_score FROM cliptracker_v2_sessions WHERE clip_id = $1 AND viewer_id = $2 ORDER BY started_at DESC LIMIT 1`;
    const sessionParams = inputSessionId ? [inputSessionId] : [clipId, viewerId];
    const sessionRow = await ctx.integrations.db.query(
      sessionQuery,
      z.object({
        id: z.string(),
        focus_score: z.coerce.number().nullable(),
        time_score: z.coerce.number().nullable(),
      }),
      sessionParams,
      { label: "Get session scores for recalculation" }
    );

    let newEngagementScore: number | null = null;

    if (sessionRow.length > 0) {
      const session = sessionRow[0];
      const focusScore = session.focus_score ?? 100;
      const timeScore = session.time_score ?? 100;

      // Count all responses (trail markers + S&R) for the combined quiz score
      const quizStats = await ctx.integrations.db.query(
        `SELECT
           COUNT(DISTINCT question_id)::int as total,
           COUNT(DISTINCT question_id) FILTER (WHERE is_correct = true)::int as correct
         FROM cliptracker_v2_responses
         WHERE session_id = $1`,
        z.object({ total: z.coerce.number(), correct: z.coerce.number() }),
        [session.id],
        { label: "Count all responses for combined quiz score" }
      );

      const { total, correct } = quizStats[0];
      const questionScore = total > 0 ? (correct / total) * 100 : 0;

      newEngagementScore = Math.round(
        (questionScore * 0.25) + (focusScore * 0.30) + (timeScore * 0.45)
      );

      // Update session: mark completed + store the recalculated engagement score
      await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_sessions
         SET completed = true, engagement_score = $2
         WHERE id = $1`,
        [session.id, newEngagementScore],
        { label: "Update session with recalculated engagement score" }
      );
    }

    ctx.log.info(`Clip completed via ${path}`, { viewerId, clipId, nextClipUnlocked, newEngagementScore });

    return { success: true, nextClipUnlocked, newEngagementScore };
  },
});
