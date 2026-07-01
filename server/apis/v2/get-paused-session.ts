import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const PausedSessionRow = z.object({
  id: z.string(),
  paused_elapsed_seconds: z.coerce.number(),
  paused_focus_seconds: z.coerce.number(),
  paused_blur_seconds: z.coerce.number(),
  paused_watched_seconds: z.coerce.number().default(0),
  low_volume_seconds: z.coerce.number().default(0),
  paused_answered_ids: z.any(),
  paused_correct_count: z.coerce.number(),
  paused_phase: z.string().nullable(),
  paused_at: z.string(),
});

export default api({
  name: "GetPausedSession",
  description: "Checks if a viewer has a paused (resumable) session for a clip",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    hasCompletedSession: z.boolean(),
    hasPausedSession: z.boolean(),
    session: z.object({
      id: z.string(),
      elapsedSeconds: z.number(),
      watchedSeconds: z.number(),
      focusSeconds: z.number(),
      blurSeconds: z.number(),
      answeredQuestionIds: z.array(z.string()),
      correctCount: z.number(),
      phase: z.string().nullable(),
      pausedAt: z.string(),
      lowVolumeSeconds: z.number(),
    }).nullable(),
  }),

  async run(ctx, { clipId, viewerId }) {
    // Check for completed session (completed=true is set solely by CompleteClipPath)
    const completedRows = await ctx.integrations.db.query(
      `SELECT 1 FROM cliptracker_v2_sessions
       WHERE clip_id = $1 AND viewer_id = $2
         AND completed = true
       LIMIT 1`,
      z.object({}),
      [clipId, viewerId],
      { label: "Check for passed session" }
    );
    const hasCompletedSession = completedRows.length > 0;

    const rows = await ctx.integrations.db.query(
      `SELECT id, paused_elapsed_seconds, paused_focus_seconds, paused_blur_seconds,
              COALESCE(paused_watched_seconds, paused_elapsed_seconds) as paused_watched_seconds,
              paused_answered_ids, paused_correct_count, paused_phase, paused_at::text,
              COALESCE(low_volume_seconds, 0) as low_volume_seconds
       FROM cliptracker_v2_sessions
       WHERE clip_id = $1 AND viewer_id = $2
         AND paused_at IS NOT NULL AND completed = false
       ORDER BY paused_at DESC
       LIMIT 1`,
      PausedSessionRow,
      [clipId, viewerId],
      { label: "Check for paused session" }
    );

    if (rows.length === 0) {
      return { hasCompletedSession, hasPausedSession: false, session: null };
    }

    const row = rows[0];
    const answeredIds = Array.isArray(row.paused_answered_ids)
      ? row.paused_answered_ids
      : JSON.parse(row.paused_answered_ids);

    return {
      hasCompletedSession,
      hasPausedSession: true,
      session: {
        id: row.id,
        elapsedSeconds: row.paused_elapsed_seconds,
        watchedSeconds: row.paused_watched_seconds ?? 0,
        focusSeconds: row.paused_focus_seconds,
        blurSeconds: row.paused_blur_seconds,
        answeredQuestionIds: answeredIds,
        correctCount: row.paused_correct_count,
        phase: row.paused_phase,
        pausedAt: row.paused_at,
        lowVolumeSeconds: row.low_volume_seconds ?? 0,
      },
    };
  },
});
