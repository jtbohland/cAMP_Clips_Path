import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Fetches all the data needed to compose a check-in email for a viewer.
 * For "approach" type: includes module reflections + W&D results.
 * For "week2"/"week3": includes clip stats, engagement, leaderboard rank.
 * For "summit": includes all cumulative stats.
 */

const ModuleSignoffRow = z.object({
  module_key: z.string(),
  reflection_prompt: z.string(),
  reflection_response: z.string(),
});

const WdRow = z.object({
  product: z.string(),
  scenario: z.string(),
  score: z.coerce.number(),
});

const ViewerStatsRow = z.object({
  name: z.string(),
  email: z.string(),
  manager_email: z.string().nullable(),
  belay_buddy: z.string().nullable(),
  total_xp: z.coerce.number(),
  ascent_day_1: z.string().nullable(),
});

const ClipStatsRow = z.object({
  total_sessions: z.coerce.number(),
  completed_sessions: z.coerce.number(),
  avg_score: z.coerce.number(),
});

const LeaderboardRow = z.object({
  rank: z.coerce.number(),
  total_learners: z.coerce.number(),
});

const EngagementRow = z.object({
  avg_question_score: z.coerce.number(),
  avg_focus_score: z.coerce.number(),
  avg_time_score: z.coerce.number(),
  overall_engagement: z.coerce.number(),
});

// XP tier thresholds (same as in award-xp.ts / get-analytics-v3.ts)
const TIERS = [
  { name: "Summit Legend", xpMin: 5000 },
  { name: "Peak Performer", xpMin: 3500 },
  { name: "Ridge Runner", xpMin: 2000 },
  { name: "Trail Blazer", xpMin: 1000 },
  { name: "Base Camp", xpMin: 0 },
];

function getTierFromXp(xp: number): string {
  for (const t of TIERS) {
    if (xp >= t.xpMin) return t.name;
  }
  return "Base Camp";
}

