import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TIERS = [
  { tier: 1, name: "Base Camper", emoji: "🏕️", xpMin: 0, xpMax: 149 },
  { tier: 2, name: "Trailblazer", emoji: "🥾", xpMin: 150, xpMax: 324 },
  { tier: 3, name: "Summit Seeker", emoji: "🧗🏼", xpMin: 325, xpMax: 499 },
  { tier: 4, name: "Pinnacle Achiever", emoji: "⛰️", xpMin: 500, xpMax: 699 },
  { tier: 5, name: "Alpinist All-Star", emoji: "💫", xpMin: 700, xpMax: null },
];

const EXPECTED_SESSIONS = [
  0,
  0, 0, 0, 0, 0,
  1, 2, 3, 4, 5,
  6, 7, 8, 9, 10,
  11, 12, 13, 14, 15,
];
const TOTAL_WEEKDAYS = 20;
const TOTAL_SESSIONS_SCHEDULE = 15;
const TOTAL_APPROACH_MODULES = 8;

function getSummitDay(startDate: Date, extensionDays = 0): Date {
  const totalDays = TOTAL_WEEKDAYS + extensionDays;
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let weekdaysCounted = 0;
  while (weekdaysCounted < totalDays) {
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
  if (completed >= TOTAL_SESSIONS_SCHEDULE) return 0;
  let learnerWeekday = 0;
  for (let i = 1; i < EXPECTED_SESSIONS.length; i++) {
    if (completed >= EXPECTED_SESSIONS[i]) learnerWeekday = i;
    else break;
  }
  return Math.max(0, Math.min(weekdaysElapsed, TOTAL_WEEKDAYS) - learnerWeekday);
}

// ─── Zod schemas for DB rows ─────────────────────────────────────────────────

const ViewerRow = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  timezone: z.string().nullable(),
  manager_name: z.string().nullable(),
  manager_email: z.string().nullable(),
  belay_buddy: z.string().nullable(),
  ascent_day_1: z.string().nullable(),
  extension_days: z.coerce.number(),
  last_login_at: z.string().nullable(),
  approach_checkin_sent_at: z.string().nullable(),
  week2_checkin_sent_at: z.string().nullable(),
  week3_checkin_sent_at: z.string().nullable(),
  week1_unlocked_at: z.string().nullable(),
  week1_unlock_type: z.string().nullable(),
  created_at: z.string(),
});

const XpEventRow = z.object({
  event_type: z.string(),
  xp_amount: z.coerce.number(),
  clip_id: z.string().nullable(),
  clip_title: z.string().nullable(),
  source_id: z.string().nullable(),
  created_at: z.string(),
});

const BadgeRow = z.object({
  badge_id: z.string(),
  clip_id: z.string().nullable(),
  clip_title: z.string().nullable(),
  earned_at: z.string(),
});

