import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixRoleConstraint",
  description: "Drops the role CHECK constraint so the dropdown controls valid roles",

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
      `ALTER TABLE cliptracker_v2_viewers DROP CONSTRAINT IF EXISTS cliptracker_v2_viewers_role_check`,
      undefined,
      { label: "Drop role check constraint permanently" }
    );

    return { success: true, message: "Role CHECK constraint removed — dropdown controls valid roles now." };
  },
});