export default api({
  name: "GetCheckinEmailData",
  description: "Fetches data needed to compose a check-in email for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    checkinType: z.enum(["approach", "week2", "week3", "summit"]),
  }),

  output: z.object({
    viewer: z.object({
      name: z.string(),
      email: z.string(),
      managerEmail: z.string().nullable(),
      belayBuddyEmail: z.string().nullable(),
      totalXp: z.number(),
      tier: z.string(),
      ascentDay1: z.string().nullable(),
    }),
    // Pacing data
    srCount: z.number(),
    wtsCount: z.number(),
    // Approach-specific data
    moduleReflections: z.array(z.object({
      moduleKey: z.string(),
      reflectionPrompt: z.string(),
      reflectionResponse: z.string(),
    })),
    wdVerification: z.object({
      product: z.string(),
      scenario: z.string(),
      score: z.number(),
    }).nullable(),
    // Clip stats for week2/week3/summit
    clipStats: z.object({
      totalSessions: z.number(),
      completedSessions: z.number(),
      avgScore: z.number(),
    }),
    leaderboard: z.object({
      rank: z.number(),
      totalLearners: z.number(),
    }),
    engagement: z.object({
      avgQuestionScore: z.number(),
      avgFocusScore: z.number(),
      avgTimeScore: z.number(),
      overallEngagement: z.number(),
    }),
    // cAMP Quiz stats (shared DB)
    quizStats: z.object({
      quizzesPassed: z.number(),
      totalQuizzes: z.number(),
      totalAttempts: z.number(),
      avgScorePct: z.number(),
      firstPassCount: z.number(),
      retakes: z.number(),
    }),
    // Week 4 specific stats (summit only)
    week4: z.object({
      clipsCompleted: z.number(),
      totalClips: z.number(),
      avgEngagement: z.number(),
      avgQuizScore: z.number(),
      quizzesPassed: z.number(),
      totalQuizzes: z.number(),
    }).nullable(),
  }),

  async run(ctx, { viewerId, checkinType }) {
    // Get viewer info with XP computed from xp_events
    const viewerRows = await ctx.integrations.db.query(
      `SELECT
        v.name, v.email,
        COALESCE(v.manager_email, '') AS manager_email,
        COALESCE(v.belay_buddy, '') AS belay_buddy,
        COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v.id), 0) AS total_xp,
        v.ascent_day_1::text AS ascent_day_1
       FROM cliptracker_v2_viewers v
       WHERE v.id = $1`,
      ViewerStatsRow,
      [viewerId],
      { label: "Get viewer info for checkin email" }
    );

    if (viewerRows.length === 0) {
      throw new Error("Viewer not found");
    }

    const viewer = viewerRows[0];
    const tier = getTierFromXp(viewer.total_xp);

    // Get module reflections (for approach checkin)
    let moduleReflections: { moduleKey: string; reflectionPrompt: string; reflectionResponse: string }[] = [];
    let wdVerification: { product: string; scenario: string; score: number } | null = null;

    if (checkinType === "approach") {
      const signoffs = await ctx.integrations.db.query(
        `SELECT module_key, reflection_prompt, reflection_response
         FROM cliptracker_v2_module_signoffs
         WHERE viewer_id = $1
         ORDER BY completed_at ASC`,
        ModuleSignoffRow,
        [viewerId],
        { label: "Get module reflections for approach email" }
      );

      moduleReflections = signoffs.map((s) => ({
        moduleKey: s.module_key,
        reflectionPrompt: s.reflection_prompt,
        reflectionResponse: s.reflection_response,
      }));

      // Get W&D verification
      const wdRows = await ctx.integrations.db.query(
        `SELECT product, scenario, score
         FROM cliptracker_v2_wd_verifications
         WHERE viewer_id = $1
         LIMIT 1`,
        WdRow,
        [viewerId],
        { label: "Get W&D for approach email" }
      );

      wdVerification = wdRows.length > 0
        ? { product: wdRows[0].product, scenario: wdRows[0].scenario, score: wdRows[0].score }
        : null;
    }

    // Get clip stats (for week2/week3/summit)
    const clipStatsRows = await ctx.integrations.db.query(
      `SELECT
        COUNT(*)::int AS total_sessions,
        COUNT(*) FILTER (WHERE completed = true)::int AS completed_sessions,
        COALESCE(AVG(CASE WHEN completed = true THEN engagement_score END)::int, 0) AS avg_score
       FROM cliptracker_v2_sessions
       WHERE viewer_id = $1`,
      ClipStatsRow,
      [viewerId],
      { label: "Get clip stats" }
    );

    const clipStats = clipStatsRows[0] ?? { total_sessions: 0, completed_sessions: 0, avg_score: 0 };

    // Get leaderboard rank using XP from xp_events
    const leaderboardRows = await ctx.integrations.db.query(
      `WITH viewer_xp AS (
        SELECT viewer_id, COALESCE(SUM(xp_amount)::int, 0) AS xp
        FROM cliptracker_v2_xp_events
        GROUP BY viewer_id
      ),
      ranked AS (
        SELECT v.id,
               COALESCE(vx.xp, 0) AS xp,
               RANK() OVER (ORDER BY COALESCE(vx.xp, 0) DESC) AS rank
        FROM cliptracker_v2_viewers v
        LEFT JOIN viewer_xp vx ON vx.viewer_id = v.id
      )
      SELECT
        r.rank::int,
        (SELECT COUNT(*)::int FROM cliptracker_v2_viewers) AS total_learners
      FROM ranked r
      WHERE r.id = $1`,
      LeaderboardRow,
      [viewerId],
      { label: "Get leaderboard rank" }
    );

    const leaderboard = leaderboardRows.length > 0
      ? { rank: leaderboardRows[0].rank, totalLearners: leaderboardRows[0].total_learners }
      : { rank: 0, totalLearners: 0 };

    // Get S&R and WtS counts
    const SrWtsRow = z.object({
      sr_count: z.coerce.number(),
      wts_count: z.coerce.number(),
    });

    const srWtsRows = await ctx.integrations.db.query(
      `SELECT
        COUNT(*) FILTER (WHERE is_recovery_attempt = true)::int AS sr_count,
        COUNT(*) FILTER (WHERE attempt_number >= 3)::int AS wts_count
       FROM cliptracker_v2_sessions
       WHERE viewer_id = $1`,
      SrWtsRow,
      [viewerId],
      { label: "Get S&R and WtS counts" }
    );

    const srCount = srWtsRows[0]?.sr_count ?? 0;
    const wtsCount = srWtsRows[0]?.wts_count ?? 0;

    // Get engagement scores
    const engagementRows = await ctx.integrations.db.query(
      `SELECT
        COALESCE(AVG(question_score)::int, 0) AS avg_question_score,
        COALESCE(AVG(focus_score)::int, 0) AS avg_focus_score,
        COALESCE(AVG(time_score)::int, 0) AS avg_time_score,
        COALESCE(AVG(
          question_score * 0.25 + focus_score * 0.30 + time_score * 0.45
        )::int, 0) AS overall_engagement
       FROM cliptracker_v2_sessions
       WHERE viewer_id = $1 AND completed = true`,
      EngagementRow,
      [viewerId],
      { label: "Get engagement scores" }
    );

    const engagement = engagementRows[0] ?? {
      avg_question_score: 0,
      avg_focus_score: 0,
      avg_time_score: 0,
      overall_engagement: 0,
    };

    // Get cAMP Quiz stats (shared DB, joined by email)
    const QuizStatsRow = z.object({
      quizzes_passed: z.coerce.number(),
      total_attempts: z.coerce.number(),
      avg_score_pct: z.coerce.number(),
      first_pass_count: z.coerce.number(),
    });

    const quizStatsRows = await ctx.integrations.db.query(
      `SELECT
        COUNT(DISTINCT quiz_id) FILTER (WHERE passed = true)::int AS quizzes_passed,
        COUNT(*)::int AS total_attempts,
        COALESCE(ROUND(AVG(score * 100.0 / NULLIF(total_questions, 0)))::int, 0) AS avg_score_pct,
        COUNT(*) FILTER (WHERE attempt_number = 1 AND passed = true)::int AS first_pass_count
       FROM camp_quiz_attempts
       WHERE user_email = $1`,
      QuizStatsRow,
      [viewer.email],
      { label: "Get cAMP Quiz stats" }
    );

    const qs = quizStatsRows[0] ?? { quizzes_passed: 0, total_attempts: 0, avg_score_pct: 0, first_pass_count: 0 };
    const totalQuizzes = 15;
    const retakes = Math.max(0, qs.total_attempts - qs.quizzes_passed - (qs.total_attempts > 0 ? (qs.total_attempts - qs.quizzes_passed) : 0));

    // Get Week 4 specific stats (sort_order 13-19, quiz days 11-15) — summit only
    let week4: { clipsCompleted: number; totalClips: number; avgEngagement: number; avgQuizScore: number; quizzesPassed: number; totalQuizzes: number } | null = null;
    if (checkinType === "summit") {
      const Week4ClipRow = z.object({
        completed: z.coerce.number(),
        total: z.coerce.number(),
        avg_engagement: z.coerce.number(),
      });

      const w4ClipRows = await ctx.integrations.db.query(
        `SELECT
          COUNT(*) FILTER (WHERE s.completed = true)::int AS completed,
          COUNT(*)::int AS total,
          COALESCE(AVG(CASE WHEN s.completed = true THEN s.engagement_score END)::int, 0) AS avg_engagement
         FROM cliptracker_v2_sessions s
         JOIN cliptracker_v2_clips c ON c.id = s.clip_id
         WHERE s.viewer_id = $1 AND c.sort_order >= 13 AND c.sort_order <= 19
           AND s.is_recovery_attempt = false`,
        Week4ClipRow,
        [viewerId],
        { label: "Get Week 4 clip stats" }
      );

      const Week4QuizRow = z.object({
        passed: z.coerce.number(),
        total_quizzes: z.coerce.number(),
        avg_score: z.coerce.number(),
      });

      const w4QuizRows = await ctx.integrations.db.query(
        `SELECT
          COUNT(DISTINCT quiz_id) FILTER (WHERE passed = true)::int AS passed,
          COUNT(DISTINCT quiz_id)::int AS total_quizzes,
          COALESCE(ROUND(AVG(score * 100.0 / NULLIF(total_questions, 0)))::int, 0) AS avg_score
         FROM camp_quiz_attempts
         WHERE user_email = $1 AND quiz_id IN ('day11','day12','day13','day14','day15')`,
        Week4QuizRow,
        [viewer.email],
        { label: "Get Week 4 quiz stats" }
      );

      const w4c = w4ClipRows[0] ?? { completed: 0, total: 0, avg_engagement: 0 };
      const w4q = w4QuizRows[0] ?? { passed: 0, total_quizzes: 0, avg_score: 0 };

      week4 = {
        clipsCompleted: w4c.completed,
        totalClips: 7, // sort 13-19 = 7 clips in week 4
        avgEngagement: w4c.avg_engagement,
        avgQuizScore: w4q.avg_score,
        quizzesPassed: w4q.passed,
        totalQuizzes: 5, // days 11-15
      };
    }

    return {
      viewer: {
        name: viewer.name,
        email: viewer.email,
        managerEmail: viewer.manager_email || null,
        belayBuddyEmail: viewer.belay_buddy || null,
        totalXp: viewer.total_xp,
        tier,
        ascentDay1: viewer.ascent_day_1 || null,
      },
      srCount,
      wtsCount,
      moduleReflections,
      wdVerification,
      clipStats: {
        totalSessions: clipStats.total_sessions,
        completedSessions: clipStats.completed_sessions,
        avgScore: clipStats.avg_score,
      },
      leaderboard,
      engagement: {
        avgQuestionScore: engagement.avg_question_score,
        avgFocusScore: engagement.avg_focus_score,
        avgTimeScore: engagement.avg_time_score,
        overallEngagement: engagement.overall_engagement,
      },
      quizStats: {
        quizzesPassed: qs.quizzes_passed,
        totalQuizzes,
        totalAttempts: qs.total_attempts,
        avgScorePct: qs.avg_score_pct,
        firstPassCount: qs.first_pass_count,
        retakes: Math.max(0, qs.total_attempts - totalQuizzes),
      },
      week4,
    };
  },
});
