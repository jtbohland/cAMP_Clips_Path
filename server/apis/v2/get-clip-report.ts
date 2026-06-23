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
    resources: z.array(z.object({
      label: z.string(),
      url: z.string(),
      type: z.string(),
    })).nullable(),
  }),

  async run(ctx, { clipId, viewerId }) {
    // Get the single session for this viewer+clip
    const sessions = await ctx.integrations.db.query(
      `SELECT id, engagement_score, attempt_number
       FROM cliptracker_v2_sessions
       WHERE clip_id = $1 AND viewer_id = $2 AND completed = true
       LIMIT 1`,
      z.object({
        id: z.string(),
        engagement_score: z.coerce.number().nullable(),
        attempt_number: z.coerce.number(),
      }),
      [clipId, viewerId],
      { label: "Get completed session" }
    );

    const session = sessions[0];
    const engagementScore = session?.engagement_score ?? null;

    // Split question results by type
    let trailMarkerCorrect = 0;
    let trailMarkerTotal = 0;
    let searchRescueCorrect = 0;
    let searchRescueTotal = 0;
    let searchRescueTriggered = false;
    let incorrectQuestions: Array<{
      questionId: string;
      questionText: string;
      triggerAtSeconds: number;
      isRecovery: boolean;
    }> = [];

    if (session) {
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
        [session.id],
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

      // S&R was triggered if any recovery question responses exist
      searchRescueTriggered = searchRescueTotal > 0;

      // Get incorrect questions for the Back Track section
      const missed = await ctx.integrations.db.query(
        `SELECT q.id as question_id, q.question_text, q.trigger_at_seconds, q.is_recovery
         FROM cliptracker_v2_responses r
         JOIN cliptracker_v2_questions q ON q.id = r.question_id
         WHERE r.session_id = $1 AND r.is_correct = false
         ORDER BY q.is_recovery, q.trigger_at_seconds`,
        IncorrectQuestionSchema,
        [session.id],
        { label: "Get incorrect questions for Back Track" }
      );

      incorrectQuestions = missed.map(q => ({
        questionId: q.question_id,
        questionText: q.question_text,
        triggerAtSeconds: q.trigger_at_seconds,
        isRecovery: q.is_recovery,
      }));
    }

    // Weather the Storm is triggered at attempt_number >= 3
    const weatherStormTriggered = (session?.attempt_number ?? 0) >= 3;

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

    // Get clip title, sort_order, video_url, and resources
    const clipInfo = await ctx.integrations.db.query(
      `SELECT title, sort_order, video_url, resources FROM cliptracker_v2_clips WHERE id = $1`,
      z.object({
        title: z.string(),
        sort_order: z.coerce.number(),
        video_url: z.string(),
        resources: z.any().nullable(),
      }),
      [clipId],
      { label: "Get clip info" }
    );

    const clip = clipInfo[0] ?? { title: "Unknown Clip", sort_order: 0, video_url: "", resources: null };

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
      resources: Array.isArray(clip.resources) ? clip.resources : null,
    };
  },
});
