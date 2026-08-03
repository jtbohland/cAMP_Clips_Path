import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateQuestionTimestamps",
  description: "Updates trigger_at_seconds for specific trail marker questions",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    updates: z.array(
      z.object({
        questionId: z.string().uuid(),
        triggerAtSeconds: z.number().int().min(0),
      })
    ),
  }),

  output: z.object({
    updated: z.number(),
  }),

  async run(ctx, { updates }) {
    let updatedCount = 0;
    for (const { questionId, triggerAtSeconds } of updates) {
      const result = await ctx.integrations.apps_db.execute(
        "UPDATE cliptracker_v2_questions SET trigger_at_seconds = $1 WHERE id = $2",
        [triggerAtSeconds, questionId],
        { label: `Update timestamp for ${questionId}` }
      );
      updatedCount += result.rowCount ?? 0;
    }

    return { updated: updatedCount };
  },
});
