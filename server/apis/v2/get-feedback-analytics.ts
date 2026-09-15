import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ReactionRow = z.object({
  lesson_key: z.string(),
  emoji: z.string(),
  count: z.coerce.number(),
});

const FeedbackRow = z.object({
  day_key: z.string(),
  rating: z.string().nullable(),
  usefulness: z.string().nullable(),
  count: z.coerce.number(),
});

const ClipPathRow = z.object({
  id: z.string(),
  title: z.string(),
  sort_order: z.coerce.number(),
  roles: z.array(z.string()).nullable(),
  week_number: z.coerce.number().nullable(),
});

export default api({
  name: "GetFeedbackAnalytics",
  description: "Aggregated reactions and daily feedback for admin analytics",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),
  output: z.object({
    reactions: z.array(ReactionRow),
    ratings: z.array(FeedbackRow),
    clipPaths: z.array(ClipPathRow),
  }),

  async run(ctx) {
    const [reactions, ratings, clipPaths] = await Promise.all([
      ctx.integrations.apps_db.query(
        `SELECT lesson_key, emoji, COUNT(*)::int AS count
         FROM cliptracker_v2_reactions
         GROUP BY lesson_key, emoji
         ORDER BY count DESC
         LIMIT 200`,
        ReactionRow,
        undefined,
        { label: "Aggregated reactions" }
      ),
      ctx.integrations.apps_db.query(
        `SELECT day_key,
                rating,
                usefulness,
                COUNT(*)::int AS count
         FROM cliptracker_v2_daily_feedback
         GROUP BY day_key, rating, usefulness
         ORDER BY day_key, count DESC
         LIMIT 200`,
        FeedbackRow,
        undefined,
        { label: "Aggregated feedback" }
      ),
      ctx.integrations.apps_db.query(
        `SELECT id, title, sort_order, roles, week_number
         FROM cliptracker_v2_clips
         ORDER BY sort_order
         LIMIT 50`,
        ClipPathRow,
        undefined,
        { label: "Clip path assignments" }
      ),
    ]);

    return { reactions, ratings, clipPaths };
  },
});
