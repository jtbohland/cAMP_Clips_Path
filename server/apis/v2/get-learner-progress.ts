import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TIERS = [
  { tier: 1, name: "Base Camper", emoji: "🏕️", xpMin: 0, xpMax: 149 },
  { tier: 2, name: "Trailblazer", emoji: "🥾", xpMin: 150, xpMax: 324 },
  { tier: 3, name: "Summit Seeker", emoji: "🧗🏼", xpMin: 325, xpMax: 499 },
  { tier: 4, name: "Pinnacle Achiever", emoji: "✨🏔️✨", xpMin: 500, xpMax: null },
];

const BadgeSchema = z.object({
  badgeId: z.string(),
  clipId: z.string().nullable(),
  earnedAt: z.string(),
});

export default api({
  name: "GetLearnerProgress",
  description: "Gets a learner's total XP, tier, and earned badges",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    totalXp: z.number(),
    xpBreakdown: z.object({
      base: z.number(),
      milestones: z.number(),
      bonuses: z.number(),
    }),
    tier: z.object({
      tier: z.number(),
      name: z.string(),
      emoji: z.string(),
      xpMin: z.number(),
      xpMax: z.number().nullable(),
    }),
    nextTier: z.object({
      tier: z.number(),
      name: z.string(),
      emoji: z.string(),
      xpMin: z.number(),
      xpMax: z.number().nullable(),
    }).nullable(),
    progressPercent: z.number(),
    badges: z.array(BadgeSchema),
    clipsCompleted: z.number(),
    ascentDay1: z.string().nullable(),
    managerName: z.string().nullable(),
    leaderboardRank: z.number(),
    approachCheckinSentAt: z.string().nullable(),
    week2CheckinSentAt: z.string().nullable(),
    week3CheckinSentAt: z.string().nullable(),
  }),

  async run(ctx, { viewerId }) {
    // Get total XP + breakdown by category
    const XpBreakdownSchema = z.object({
      event_type: z.string(),
      type_xp: z.coerce.number(),
    });
    const xpRows = await ctx.integrations.db.query(
      `SELECT event_type, COALESCE(SUM(xp_amount), 0)::int as type_xp
       FROM cliptracker_v2_xp_events
       WHERE viewer_id = $1
       GROUP BY event_type`,
      XpBreakdownSchema,
      [viewerId],
      { label: "Get XP breakdown by category" }
    );
    const xpByType: Record<string, number> = {};
    for (const row of xpRows) {
      xpByType[row.event_type] = row.type_xp;
    }
    const totalXp = Object.values(xpByType).reduce((sum, v) => sum + v, 0);
    const xpBreakdown = {
      base: xpByType.base ?? 0,
      milestones: xpByType.milestone ?? 0,
      bonuses: (xpByType.performance ?? 0) + (xpByType.streak ?? 0) + (xpByType.pace ?? 0),
    };

    // Get badges
    const BadgeRowSchema = z.object({
      badge_id: z.string(),
      clip_id: z.string().nullable(),
      earned_at: z.string(),
    });
    const badgeRows = await ctx.integrations.db.query(
      `SELECT badge_id, clip_id::text, earned_at::text 
       FROM cliptracker_v2_badges 
       WHERE viewer_id = $1 
       ORDER BY earned_at`,
      BadgeRowSchema,
      [viewerId],
      { label: "Get earned badges" }
    );

    // Get clips completed count
    const CompletedSchema = z.object({ count: z.coerce.number() });
    const completedResult = await ctx.integrations.db.query(
      `SELECT COUNT(DISTINCT clip_id)::int as count
       FROM cliptracker_v2_sessions
       WHERE viewer_id = $1 AND completed = true`,
      CompletedSchema,
      [viewerId],
      { label: "Count completed clips" }
    );
    const clipsCompleted = completedResult[0]?.count ?? 0;

    // Get ascent_day_1
    const ViewerDateSchema = z.object({
      ascent_day_1: z.string().nullable(),
      manager_name: z.string().nullable(),
      approach_checkin_sent_at: z.string().nullable(),
      week2_checkin_sent_at: z.string().nullable(),
      week3_checkin_sent_at: z.string().nullable(),
    });
    const viewerDate = await ctx.integrations.db.query(
      `SELECT ascent_day_1::text, manager_name,
              approach_checkin_sent_at::text, week2_checkin_sent_at::text, week3_checkin_sent_at::text
       FROM cliptracker_v2_viewers WHERE id = $1`,
      ViewerDateSchema,
      [viewerId],
      { label: "Get ascent day 1 + checkin timestamps" }
    );

    // Leaderboard rank — count non-admin viewers with higher XP + 1
    const RankSchema = z.object({ rank: z.coerce.number() });
    const rankResult = await ctx.integrations.db.query(
      `SELECT COUNT(*) + 1 AS rank
       FROM cliptracker_v2_viewers v
       WHERE COALESCE(v.is_admin, false) = false
         AND COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v.id), 0) > $1`,
      RankSchema,
      [totalXp],
      { label: "Get leaderboard rank" }
    );
    const leaderboardRank = rankResult[0]?.rank ?? 1;

    // Determine tier
    const currentTier = TIERS.reduce((acc, t) => {
      if (totalXp >= t.xpMin) return t;
      return acc;
    }, TIERS[0]);

    const currentIdx = TIERS.findIndex(t => t.tier === currentTier.tier);
    const nextTier = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;

    // Calculate progress within current tier
    let progressPercent = 100;
    if (nextTier) {
      const tierRange = nextTier.xpMin - currentTier.xpMin;
      const tierProgress = totalXp - currentTier.xpMin;
      progressPercent = Math.min(Math.round((tierProgress / tierRange) * 100), 100);
    }

    return {
      totalXp,
      xpBreakdown,
      tier: currentTier,
      nextTier,
      progressPercent,
      badges: badgeRows.map(b => ({
        badgeId: b.badge_id,
        clipId: b.clip_id,
        earnedAt: b.earned_at,
      })),
      clipsCompleted,
      ascentDay1: viewerDate[0]?.ascent_day_1 ?? null,
      managerName: viewerDate[0]?.manager_name ?? null,
      leaderboardRank,
      approachCheckinSentAt: viewerDate[0]?.approach_checkin_sent_at ?? null,
      week2CheckinSentAt: viewerDate[0]?.week2_checkin_sent_at ?? null,
      week3CheckinSentAt: viewerDate[0]?.week3_checkin_sent_at ?? null,
    };
  },
});
