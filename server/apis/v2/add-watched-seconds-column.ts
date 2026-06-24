import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddWatchedSecondsColumn",
  description: "Adds paused_watched_seconds column to sessions table for seek protection",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    // Add paused_watched_seconds column (nullable integer, defaults to null)
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_sessions
       ADD COLUMN IF NOT EXISTS paused_watched_seconds INTEGER DEFAULT NULL`,
      [],
      { label: "Add paused_watched_seconds column" }
    );

    return { success: true, message: "Added paused_watched_seconds column" };
  },
});
