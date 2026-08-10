import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateChallengerConstraint",
  description: "Adds challenger_why and challenger_intro to academy_screenshots CHECK constraint",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx) {
    // Drop the old CHECK constraint and add the new one with challenger course keys
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_academy_screenshots
       DROP CONSTRAINT IF EXISTS cliptracker_v2_academy_screenshots_course_key_check`,
      undefined,
      { label: "Drop old course_key CHECK" }
    );

    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_academy_screenshots
       ADD CONSTRAINT cliptracker_v2_academy_screenshots_course_key_check
       CHECK (course_key IN ('analytics', 'experiment', 'session_replay', 'guides_surveys', 'challenger_why', 'challenger_intro'))`,
      undefined,
      { label: "Add updated course_key CHECK with challenger keys" }
    );

    ctx.log.info("Updated academy_screenshots CHECK constraint with challenger course keys");
    return { success: true };
  },
});
