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

/** Map clip sort_order → quiz day ID */
const SORT_ORDER_TO_QUIZ_DAY: Record<number, string> = {
  1: "day1", 2: "day2", 3: "day3", 4: "day4", 5: "day5", 6: "day6",
  7: "day7", 8: "day7", 9: "day8", 10: "day8", 11: "day9",
  12: "day10", 13: "day11", 14: "day11", 15: "day12",
  16: "day13", 17: "day14", 18: "day15", 19: "day15",
};

/** Quiz day → display name */
const QUIZ_DAY_TO_NAME: Record<string, string> = {
  day1: "🔎 Ideal Customer Profiles (Personas & Industries)",
  day2: "📥 Top of Funnel (TOFU) – MQLs & Inbounds",
  day3: "📈 GTM Launch Pad",
  day4: "📇 Prospecting Process",
  day5: "🐦\u200d🔥 Renewal Operations",
  day6: "🥊 The Competitive Landscape",
  day7: "🩺 Account Planning Best Practices",
  day8: "🏎️ Discovery That Accelerates",
  day9: "💰 Pricing & Packaging 101",
  day10: "🪢 Leveraging Partners",
  day11: "☂️ Forecasting",
  day12: "📖 Customer Stories",
  day13: "📑 Contract Lifecycle Management",
  day14: "🫱🏻\u200d🫲🏼 Deal Desk & CPQ",
  day15: "🪢 Leveraging Solution Engineers & Professional Services",
};

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
    // Quiz data
    quizDay: z.string().nullable(),
    quizName: z.string().nullable(),
    quizBestScore: z.number().nullable(),
    quizBestCorrect: z.number().nullable(),
    quizTotalQuestions: z.number().nullable(),
    quizAttempts: z.number().nullable(),
    quizLiveAverage: z.number().nullable(),
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
           COUNT(DISTINCT r.question_id)::int as total,
           COUNT(DISTINCT r.question_id) FILTER (WHERE r.is_correct = true)::int as correct
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
        `SELECT DISTINCT q.id as question_id, q.question_text, q.trigger_at_seconds, q.is_recovery
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

    // --- Quiz data ---
    const quizDay = SORT_ORDER_TO_QUIZ_DAY[clip.sort_order] ?? null;
    const quizName = quizDay ? (QUIZ_DAY_TO_NAME[quizDay] ?? null) : null;

    let quizBestScore: number | null = null;
    let quizBestCorrect: number | null = null;
    let quizTotalQuestions: number | null = null;
    let quizAttempts: number | null = null;
    let quizLiveAverage: number | null = null;

    if (quizDay) {
      // Get viewer email for cross-app join
      const viewerRows = await ctx.integrations.db.query(
        `SELECT email FROM cliptracker_v2_viewers WHERE id = $1`,
        z.object({ email: z.string() }),
        [viewerId],
        { label: "Get viewer email for quiz join" }
      );
      const viewerEmail = viewerRows[0]?.email ?? null;

      if (viewerEmail) {
        // Best attempt for this quiz
        const bestAttempt = await ctx.integrations.db.query(
          `SELECT score, total_questions
           FROM camp_quiz_attempts
           WHERE user_email = $1 AND quiz_id = $2
           ORDER BY score DESC
           LIMIT 1`,
          z.object({ score: z.coerce.number(), total_questions: z.coerce.number() }),
          [viewerEmail, quizDay],
          { label: "Get best quiz attempt" }
        );

        // Attempt count for this quiz
        const attemptCount = await ctx.integrations.db.query(
          `SELECT COUNT(*)::int as cnt
           FROM camp_quiz_attempts
           WHERE user_email = $1 AND quiz_id = $2`,
          z.object({ cnt: z.coerce.number() }),
          [viewerEmail, quizDay],
          { label: "Get quiz attempt count" }
        );

        if (bestAttempt.length > 0) {
          quizBestCorrect = bestAttempt[0].score;
          quizTotalQuestions = bestAttempt[0].total_questions;
          quizBestScore = quizTotalQuestions > 0
            ? Math.round((quizBestCorrect / quizTotalQuestions) * 100)
            : 0;
          quizAttempts = attemptCount[0]?.cnt ?? 0;
        }

        // Live average across ALL completed quizzes for this learner
        const avgResult = await ctx.integrations.db.query(
          `SELECT ROUND(AVG(best_pct))::int as avg_score
           FROM (
             SELECT quiz_id, MAX(score::float / NULLIF(total_questions, 0) * 100) as best_pct
             FROM camp_quiz_attempts
             WHERE user_email = $1
             GROUP BY quiz_id
           ) sub`,
          z.object({ avg_score: z.coerce.number().nullable() }),
          [viewerEmail],
          { label: "Get live quiz average" }
        );
        quizLiveAverage = avgResult[0]?.avg_score ?? null;
      }
    }

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
      // Quiz
      quizDay,
      quizName,
      quizBestScore,
      quizBestCorrect,
      quizTotalQuestions,
      quizAttempts,
      quizLiveAverage,
    };
  },
});
