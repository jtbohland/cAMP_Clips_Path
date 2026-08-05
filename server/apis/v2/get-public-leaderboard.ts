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

const TopicsRow = z.object({
  viewer_id: z.string(),
  topics_completed: z.coerce.number(),
});

// ─── Pacing helpers (mirrors get-analytics-v3 logic) ──────────────────────────

const EXPECTED_SESSIONS = [
  0,                        // 0 weekdays elapsed
  0, 0, 0, 0, 0,            // weekdays 1–5: Approach
  1, 2, 3, 4, 5,            // weekdays 6–10: Ascent days 1–5
  6, 7, 8, 9, 10,           // weekdays 11–15: Ascent days 6–10
  11, 12, 13, 14, 15,       // weekdays 16–20: Ascent days 11–15
];
const TOTAL_WEEKDAYS = 20;
const TOTAL_SESSIONS_SCHEDULE = 15;

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

function getTopicDaysBehind(completed: number, weekdaysElapsed: number): number {
  if (completed >= TOTAL_SESSIONS_SCHEDULE) return 0;
  let learnerWeekday = 0;
  for (let i = 1; i < EXPECTED_SESSIONS.length; i++) {
    if (completed >= EXPECTED_SESSIONS[i]) learnerWeekday = i;
    else break;
  }
  return Math.max(0, Math.min(weekdaysElapsed, TOTAL_WEEKDAYS) - learnerWeekday);
}

function computePacingStatus(
  ascentDay1: string | null,
  extensionDays: number,
  topicsCompleted: number,
  now: Date,
): string {
  if (!ascentDay1) return "not_started";
  if (topicsCompleted >= TOTAL_SESSIONS_SCHEDULE) return "completed";

  const start = new Date(ascentDay1);
  const weekdaysElapsed = countWeekdays(start, now);
  const effective = Math.max(0, weekdaysElapsed - extensionDays);
  const summit = getSummitDay(start, extensionDays);
  const pastSummit = isAfterDate(summit, now);

  if (pastSummit) return "anchor_failure";

  const daysBehind = getTopicDaysBehind(topicsCompleted, effective);
  if (daysBehind <= 0) return "summit_bound";
  if (daysBehind <= 2) return "off_the_trail";
  if (daysBehind <= 5) return "lost_in_the_woods";
  if (daysBehind <= 9) return "rockslide";
  return "avalanche_warning";
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

    // 2. Topics completed per viewer (for pacing calculation)
    const topicsRows = await ctx.integrations.apps_database.query(
      `WITH clip_days AS (
        SELECT id, day_label FROM cliptracker_v2_clips WHERE status = 'live'
      ),
      session_completions AS (
        SELECT s.viewer_id, s.clip_id
        FROM cliptracker_v2_sessions s
        WHERE s.completed = true
        GROUP BY s.viewer_id, s.clip_id
      ),
      resource_completions AS (
        SELECT x.viewer_id, x.clip_id
        FROM cliptracker_v2_xp_events x
        JOIN cliptracker_v2_clips c ON c.id = x.clip_id
        WHERE x.event_type = 'swiss_army_knife' AND c.status = 'live'
      ),
      learner_completions AS (
        SELECT viewer_id, clip_id FROM session_completions
        UNION
        SELECT viewer_id, clip_id FROM resource_completions
      ),
      day_totals AS (
        SELECT day_label, COUNT(*) AS total FROM clip_days GROUP BY day_label
      ),
      learner_day_completions AS (
        SELECT lc.viewer_id, cd.day_label, COUNT(*) AS completed
        FROM learner_completions lc
        JOIN clip_days cd ON cd.id = lc.clip_id
        GROUP BY lc.viewer_id, cd.day_label
      )
      SELECT ldc.viewer_id, COUNT(*)::int AS topics_completed
      FROM learner_day_completions ldc
      JOIN day_totals dt ON dt.day_label = ldc.day_label
      WHERE ldc.completed >= dt.total
      GROUP BY ldc.viewer_id
      LIMIT 500`,
      TopicsRow,
      undefined,
      { label: "Topics completed (pacing)" }
    );

    const topicsMap = new Map<string, number>();
    for (const t of topicsRows) {
      topicsMap.set(t.viewer_id, t.topics_completed);
    }

    const now = new Date();

    return {
      leaderboard: rows.map((r, i) => {
        const topicsCompleted = topicsMap.get(r.viewer_id) ?? 0;
        const pacingStatus = computePacingStatus(r.ascent_day_1, r.extension_days, topicsCompleted, now);
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
