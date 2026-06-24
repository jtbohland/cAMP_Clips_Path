import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreatePitchClicksTable",
  description: "Creates cliptracker_v2_pitch_clicks table for tracking elevator pitch engagement",

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
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_pitch_clicks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        pitch_name TEXT NOT NULL,
        clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create pitch_clicks table" }
    );

    // Index for analytics queries
    await ctx.integrations.db.execute(
      `CREATE INDEX IF NOT EXISTS idx_pitch_clicks_viewer
       ON cliptracker_v2_pitch_clicks(viewer_id)`,
      undefined,
      { label: "Create viewer index on pitch_clicks" }
    );

    ctx.log.info("cliptracker_v2_pitch_clicks table created");
    return { success: true, message: "Table created successfully" };
  },
});
