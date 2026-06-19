import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// --- Row schemas for each query ---

const OverviewRow = z.object({
  total_sessions: z.coerce.number(),
  unique_viewers: z.coerce.number(),
  avg_engagement: z.string().nullable(),
  completion_rate: z.string().nullable(),
  total_clips: z.coerce.number(),
});

const LearnerRow = z.object({
  viewer_id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  ascent_day_1: z.string().nullable(),
  clips_completed: z.coerce.number(),
  avg_score: z.string().nullable(),
  total_xp: z.coerce.number(),
  last_active: z.string().nullable(),
});

const ClipBreakdownRow = z.object({
  clip_id: z.string(),
  title: z.string(),
  sort_order: z.coerce.number(),
  total_sessions: z.coerce.number(),
  unique_viewers: z.coerce.number(),
  completed_count: z.coerce.number(),
  avg_engagement: z.string().nullable(),
  avg_focus: z.string().nullable(),
  avg_watch_seconds: z.string().nullable(),
  sr_triggered: z.coerce.number(),
  wts_has_card: z.coerce.number(),
});

const QuestionRow = z.object({
  clip_id: z.string(),
  clip_title: z.string(),
  clip_sort_order: z.coerce.number(),
  question_id: z.string(),
  question_text: z.string(),
  total_answers: z.coerce.number(),
  correct_count: z.coerce.number(),
  incorrect_count: z.coerce.number(),
});

const BadgeSummaryRow = z.object({
  badge_id: z.string(),
  total_earned: z.coerce.number(),
});

const XpSummaryRow = z.object({
  total_xp_distributed: z.coerce.number(),
  total_badges_earned: z.coerce.number(),
});

const LeaderboardRow = z.object({
  viewer_id: z.string(),
  name: z.string(),
  role: z.string(),
  total_xp: z.coerce.number(),
  clips_completed: z.coerce.number(),
  badges_earned: z.coerce.number(),
});

