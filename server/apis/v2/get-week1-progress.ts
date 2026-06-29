import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ModuleSignoffRow = z.object({
  module_key: z.string(),
  reflection_response: z.string(),
  signature: z.string(),
  completed_at: z.string(),
});

const AcademyScreenshotRow = z.object({
  course_key: z.string(),
  screenshot_filename: z.string(),
  uploaded_at: z.string(),
});

const WdVerificationRow = z.object({
  product: z.string(),
  scenario: z.string(),
  score: z.coerce.number(),
  completed_at: z.string(),
});

const ViewerWeek1Row = z.object({
  week1_unlocked_at: z.string().nullable(),
  week1_unlock_type: z.string().nullable(),
  clips_completed: z.coerce.number(),
});

export default api({
  name: "GetWeek1Progress",
  description: "Fetches a viewer's Week 1 (The Approach) progress across all modules",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    moduleSignoffs: z.array(z.object({
      moduleKey: z.string(),
      reflectionResponse: z.string(),
      signature: z.string(),
      completedAt: z.string(),
    })),
    academyScreenshots: z.array(z.object({
      courseKey: z.string(),
      screenshotFilename: z.string(),
      uploadedAt: z.string(),
    })),
    wdVerification: z.object({
      product: z.string(),
      scenario: z.string(),
      score: z.number(),
      completedAt: z.string(),
    }).nullable(),
    week1UnlockedAt: z.string().nullable(),
    week1UnlockType: z.string().nullable(),
    isLegacyLearner: z.boolean(),
  }),

  async run(ctx, { viewerId }) {
    // Get viewer's Week 1 status + whether they're a legacy learner
    const viewerRows = await ctx.integrations.db.query(
      `SELECT
        week1_unlocked_at::text,
        week1_unlock_type,
        (SELECT COUNT(*)::int FROM cliptracker_v2_sessions
         WHERE viewer_id = $1 AND completed = true) AS clips_completed
       FROM cliptracker_v2_viewers
       WHERE id = $1`,
      ViewerWeek1Row,
      [viewerId],
      { label: "Get viewer Week 1 status" }
    );

    const viewer = viewerRows[0];
    // Legacy learner = has completed clips but no week1_unlock_type set
    const isLegacyLearner = viewer
      ? viewer.clips_completed > 0 && viewer.week1_unlock_type === null
      : false;

    // Get module sign-offs
    const signoffs = await ctx.integrations.db.query(
      `SELECT module_key, reflection_response, signature, completed_at::text
       FROM cliptracker_v2_module_signoffs
       WHERE viewer_id = $1
       ORDER BY completed_at ASC`,
      ModuleSignoffRow,
      [viewerId],
      { label: "Get module sign-offs" }
    );

    // Get academy screenshots
    const screenshots = await ctx.integrations.db.query(
      `SELECT course_key, screenshot_filename, uploaded_at::text
       FROM cliptracker_v2_academy_screenshots
       WHERE viewer_id = $1
       ORDER BY uploaded_at ASC`,
      AcademyScreenshotRow,
      [viewerId],
      { label: "Get academy screenshots" }
    );

    // Get W&D verification
    const wdRows = await ctx.integrations.db.query(
      `SELECT product, scenario, score, completed_at::text
       FROM cliptracker_v2_wd_verifications
       WHERE viewer_id = $1
       LIMIT 1`,
      WdVerificationRow,
      [viewerId],
      { label: "Get W&D verification" }
    );

    return {
      moduleSignoffs: signoffs.map((s) => ({
        moduleKey: s.module_key,
        reflectionResponse: s.reflection_response,
        signature: s.signature,
        completedAt: s.completed_at,
      })),
      academyScreenshots: screenshots.map((s) => ({
        courseKey: s.course_key,
        screenshotFilename: s.screenshot_filename,
        uploadedAt: s.uploaded_at,
      })),
      wdVerification: wdRows.length > 0
        ? {
            product: wdRows[0].product,
            scenario: wdRows[0].scenario,
            score: wdRows[0].score,
            completedAt: wdRows[0].completed_at,
          }
        : null,
      week1UnlockedAt: viewer?.week1_unlocked_at ?? null,
      week1UnlockType: viewer?.week1_unlock_type ?? null,
      isLegacyLearner,
    };
  },
});
