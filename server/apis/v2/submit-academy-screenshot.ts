import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const COURSE_KEYS = ['analytics', 'experiment', 'session_replay', 'guides_surveys'] as const;

export default api({
  name: "SubmitAcademyScreenshot",
  description: "Uploads a single Academy course completion screenshot with cross-dedup",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    courseKey: z.enum(COURSE_KEYS),
    screenshotData: z.string().min(1),
    screenshotFilename: z.string().min(1),
    screenshotHash: z.string().min(1),
  }),

  output: z.object({
    success: z.boolean(),
    alreadyUploaded: z.boolean(),
  }),

  async run(ctx, { viewerId, courseKey, screenshotData, screenshotFilename, screenshotHash }) {
    const CountSchema = z.object({ count: z.coerce.number() });

    // Cross-upload SHA-256 hash dedup — check across ALL screenshots for this viewer
    const dupeCheck = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM (
        SELECT screenshot_hash FROM cliptracker_v2_module_signoffs WHERE viewer_id = $1
        UNION ALL
        SELECT screenshot_hash FROM cliptracker_v2_academy_screenshots WHERE viewer_id = $1
      ) all_hashes WHERE screenshot_hash = $2`,
      CountSchema,
      [viewerId, screenshotHash],
      { label: "Check screenshot hash dedup" }
    );

    if (dupeCheck[0]?.count > 0) {
      throw new Error("This screenshot has already been uploaded. Please use a unique screenshot for each course.");
    }

    // Check if already uploaded for this course
    const existingCheck = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_academy_screenshots
       WHERE viewer_id = $1 AND course_key = $2`,
      CountSchema,
      [viewerId, courseKey],
      { label: "Check existing screenshot" }
    );

    if (existingCheck[0]?.count > 0) {
      return { success: true, alreadyUploaded: true };
    }

    // Insert screenshot
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_academy_screenshots
        (viewer_id, course_key, screenshot_data, screenshot_filename, screenshot_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (viewer_id, course_key) DO NOTHING`,
      [viewerId, courseKey, screenshotData, screenshotFilename, screenshotHash],
      { label: "Insert academy screenshot" }
    );

    ctx.log.info("Academy screenshot uploaded", { viewerId, courseKey });
    return { success: true, alreadyUploaded: false };
  },
});