export default api({
  name: "GetAnalyticsV3",
  description: "Comprehensive 7-section analytics for cAMP Ascent admin dashboard",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    overview: z.object({
      totalSessions: z.number(),
      uniqueViewers: z.number(),
      avgEngagement: z.number().nullable(),
      completionRate: z.number().nullable(),
      totalClips: z.number(),
    }),
    learners: z.array(z.object({
      viewerId: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      ascentDay1: z.string().nullable(),
      clipsCompleted: z.number(),
      avgScore: z.number().nullable(),
      totalXp: z.number(),
      lastActive: z.string().nullable(),
      pacingStatus: z.string(),
    })),
    clipBreakdown: z.array(z.object({
      clipId: z.string(),
      title: z.string(),
      sortOrder: z.number(),
      totalSessions: z.number(),
      uniqueViewers: z.number(),
      completedCount: z.number(),
      avgEngagement: z.number().nullable(),
      avgFocus: z.number().nullable(),
      avgWatchSeconds: z.number().nullable(),
      srTriggered: z.number(),
      wtsHasCard: z.number(),
    })),
    questions: z.array(z.object({
      clipId: z.string(),
      clipTitle: z.string(),
      clipSortOrder: z.number(),
      questionId: z.string(),
      questionText: z.string(),
      totalAnswers: z.number(),
      correctCount: z.number(),
      incorrectCount: z.number(),
    })),
    xpSummary: z.object({
      totalXpDistributed: z.number(),
      totalBadgesEarned: z.number(),
      badgeCounts: z.array(z.object({
        badgeId: z.string(),
        totalEarned: z.number(),
      })),
    }),
    leaderboard: z.array(z.object({
      rank: z.number(),
      viewerId: z.string(),
      name: z.string(),
      role: z.string(),
      totalXp: z.number(),
      clipsCompleted: z.number(),
      badgesEarned: z.number(),
    })),
  }),

  async run(ctx) {
    // 1. Overview stats
    const overviewRows = await ctx.integrations.db.query(
      `SELECT
        COUNT(s.id)::int AS total_sessions,
        COUNT(DISTINCT s.viewer_id)::int AS unique_viewers,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true), 1)::text AS avg_engagement,
        ROUND(
          COUNT(*) FILTER (WHERE s.completed = true AND s.engagement_score >= 80)::numeric * 100.0 /
          NULLIF(COUNT(*), 0), 1
        )::text AS completion_rate,
        (SELECT COUNT(*)::int FROM cliptracker_v2_clips WHERE status = 'live') AS total_clips
       FROM cliptracker_v2_sessions s`,
      OverviewRow,
      undefined,
      { label: "Overview stats" }
    );

    // 2. Per-learner table
    const learnerRows = await ctx.integrations.db.query(
      `SELECT
        v.id AS viewer_id, v.name, v.email, v.role,
        v.ascent_day_1::text AS ascent_day_1,
        COUNT(DISTINCT s.clip_id) FILTER (WHERE s.completed = true AND s.engagement_score >= 80)::int AS clips_completed,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true), 1)::text AS avg_score,
        COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v.id), 0) AS total_xp,
        MAX(s.ended_at)::text AS last_active
       FROM cliptracker_v2_viewers v
       LEFT JOIN cliptracker_v2_sessions s ON s.viewer_id = v.id
       GROUP BY v.id, v.name, v.email, v.role, v.ascent_day_1
       ORDER BY v.name ASC
       LIMIT 500`,
      LearnerRow,
      undefined,
      { label: "Per-learner stats" }
    );

    // Calculate pacing for each learner
    const totalLiveClips = overviewRows[0]?.total_clips ?? 0;
    const now = new Date();

    const learners = learnerRows.map(l => {
      let pacingStatus = "not_started";
      if (l.ascent_day_1) {
        const start = new Date(l.ascent_day_1);
        const daysElapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        // 5 business days per clip is the expected pace
        const expectedClips = Math.min(totalLiveClips, Math.floor(daysElapsed / 5));
        if (l.clips_completed >= totalLiveClips) {
          pacingStatus = "completed";
        } else if (l.clips_completed >= expectedClips) {
          pacingStatus = "on_track";
        } else {
          pacingStatus = "behind";
        }
      }
      return {
        viewerId: l.viewer_id,
        name: l.name,
        email: l.email,
        role: l.role,
        ascentDay1: l.ascent_day_1,
        clipsCompleted: l.clips_completed,
        avgScore: l.avg_score ? parseFloat(l.avg_score) : null,
        totalXp: l.total_xp,
        lastActive: l.last_active,
        pacingStatus,
      };
    });

    // 3. Per-clip breakdown
    const clipRows = await ctx.integrations.db.query(
      `SELECT
        c.id AS clip_id, c.title, c.sort_order,
        COUNT(s.id)::int AS total_sessions,
        COUNT(DISTINCT s.viewer_id)::int AS unique_viewers,
        COUNT(*) FILTER (WHERE s.completed = true AND s.engagement_score >= 80)::int AS completed_count,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true), 1)::text AS avg_engagement,
        ROUND(AVG(s.focus_score) FILTER (WHERE s.completed = true), 1)::text AS avg_focus,
        ROUND(AVG(s.total_time_seconds) FILTER (WHERE s.completed = true), 0)::text AS avg_watch_seconds,
        COUNT(*) FILTER (WHERE s.is_recovery_attempt = true)::int AS sr_triggered,
        (SELECT COUNT(*)::int FROM cliptracker_v2_weather_storm w WHERE w.clip_id = c.id) AS wts_has_card
       FROM cliptracker_v2_clips c
       LEFT JOIN cliptracker_v2_sessions s ON s.clip_id = c.id
       WHERE c.status = 'live'
       GROUP BY c.id, c.title, c.sort_order
       ORDER BY c.sort_order ASC`,
      ClipBreakdownRow,
      undefined,
      { label: "Per-clip breakdown" }
    );

    // 4. Trail marker questions
    const questionRows = await ctx.integrations.db.query(
      `SELECT
        c.id AS clip_id, c.title AS clip_title, c.sort_order AS clip_sort_order,
        q.id AS question_id, q.question_text,
        COUNT(r.id)::int AS total_answers,
        COUNT(*) FILTER (WHERE r.is_correct = true)::int AS correct_count,
        COUNT(*) FILTER (WHERE r.is_correct = false)::int AS incorrect_count
       FROM cliptracker_v2_questions q
       JOIN cliptracker_v2_clips c ON c.id = q.clip_id
       LEFT JOIN cliptracker_v2_responses r ON r.question_id = q.id
       WHERE q.is_recovery = false
       GROUP BY c.id, c.title, c.sort_order, q.id, q.question_text
       ORDER BY c.sort_order ASC, q.sort_order ASC
       LIMIT 200`,
      QuestionRow,
      undefined,
      { label: "Trail marker questions" }
    );

    // 5. XP & badge summary
    const xpSummaryRows = await ctx.integrations.db.query(
      `SELECT
        COALESCE(SUM(xp_amount), 0)::int AS total_xp_distributed,
        (SELECT COUNT(*)::int FROM cliptracker_v2_badges) AS total_badges_earned
       FROM cliptracker_v2_xp_events`,
      XpSummaryRow,
      undefined,
      { label: "XP summary" }
    );

    const badgeCounts = await ctx.integrations.db.query(
      `SELECT badge_id, COUNT(*)::int AS total_earned
       FROM cliptracker_v2_badges
       GROUP BY badge_id
       ORDER BY total_earned DESC
       LIMIT 50`,
      BadgeSummaryRow,
      undefined,
      { label: "Badge counts" }
    );

    // 6. XP Leaderboard (top 50)
    const leaderboardRows = await ctx.integrations.db.query(
      `SELECT
        v.id AS viewer_id, v.name, v.role,
        COALESCE(SUM(x.xp_amount), 0)::int AS total_xp,
        COUNT(DISTINCT s.clip_id) FILTER (WHERE s.completed = true AND s.engagement_score >= 80)::int AS clips_completed,
        (SELECT COUNT(*)::int FROM cliptracker_v2_badges b WHERE b.viewer_id = v.id) AS badges_earned
       FROM cliptracker_v2_viewers v
       LEFT JOIN cliptracker_v2_xp_events x ON x.viewer_id = v.id
       LEFT JOIN cliptracker_v2_sessions s ON s.viewer_id = v.id
       GROUP BY v.id, v.name, v.role
       ORDER BY total_xp DESC
       LIMIT 50`,
      LeaderboardRow,
      undefined,
      { label: "XP leaderboard" }
    );

    const ov = overviewRows[0];

    return {
      overview: {
        totalSessions: ov.total_sessions,
        uniqueViewers: ov.unique_viewers,
        avgEngagement: ov.avg_engagement ? parseFloat(ov.avg_engagement) : null,
        completionRate: ov.completion_rate ? parseFloat(ov.completion_rate) : null,
        totalClips: ov.total_clips,
      },
      learners,
      clipBreakdown: clipRows.map(c => ({
        clipId: c.clip_id,
        title: c.title,
        sortOrder: c.sort_order,
        totalSessions: c.total_sessions,
        uniqueViewers: c.unique_viewers,
        completedCount: c.completed_count,
        avgEngagement: c.avg_engagement ? parseFloat(c.avg_engagement) : null,
        avgFocus: c.avg_focus ? parseFloat(c.avg_focus) : null,
        avgWatchSeconds: c.avg_watch_seconds ? parseFloat(c.avg_watch_seconds) : null,
        srTriggered: c.sr_triggered,
        wtsHasCard: c.wts_has_card,
      })),
      questions: questionRows.map(q => ({
        clipId: q.clip_id,
        clipTitle: q.clip_title,
        clipSortOrder: q.clip_sort_order,
        questionId: q.question_id,
        questionText: q.question_text,
        totalAnswers: q.total_answers,
        correctCount: q.correct_count,
        incorrectCount: q.incorrect_count,
      })),
      xpSummary: {
        totalXpDistributed: xpSummaryRows[0]?.total_xp_distributed ?? 0,
        totalBadgesEarned: xpSummaryRows[0]?.total_badges_earned ?? 0,
        badgeCounts: badgeCounts.map(b => ({
          badgeId: b.badge_id,
          totalEarned: b.total_earned,
        })),
      },
      leaderboard: leaderboardRows.map((l, i) => ({
        rank: i + 1,
        viewerId: l.viewer_id,
        name: l.name,
        role: l.role,
        totalXp: l.total_xp,
        clipsCompleted: l.clips_completed,
        badgesEarned: l.badges_earned,
      })),
    };
  },
});
