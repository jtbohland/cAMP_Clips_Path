import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupLoginTracking",
  description: "One-time setup: adds last_login_at column to viewers table",

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
      `ALTER TABLE cliptracker_v2_viewers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL`,
      undefined,
      { label: "Add last_login_at column" }
    );

    ctx.log.info("Added last_login_at column to cliptracker_v2_viewers");
    return { success: true, message: "last_login_at column added (or already exists)" };
  },
});
