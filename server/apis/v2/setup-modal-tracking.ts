import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupModalTracking",
  description: "Creates the cliptracker_v2_modal_interactions table for tracking modal events",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_modal_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL,
        modal_type TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create modal_interactions table" }
    );

    await ctx.integrations.db.execute(
      `CREATE INDEX IF NOT EXISTS idx_modal_interactions_viewer
       ON cliptracker_v2_modal_interactions (viewer_id, created_at DESC)`,
      undefined,
      { label: "Index on viewer_id" }
    );

    await ctx.integrations.db.execute(
      `CREATE INDEX IF NOT EXISTS idx_modal_interactions_type
       ON cliptracker_v2_modal_interactions (modal_type, created_at DESC)`,
      undefined,
      { label: "Index on modal_type" }
    );

    return { success: true };
  },
});
