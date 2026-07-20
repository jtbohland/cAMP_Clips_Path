import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const InteractionRow = z.object({
  id: z.string(),
  viewer_id: z.string(),
  viewer_name: z.string(),
  modal_type: z.string(),
  action: z.string(),
  metadata: z.unknown().nullable(),
  created_at: z.string(),
});

const SummaryRow = z.object({
  modal_type: z.string(),
  action: z.string(),
  count: z.coerce.number(),
  unique_viewers: z.coerce.number(),
});

export default api({
  name: "GetModalInteractions",
  description: "Fetches modal interaction events for the analytics dashboard",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    interactions: z.array(InteractionRow),
    summary: z.array(SummaryRow),
  }),

  async run(ctx) {
    const interactions = await ctx.integrations.db.query(
      `SELECT mi.id, mi.viewer_id, v.name AS viewer_name,
              mi.modal_type, mi.action, mi.metadata, mi.created_at::text
       FROM cliptracker_v2_modal_interactions mi
       JOIN cliptracker_v2_viewers v ON v.id = mi.viewer_id
       ORDER BY mi.created_at DESC
       LIMIT 200`,
      InteractionRow,
      undefined,
      { label: "Get all modal interactions" }
    );

    const summary = await ctx.integrations.db.query(
      `SELECT modal_type, action,
              COUNT(*) AS count,
              COUNT(DISTINCT viewer_id) AS unique_viewers
       FROM cliptracker_v2_modal_interactions
       GROUP BY modal_type, action
       ORDER BY modal_type, action`,
      SummaryRow,
      undefined,
      { label: "Summarize modal interactions" }
    );

    return { interactions, summary };
  },
});
