import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "EndSession",
  description: "Ends a viewing session and calculates engagement score",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string().uuid(),
    totalFocusSeconds: z.number(),
    totalBlurSeconds: z.number(),
    totalTimeSeconds: z.number(),
    clipDurationSeconds: z.number(),
    tabAwayCount: z.number().int().min(0).default(0),
    lowVolumeSeconds: z.number().default(0),
  }),

  output: z.object({
    engagementScore: z.number(),
    questionScore: z.number(),
    focusScore: z.number(),
    timeScore: z.number(),
    passed: z.boolean(),
    correctAnswers: z.number(),
    totalQuestions: z.number(),
  }),

  async run(ctx, { sessionId, totalFocusSeconds, totalBlurSeconds, totalTimeSeconds, clipDurationSeconds, tabAwayCount, lowVolumeSeconds }) {
    // Get all responses for this session
    const ResponseCountSchema = z.object({
      total: z.coerce.number(),
      correct: z.coerce.number(),
    });
    
    const responseStats = await ctx.integrations.db.query(
      `SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE is_correct = true)::int as correct
       FROM cliptracker_v2_responses
       WHERE session_id = $1`,
      ResponseCountSchema,
      [sessionId],
      { label: "Get response stats" }
    );

    const { total: totalQuestions, correct: correctAnswers } = responseStats[0];

    // Calculate scores (0-100 each)
    // Question score: percentage of correct answers (25% weight)
    const questionScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Focus score: blended tab-away (60%) + volume (40%)
    // Tab score: 0 tab-aways = 100%, 1 = 80%, 2 = 60%, 3 = 40%, 4+ = 20%
    const tabScore = tabAwayCount === 0 ? 100
      : tabAwayCount === 1 ? 80
      : tabAwayCount === 2 ? 60
      : tabAwayCount === 3 ? 40
      : 20;

    // Volume score: % of watched time at adequate volume (>=10%)
    // If lowVolumeSeconds is 0 or missing (old sessions), no penalty
    const volumeScore = totalTimeSeconds > 0 && lowVolumeSeconds > 0
      ? Math.max(0, ((totalTimeSeconds - lowVolumeSeconds) / totalTimeSeconds) * 100)
      : 100;

    const focusScore = (tabScore * 0.6) + (volumeScore * 0.4);

    // Time score: how much of the video's duration was spent watching (45% weight)
    // Cap at 100 (viewer can spend more time than video duration due to pauses)
    const timeScore = clipDurationSeconds > 0 
      ? Math.min((totalTimeSeconds / clipDurationSeconds) * 100, 100) 
      : 100;

    // Weighted engagement score
    const engagementScore = Math.round(
      (questionScore * 0.25) + (focusScore * 0.3) + (timeScore * 0.45)
    );

    const passed = engagementScore >= 80;

    // Update the session — save metrics only.
    // completed=true is set exclusively by CompleteClipPath (first pass, S&R pass, or WtS).
    // initial_engagement_score captures the first-pass engagement before any S&R/WtS
    // overwrite — only set it when it's NULL (preserves the original first-pass score).
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions 
       SET ended_at = NOW(),
           total_focus_seconds = $2,
           total_blur_seconds = $3,
           total_time_seconds = $4,
           low_volume_seconds = $9,
           engagement_score = $5,
           question_score = $6,
           focus_score = $7,
           time_score = $8,
           initial_engagement_score = COALESCE(initial_engagement_score, $5)
       WHERE id = $1`,
      [sessionId, totalFocusSeconds, totalBlurSeconds, totalTimeSeconds, 
       engagementScore, questionScore, focusScore, timeScore, lowVolumeSeconds],
      { label: "Update session with scores (metrics only)" }
    );

    return {
      engagementScore,
      questionScore: Math.round(questionScore),
      focusScore: Math.round(focusScore),
      timeScore: Math.round(timeScore),
      passed,
      correctAnswers,
      totalQuestions,
    };
  },
});
