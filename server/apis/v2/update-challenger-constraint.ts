import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateChallengerConstraint",
  description: "Updates academy_screenshots CHECK constraint with all valid course keys",

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
       CHECK (course_key IN ('analytics', 'experiment', 'session_replay', 'guides_surveys', 'challenger_why', 'challenger_intro', 'statsig'))`,
      undefined,
      { label: "Add updated course_key CHECK with challenger keys" }
    );

    ctx.log.info("Updated academy_screenshots CHECK constraint with challenger + statsig course keys");

    // Update W&D score constraint from max 12 → 15
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_wd_verifications
       DROP CONSTRAINT IF EXISTS cliptracker_v2_wd_verifications_score_check`,
      undefined,
      { label: "Drop old W&D score CHECK" }
    );

    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_wd_verifications
       ADD CONSTRAINT cliptracker_v2_wd_verifications_score_check
       CHECK (score >= 4 AND score <= 15)`,
      undefined,
      { label: "Add updated W&D score CHECK (4-15)" }
    );

    ctx.log.info("Updated W&D score CHECK constraint to max 15");
    return { success: true };
  },
});
