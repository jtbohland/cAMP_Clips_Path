import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ToggleReaction",
  description: "Adds or removes an emoji reaction for the current user on a lesson.",

  integrations: {
    apps_database: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
    lessonKey: z.string(),
    emoji: z.string(),
  }),

  output: z.object({
    action: z.enum(["added", "removed"]),
  }),

  async run(ctx, { viewerId, lessonKey, emoji }) {
    // Try to delete first — if a row was deleted, it was a removal
    const deleteResult = await ctx.integrations.apps_database.execute(
      `DELETE FROM cliptracker_v2_reactions
       WHERE viewer_id = $1 AND lesson_key = $2 AND emoji = $3`,
      [viewerId, lessonKey, emoji],
      { label: "Try remove reaction" }
    );

    if (deleteResult.rowCount > 0) {
      return { action: "removed" as const };
    }

    // No row existed — insert
    await ctx.integrations.apps_database.execute(
      `INSERT INTO cliptracker_v2_reactions (viewer_id, lesson_key, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (viewer_id, lesson_key, emoji) DO NOTHING`,
      [viewerId, lessonKey, emoji],
      { label: "Add reaction" }
    );

    return { action: "added" as const };
  },
});
