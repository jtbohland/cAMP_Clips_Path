import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ViewerCheckinRow = z.object({
  approach_checkin_sent_at: z.string().nullable(),
  week2_checkin_sent_at: z.string().nullable(),
  week3_checkin_sent_at: z.string().nullable(),
  first_achievement_shown: z.coerce.boolean(),
});

const CheckinEmailRow = z.object({
  checkin_type: z.string(),
  manager_email: z.string().nullable(),
  belay_buddy_email: z.string().nullable(),
  sent_at: z.string(),
});

export default api({
  name: "GetCheckinStatus",
  description: "Fetches check-in email status and first achievement flag for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    approachCheckinSentAt: z.string().nullable(),
    week2CheckinSentAt: z.string().nullable(),
    week3CheckinSentAt: z.string().nullable(),
    firstAchievementShown: z.boolean(),
    checkinEmails: z.array(z.object({
      checkinType: z.string(),
      managerEmail: z.string().nullable(),
      belayBuddyEmail: z.string().nullable(),
      sentAt: z.string(),
    })),
  }),

  async run(ctx, { viewerId }) {
    // Get viewer-level timestamps
    const viewerRows = await ctx.integrations.db.query(
      `SELECT
        approach_checkin_sent_at::text,
        week2_checkin_sent_at::text,
        week3_checkin_sent_at::text,
        COALESCE(first_achievement_shown, false) AS first_achievement_shown
       FROM cliptracker_v2_viewers
       WHERE id = $1`,
      ViewerCheckinRow,
      [viewerId],
      { label: "Get viewer checkin timestamps" }
    );

    if (viewerRows.length === 0) {
      return {
        approachCheckinSentAt: null,
        week2CheckinSentAt: null,
        week3CheckinSentAt: null,
        firstAchievementShown: false,
        checkinEmails: [],
      };
    }

    const viewer = viewerRows[0];

    // Get detailed checkin email records
    const emails = await ctx.integrations.db.query(
      `SELECT checkin_type, manager_email, belay_buddy_email, sent_at::text
       FROM cliptracker_v2_checkin_emails
       WHERE viewer_id = $1
       ORDER BY sent_at ASC`,
      CheckinEmailRow,
      [viewerId],
      { label: "Get checkin email records" }
    );

    return {
      approachCheckinSentAt: viewer.approach_checkin_sent_at,
      week2CheckinSentAt: viewer.week2_checkin_sent_at,
      week3CheckinSentAt: viewer.week3_checkin_sent_at,
      firstAchievementShown: viewer.first_achievement_shown,
      checkinEmails: emails.map((e) => ({
        checkinType: e.checkin_type,
        managerEmail: e.manager_email,
        belayBuddyEmail: e.belay_buddy_email,
        sentAt: e.sent_at,
      })),
    };
  },
});
