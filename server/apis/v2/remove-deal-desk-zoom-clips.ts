import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "RemoveDealDeskZoomClips",
  description: "Migration: removes bonus Zoom clips from Deal Desk resources",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    removedCount: z.number(),
  }),

  async run(ctx) {
    // Remove elements from the resources JSONB array where type = 'zoom'
    // and label matches the two bonus clips
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_clips
       SET resources = (
         SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
         FROM jsonb_array_elements(resources) AS elem
         WHERE NOT (
           elem->>'type' = 'zoom'
           AND (
             elem->>'label' LIKE '%How to Create a Support Case%'
             OR elem->>'label' LIKE '%Sales Stage 6.5%'
           )
         )
       )
       WHERE sort_order = 17`,
      undefined,
      { label: "Remove bonus Zoom clips from Deal Desk resources" }
    );

    ctx.log.info("Removed bonus Zoom clips from Deal Desk (sort_order 17) resources");
    return { success: true, removedCount: 2 };
  },
});
