import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddManagerColumns",
  description: "Adds manager_name and manager_email columns to viewers table",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_viewers
       ADD COLUMN IF NOT EXISTS manager_name TEXT,
       ADD COLUMN IF NOT EXISTS manager_email TEXT`,
      undefined,
      { label: "Add manager columns" }
    );

    ctx.log.info("Added manager_name and manager_email columns");
    return { success: true, message: "Columns added successfully" };
  },
});
