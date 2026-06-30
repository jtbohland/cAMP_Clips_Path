import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CHECKIN_TYPES = ["approach", "week2", "week3", "summit"] as const;

export default api({
  name: "MarkCheckinSent",
  description: "Records a check-in email as sent and updates viewer timestamp",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    checkinType: z.enum(CHECKIN_TYPES),
    managerEmail: z.string().nullable(),
    belayBuddyEmail: z.string().nullable(),
    feedbackToken: z.string().min(1),
    learnerReflection: z.string().nullable(),
  }),

  output: z.object({
    success: z.boolean(),
    alreadySent: z.boolean(),
  }),

  async run(ctx, { viewerId, checkinType, managerEmail, belayBuddyEmail, feedbackToken, learnerReflection }) {
    const CountSchema = z.object({ count: z.coerce.number() });

    // Check if already sent
    const existing = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_checkin_emails
       WHERE viewer_id = $1 AND checkin_type = $2`,
      CountSchema,
      [viewerId, checkinType],
      { label: "Check if checkin already sent" }
    );

    if (existing[0].count > 0) {
      return { success: true, alreadySent: true };
    }

    // Insert checkin email record
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_checkin_emails
        (viewer_id, checkin_type, manager_email, belay_buddy_email, feedback_token, learner_reflection)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (viewer_id, checkin_type) DO NOTHING`,
      [viewerId, checkinType, managerEmail, belayBuddyEmail, feedbackToken, learnerReflection],
      { label: "Insert checkin email record" }
    );

    // Update the viewer timestamp for the relevant checkin type
    const columnMap: Record<string, string> = {
      approach: "approach_checkin_sent_at",
      week2: "week2_checkin_sent_at",
      week3: "week3_checkin_sent_at",
    };

    const column = columnMap[checkinType];
    if (column) {
      await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_viewers SET ${column} = NOW() WHERE id = $1`,
        [viewerId],
        { label: `Set ${column} timestamp` }
      );
    }

    ctx.log.info("Check-in email marked as sent", { viewerId, checkinType });
    return { success: true, alreadySent: false };
  },
});
