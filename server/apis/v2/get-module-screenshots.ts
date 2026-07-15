import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ScreenshotRow = z.object({
  id: z.string(),
  viewer_id: z.string(),
  viewer_name: z.string(),
  source: z.string(),
  item_key: z.string(),
  filename: z.string().nullable(),
  screenshot_data: z.string(),
  uploaded_at: z.string(),
});

export default api({
  name: "GetModuleScreenshots",
  description: "Fetches academy and module signoff screenshots for analytics.",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    screenshots: z.array(z.object({
      id: z.string(),
      viewerId: z.string(),
      viewerName: z.string(),
      source: z.string(),
      itemKey: z.string(),
      filename: z.string().nullable(),
      screenshotData: z.string(),
      uploadedAt: z.string(),
    })),
  }),

  async run(ctx) {
    // Fetch academy screenshots
    const academyRows = await ctx.integrations.db.query(
      `SELECT
        acs.id,
        acs.viewer_id,
        v.name AS viewer_name,
        'academy' AS source,
        acs.course_key AS item_key,
        acs.screenshot_filename AS filename,
        acs.screenshot_data,
        acs.uploaded_at::text
      FROM cliptracker_v2_academy_screenshots acs
      JOIN cliptracker_v2_viewers v ON v.id = acs.viewer_id
      ORDER BY v.name, acs.uploaded_at
      LIMIT 100`,
      ScreenshotRow,
      [],
      { label: "Fetch academy screenshots" },
    );

    // Fetch module signoff screenshots (exclude placeholder entries)
    const moduleRows = await ctx.integrations.db.query(
      `SELECT
        ms.id,
        ms.viewer_id,
        v.name AS viewer_name,
        'module' AS source,
        ms.module_key AS item_key,
        ms.screenshot_filename AS filename,
        ms.screenshot_data,
        ms.completed_at::text AS uploaded_at
      FROM cliptracker_v2_module_signoffs ms
      JOIN cliptracker_v2_viewers v ON v.id = ms.viewer_id
      WHERE ms.screenshot_data IS NOT NULL
        AND ms.screenshot_data != 'academy_screenshots_complete'
        AND LENGTH(ms.screenshot_data) > 100
      ORDER BY v.name, ms.completed_at
      LIMIT 100`,
      ScreenshotRow,
      [],
      { label: "Fetch module signoff screenshots" },
    );

    const all = [...academyRows, ...moduleRows];

    return {
      screenshots: all.map((r) => ({
        id: r.id,
        viewerId: r.viewer_id,
        viewerName: r.viewer_name,
        source: r.source,
        itemKey: r.item_key,
        filename: r.filename,
        screenshotData: r.screenshot_data,
        uploadedAt: r.uploaded_at,
      })),
    };
  },
});
