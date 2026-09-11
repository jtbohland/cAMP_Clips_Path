import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ReactionRow = z.object({
  lesson_key: z.string(),
  emoji: z.string(),
  count: z.coerce.number(),
});

const UserReactionRow = z.object({
  lesson_key: z.string(),
  emoji: z.string(),
});

export default api({
  name: "GetReactions",
  description: "Fetches emoji reaction counts and current user's reactions for all lessons.",

  integrations: {
    apps_database: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
  }),

  output: z.object({
    counts: z.array(ReactionRow),
    userReactions: z.array(UserReactionRow),
  }),

  async run(ctx, { viewerId }) {
    const [counts, userReactions] = await Promise.all([
      ctx.integrations.apps_database.query(
        `SELECT lesson_key, emoji, COUNT(*)::int AS count
         FROM cliptracker_v2_reactions
         GROUP BY lesson_key, emoji
         HAVING COUNT(*) > 0`,
        ReactionRow,
        undefined,
        { label: "Reaction counts by lesson+emoji" }
      ),
      ctx.integrations.apps_database.query(
        `SELECT lesson_key, emoji
         FROM cliptracker_v2_reactions
         WHERE viewer_id = $1`,
        UserReactionRow,
        [viewerId],
        { label: "Current user reactions" }
      ),
    ]);

    return { counts, userReactions };
  },
});
