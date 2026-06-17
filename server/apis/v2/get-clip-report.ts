import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const XpEventSchema = z.object({
  event_type: z.string(),
  xp_amount: z.coerce.number(),
});

const BadgeSchema = z.object({
  badge_id: z.string(),
  earned_at: z.string(),
});

export default api({
  name: "GetClipReport",
  description: "Fetches Ranger Report data for a completed clip (best session)",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    engagementScore: z.number().nullable(),
    engagementThreshold: z.number(),
    correctAnswers: z.number(),
    totalQuestions: z.number(),
    xpEvents: z.array(z.object({
      eventType: z.string(),
      xpAmount: z.number(),
    })),
    totalXpEarned: z.number(),
    badges: z.array(z.object({
      badgeId: z.string(),
      earnedAt: z.string(),
    })),
    clipTitle: z.string(),
    clipSortOrder: z.number(),
  }),

  async run(ctx, { clipId, viewerId }) {
    // Get the best completed session (highest engagement score)
    const sessions = await ctx.integrations.db.query(
      `SELECT id, engagement_score
       FROM cliptracker_v2_sessions
       WHERE clip_id = $1 AND viewer_id = $2 AND completed = true
       ORDER BY engagement_score DESC NULLS LAST
       LIMIT 1`,
      z.object({ id: z.string(), engagement_score: z.coerce.number().nullable() }),
      [clipId, viewerId],
      { label: "Get best session" }
    );

    const bestSession = sessions[0];
    const engagementScore = bestSession?.engagement_score ?? null;

    // Get Trail Marker results from the best session
    let correctAnswers = 0;
    let totalQuestions = 0;
    if (bestSession) {
      const trailMarkers = await ctx.integrations.db.query(
        `SELECT
           COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE is_correct = true)::int as correct
         FROM cliptracker_v2_responses
         WHERE session_id = $1`,
        z.object({ total: z.coerce.number(), correct: z.coerce.number() }),
        [bestSession.id],
        { label: "Get trail marker results from best session" }
      );
      correctAnswers = trailMarkers[0]?.correct ?? 0;
      totalQuestions = trailMarkers[0]?.total ?? 0;
    }

    // Get XP events for this clip
    const xpEvents = await ctx.integrations.db.query(
      `SELECT event_type, xp_amount
       FROM cliptracker_v2_xp_events
       WHERE clip_id = $1 AND viewer_id = $2
       ORDER BY created_at`,
      XpEventSchema,
      [clipId, viewerId],
      { label: "Get XP events for clip" }
    );

    // Get badges earned on this clip
    const badges = await ctx.integrations.db.query(
      `SELECT badge_id, earned_at::text
       FROM cliptracker_v2_badges
       WHERE clip_id = $1 AND viewer_id = $2
       ORDER BY earned_at`,
      BadgeSchema,
      [clipId, viewerId],
      { label: "Get badges for clip" }
    );

    // Get clip title and sort_order
    const clipInfo = await ctx.integrations.db.query(
      `SELECT title, sort_order FROM cliptracker_v2_clips WHERE id = $1`,
      z.object({ title: z.string(), sort_order: z.coerce.number() }),
      [clipId],
      { label: "Get clip info" }
    );

    const clip = clipInfo[0] ?? { title: "Unknown Clip", sort_order: 0 };

    const totalXpEarned = xpEvents.reduce((sum, e) => sum + e.xp_amount, 0);

    return {
      engagementScore: engagementScore,
      engagementThreshold: 80,
      correctAnswers,
      totalQuestions,
      xpEvents: xpEvents.map(e => ({
        eventType: e.event_type,
        xpAmount: e.xp_amount,
      })),
      totalXpEarned,
      badges: badges.map(b => ({
        badgeId: b.badge_id,
        earnedAt: b.earned_at,
      })),
      clipTitle: clip.title,
      clipSortOrder: clip.sort_order,
    };
  },
});
