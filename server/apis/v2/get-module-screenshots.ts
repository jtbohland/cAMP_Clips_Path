import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ScreenshotMetaRow = z.object({
  id: z.string(),
  viewer_id: z.string(),
  viewer_name: z.string(),
  source: z.string(),
  item_key: z.string(),
  filename: z.string().nullable(),
  uploaded_at: z.string(),
});

export default api({
  name: "GetModuleScreenshots",
  description: "Fetches academy and module signoff screenshot metadata (no base64 data) for analytics listing.",

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
      uploadedAt: z.string(),
    })),
  }),

  async run(ctx) {
    // Fetch academy screenshot metadata (no screenshot_data)
    const academyRows = await ctx.integrations.db.query(
      `SELECT
        acs.id,
        acs.viewer_id,
        v.name AS viewer_name,
        'academy' AS source,
        acs.course_key AS item_key,
        acs.screenshot_filename AS filename,
        acs.uploaded_at::text
      FROM cliptracker_v2_academy_screenshots acs
      JOIN cliptracker_v2_viewers v ON v.id = acs.viewer_id
      ORDER BY v.name, acs.uploaded_at
      LIMIT 200`,
      ScreenshotMetaRow,
      [],
      { label: "Fetch academy screenshot metadata" },
    );

    // Fetch module signoff screenshot metadata (exclude placeholder entries)
    const moduleRows = await ctx.integrations.db.query(
      `SELECT
        ms.id,
        ms.viewer_id,
        v.name AS viewer_name,
        'module' AS source,
        ms.module_key AS item_key,
        ms.screenshot_filename AS filename,
        ms.completed_at::text AS uploaded_at
      FROM cliptracker_v2_module_signoffs ms
      JOIN cliptracker_v2_viewers v ON v.id = ms.viewer_id
      WHERE ms.screenshot_data IS NOT NULL
        AND ms.screenshot_data != 'academy_screenshots_complete'
        AND LENGTH(ms.screenshot_data) > 100
      ORDER BY v.name, ms.completed_at
      LIMIT 200`,
      ScreenshotMetaRow,
      [],
      { label: "Fetch module signoff screenshot metadata" },
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
        uploadedAt: r.uploaded_at,
      })),
    };
  },
});
