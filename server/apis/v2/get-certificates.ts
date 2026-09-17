import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Derives which certificates a learner has earned based on existing progress data.
 * No new tracking table — we read from viewers, sessions, checkin_emails, and signoffs.
 */

const CertRow = z.object({
  key: z.string(),
  earned: z.boolean(),
  earnedAt: z.string().nullable(),
});

export default api({
  name: "GetCertificates",
  description: "Derives earned certificates from existing learner progress data.",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
  }),

  output: z.object({
    certificates: z.array(CertRow),
    viewerName: z.string(),
    viewerRole: z.string(),
    tierName: z.string(),
    tierEmoji: z.string(),
  }),

  async run(ctx, { viewerId }) {
    // 1. Get viewer info + tier
    const ViewerRow = z.object({
      name: z.string(),
      role: z.string(),
      week1_unlocked_at: z.string().nullable(),
    });
    const [viewer] = await ctx.integrations.apps_db.query(
      `SELECT name, role, week1_unlocked_at::text FROM cliptracker_v2_viewers WHERE id = $1`,
      ViewerRow,
      [viewerId],
      { label: "Get viewer info" }
    );
    if (!viewer) return { certificates: [], viewerName: "", viewerRole: "", tierName: "", tierEmoji: "" };

    // 2. Get current XP + tier
    const XpRow = z.object({ total_xp: z.coerce.number() });
    const [xpResult] = await ctx.integrations.apps_db.query(
      `SELECT COALESCE(SUM(xp_amount), 0) AS total_xp FROM cliptracker_v2_xp_events WHERE viewer_id = $1`,
      XpRow,
      [viewerId],
      { label: "Get total XP for tier" }
    );
    const totalXp = xpResult?.total_xp ?? 0;

    // Tier thresholds (must match lib/tiers)
    const tiers = [
      { name: "Base Camper", emoji: "🏕️", min: 0 },
      { name: "Day Hiker", emoji: "🥾", min: 50 },
      { name: "Trailblazer", emoji: "🔥", min: 150 },
      { name: "Ridge Runner", emoji: "🏔️", min: 300 },
      { name: "Pinnacle Achiever", emoji: "🏆", min: 500 },
    ];
    let currentTier = tiers[0];
    for (const t of tiers) {
      if (totalXp >= t.min) currentTier = t;
    }

    // 3. Check approach completion (week1_unlocked_at set = approach done)
    const approachEarned = !!viewer.week1_unlocked_at;
    const approachDate = viewer.week1_unlocked_at;

    // 4. Check weekly anchor points sent (week 2, 3, 4 checkins)
    const CheckinRow = z.object({
      checkin_type: z.string(),
      sent_at: z.string(),
    });
    const checkins = await ctx.integrations.apps_db.query(
      `SELECT checkin_type, sent_at::text FROM cliptracker_v2_checkin_emails
       WHERE viewer_id = $1 AND checkin_type IN ('week2', 'week3', 'week4', 'summit')
       ORDER BY sent_at`,
      CheckinRow,
      [viewerId],
      { label: "Get anchor point checkins" }
    );
    const checkinMap = new Map(checkins.map(c => [c.checkin_type, c.sent_at]));

    // 5. Check summit (summit email sent OR confirmed completer logic)
    const summitEarned = !!checkinMap.get("summit");
    const summitDate = checkinMap.get("summit") ?? null;

    // Build certificates array
    const certificates: Array<{ key: string; earned: boolean; earnedAt: string | null }> = [
      { key: "approach", earned: approachEarned, earnedAt: approachDate },
      { key: "week2", earned: !!checkinMap.get("week2"), earnedAt: checkinMap.get("week2") ?? null },
      { key: "week3", earned: !!checkinMap.get("week3"), earnedAt: checkinMap.get("week3") ?? null },
    ];

    // Week 4 only for AE/SDR paths (not Promo)
    const isPromo = viewer.role === "SDR>Velocity Promo" || viewer.role === "Velocity Promo";
    if (!isPromo) {
      certificates.push({
        key: "week4",
        earned: !!checkinMap.get("week4"),
        earnedAt: checkinMap.get("week4") ?? null,
      });
    }

    certificates.push({ key: "summit", earned: summitEarned, earnedAt: summitDate });

    return {
      certificates,
      viewerName: viewer.name,
      viewerRole: viewer.role,
      tierName: currentTier.name,
      tierEmoji: currentTier.emoji,
    };
  },
});
