import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "TrackLogin",
  description: "Updates last_login_at timestamp for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { viewerId }) {
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET last_login_at = NOW() WHERE id = $1`,
      [viewerId],
      { label: "Update last_login_at" }
    );

    return { success: true };
  },
});
