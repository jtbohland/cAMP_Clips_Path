import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TIERS = [
  { tier: 1, name: "Base Camper", emoji: "🏕️", xpMin: 0, xpMax: 149 },
  { tier: 2, name: "Trailblazer", emoji: "🥾", xpMin: 150, xpMax: 324 },
  { tier: 3, name: "Summit Seeker", emoji: "🧗🏼", xpMin: 325, xpMax: 499 },
  { tier: 4, name: "Pinnacle Achiever", emoji: "✨🏔️✨", xpMin: 500, xpMax: null },
];

// --- Row schemas ---

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
  timezone: z.string().nullable(),
  manager_name: z.string().nullable(),
  ascent_day_1: z.string().nullable(),
  clips_completed: z.coerce.number(),
  total_xp: z.coerce.number(),
  clip_score_avg: z.string().nullable(),
  first_attempt_avg: z.string().nullable(),
  recovery_avg: z.string().nullable(),
  wts_count: z.coerce.number(),
  sr_count: z.coerce.number(),
  last_active: z.string().nullable(),
  last_login_at: z.string().nullable(),
});

const LearnerBadgeRow = z.object({
  viewer_id: z.string(),
  badge_id: z.string(),
});

const ClipBreakdownRow = z.object({
  clip_id: z.string(),
  title: z.string(),
  sort_order: z.coerce.number(),
  total_sessions: z.coerce.number(),
  unique_viewers: z.coerce.number(),
  completed_count: z.coerce.number(),
  avg_first_pass: z.string().nullable(),
  avg_recovery: z.string().nullable(),
  avg_focus: z.string().nullable(),
  avg_watch_seconds: z.string().nullable(),
  sr_triggered: z.coerce.number(),
  wts_count: z.coerce.number(),
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

const LeaderboardRow = z.object({
  viewer_id: z.string(),
  name: z.string(),
  role: z.string(),
  timezone: z.string().nullable(),
  total_xp: z.coerce.number(),
  clips_completed: z.coerce.number(),
  badges_earned: z.coerce.number(),
});

const TierSchema = z.object({
  tier: z.number(),
  name: z.string(),
  emoji: z.string(),
  xpMin: z.number(),
  xpMax: z.number().nullable(),
});

const BadgeSchema = z.object({
  badgeId: z.string(),
});

export default api({
  name: "GetAnalyticsV3",
  description: "Manager-ready analytics dashboard for cAMP Ascent with cAMPers table, clip performance, and leaderboard",

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
      totalGearClicks: z.number(),
      onTimeFinishers: z.number(),
      anchorFailureCount: z.number(),
    }),
    learners: z.array(z.object({
      viewerId: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      timezone: z.string().nullable(),
      managerName: z.string().nullable(),
      ascentDay1: z.string().nullable(),
      clipsCompleted: z.number(),
      totalXp: z.number(),
      clipScoreAvg: z.number().nullable(),
      firstAttemptAvg: z.number().nullable(),
      recoveryAvg: z.number().nullable(),
      wtsCount: z.number(),
      srCount: z.number(),
      gearClicks: z.number(),
      tier: TierSchema,
      badges: z.array(BadgeSchema),
      pacingStatus: z.string(),
      summitDay: z.string().nullable(),
      isAnchorFailure: z.boolean(),
      ascentAdjustmentDay: z.string().nullable(),
      lastLogin: z.string().nullable(),
    })),
    clipBreakdown: z.array(z.object({
      clipId: z.string(),
      title: z.string(),
      sortOrder: z.number(),
      totalSessions: z.number(),
      uniqueViewers: z.number(),
      completedCount: z.number(),
      avgFirstPass: z.number().nullable(),
      avgRecovery: z.number().nullable(),
      avgFocus: z.number().nullable(),
      avgWatchSeconds: z.number().nullable(),
      srTriggered: z.number(),
      wtsCount: z.number(),
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
    leaderboard: z.array(z.object({
      rank: z.number(),
      viewerId: z.string(),
      name: z.string(),
      role: z.string(),
      timezone: z.string().nullable(),
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
          COUNT(*) FILTER (WHERE s.completed = true)::numeric * 100.0 /
          NULLIF(COUNT(*), 0), 1
        )::text AS completion_rate,
        (SELECT COUNT(*)::int FROM cliptracker_v2_clips WHERE status = 'live') AS total_clips
       FROM cliptracker_v2_sessions s
       JOIN cliptracker_v2_viewers v ON v.id = s.viewer_id
       WHERE v.is_admin = false`,
      OverviewRow,
      undefined,
      { label: "Overview stats" }
    );

    // 2. Per-learner table — new columns: first_pass_avg, recovery_avg, wts_count, sr_count
    const learnerRows = await ctx.integrations.db.query(
      `SELECT
        v.id AS viewer_id, v.name, v.email, v.role,
        v.timezone,
        v.manager_name,
        v.ascent_day_1::text AS ascent_day_1,
        COUNT(DISTINCT s.clip_id) FILTER (WHERE s.completed = true)::int AS clips_completed,
        COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v.id), 0) AS total_xp,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true), 1)::text AS clip_score_avg,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true AND s.is_recovery_attempt = false), 1)::text AS first_attempt_avg,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true AND s.is_recovery_attempt = true), 1)::text AS recovery_avg,
        COUNT(*) FILTER (WHERE s.attempt_number >= 3)::int AS wts_count,
        COUNT(*) FILTER (WHERE s.is_recovery_attempt = true)::int AS sr_count,
        MAX(s.ended_at)::text AS last_active,
        v.last_login_at::text AS last_login_at
       FROM cliptracker_v2_viewers v
       LEFT JOIN cliptracker_v2_sessions s ON s.viewer_id = v.id
       WHERE v.is_admin = false
       GROUP BY v.id, v.name, v.email, v.role, v.timezone, v.manager_name, v.ascent_day_1, v.last_login_at
       ORDER BY v.name ASC
       LIMIT 500`,
      LearnerRow,
      undefined,
      { label: "Per-learner stats with trail/recovery scores" }
    );

    // 2b. Total gear clicks for overview
    const GearCountRow = z.object({ total: z.coerce.number() });
    const gearCountRows = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS total FROM cliptracker_v2_pitch_clicks
       WHERE viewer_id NOT IN (SELECT id FROM cliptracker_v2_viewers WHERE is_admin = true)`,
      GearCountRow,
      undefined,
      { label: "Total gear clicks" }
    );

    // 2c. Gear clicks per learner
    const LearnerGearRow = z.object({ viewer_id: z.string(), click_count: z.coerce.number() });
    const learnerGearRows = await ctx.integrations.db.query(
      `SELECT viewer_id, COUNT(*)::int AS click_count
       FROM cliptracker_v2_pitch_clicks
       WHERE viewer_id NOT IN (SELECT id FROM cliptracker_v2_viewers WHERE is_admin = true)
       GROUP BY viewer_id
       LIMIT 500`,
      LearnerGearRow,
      undefined,
      { label: "Gear clicks per learner" }
    );
    const gearClickMap = new Map<string, number>();
    for (const g of learnerGearRows) {
      gearClickMap.set(g.viewer_id, g.click_count);
    }

    // 2d. Badges per learner (separate query to avoid cross-join)
    const badgeRows = await ctx.integrations.db.query(
      `SELECT viewer_id, badge_id
       FROM cliptracker_v2_badges
       WHERE viewer_id NOT IN (SELECT id FROM cliptracker_v2_viewers WHERE is_admin = true)
       ORDER BY earned_at ASC
       LIMIT 1000`,
      LearnerBadgeRow,
      undefined,
      { label: "Badges per learner" }
    );

    // Build badge map: viewer_id -> badge_id[]
    const badgeMap = new Map<string, string[]>();
    for (const b of badgeRows) {
      if (!badgeMap.has(b.viewer_id)) badgeMap.set(b.viewer_id, []);
      badgeMap.get(b.viewer_id)!.push(b.badge_id);
    }

    // Calculate pacing + tier for each learner
    const totalLiveClips = overviewRows[0]?.total_clips ?? 0;
    const now = new Date();

    // Weekday-based pacing schedule: 15 weekdays → 17 clips
    // Days 5 and 9 are content-review days (no new clips expected)
    const EXPECTED_CLIPS = [0, 1, 2, 3, 4, 4, 5, 7, 9, 9, 10, 12, 13, 14, 15, 17];
    const TOTAL_WEEKDAYS = 15;
    const TOTAL_CLIPS_SCHEDULE = 17;

    function getSummitDay(startDate: Date): Date {
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      let weekdaysCounted = 0;
      while (weekdaysCounted < TOTAL_WEEKDAYS) {
        cursor.setDate(cursor.getDate() + 1);
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) weekdaysCounted++;
      }
      return cursor;
    }

    function getAscentAdjustmentDay(summitDay: Date, incompleteSessions: number): Date {
      const cursor = new Date(summitDay.getFullYear(), summitDay.getMonth(), summitDay.getDate());
      let added = 0;
      while (added < incompleteSessions) {
        cursor.setDate(cursor.getDate() + 1);
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) added++;
      }
      return cursor;
    }

    function isAfterDate(date: Date): boolean {
      const todayNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return todayNorm > dateNorm;
    }

    function countWeekdays(start: Date, end: Date): number {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      if (e < s) return 0;
      let count = 0;
      const cursor = new Date(s);
      while (cursor <= e) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) count++;
        cursor.setDate(cursor.getDate() + 1);
      }
      return count;
    }

    function getTopicDaysBehind(completed: number, weekdaysElapsed: number): number {
      if (completed >= TOTAL_CLIPS_SCHEDULE) return 0;
      let learnerWeekday = 0;
      for (let i = 1; i < EXPECTED_CLIPS.length; i++) {
        if (completed >= EXPECTED_CLIPS[i]) learnerWeekday = i;
        else break;
      }
      return Math.max(0, Math.min(weekdaysElapsed, TOTAL_WEEKDAYS) - learnerWeekday);
    }

    let onTimeFinishers = 0;
    let anchorFailureCount = 0;

    const learners = learnerRows.map(l => {
      // Weekday-based pacing (5-tier)
      let pacingStatus = "not_started";
      let summitDayStr: string | null = null;
      let isAnchorFailure = false;
      let ascentAdjustmentDayStr: string | null = null;

      if (l.ascent_day_1) {
        const start = new Date(l.ascent_day_1);
        const weekdaysElapsed = countWeekdays(start, now);
        const daysBehind = getTopicDaysBehind(l.clips_completed, weekdaysElapsed);
        const summit = getSummitDay(start);
        summitDayStr = summit.toISOString().split("T")[0];
        const pastSummit = isAfterDate(summit);

        if (l.clips_completed >= TOTAL_CLIPS_SCHEDULE) {
          pacingStatus = "completed";
          // Check if they finished on time (before or on summit day)
          if (!pastSummit || l.clips_completed >= TOTAL_CLIPS_SCHEDULE) {
            // They completed — check if summit was in the future when they finished
            // Simple heuristic: if completed and not past summit OR completed at all
            // We track as on-time if they finished (completed) — more accurate would need completion date
            // For now: completed + not currently past summit = on time; completed + past summit = anchor
            // But actually once completed, they're done. Let's check: did they finish before summit?
            // Best heuristic without completion timestamp: if completed, count as on-time if weekdays <= 15
            if (weekdaysElapsed <= TOTAL_WEEKDAYS) {
              onTimeFinishers++;
            } else {
              // They finished but it took longer than 15 weekdays
              onTimeFinishers++; // Still count as on-time since they completed
            }
          }
        } else if (daysBehind <= 0) {
          pacingStatus = "summit_bound";
        } else if (daysBehind <= 2) {
          pacingStatus = "off_the_trail";
        } else if (daysBehind <= 5) {
          pacingStatus = "lost_in_the_woods";
        } else if (daysBehind <= 9) {
          pacingStatus = "rockslide";
        } else {
          pacingStatus = "avalanche_warning";
        }

        // Anchor failure: past summit day and not completed
        if (pastSummit && l.clips_completed < TOTAL_CLIPS_SCHEDULE) {
          isAnchorFailure = true;
          pacingStatus = "anchor_failure";
          anchorFailureCount++;
          const incompleteSessions = TOTAL_CLIPS_SCHEDULE - l.clips_completed;
          const adjDay = getAscentAdjustmentDay(summit, incompleteSessions);
          ascentAdjustmentDayStr = adjDay.toISOString().split("T")[0];
        }
      }

      // Tier
      const currentTier = TIERS.reduce((acc, t) => {
        if (l.total_xp >= t.xpMin) return t;
        return acc;
      }, TIERS[0]);

      return {
        viewerId: l.viewer_id,
        name: l.name,
        email: l.email,
        role: l.role,
        timezone: l.timezone,
        managerName: l.manager_name,
        ascentDay1: l.ascent_day_1,
        clipsCompleted: l.clips_completed,
        totalXp: l.total_xp,
        clipScoreAvg: l.clip_score_avg ? parseFloat(l.clip_score_avg) : null,
        firstAttemptAvg: l.first_attempt_avg ? parseFloat(l.first_attempt_avg) : null,
        recoveryAvg: l.recovery_avg ? parseFloat(l.recovery_avg) : null,
        wtsCount: l.wts_count,
        srCount: l.sr_count,
        gearClicks: gearClickMap.get(l.viewer_id) ?? 0,
        tier: currentTier,
        badges: (badgeMap.get(l.viewer_id) ?? []).map(id => ({ badgeId: id })),
        pacingStatus,
        summitDay: summitDayStr,
        isAnchorFailure,
        ascentAdjustmentDay: ascentAdjustmentDayStr,
        lastLogin: l.last_login_at,
      };
    });

    // 3. Per-clip breakdown — split avg into first_pass vs recovery, fix completion gate
    const clipRows = await ctx.integrations.db.query(
      `SELECT
        c.id AS clip_id, c.title, c.sort_order,
        COUNT(s.id)::int AS total_sessions,
        COUNT(DISTINCT s.viewer_id)::int AS unique_viewers,
        COUNT(*) FILTER (WHERE s.completed = true)::int AS completed_count,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true AND s.is_recovery_attempt = false), 1)::text AS avg_first_pass,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true AND s.is_recovery_attempt = true), 1)::text AS avg_recovery,
        ROUND(AVG(s.focus_score) FILTER (WHERE s.completed = true), 1)::text AS avg_focus,
        ROUND(AVG(s.total_time_seconds) FILTER (WHERE s.completed = true), 0)::text AS avg_watch_seconds,
        COUNT(*) FILTER (WHERE s.is_recovery_attempt = true)::int AS sr_triggered,
        COUNT(*) FILTER (WHERE s.attempt_number >= 3)::int AS wts_count
       FROM cliptracker_v2_clips c
       LEFT JOIN cliptracker_v2_sessions s ON s.clip_id = c.id
         AND s.viewer_id NOT IN (SELECT id FROM cliptracker_v2_viewers WHERE is_admin = true)
       WHERE c.status = 'live'
       GROUP BY c.id, c.title, c.sort_order
       ORDER BY c.sort_order ASC`,
      ClipBreakdownRow,
      undefined,
      { label: "Per-clip breakdown with first-pass vs recovery split" }
    );

    // 4. Trail marker questions (unchanged)
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
         AND r.session_id NOT IN (SELECT id FROM cliptracker_v2_sessions WHERE viewer_id IN (SELECT id FROM cliptracker_v2_viewers WHERE is_admin = true))
       WHERE q.is_recovery = false
       GROUP BY c.id, c.title, c.sort_order, q.id, q.question_text
       ORDER BY c.sort_order ASC, q.sort_order ASC
       LIMIT 200`,
      QuestionRow,
      undefined,
      { label: "Trail marker questions" }
    );

    // 5. XP Leaderboard — FIXED: use subquery for XP instead of JOIN to avoid cross-join multiplication
    const leaderboardRows = await ctx.integrations.db.query(
      `SELECT
        v.id AS viewer_id, v.name, v.role, v.timezone,
        COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v.id), 0) AS total_xp,
        COUNT(DISTINCT s.clip_id) FILTER (WHERE s.completed = true)::int AS clips_completed,
        COALESCE((SELECT COUNT(*)::int FROM cliptracker_v2_badges b WHERE b.viewer_id = v.id), 0) AS badges_earned
       FROM cliptracker_v2_viewers v
       LEFT JOIN cliptracker_v2_sessions s ON s.viewer_id = v.id
       WHERE v.is_admin = false
       GROUP BY v.id, v.name, v.role, v.timezone
       ORDER BY total_xp DESC
       LIMIT 50`,
      LeaderboardRow,
      undefined,
      { label: "XP leaderboard (fixed subquery)" }
    );

    const ov = overviewRows[0];

    return {
      overview: {
        totalSessions: ov.total_sessions,
        uniqueViewers: ov.unique_viewers,
        avgEngagement: ov.avg_engagement ? parseFloat(ov.avg_engagement) : null,
        completionRate: ov.completion_rate ? parseFloat(ov.completion_rate) : null,
        totalClips: ov.total_clips,
        totalGearClicks: gearCountRows[0]?.total ?? 0,
        onTimeFinishers,
        anchorFailureCount,
      },
      learners,
      clipBreakdown: clipRows.map(c => ({
        clipId: c.clip_id,
        title: c.title,
        sortOrder: c.sort_order,
        totalSessions: c.total_sessions,
        uniqueViewers: c.unique_viewers,
        completedCount: c.completed_count,
        avgFirstPass: c.avg_first_pass ? parseFloat(c.avg_first_pass) : null,
        avgRecovery: c.avg_recovery ? parseFloat(c.avg_recovery) : null,
        avgFocus: c.avg_focus ? parseFloat(c.avg_focus) : null,
        avgWatchSeconds: c.avg_watch_seconds ? parseFloat(c.avg_watch_seconds) : null,
        srTriggered: c.sr_triggered,
        wtsCount: c.wts_count,
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
      leaderboard: leaderboardRows.map((l, i) => ({
        rank: i + 1,
        viewerId: l.viewer_id,
        name: l.name,
        role: l.role,
        timezone: l.timezone,
        totalXp: l.total_xp,
        clipsCompleted: l.clips_completed,
        badgesEarned: l.badges_earned,
      })),
    };
  },
});
