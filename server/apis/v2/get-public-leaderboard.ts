import { api, z, postgres } from "@superblocksteam/sdk-api";
import {
  getEffectiveClipTotal,
  getClipsExpectedByWeekday,
  getTotalWeekdays,
  getRoleGroup,
  TOTAL_ASCENT_CLIPS_SDR,
  type RoleGroup,
} from "./pacing-helpers.js";

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

const MaxSortRow = z.object({
  viewer_id: z.string(),
  max_sort_done: z.coerce.number(),
});

// ─── Pacing helpers (clip-level % brackets) ───────────────────────────────────

const WEEK1_EXPECTED_BY_DAY = [0, 2, 4, 5, 6, 7];
const WEEK1_TOTAL = 7;
const TOTAL_APPROACH_MODULES = 8; // meddpicc + camp101 + challenger + 4 academies + W&D

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

function getSummitDay(startDate: Date, totalWeekdays: number, extensionDays: number = 0): Date {
  const totalDays = totalWeekdays + extensionDays;
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
  role: string,
  effectiveTotal: number,
): number {
  const totalWeekdays = getTotalWeekdays(role);
  const schedule = getClipsExpectedByWeekday(role);
  const capped = Math.min(Math.max(weekdaysElapsed, 0), totalWeekdays);
  const approachExpected = capped >= 5 ? WEEK1_TOTAL : (WEEK1_EXPECTED_BY_DAY[capped] ?? 0);
  const clipsExpected = schedule[capped] ?? effectiveTotal;
  const totalExpected = approachExpected + clipsExpected;
  if (totalExpected <= 0) return 100;
  const totalDone = Math.min(approachDone, WEEK1_TOTAL) + Math.min(clipsDone, effectiveTotal);
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
      roleGroup: z.string(),
      timezone: z.string().nullable(),
      totalXp: z.number(),
      xpPct: z.number(),
      maxXp: z.number(),
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

    // 2. Max sort_order completed per viewer (for legacy exemptions)
    const maxSortRows = await ctx.integrations.apps_database.query(
      `SELECT s.viewer_id, MAX(c.sort_order)::int AS max_sort_done
       FROM cliptracker_v2_sessions s
       JOIN cliptracker_v2_clips c ON c.id = s.clip_id
       WHERE s.completed = true AND c.status = 'live'
       GROUP BY s.viewer_id
       LIMIT 500`,
      MaxSortRow,
      undefined,
      { label: "Max sort_order completed per learner" }
    );

    const maxSortMap = new Map<string, number>();
    for (const m of maxSortRows) maxSortMap.set(m.viewer_id, m.max_sort_done);

    // 3. Individual clips completed per viewer (clip-level pacing)
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

    // 4. Approach items completed per viewer
    const approachRows = await ctx.integrations.apps_database.query(
      `SELECT
        v.id AS viewer_id,
        (
          (SELECT COUNT(*)::int FROM cliptracker_v2_module_signoffs ms
           WHERE ms.viewer_id = v.id AND ms.module_key IN ('meddpicc', 'challenger', 'camp101'))
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

    // Compute max XP per role group (AE/PSM/Renewals share ~963, SDR needs calculation)
    // For now, use known constants. SDR max is calculated from their 16-clip path.
    const MAX_XP_AE = 993;
    const MAX_XP_SDR = 903; // 18 clips, scaled pacing (3/6/9/12), Ridge Runner game
    function getMaxXp(role: string, clipsDone: number): number {
      // If an SDR completed more clips than the SDR path offers,
      // they followed the AE path — use AE max XP for fair comparison.
      if (getRoleGroup(role) === "SDR" && clipsDone <= TOTAL_ASCENT_CLIPS_SDR) {
        return MAX_XP_SDR;
      }
      return MAX_XP_AE;
    }

    // Build enriched entries with pacing + xpPct
    const entries = rows.map((r) => {
      const clipsDone = clipsDoneMap.get(r.viewer_id) ?? 0;
      const approachDone = approachMap.get(r.viewer_id) ?? 0;
      const maxSortDone = maxSortMap.get(r.viewer_id) ?? 0;

      // Role-aware effective clip total (accounts for legacy exemptions)
      const effectiveTotal = getEffectiveClipTotal(r.role, maxSortDone);
      const totalWeekdays = getTotalWeekdays(r.role);

      // Completed = all clips done for this role (with exemptions applied)
      const allComplete = clipsDone >= effectiveTotal
        && (approachDone >= TOTAL_APPROACH_MODULES || approachDone === 0);

      let pacingStatus = "not_started";
      if (r.ascent_day_1 || approachDone > 0 || clipsDone > 0) {
        const start = r.ascent_day_1 ? new Date(r.ascent_day_1) : new Date(now);
        const weekdaysElapsed = countWeekdays(start, now);
        const effectiveWeekdays = Math.max(0, weekdaysElapsed - r.extension_days);
        const pastSummitDay = r.ascent_day_1
          ? isAfterDate(getSummitDay(new Date(r.ascent_day_1), totalWeekdays, r.extension_days), now)
          : false;
        const percent = computeClipPacingPercent(effectiveWeekdays, approachDone, clipsDone, r.role, effectiveTotal);
        pacingStatus = computePacingStatusFromPercent(percent, allComplete, pastSummitDay);
      }

      const currentTier = TIERS.reduce((acc, t) => (r.total_xp >= t.xpMin ? t : acc), TIERS[0]);
      const maxXp = getMaxXp(r.role, clipsDone);
      const xpPct = maxXp > 0 ? Math.round((r.total_xp / maxXp) * 1000) / 10 : 0;
      const roleGroup = getRoleGroup(r.role);

      return {
        viewerId: r.viewer_id,
        name: r.name,
        role: r.role,
        roleGroup,
        timezone: r.timezone,
        totalXp: r.total_xp,
        xpPct,
        maxXp,
        clipsCompleted: r.clips_completed,
        badgesEarned: r.badges_earned,
        pacingStatus,
        tierName: currentTier.name,
        tierEmoji: currentTier.emoji,
      };
    });

    // Sort by xpPct DESC (% of max possible XP for their role)
    entries.sort((a, b) => b.xpPct - a.xpPct || b.totalXp - a.totalXp);

    return {
      leaderboard: entries.map((e, i) => ({
        rank: i + 1,
        ...e,
      })),
    };
  },
});
