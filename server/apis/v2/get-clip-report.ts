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

const IncorrectQuestionSchema = z.object({
  question_id: z.string(),
  question_text: z.string(),
  trigger_at_seconds: z.coerce.number(),
  is_recovery: z.boolean(),
});

export default api({
  name: "GetClipReport",
  description: "Fetches Ranger Report data for a completed clip with S&R and Back Track details",

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
    // Trail Marker scores (primary questions only)
    trailMarkerCorrect: z.number(),
    trailMarkerTotal: z.number(),
    // S&R scores (recovery questions only)
    searchRescueCorrect: z.number(),
    searchRescueTotal: z.number(),
    // Flags
    searchRescueTriggered: z.boolean(),
    weatherStormTriggered: z.boolean(),
    // Backward compat (total correct/total across all question types)
    correctAnswers: z.number(),
    totalQuestions: z.number(),
    // Incorrect questions for Back Track section
    incorrectQuestions: z.array(z.object({
      questionId: z.string(),
      questionText: z.string(),
      triggerAtSeconds: z.number(),
      isRecovery: z.boolean(),
    })),
    // XP
    xpEvents: z.array(z.object({
      eventType: z.string(),
      xpAmount: z.number(),
    })),
    totalXpEarned: z.number(),
    // Badges
    badges: z.array(z.object({
      badgeId: z.string(),
      earnedAt: z.string(),
    })),
    // Clip info
    clipTitle: z.string(),
    clipSortOrder: z.number(),
    videoUrl: z.string(),
  }),

  async run(ctx, { clipId, viewerId }) {
    // Get the best completed session (highest engagement score)
    const sessions = await ctx.integrations.db.query(
      `SELECT id, engagement_score, is_recovery_attempt, attempt_number
       FROM cliptracker_v2_sessions
       WHERE clip_id = $1 AND viewer_id = $2 AND completed = true
       ORDER BY engagement_score DESC NULLS LAST
       LIMIT 1`,
      z.object({
        id: z.string(),
        engagement_score: z.coerce.number().nullable(),
        is_recovery_attempt: z.boolean(),
        attempt_number: z.coerce.number(),
      }),
      [clipId, viewerId],
      { label: "Get best completed session" }
    );

    const bestSession = sessions[0];
    const engagementScore = bestSession?.engagement_score ?? null;

    // Check if S&R was ever triggered for this clip
    // (a recovery attempt exists, even if not the best session)
    const recoveryCheck = await ctx.integrations.db.query(
      `SELECT EXISTS(
         SELECT 1 FROM cliptracker_v2_sessions
         WHERE clip_id = $1 AND viewer_id = $2 AND is_recovery_attempt = true
       ) as has_recovery`,
      z.object({ has_recovery: z.boolean() }),
      [clipId, viewerId],
      { label: "Check if S&R was triggered" }
    );
    const searchRescueTriggered = recoveryCheck[0]?.has_recovery ?? false;

    // Get Trail Marker results from best session, split by question type
    let trailMarkerCorrect = 0;
    let trailMarkerTotal = 0;
    let searchRescueCorrect = 0;
    let searchRescueTotal = 0;
    let incorrectQuestions: Array<{
      questionId: string;
      questionText: string;
      triggerAtSeconds: number;
      isRecovery: boolean;
    }> = [];

    if (bestSession) {
      // Get split counts: trail markers vs recovery questions
      const splitCounts = await ctx.integrations.db.query(
        `SELECT
           q.is_recovery,
           COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE r.is_correct = true)::int as correct
         FROM cliptracker_v2_responses r
         JOIN cliptracker_v2_questions q ON q.id = r.question_id
         WHERE r.session_id = $1
         GROUP BY q.is_recovery`,
        z.object({
          is_recovery: z.boolean(),
          total: z.coerce.number(),
          correct: z.coerce.number(),
        }),
        [bestSession.id],
        { label: "Get split trail marker / S&R counts" }
      );

      for (const row of splitCounts) {
        if (row.is_recovery) {
          searchRescueCorrect = row.correct;
          searchRescueTotal = row.total;
        } else {
          trailMarkerCorrect = row.correct;
          trailMarkerTotal = row.total;
        }
      }

      // Get incorrect questions for the Back Track section
      const missed = await ctx.integrations.db.query(
        `SELECT q.id as question_id, q.question_text, q.trigger_at_seconds, q.is_recovery
         FROM cliptracker_v2_responses r
         JOIN cliptracker_v2_questions q ON q.id = r.question_id
         WHERE r.session_id = $1 AND r.is_correct = false
         ORDER BY q.is_recovery, q.trigger_at_seconds`,
        IncorrectQuestionSchema,
        [bestSession.id],
        { label: "Get incorrect questions for Back Track" }
      );

      incorrectQuestions = missed.map(q => ({
        questionId: q.question_id,
        questionText: q.question_text,
        triggerAtSeconds: q.trigger_at_seconds,
        isRecovery: q.is_recovery,
      }));
    }

    // Check if Weather the Storm was triggered
    // Weather Storm happens at attempt_number >= 3 (failed primary, failed S&R, then WtS)
    const weatherCheck = await ctx.integrations.db.query(
      `SELECT EXISTS(
         SELECT 1 FROM cliptracker_v2_sessions
         WHERE clip_id = $1 AND viewer_id = $2 AND attempt_number >= 3
       ) as has_weather`,
      z.object({ has_weather: z.boolean() }),
      [clipId, viewerId],
      { label: "Check if Weather the Storm was triggered" }
    );
    const weatherStormTriggered = weatherCheck[0]?.has_weather ?? false;

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

    // Get clip title, sort_order, and video_url
    const clipInfo = await ctx.integrations.db.query(
      `SELECT title, sort_order, video_url FROM cliptracker_v2_clips WHERE id = $1`,
      z.object({
        title: z.string(),
        sort_order: z.coerce.number(),
        video_url: z.string(),
      }),
      [clipId],
      { label: "Get clip info" }
    );

    const clip = clipInfo[0] ?? { title: "Unknown Clip", sort_order: 0, video_url: "" };

    const totalXpEarned = xpEvents.reduce((sum, e) => sum + e.xp_amount, 0);

    return {
      engagementScore,
      engagementThreshold: 80,
      trailMarkerCorrect,
      trailMarkerTotal,
      searchRescueCorrect,
      searchRescueTotal,
      searchRescueTriggered,
      weatherStormTriggered,
      // Backward compat totals
      correctAnswers: trailMarkerCorrect + searchRescueCorrect,
      totalQuestions: trailMarkerTotal + searchRescueTotal,
      incorrectQuestions,
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
      videoUrl: clip.video_url,
    };
  },
});
