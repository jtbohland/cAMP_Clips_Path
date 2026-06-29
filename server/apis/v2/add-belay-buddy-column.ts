import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddBelayBuddyColumn",
  description: "Migration: adds belay_buddy column to cliptracker_v2_viewers",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      "ALTER TABLE cliptracker_v2_viewers ADD COLUMN IF NOT EXISTS belay_buddy text",
      undefined,
      { label: "Add belay_buddy column" }
    );

    ctx.log.info("Added belay_buddy column to cliptracker_v2_viewers");
    return { success: true };
  },
});
