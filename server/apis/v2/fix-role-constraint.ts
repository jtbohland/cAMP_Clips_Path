import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixRoleConstraint",
  description: "Updates role check constraint to accept Strategic AE instead of Strategic AEs",

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
      `ALTER TABLE cliptracker_v2_viewers DROP CONSTRAINT cliptracker_v2_viewers_role_check`,
      undefined,
      { label: "Drop old role check constraint" }
    );

    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_viewers ADD CONSTRAINT cliptracker_v2_viewers_role_check CHECK (role = ANY(ARRAY['SDR','Velocity AE','Emerging AE','Majors AE','Strategic AE','PSM','Renewals']))`,
      undefined,
      { label: "Add updated role check constraint with Strategic AE" }
    );

    return { success: true, message: "Updated constraint: 'Strategic AEs' → 'Strategic AE'" };
  },
});
