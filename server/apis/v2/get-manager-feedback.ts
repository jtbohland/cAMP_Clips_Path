import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const FeedbackRow = z.object({
  id: z.string(),
  viewer_name: z.string(),
  checkin_type: z.string(),
  manager_email: z.string().nullable(),
  response: z.string(),
  comment: z.string().nullable(),
  submitted_at: z.string(),
});

export default api({
  name: "GetManagerFeedback",
  description: "Fetches all manager feedback entries for analytics admin view",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    feedback: z.array(z.object({
      id: z.string(),
      viewerName: z.string(),
      checkinType: z.string(),
      managerEmail: z.string().nullable(),
      response: z.string(),
      comment: z.string().nullable(),
      submittedAt: z.string(),
    })),
  }),

  async run(ctx) {
    const rows = await ctx.integrations.db.query(
      `SELECT
        mf.id,
        v.name AS viewer_name,
        mf.checkin_type,
        mf.manager_email,
        mf.response,
        mf.comment,
        mf.submitted_at::text
       FROM cliptracker_v2_manager_feedback mf
       JOIN cliptracker_v2_viewers v ON v.id = mf.viewer_id
       ORDER BY mf.submitted_at DESC
       LIMIT 200`,
      FeedbackRow,
      [],
      { label: "Get all manager feedback" }
    );

    return {
      feedback: rows.map((r) => ({
        id: r.id,
        viewerName: r.viewer_name,
        checkinType: r.checkin_type,
        managerEmail: r.manager_email,
        response: r.response,
        comment: r.comment,
        submittedAt: r.submitted_at,
      })),
    };
  },
});
