import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TIERS = [
  { tier: 1, name: "Base Camper", emoji: "🏕️", xpMin: 0, xpMax: 149 },
  { tier: 2, name: "Trailblazer", emoji: "🥾", xpMin: 150, xpMax: 324 },
  { tier: 3, name: "Summit Seeker", emoji: "🧗🏼", xpMin: 325, xpMax: 499 },
  { tier: 4, name: "Pinnacle Achiever", emoji: "⛰️", xpMin: 500, xpMax: 699 },
  { tier: 5, name: "Alpinist All-Star", emoji: "💫", xpMin: 700, xpMax: null },
];

// ─── Row schemas ──────────────────────────────────────────────────────────────

const LeaderboardRow = z.object({
  viewer_id: z.string(),
  name: z.string(),
  role: z.string(),
  timezone: z.string().nullable(),
  ascent_day_1: z.string().nullable(),
  extension_days: z.coerce.number(),
  total_xp: z.coerce.number(),
  clips_completed: z.coerce.number(),
  badges_earned: z.coerce.number(),
});

const ClipsDoneRow = z.object({
  viewer_id: z.string(),
  clips_done: z.coerce.number(),
});

const ApproachCountRow = z.object({
  viewer_id: z.string(),
  approach_items: z.coerce.number(),
});

// ─── Pacing helpers (clip-level % brackets) ───────────────────────────────────

// Cumulative CLIPS expected by weekday (individual clips, not topics)
const CLIPS_EXPECTED_BY_WEEKDAY = [
  0,   // 0 weekdays elapsed
  0, 0, 0, 0, 0,            // weekdays 1-5: Approach (no clips)
  2, 3, 4, 5, 6,            // weekdays 6-10
  7, 9, 11, 12, 13,         // weekdays 11-15
  15, 16, 17, 18, 20,       // weekdays 16-20
];
const WEEK1_EXPECTED_BY_DAY = [0, 2, 4, 5, 6, 7];
const WEEK1_TOTAL = 7;
const TOTAL_APPROACH_MODULES = 8; // meddpicc + camp101 + challenger + 4 academies + W&D
const TOTAL_WEEKDAYS = 20;
const TOTAL_ASCENT_CLIPS = 20;

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

