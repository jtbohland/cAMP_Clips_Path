import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateClipResources",
  description: "Updates the resources JSONB array for a specific clip",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
    resources: z.array(
      z.object({
        label: z.string(),
        url: z.string(),
        type: z.string(),
        note: z.string().optional(),
      })
    ),
  }),

  output: z.object({
    updated: z.boolean(),
  }),

  async run(ctx, { clipId, resources }) {
    const result = await ctx.integrations.apps_db.execute(
      "UPDATE cliptracker_v2_clips SET resources = $1::jsonb, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(resources), clipId],
      { label: `Update resources for clip ${clipId}` }
    );

    return { updated: (result.rowCount ?? 0) > 0 };
  },
});
