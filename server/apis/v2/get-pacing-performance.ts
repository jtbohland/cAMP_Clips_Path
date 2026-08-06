import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// ─── Row schemas ──────────────────────────────────────────────────────────────

const LearnerRow = z.object({
  viewer_id: z.string(),
  name: z.string(),
  role: z.string(),
  timezone: z.string().nullable(),
  manager_name: z.string().nullable(),
  created_at: z.string(),
  ascent_day_1: z.string().nullable(),
  extension_days: z.coerce.number(),
});

const ClipsDoneRow = z.object({
  viewer_id: z.string(),
  clips_done: z.coerce.number(),
});

const ApproachCountRow = z.object({
  viewer_id: z.string(),
  approach_items: z.coerce.number(),
});

// ─── Pacing helpers ───────────────────────────────────────────────────────────

// Weekday 1-5 = Approach (7 modules), Weekday 6-20 = Ascent (20 individual clips)
const WEEK1_EXPECTED_BY_DAY = [0, 2, 4, 5, 6, 7]; // indices 0-5
const WEEK1_TOTAL = 7;
const TOTAL_APPROACH_MODULES = 8; // meddpicc + camp101 + challenger + 4 academies + W&D

// Cumulative CLIPS expected by weekday (individual clips, not topics)
const CLIPS_EXPECTED_BY_WEEKDAY = [
  0,   // 0 weekdays elapsed
  0, 0, 0, 0, 0,            // weekdays 1-5: Approach (no clips)
  2, 3, 4, 5, 6,            // weekdays 6-10 (Day 1=2, Day 2-4=1 each, Day 5=1 resource)
  7, 9, 11, 12, 13,         // weekdays 11-15 (Day 6=1, Day 7=2, Day 8=2, Day 9=1 resource, Day 10=1)
  15, 16, 17, 18, 20,       // weekdays 16-20 (Day 11=2, Day 12-14=1 each, Day 15=2)
];
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

/**
 * Compute unified pacing % across Approach + Ascent (clip-level).
 * Pacing % = (approach_done + clips_done) / (approach_expected + clips_expected) × 100
 */
function computeClipPacingPercent(
  weekdaysElapsed: number,
  approachItemsDone: number,
  clipsDone: number,
): number {
  const capped = Math.min(Math.max(weekdaysElapsed, 0), TOTAL_WEEKDAYS);

  // Approach expected: ramp over weekdays 1-5, then always 7
  const approachExpected = capped >= 5 ? WEEK1_TOTAL : (WEEK1_EXPECTED_BY_DAY[capped] ?? 0);

  // Clips expected by this weekday (individual clips, not topics)
  const clipsExpected = CLIPS_EXPECTED_BY_WEEKDAY[capped] ?? TOTAL_ASCENT_CLIPS;

  const totalExpected = approachExpected + clipsExpected;
  if (totalExpected <= 0) return 100; // Day 0: nothing expected yet

  const totalDone = Math.min(approachItemsDone, WEEK1_TOTAL) + Math.min(clipsDone, TOTAL_ASCENT_CLIPS);
  return Math.round((totalDone / totalExpected) * 100);
}

/**
 * Determine pacing status from a percentage using bracket system.
 * Dual Anchor Failure trigger: pacing % < 50% OR past Summit Day + incomplete.
 */
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
  name: "GetPacingPerformance",
  description: "Unified pacing leaderboard for all active cAMPers (Approach + Ascent)",

  integrations: {
    apps_database: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    learners: z.array(z.object({
      viewerId: z.string(),
      name: z.string(),
      role: z.string(),
      region: z.string().nullable(),
      managerName: z.string().nullable(),
      pacingStatus: z.string(),
      pacingPercent: z.number(),
      rank: z.number(),
    })),
  }),

  async run(ctx) {
    // 1. All non-admin learners with their start info
    const learners = await ctx.integrations.apps_database.query(
      `SELECT
        v.id AS viewer_id,
        v.name,
        v.role,
        v.timezone,
        v.manager_name,
        v.created_at::text,
        v.ascent_day_1::text AS ascent_day_1,
        COALESCE(v.extension_days, 0)::int AS extension_days
       FROM cliptracker_v2_viewers v
       WHERE v.is_admin = false
       ORDER BY v.created_at ASC
       LIMIT 100`,
      LearnerRow,
      undefined,
      { label: "All non-admin learners" }
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
      { label: "Individual clips completed per learner" }
    );

    // 3. Approach items completed per viewer (modules + academies + W&D)
    //    7 items: 2 sign-offs (meddpicc, challenger) + 4 academies + 1 W&D
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
      { label: "Approach items completed per learner" }
    );

    // Build lookup maps
    const clipsDoneMap = new Map<string, number>();
    for (const c of clipsDoneRows) clipsDoneMap.set(c.viewer_id, c.clips_done);

    const approachMap = new Map<string, number>();
    for (const a of approachRows) approachMap.set(a.viewer_id, a.approach_items);

    const now = new Date();

    // 4. Calculate pacing for each learner, filter out completed
    const results: Array<{
      viewerId: string;
      name: string;
      role: string;
      region: string | null;
      managerName: string | null;
      pacingStatus: string;
      pacingPercent: number;
      weekdaysElapsed: number;
    }> = [];

    for (const l of learners) {
      const clipsDone = clipsDoneMap.get(l.viewer_id) ?? 0;
      const approachDone = approachMap.get(l.viewer_id) ?? 0;

      // Completed = all 20 clips + approach done (legacy learners have approachDone=0, exempt)
      const allComplete = clipsDone >= TOTAL_ASCENT_CLIPS
        && (approachDone >= TOTAL_APPROACH_MODULES || approachDone === 0);

      // Skip completed learners
      if (allComplete) continue;

      // Weekdays elapsed from their registration (created_at) to now
      const startDate = new Date(l.created_at);
      const weekdaysElapsed = countWeekdays(startDate, now);
      const effectiveWeekdays = Math.max(0, weekdaysElapsed - l.extension_days);

      // Check Summit Day deadline gate
      const pastSummitDay = l.ascent_day_1
        ? isAfterDate(getSummitDay(new Date(l.ascent_day_1), l.extension_days), now)
        : false;

      // Unified pacing % (clip-level)
      const pacingPercent = computeClipPacingPercent(effectiveWeekdays, approachDone, clipsDone);

      // Pacing status from % brackets + Summit Day gate
      const pacingStatus = l.ascent_day_1 || approachDone > 0 || clipsDone > 0
        ? computePacingStatusFromPercent(pacingPercent, false, pastSummitDay)
        : "not_started";

      results.push({
        viewerId: l.viewer_id,
        name: l.name,
        role: l.role,
        region: l.timezone,
        managerName: l.manager_name,
        pacingStatus,
        pacingPercent,
        weekdaysElapsed,
      });
    }

    // Sort: pacing % desc, then weekdays elapsed desc (further along ranks higher at same %)
    results.sort((a, b) => {
      if (b.pacingPercent !== a.pacingPercent) return b.pacingPercent - a.pacingPercent;
      return b.weekdaysElapsed - a.weekdaysElapsed;
    });

    return {
      learners: results.map((r, i) => ({
        viewerId: r.viewerId,
        name: r.name,
        role: r.role,
        region: r.region,
        managerName: r.managerName,
        pacingStatus: r.pacingStatus,
        pacingPercent: r.pacingPercent,
        rank: i + 1,
      })),
    };
  },
});
