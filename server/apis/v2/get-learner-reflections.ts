import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CheckinReflectionSchema = z.object({
  viewerName: z.string(),
  viewerEmail: z.string(),
  checkinType: z.string(),
  learnerReflection: z.string().nullable(),
  sentAt: z.string(),
});

export default api({
  name: "GetLearnerReflections",
  description: "Fetches learner reflections from check-in emails for analytics",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    reflections: z.array(CheckinReflectionSchema),
  }),

  async run(ctx) {
    // Check if learner_reflection column exists yet (added via SetupCheckinColumn)
    const ColCheckSchema = z.object({ col_exists: z.boolean() });
    const [{ col_exists: hasReflectionCol }] = await ctx.integrations.db.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'cliptracker_v2_checkin_emails'
           AND column_name = 'learner_reflection'
       ) AS col_exists`,
      ColCheckSchema,
      undefined,
      { label: "Check if learner_reflection column exists" }
    );

    const RowSchema = z.object({
      viewer_name: z.string(),
      viewer_email: z.string(),
      checkin_type: z.string(),
      learner_reflection: z.string().nullable(),
      sent_at: z.string(),
    });

    const reflectionSelect = hasReflectionCol ? "ce.learner_reflection" : "NULL AS learner_reflection";

    const rows = await ctx.integrations.db.query(
      `SELECT v.name AS viewer_name, v.email AS viewer_email,
              ce.checkin_type, ${reflectionSelect}, ce.sent_at::text
       FROM cliptracker_v2_checkin_emails ce
       JOIN cliptracker_v2_viewers v ON v.id = ce.viewer_id
       WHERE COALESCE(v.is_admin, false) = false
       ORDER BY ce.sent_at DESC
       LIMIT 200`,
      RowSchema,
      undefined,
      { label: "Get check-in email reflections" }
    );

    return {
      reflections: rows.map(r => ({
        viewerName: r.viewer_name,
        viewerEmail: r.viewer_email,
        checkinType: r.checkin_type,
        learnerReflection: r.learner_reflection,
        sentAt: r.sent_at,
      })),
    };
  },
});
