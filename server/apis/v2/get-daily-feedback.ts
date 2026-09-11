import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const FeedbackRow = z.object({
  day_key: z.string(),
  rating: z.string().nullable(),
  usefulness: z.string().nullable(),
});

export default api({
  name: "GetDailyFeedback",
  description: "Fetches the current learner's daily feedback submissions.",

  integrations: {
    apps_database: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
  }),

  output: z.object({
    feedback: z.array(FeedbackRow),
  }),

  async run(ctx, { viewerId }) {
    const feedback = await ctx.integrations.apps_database.query(
      `SELECT day_key, rating, usefulness
       FROM cliptracker_v2_daily_feedback
       WHERE viewer_id = $1`,
      FeedbackRow,
      [viewerId],
      { label: "Get user daily feedback" }
    );

    return { feedback };
  },
});
