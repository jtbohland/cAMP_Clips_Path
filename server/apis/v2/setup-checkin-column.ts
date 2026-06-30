import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupCheckinColumn",
  description: "One-time setup: adds learner_reflection column to checkin_emails table",

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
      `ALTER TABLE cliptracker_v2_checkin_emails ADD COLUMN IF NOT EXISTS learner_reflection TEXT`,
      undefined,
      { label: "Add learner_reflection column" }
    );

    ctx.log.info("Added learner_reflection column to cliptracker_v2_checkin_emails");
    return { success: true, message: "learner_reflection column added (or already exists)" };
  },
});
