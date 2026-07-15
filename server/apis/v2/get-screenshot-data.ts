import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const DataRow = z.object({
  screenshot_data: z.string(),
});

export default api({
  name: "GetScreenshotData",
  description: "Fetches a single screenshot's base64 data by ID and source table.",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    id: z.string(),
    source: z.enum(["academy", "module"]),
  }),

  output: z.object({
    screenshotData: z.string(),
  }),

  async run(ctx, { id, source }) {
    let rows: { screenshot_data: string }[];

    if (source === "academy") {
      rows = await ctx.integrations.db.query(
        `SELECT screenshot_data FROM cliptracker_v2_academy_screenshots WHERE id = $1 LIMIT 1`,
        DataRow,
        [id],
        { label: "Fetch academy screenshot data" },
      );
    } else {
      rows = await ctx.integrations.db.query(
        `SELECT screenshot_data FROM cliptracker_v2_module_signoffs WHERE id = $1 LIMIT 1`,
        DataRow,
        [id],
        { label: "Fetch module signoff screenshot data" },
      );
    }

    if (rows.length === 0) {
      throw new Error(`Screenshot not found: ${id}`);
    }

    return { screenshotData: rows[0].screenshot_data };
  },
});
