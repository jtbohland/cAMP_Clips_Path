import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitDailyFeedback",
  description: "Submits a one-shot daily feedback rating or usefulness score.",

  integrations: {
    apps_database: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
    dayKey: z.string(),
    field: z.enum(["rating", "usefulness"]),
    value: z.string(),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { viewerId, dayKey, field, value }) {
    if (field === "rating") {
      // Insert with rating, or update ONLY if rating is still null (one-shot)
      await ctx.integrations.apps_database.execute(
        `INSERT INTO cliptracker_v2_daily_feedback (viewer_id, day_key, rating)
         VALUES ($1, $2, $3)
         ON CONFLICT (viewer_id, day_key)
         DO UPDATE SET rating = $3
         WHERE cliptracker_v2_daily_feedback.rating IS NULL`,
        [viewerId, dayKey, value],
        { label: "Submit daily rating" }
      );
    } else {
      // Insert with usefulness, or update ONLY if usefulness is still null (one-shot)
      await ctx.integrations.apps_database.execute(
        `INSERT INTO cliptracker_v2_daily_feedback (viewer_id, day_key, usefulness)
         VALUES ($1, $2, $3)
         ON CONFLICT (viewer_id, day_key)
         DO UPDATE SET usefulness = $3
         WHERE cliptracker_v2_daily_feedback.usefulness IS NULL`,
        [viewerId, dayKey, value],
        { label: "Submit daily usefulness" }
      );
    }

    return { success: true };
  },
});
