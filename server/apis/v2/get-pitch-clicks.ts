import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const PitchClickRow = z.object({
  viewer_name: z.string(),
  viewer_email: z.string(),
  pitch_name: z.string(),
  clicked_at: z.string(),
});

export default api({
  name: "GetPitchClicks",
  description: "Fetches elevator pitch click data for analytics",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    clicks: z.array(z.object({
      viewerName: z.string(),
      viewerEmail: z.string(),
      pitchName: z.string(),
      clickedAt: z.string(),
    })),
    summary: z.array(z.object({
      pitchName: z.string(),
      clickCount: z.number(),
      uniqueViewers: z.number(),
    })),
  }),

  async run(ctx) {
    // Individual clicks
    const clicks = await ctx.integrations.db.query(
      `SELECT v.name AS viewer_name, v.email AS viewer_email,
              pc.pitch_name, pc.clicked_at::text
       FROM cliptracker_v2_pitch_clicks pc
       JOIN cliptracker_v2_viewers v ON v.id = pc.viewer_id
       ORDER BY pc.clicked_at DESC
       LIMIT 200`,
      PitchClickRow,
      undefined,
      { label: "Fetch pitch clicks" }
    );

    // Summary per pitch
    const SummaryRow = z.object({
      pitch_name: z.string(),
      click_count: z.coerce.number(),
      unique_viewers: z.coerce.number(),
    });

    const summaryRows = await ctx.integrations.db.query(
      `SELECT pitch_name,
              COUNT(*)::int AS click_count,
              COUNT(DISTINCT viewer_id)::int AS unique_viewers
       FROM cliptracker_v2_pitch_clicks
       GROUP BY pitch_name
       ORDER BY click_count DESC`,
      SummaryRow,
      undefined,
      { label: "Pitch click summary" }
    );

    return {
      clicks: clicks.map(c => ({
        viewerName: c.viewer_name,
        viewerEmail: c.viewer_email,
        pitchName: c.pitch_name,
        clickedAt: c.clicked_at,
      })),
      summary: summaryRows.map(s => ({
        pitchName: s.pitch_name,
        clickCount: s.click_count,
        uniqueViewers: s.unique_viewers,
      })),
    };
  },
});
