import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time migration: add ai_coach_score column to W&D verifications.
 * Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.
 */
export default api({
  name: "AddWdAiCoachColumn",
  description: "Adds ai_coach_score column to W&D verifications table",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_wd_verifications
       ADD COLUMN IF NOT EXISTS ai_coach_score INTEGER`,
      undefined,
      { label: "Add ai_coach_score column" }
    );

    ctx.log.info("Added ai_coach_score column to wd_verifications");
    return { success: true };
  },
});
