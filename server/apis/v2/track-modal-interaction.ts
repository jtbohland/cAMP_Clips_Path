import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "TrackModalInteraction",
  description: "Records a modal interaction event (shown, dismissed, action taken)",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
    modalType: z.string(),
    action: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { viewerId, modalType, action, metadata }) {
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_modal_interactions (viewer_id, modal_type, action, metadata)
       VALUES ($1, $2, $3, $4)`,
      [viewerId, modalType, action, JSON.stringify(metadata ?? {})],
      { label: `Track modal: ${modalType} / ${action}` }
    );

    return { success: true };
  },
});