const ClipSessionRow = z.object({
  clip_id: z.string(),
  clip_title: z.string(),
  clip_sort_order: z.coerce.number(),
  day_label: z.string().nullable(),
  session_id: z.string(),
  attempt_number: z.coerce.number(),
  is_recovery_attempt: z.boolean(),
  engagement_score: z.string().nullable(),
  question_score: z.string().nullable(),
  focus_score: z.string().nullable(),
  completed: z.boolean(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  initial_engagement_score: z.string().nullable(),
});

const TrailMarkerRow = z.object({
  clip_id: z.string(),
  total_trail_markers: z.coerce.number(),
  correct_trail_markers: z.coerce.number(),
});

const ModuleSignoffRow = z.object({
  module_key: z.string(),
  reflection_prompt: z.string().nullable(),
  reflection_response: z.string().nullable(),
  screenshot_data: z.string().nullable(),
  screenshot_filename: z.string().nullable(),
  completed_at: z.string(),
});

const AcademyRow = z.object({
  course_key: z.string(),
  screenshot_data: z.string().nullable(),
  screenshot_filename: z.string().nullable(),
  uploaded_at: z.string(),
});

const WdRow = z.object({
  product: z.string(),
  scenario: z.string().nullable(),
  score: z.coerce.number().nullable(),
  completed_at: z.string(),
});

const TopicReflectionRow = z.object({
  topic_day: z.string(),
  question_1: z.string().nullable(),
  answer_1: z.string().nullable(),
  question_2: z.string().nullable(),
  answer_2: z.string().nullable(),
  submitted_at: z.string(),
});

const CheckinReflectionRow = z.object({
  checkin_type: z.string(),
  learner_reflection: z.string().nullable(),
  sent_at: z.string(),
});

const GearClickRow = z.object({
  pitch_name: z.string(),
  clicked_at: z.string(),
});

const ModalRow = z.object({
  modal_type: z.string(),
  action: z.string(),
  metadata: z.unknown().nullable(),
  created_at: z.string(),
});

const TopicsCompletedRow = z.object({
  topics_completed: z.coerce.number(),
});

const LeaderboardRankRow = z.object({
  rank: z.coerce.number(),
  total_xp: z.coerce.number(),
});

export default api({
  name: "GetLearnerDetail",
  description: "Fetches all data for a single learner: profile, XP, badges, clip sessions, approach, journals, gear clicks, modal interactions",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    viewer: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      timezone: z.string().nullable(),
      managerName: z.string().nullable(),
      managerEmail: z.string().nullable(),
      belayBuddy: z.string().nullable(),
      ascentDay1: z.string().nullable(),
      extensionDays: z.number(),
      lastLoginAt: z.string().nullable(),
      approachCheckinSentAt: z.string().nullable(),
      week2CheckinSentAt: z.string().nullable(),
      week3CheckinSentAt: z.string().nullable(),
      week1UnlockedAt: z.string().nullable(),
      week1UnlockType: z.string().nullable(),
      memberSince: z.string(),
    }),
    pacing: z.object({
      status: z.string(),
      summitDay: z.string().nullable(),
      isAnchorFailure: z.boolean(),
      ascentAdjustmentDay: z.string().nullable(),
      topicsCompleted: z.number(),
      daysBehind: z.number(),
    }),
    xp: z.object({
      total: z.number(),
      base: z.number(),
      milestones: z.number(),
      bonuses: z.number(),
      events: z.array(z.object({
        eventType: z.string(),
        xpAmount: z.number(),
        clipId: z.string().nullable(),
        clipTitle: z.string().nullable(),
        sourceId: z.string().nullable(),
        createdAt: z.string(),
      })),
    }),
    tier: z.object({
      tier: z.number(),
      name: z.string(),
      emoji: z.string(),
      xpMin: z.number(),
      xpMax: z.number().nullable(),
      progressPercent: z.number(),
    }),
    leaderboardRank: z.number(),
    badges: z.array(z.object({
      badgeId: z.string(),
      clipId: z.string().nullable(),
      clipTitle: z.string().nullable(),
      earnedAt: z.string(),
    })),
    clips: z.array(z.object({
      clipId: z.string(),
      clipTitle: z.string(),
      clipSortOrder: z.number(),
      dayLabel: z.string().nullable(),
      completed: z.boolean(),
      totalAttempts: z.number(),
      bestEngagement: z.number().nullable(),
      latestEngagement: z.number().nullable(),
      trailMarkersCorrect: z.number(),
      trailMarkersTotal: z.number(),
      firstAttemptEngagement: z.number().nullable(),
      srTriggered: z.boolean(),
      srScore: z.number().nullable(),
      wtsTriggered: z.boolean(),
      sessions: z.array(z.object({
        sessionId: z.string(),
        attemptNumber: z.number(),
        isRecovery: z.boolean(),
        engagementScore: z.number().nullable(),
        questionScore: z.number().nullable(),
        focusScore: z.number().nullable(),
        completed: z.boolean(),
        startedAt: z.string(),
        endedAt: z.string().nullable(),
        initialEngagementScore: z.number().nullable(),
      })),
    })),
    approach: z.object({
      completedCount: z.number(),
      totalModules: z.number(),
      isComplete: z.boolean(),
      modules: z.array(z.object({
        moduleKey: z.string(),
        reflectionPrompt: z.string().nullable(),
        reflectionResponse: z.string().nullable(),
        screenshotData: z.string().nullable(),
        screenshotFilename: z.string().nullable(),
        completedAt: z.string(),
      })),
      academyScreenshots: z.array(z.object({
        courseKey: z.string(),
        screenshotData: z.string().nullable(),
        screenshotFilename: z.string().nullable(),
        uploadedAt: z.string(),
      })),
      wdVerifications: z.array(z.object({
        product: z.string(),
        scenario: z.string().nullable(),
        score: z.number().nullable(),
        completedAt: z.string(),
      })),
    }),
    journals: z.array(z.object({
      topicDay: z.string(),
      question1: z.string().nullable(),
      answer1: z.string().nullable(),
      question2: z.string().nullable(),
      answer2: z.string().nullable(),
      submittedAt: z.string(),
    })),
    checkinReflections: z.array(z.object({
      checkinType: z.string(),
      learnerReflection: z.string().nullable(),
      sentAt: z.string(),
    })),
    gearClicks: z.array(z.object({
      pitchName: z.string(),
      clickedAt: z.string(),
    })),
    modalInteractions: z.array(z.object({
      modalType: z.string(),
      action: z.string(),
      metadata: z.unknown().nullable(),
      createdAt: z.string(),
    })),
    clipsCompleted: z.number(),
    totalLiveClips: z.number(),
  }),

  async run(ctx, { viewerId }) {
    const now = new Date();

    // Fire all queries in parallel
    const [
      viewerRows,
      xpRows,
      badgeRows,
      sessionRows,
      moduleRows,
      academyRows,
      wdRows,
      journalRows,
      checkinRows,
      gearRows,
      modalRows,
      topicsRows,
      rankRows,
      liveClipCountRows,
      trailMarkerRows,
    ] = await Promise.all([
      // 1. Viewer info
      ctx.integrations.db.query(
        `SELECT id, name, email, role, timezone, manager_name, manager_email, belay_buddy,
                ascent_day_1::text, COALESCE(extension_days, 0)::int AS extension_days,
                last_login_at::text, approach_checkin_sent_at::text,
                week2_checkin_sent_at::text, week3_checkin_sent_at::text,
                week1_unlocked_at::text, week1_unlock_type, created_at::text
         FROM cliptracker_v2_viewers WHERE id = $1`,
        ViewerRow,
        [viewerId],
        { label: "Fetch viewer profile" }
      ),

      // 2. XP events (most recent first, capped)
      ctx.integrations.db.query(
        `SELECT x.event_type, x.xp_amount, x.clip_id::text,
                c.title AS clip_title, x.source_id, x.created_at::text
         FROM cliptracker_v2_xp_events x
         LEFT JOIN cliptracker_v2_clips c ON c.id = x.clip_id
         WHERE x.viewer_id = $1
         ORDER BY x.created_at DESC
         LIMIT 500`,
        XpEventRow,
        [viewerId],
        { label: "Fetch XP events" }
      ),

      // 3. Badges
      ctx.integrations.db.query(
        `SELECT b.badge_id, b.clip_id::text, c.title AS clip_title, b.earned_at::text
         FROM cliptracker_v2_badges b
         LEFT JOIN cliptracker_v2_clips c ON c.id = b.clip_id
         WHERE b.viewer_id = $1
         ORDER BY b.earned_at ASC`,
        BadgeRow,
        [viewerId],
        { label: "Fetch badges" }
      ),

      // 4. All clip sessions (grouped later in JS)
      ctx.integrations.db.query(
        `SELECT s.clip_id::text, c.title AS clip_title, c.sort_order AS clip_sort_order,
                c.day_label, s.id::text AS session_id,
                s.attempt_number, s.is_recovery_attempt,
                s.engagement_score::text, s.question_score::text, s.focus_score::text,
                s.completed, s.started_at::text, s.ended_at::text,
                s.initial_engagement_score::text
         FROM cliptracker_v2_sessions s
         JOIN cliptracker_v2_clips c ON c.id = s.clip_id
         WHERE s.viewer_id = $1
         ORDER BY c.sort_order ASC, s.started_at ASC
         LIMIT 1000`,
        ClipSessionRow,
        [viewerId],
        { label: "Fetch clip sessions" }
      ),

      // 5. Module signoffs (approach)
      ctx.integrations.db.query(
        `SELECT module_key, reflection_prompt, reflection_response,
                screenshot_data, screenshot_filename, completed_at::text
         FROM cliptracker_v2_module_signoffs
         WHERE viewer_id = $1
         ORDER BY completed_at ASC`,
        ModuleSignoffRow,
        [viewerId],
        { label: "Fetch module signoffs" }
      ),

      // 6. Academy screenshots
      ctx.integrations.db.query(
        `SELECT course_key, screenshot_data, screenshot_filename, uploaded_at::text
         FROM cliptracker_v2_academy_screenshots
         WHERE viewer_id = $1
         ORDER BY uploaded_at ASC`,
        AcademyRow,
        [viewerId],
        { label: "Fetch academy screenshots" }
      ),

      // 7. WD verifications
      ctx.integrations.db.query(
        `SELECT product, scenario, score, completed_at::text
         FROM cliptracker_v2_wd_verifications
         WHERE viewer_id = $1
         ORDER BY completed_at ASC`,
        WdRow,
        [viewerId],
        { label: "Fetch WD verifications" }
      ),

      // 8. Topic/day reflections (journals)
      ctx.integrations.db.query(
        `SELECT topic_day, question_1, answer_1, question_2, answer_2, submitted_at::text
         FROM cliptracker_v2_topic_reflections
         WHERE viewer_id = $1
         ORDER BY submitted_at ASC`,
        TopicReflectionRow,
        [viewerId],
        { label: "Fetch topic reflections" }
      ),

      // 9. Check-in reflections (conditional column)
      ctx.integrations.db.query(
        `SELECT checkin_type,
                (CASE WHEN EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'cliptracker_v2_checkin_emails'
                  AND column_name = 'learner_reflection'
                ) THEN learner_reflection ELSE NULL END) AS learner_reflection,
                sent_at::text
         FROM cliptracker_v2_checkin_emails
         WHERE viewer_id = $1
         ORDER BY sent_at ASC`,
        CheckinReflectionRow,
        [viewerId],
        { label: "Fetch check-in reflections" }
      ),

      // 10. Gear clicks
      ctx.integrations.db.query(
        `SELECT pitch_name, clicked_at::text
         FROM cliptracker_v2_pitch_clicks
         WHERE viewer_id = $1
         ORDER BY clicked_at DESC
         LIMIT 200`,
        GearClickRow,
        [viewerId],
        { label: "Fetch gear clicks" }
      ),

      // 11. Modal interactions
      ctx.integrations.db.query(
        `SELECT modal_type, action, metadata, created_at::text
         FROM cliptracker_v2_modal_interactions
         WHERE viewer_id = $1
         ORDER BY created_at DESC
         LIMIT 200`,
        ModalRow,
        [viewerId],
        { label: "Fetch modal interactions" }
      ),

      // 12. Topics completed (for pacing)
      ctx.integrations.db.query(
        `WITH clip_days AS (
          SELECT id, day_label FROM cliptracker_v2_clips WHERE status = 'live'
        ),
        session_completions AS (
          SELECT clip_id FROM cliptracker_v2_sessions
          WHERE viewer_id = $1 AND completed = true
          GROUP BY clip_id
        ),
        resource_completions AS (
          SELECT x.clip_id
          FROM cliptracker_v2_xp_events x
          JOIN cliptracker_v2_clips c ON c.id = x.clip_id
          WHERE x.viewer_id = $1 AND x.event_type = 'swiss_army_knife' AND c.status = 'live'
        ),
        learner_completions AS (
          SELECT clip_id FROM session_completions
          UNION
          SELECT clip_id FROM resource_completions
        ),
        day_totals AS (
          SELECT day_label, COUNT(*) AS total FROM clip_days GROUP BY day_label
        ),
        learner_day_completions AS (
          SELECT cd.day_label, COUNT(*) AS completed
          FROM learner_completions lc
          JOIN clip_days cd ON cd.id = lc.clip_id
          GROUP BY cd.day_label
        )
        SELECT COALESCE(COUNT(*)::int, 0) AS topics_completed
        FROM learner_day_completions ldc
        JOIN day_totals dt ON dt.day_label = ldc.day_label
        WHERE ldc.completed >= dt.total`,
        TopicsCompletedRow,
        [viewerId],
        { label: "Topics completed for pacing" }
      ),

      // 13. Leaderboard rank + total XP check
      ctx.integrations.db.query(
        `SELECT
           COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events WHERE viewer_id = $1), 0) AS total_xp,
           (SELECT COUNT(*) + 1 FROM cliptracker_v2_viewers v2
            WHERE COALESCE(v2.is_admin, false) = false
              AND COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v2.id), 0)
                > COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events WHERE viewer_id = $1), 0)
           )::int AS rank`,
        LeaderboardRankRow,
        [viewerId],
        { label: "Leaderboard rank" }
      ),

      // 14. Total live clips
      ctx.integrations.db.query(
        `SELECT COUNT(*)::int AS topics_completed FROM cliptracker_v2_clips WHERE status = 'live'`,
        z.object({ topics_completed: z.coerce.number() }),
        undefined,
        { label: "Total live clips" }
      ),

      // 15. Trail markers per clip (non-recovery questions only, first attempt only)
      ctx.integrations.db.query(
        `SELECT q.clip_id::text AS clip_id,
                COUNT(DISTINCT q.id)::int AS total_trail_markers,
                COUNT(DISTINCT q.id) FILTER (WHERE r.is_correct)::int AS correct_trail_markers
         FROM cliptracker_v2_questions q
         JOIN cliptracker_v2_clips c ON c.id = q.clip_id
         LEFT JOIN cliptracker_v2_responses r ON r.question_id = q.id
           AND r.session_id IN (
             SELECT s.id FROM cliptracker_v2_sessions s
             WHERE s.viewer_id = $1 AND s.is_recovery_attempt = false
           )
         WHERE c.status = 'live' AND q.is_recovery = false
         GROUP BY q.clip_id`,
        TrailMarkerRow,
        [viewerId],
        { label: "Trail markers per clip" }
      ),
    ]);

    const viewer = viewerRows[0];
    if (!viewer) throw new Error(`Viewer ${viewerId} not found`);

    // ─── XP breakdown ───────────────────────────────────────────────────────
    const xpByType: Record<string, number> = {};
    let totalXp = 0;
    for (const e of xpRows) {
      xpByType[e.event_type] = (xpByType[e.event_type] ?? 0) + e.xp_amount;
      totalXp += e.xp_amount;
    }

    // ─── Tier ───────────────────────────────────────────────────────────────
    const currentTier = TIERS.reduce((acc, t) => (totalXp >= t.xpMin ? t : acc), TIERS[0]);
    const currentIdx = TIERS.findIndex(t => t.tier === currentTier.tier);
    const nextTier = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
    let progressPercent = 100;
    if (nextTier) {
      const range = nextTier.xpMin - currentTier.xpMin;
      progressPercent = Math.min(Math.round(((totalXp - currentTier.xpMin) / range) * 100), 100);
    }

    // ─── Pacing ─────────────────────────────────────────────────────────────
    const topicsCompleted = topicsRows[0]?.topics_completed ?? 0;
    let pacingStatus = "not_started";
    let summitDayStr: string | null = null;
    let isAnchorFailure = false;
    let ascentAdjustmentDayStr: string | null = null;
    let daysBehind = 0;

    if (viewer.ascent_day_1) {
      const start = new Date(viewer.ascent_day_1);
      const extDays = viewer.extension_days;
      const weekdaysElapsed = countWeekdays(start, now);
      const effectiveWeekdaysElapsed = Math.max(0, weekdaysElapsed - extDays);
      daysBehind = getTopicDaysBehind(topicsCompleted, effectiveWeekdaysElapsed);
      const summit = getSummitDay(start, extDays);
      summitDayStr = summit.toISOString().split("T")[0];
      const todayNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const summitNorm = new Date(summit.getFullYear(), summit.getMonth(), summit.getDate());
      const pastSummit = todayNorm > summitNorm;

      if (topicsCompleted >= TOTAL_SESSIONS_SCHEDULE) {
        pacingStatus = "completed";
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

      if (pastSummit && topicsCompleted < TOTAL_SESSIONS_SCHEDULE) {
        isAnchorFailure = true;
        pacingStatus = "anchor_failure";
        const incompleteTopics = TOTAL_SESSIONS_SCHEDULE - topicsCompleted;
        const adjDay = getAscentAdjustmentDay(summit, incompleteTopics);
        ascentAdjustmentDayStr = adjDay.toISOString().split("T")[0];
      }
    }

    // ─── Approach completion count ──────────────────────────────────────────
    const approachModuleKeys = new Set(moduleRows.map(m => m.module_key));
    // Filter to only the 3 valid module keys
    const validKeys = new Set(["meddpicc", "challenger", "camp101"]);
    const uniqueModuleKeys = new Set([...approachModuleKeys].filter(k => validKeys.has(k)));
    const validAcademyCourses = new Set(["analytics", "experiment", "session_replay", "guides_surveys"]);
    const uniqueAcademyKeys = new Set(academyRows.map(a => a.course_key).filter(k => validAcademyCourses.has(k)));
    const hasWd = wdRows.length > 0;
    const approachCompletedCount = uniqueModuleKeys.size + uniqueAcademyKeys.size + (hasWd ? 1 : 0);

    // ─── Clips: group sessions by clip ─────────────────────────────────────
    const clipMap = new Map<string, {
      clipId: string;
      clipTitle: string;
      clipSortOrder: number;
      dayLabel: string | null;
      sessions: typeof sessionRows;
    }>();

    for (const s of sessionRows) {
      if (!clipMap.has(s.clip_id)) {
        clipMap.set(s.clip_id, {
          clipId: s.clip_id,
          clipTitle: s.clip_title,
          clipSortOrder: s.clip_sort_order,
          dayLabel: s.day_label,
          sessions: [],
        });
      }
      clipMap.get(s.clip_id)!.sessions.push(s);
    }

    // Build trail marker lookup
    const trailMarkerMap = new Map<string, { correct: number; total: number }>();
    for (const tm of trailMarkerRows) {
      trailMarkerMap.set(tm.clip_id, { correct: tm.correct_trail_markers, total: tm.total_trail_markers });
    }

    const clips = Array.from(clipMap.values())
      .sort((a, b) => a.clipSortOrder - b.clipSortOrder)
      .map(c => {
        const completedSessions = c.sessions.filter(s => s.completed);
        const completed = completedSessions.length > 0;
        const engagementScores = completedSessions
          .map(s => (s.engagement_score ? parseFloat(s.engagement_score) : null))
          .filter((n): n is number => n !== null);
        const bestEngagement = engagementScores.length > 0 ? Math.max(...engagementScores) : null;
        const latestCompleted = completedSessions[completedSessions.length - 1];
        const latestEngagement = latestCompleted?.engagement_score
          ? parseFloat(latestCompleted.engagement_score)
          : null;

        // Trail markers for this clip
        const tm = trailMarkerMap.get(c.clipId) ?? { correct: 0, total: 0 };

        // First (non-recovery) attempt engagement
        const firstAttemptSession = c.sessions.find(s => !s.is_recovery_attempt && s.completed);
        const firstAttemptEngagement = firstAttemptSession?.engagement_score
          ? parseFloat(firstAttemptSession.engagement_score)
          : null;

        // S&R: was a recovery session triggered?
        const srSession = c.sessions.find(s => s.is_recovery_attempt);
        const srTriggered = !!srSession;
        const srCompletedSession = c.sessions.find(s => s.is_recovery_attempt && s.completed);
        const srScore = srCompletedSession?.engagement_score
          ? parseFloat(srCompletedSession.engagement_score)
          : null;

        // WtS: triggered when attempt_number >= 3
        const wtsTriggered = c.sessions.some(s => s.attempt_number >= 3);

        return {
          clipId: c.clipId,
          clipTitle: c.clipTitle,
          clipSortOrder: c.clipSortOrder,
          dayLabel: c.dayLabel,
          completed,
          totalAttempts: c.sessions.length,
          bestEngagement,
          latestEngagement,
          trailMarkersCorrect: tm.correct,
          trailMarkersTotal: tm.total,
          firstAttemptEngagement,
          srTriggered,
          srScore,
          wtsTriggered,
          sessions: c.sessions.map(s => ({
            sessionId: s.session_id,
            attemptNumber: s.attempt_number,
            isRecovery: s.is_recovery_attempt,
            engagementScore: s.engagement_score ? parseFloat(s.engagement_score) : null,
            questionScore: s.question_score ? parseFloat(s.question_score) : null,
            focusScore: s.focus_score ? parseFloat(s.focus_score) : null,
            completed: s.completed,
            startedAt: s.started_at,
            endedAt: s.ended_at,
            initialEngagementScore: s.initial_engagement_score ? parseFloat(s.initial_engagement_score) : null,
          })),
        };
      });

    // Clips completed (from sessions + resource-day XP events)
    const sessionCompletedClips = new Set(
      sessionRows.filter(s => s.completed).map(s => s.clip_id)
    );
    const resourceDayClips = new Set(
      xpRows.filter(e => e.event_type === "swiss_army_knife" && e.clip_id).map(e => e.clip_id!)
    );
    const clipsCompleted = new Set([...sessionCompletedClips, ...resourceDayClips]).size;

    const totalLiveClips = liveClipCountRows[0]?.topics_completed ?? 0;

    return {
      viewer: {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        role: viewer.role,
        timezone: viewer.timezone,
        managerName: viewer.manager_name,
        managerEmail: viewer.manager_email,
        belayBuddy: viewer.belay_buddy,
        ascentDay1: viewer.ascent_day_1,
        extensionDays: viewer.extension_days,
        lastLoginAt: viewer.last_login_at,
        approachCheckinSentAt: viewer.approach_checkin_sent_at,
        week2CheckinSentAt: viewer.week2_checkin_sent_at,
        week3CheckinSentAt: viewer.week3_checkin_sent_at,
        week1UnlockedAt: viewer.week1_unlocked_at,
        week1UnlockType: viewer.week1_unlock_type,
        memberSince: viewer.created_at,
      },
      pacing: {
        status: pacingStatus,
        summitDay: summitDayStr,
        isAnchorFailure,
        ascentAdjustmentDay: ascentAdjustmentDayStr,
        topicsCompleted,
        daysBehind,
      },
      xp: {
        total: totalXp,
        base: xpByType.base ?? 0,
        milestones: xpByType.milestone ?? 0,
        bonuses: (xpByType.performance ?? 0) + (xpByType.streak ?? 0) + (xpByType.pace ?? 0),
        events: xpRows.map(e => ({
          eventType: e.event_type,
          xpAmount: e.xp_amount,
          clipId: e.clip_id,
          clipTitle: e.clip_title,
          sourceId: e.source_id,
          createdAt: e.created_at,
        })),
      },
      tier: { ...currentTier, progressPercent },
      leaderboardRank: rankRows[0]?.rank ?? 1,
      badges: badgeRows.map(b => ({
        badgeId: b.badge_id,
        clipId: b.clip_id,
        clipTitle: b.clip_title,
        earnedAt: b.earned_at,
      })),
      clips,
      approach: {
        completedCount: approachCompletedCount,
        totalModules: TOTAL_APPROACH_MODULES,
        isComplete: approachCompletedCount >= TOTAL_APPROACH_MODULES,
        modules: moduleRows.map(m => ({
          moduleKey: m.module_key,
          reflectionPrompt: m.reflection_prompt,
          reflectionResponse: m.reflection_response,
          screenshotData: m.screenshot_data,
          screenshotFilename: m.screenshot_filename,
          completedAt: m.completed_at,
        })),
        academyScreenshots: academyRows.map(a => ({
          courseKey: a.course_key,
          screenshotData: a.screenshot_data,
          screenshotFilename: a.screenshot_filename,
          uploadedAt: a.uploaded_at,
        })),
        wdVerifications: wdRows.map(w => ({
          product: w.product,
          scenario: w.scenario,
          score: w.score,
          completedAt: w.completed_at,
        })),
      },
      journals: journalRows.map(j => ({
        topicDay: j.topic_day,
        question1: j.question_1,
        answer1: j.answer_1,
        question2: j.question_2,
        answer2: j.answer_2,
        submittedAt: j.submitted_at,
      })),
      checkinReflections: checkinRows.map(c => ({
        checkinType: c.checkin_type,
        learnerReflection: c.learner_reflection,
        sentAt: c.sent_at,
      })),
      gearClicks: gearRows.map(g => ({
        pitchName: g.pitch_name,
        clickedAt: g.clicked_at,
      })),
      modalInteractions: modalRows.map(m => ({
        modalType: m.modal_type,
        action: m.action,
        metadata: m.metadata,
        createdAt: m.created_at,
      })),
      clipsCompleted,
      totalLiveClips,
    };
  },
});