function getSummitDay(startDate: Date, extensionDays: number = 0): Date {
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

function isAfterDate(date: Date, now: Date): boolean {
  const todayNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return todayNorm > dateNorm;
}

function computeClipPacingPercent(
  weekdaysElapsed: number,
  approachDone: number,
  clipsDone: number,
): number {
  const capped = Math.min(Math.max(weekdaysElapsed, 0), TOTAL_WEEKDAYS);
  const approachExpected = capped >= 5 ? WEEK1_TOTAL : (WEEK1_EXPECTED_BY_DAY[capped] ?? 0);
  const clipsExpected = CLIPS_EXPECTED_BY_WEEKDAY[capped] ?? TOTAL_ASCENT_CLIPS;
  const totalExpected = approachExpected + clipsExpected;
  if (totalExpected <= 0) return 100;
  const totalDone = Math.min(approachDone, WEEK1_TOTAL) + Math.min(clipsDone, TOTAL_ASCENT_CLIPS);
  return Math.round((totalDone / totalExpected) * 100);
}

function computePacingStatusFromPercent(
  percent: number,
  allComplete: boolean,
  pastSummitDay: boolean,
): string {
  if (allComplete) return "completed";
  if (pastSummitDay) return "anchor_failure";
  if (percent >= 90) return "summit_bound";
  if (percent >= 80) return "off_the_trail";
  if (percent >= 70) return "lost_in_the_woods";
  if (percent >= 60) return "rockslide";
  if (percent >= 50) return "avalanche_warning";
  return "anchor_failure";
}

// ─── API ──────────────────────────────────────────────────────────────────────

export default api({
  name: "GetPublicLeaderboard",
  description: "Public XP leaderboard with pacing status for all non-admin learners",

  integrations: {
    apps_database: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    leaderboard: z.array(z.object({
      rank: z.number(),
      viewerId: z.string(),
      name: z.string(),
      role: z.string(),
      timezone: z.string().nullable(),
      totalXp: z.number(),
      clipsCompleted: z.number(),
      badgesEarned: z.number(),
      pacingStatus: z.string(),
      tierName: z.string(),
      tierEmoji: z.string(),
    })),
  }),

  async run(ctx) {
    // 1. Leaderboard rows (same query as admin, plus ascent_day_1/extension_days for pacing)
    const rows = await ctx.integrations.apps_database.query(
      `SELECT
        v.id AS viewer_id, v.name, v.role, v.timezone,
        v.ascent_day_1::text AS ascent_day_1,
        COALESCE(v.extension_days, 0)::int AS extension_days,
        COALESCE((SELECT SUM(xp_amount)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v.id), 0) AS total_xp,
        (COUNT(DISTINCT s.clip_id) FILTER (WHERE s.completed = true)
         + COALESCE((SELECT COUNT(*)::int FROM cliptracker_v2_xp_events x WHERE x.viewer_id = v.id AND x.event_type = 'swiss_army_knife'), 0)
        )::int AS clips_completed,
        COALESCE((SELECT COUNT(*)::int FROM cliptracker_v2_badges b WHERE b.viewer_id = v.id), 0) AS badges_earned
       FROM cliptracker_v2_viewers v
       LEFT JOIN cliptracker_v2_sessions s ON s.viewer_id = v.id
       WHERE v.is_admin = false
       GROUP BY v.id, v.name, v.role, v.timezone, v.ascent_day_1, v.extension_days
       ORDER BY total_xp DESC
       LIMIT 50`,
      LeaderboardRow,
      undefined,
      { label: "Public leaderboard rows" }
    );

    // 2. Individual clips completed per viewer (clip-level pacing)
    const clipsDoneRows = await ctx.integrations.apps_database.query(
      `WITH session_completions AS (
        SELECT DISTINCT s.viewer_id, s.clip_id
        FROM cliptracker_v2_sessions s
        JOIN cliptracker_v2_clips c ON c.id = s.clip_id
        WHERE s.completed = true AND c.status = 'live'
      ),
      resource_completions AS (
        SELECT DISTINCT x.viewer_id, x.clip_id
        FROM cliptracker_v2_xp_events x
        JOIN cliptracker_v2_clips c ON c.id = x.clip_id
        WHERE x.event_type = 'swiss_army_knife' AND c.status = 'live'
      ),
      all_completions AS (
        SELECT viewer_id, clip_id FROM session_completions
        UNION
        SELECT viewer_id, clip_id FROM resource_completions
      )
      SELECT viewer_id, COUNT(*)::int AS clips_done
      FROM all_completions
      GROUP BY viewer_id
      LIMIT 500`,
      ClipsDoneRow,
      undefined,
      { label: "Individual clips done per learner" }
    );

    // 3. Approach items completed per viewer
    const approachRows = await ctx.integrations.apps_database.query(
      `SELECT
        v.id AS viewer_id,
        (
          (SELECT COUNT(*)::int FROM cliptracker_v2_module_signoffs ms
           WHERE ms.viewer_id = v.id AND ms.module_key IN ('meddpicc', 'challenger'))
          +
          (SELECT COUNT(*)::int FROM cliptracker_v2_academy_screenshots acs
           WHERE acs.viewer_id = v.id AND acs.course_key IN ('analytics', 'experiment', 'session_replay', 'guides_surveys'))
          +
          (SELECT CASE WHEN EXISTS (SELECT 1 FROM cliptracker_v2_wd_verifications wd WHERE wd.viewer_id = v.id) THEN 1 ELSE 0 END)
        )::int AS approach_items
       FROM cliptracker_v2_viewers v
       WHERE v.is_admin = false
       LIMIT 100`,
      ApproachCountRow,
      undefined,
      { label: "Approach items per learner" }
    );

    const clipsDoneMap = new Map<string, number>();
    for (const c of clipsDoneRows) clipsDoneMap.set(c.viewer_id, c.clips_done);

    const approachMap = new Map<string, number>();
    for (const a of approachRows) approachMap.set(a.viewer_id, a.approach_items);

    const now = new Date();

    return {
      leaderboard: rows.map((r, i) => {
        const clipsDone = clipsDoneMap.get(r.viewer_id) ?? 0;
        const approachDone = approachMap.get(r.viewer_id) ?? 0;
        // Completed = all 20 clips + approach done (legacy learners have approachDone=0, exempt)
        const allComplete = clipsDone >= TOTAL_ASCENT_CLIPS
          && (approachDone >= TOTAL_APPROACH_MODULES || approachDone === 0);

        let pacingStatus = "not_started";
        if (r.ascent_day_1 || approachDone > 0 || clipsDone > 0) {
          const start = r.ascent_day_1 ? new Date(r.ascent_day_1) : new Date(now);
          const weekdaysElapsed = countWeekdays(start, now);
          const effectiveWeekdays = Math.max(0, weekdaysElapsed - r.extension_days);
          const pastSummitDay = r.ascent_day_1
            ? isAfterDate(getSummitDay(new Date(r.ascent_day_1), r.extension_days), now)
            : false;
          const percent = computeClipPacingPercent(effectiveWeekdays, approachDone, clipsDone);
          pacingStatus = computePacingStatusFromPercent(percent, allComplete, pastSummitDay);
        }

        const currentTier = TIERS.reduce((acc, t) => (r.total_xp >= t.xpMin ? t : acc), TIERS[0]);

        return {
          rank: i + 1,
          viewerId: r.viewer_id,
          name: r.name,
          role: r.role,
          timezone: r.timezone,
          totalXp: r.total_xp,
          clipsCompleted: r.clips_completed,
          badgesEarned: r.badges_earned,
          pacingStatus,
          tierName: currentTier.name,
          tierEmoji: currentTier.emoji,
        };
      }),
    };
  },
});
