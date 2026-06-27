import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "PauseSession",
  description: "Saves pause state for a viewing session so the learner can resume later",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string().uuid(),
    elapsedSeconds: z.number(),
    focusSeconds: z.number(),
    blurSeconds: z.number(),
    watchedSeconds: z.number().default(0),
    answeredQuestionIds: z.array(z.string()),
    correctCount: z.number(),
    phase: z.string(),
    lowVolumeSeconds: z.number().default(0),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { sessionId, elapsedSeconds, focusSeconds, blurSeconds, watchedSeconds, answeredQuestionIds, correctCount, phase, lowVolumeSeconds }) {
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions SET
        paused_at = NOW(),
        paused_elapsed_seconds = $2,
        paused_focus_seconds = $3,
        paused_blur_seconds = $4,
        paused_answered_ids = $5::jsonb,
        paused_correct_count = $6,
        paused_phase = $7,
        paused_watched_seconds = $8,
        low_volume_seconds = $9
       WHERE id = $1 AND completed = false`,
      [sessionId, elapsedSeconds, focusSeconds, blurSeconds, JSON.stringify(answeredQuestionIds), correctCount, phase, watchedSeconds, lowVolumeSeconds],
      { label: "Save pause state" }
    );

    return { success: true };
  },
});
