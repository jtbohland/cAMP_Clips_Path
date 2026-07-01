/**
 * Shared pacing logic for cAMP Ascent.
 *
 * Schedule: 20 weekdays total = 5 weekdays (Week 1 "The Approach") + 15 weekdays ("The Ascent").
 * Week 1 (weekdays 1–5): onboarding modules, no video clips.
 * The Ascent (weekdays 6–20): 17 clips across 15 weekdays.
 * Weekends (Sat / Sun) are skipped.
 * Days 10 and 14 (Ascent days 5 & 9) are content-review days (no video clips).
 *
 * Week 1 pacing (The Approach — modules, not clips):
 *   Weekday 1–5  → Complete MEDDPICC, cAMP 101, Challenger, Wheel & Deal
 *
 * Ascent pacing (weekdays 6–20, mapped to Ascent days 1–15):
 *   Weekday 6   → Day 1   (sort 1)         1 clip
 *   Weekday 7   → Day 2   (sort 2)         1 clip
 *   Weekday 8   → Day 3   (sort 3)         1 clip
 *   Weekday 9   → Day 4   (sort 4)         1 clip
 *   Weekday 10  → Day 5   (sort 5, TOPIC)  0 clips — resource review day
 *   Weekday 11  → Day 6   (sort 6)         1 clip
 *   Weekday 12  → Day 7   (sorts 7-8)      2 clips (a/b)
 *   Weekday 13  → Day 8   (sorts 9-10)     2 clips (a/b)
 *   Weekday 14  → Day 9   (sort 11, TOPIC) 0 clips — resource review day
 *   Weekday 15  → Day 10  (sort 12)        1 clip
 *   Weekday 16  → Day 11  (sorts 13-14)    2 clips (a/b)
 *   Weekday 17  → Day 12  (sort 15)        1 clip
 *   Weekday 18  → Day 13  (sort 16)        1 clip
 *   Weekday 19  → Day 14  (sort 17)        1 clip
 *   Weekday 20  → Day 15  (sorts 18-19)    2 clips (a/b)
 */

// Week 1 (The Approach) has no clip sessions — it's module-based.
// The Ascent starts at weekday 6 and maps to the old weekday 1–15 clip schedule.
// Cumulative clip sessions expected after each weekday (indices 0–20).
const EXPECTED_SESSIONS_BY_WEEKDAY = [
  0,   // 0 weekdays elapsed
  0,   // weekday 1  → Week 1 (Approach)
  0,   // weekday 2  → Week 1 (Approach)
  0,   // weekday 3  → Week 1 (Approach)
  0,   // weekday 4  → Week 1 (Approach)
  0,   // weekday 5  → Week 1 (Approach)
  1,   // weekday 6  → Ascent Day 1  (sort 1)
  2,   // weekday 7  → Ascent Day 2  (sort 2)
  3,   // weekday 8  → Ascent Day 3  (sort 3)
  4,   // weekday 9  → Ascent Day 4  (sort 4)
  5,   // weekday 10 → Ascent Day 5  (sort 5, topic day)
  6,   // weekday 11 → Ascent Day 6  (sort 6)
  8,   // weekday 12 → Ascent Day 7  (sorts 7-8, a/b)
  10,  // weekday 13 → Ascent Day 8  (sorts 9-10, a/b)
  11,  // weekday 14 → Ascent Day 9  (sort 11, topic day)
  12,  // weekday 15 → Ascent Day 10 (sort 12)
  14,  // weekday 16 → Ascent Day 11 (sorts 13-14, a/b)
  15,  // weekday 17 → Ascent Day 12 (sort 15)
  16,  // weekday 18 → Ascent Day 13 (sort 16)
  17,  // weekday 19 → Ascent Day 14 (sort 17)
  19,  // weekday 20 → Ascent Day 15 (sorts 18-19, a/b — all done)
];

const TOTAL_WEEKDAYS = 20;
const TOTAL_SESSIONS = 19;
const WEEK1_WEEKDAYS = 5;

// Legacy alias — some consumers still reference TOTAL_CLIPS
const TOTAL_CLIPS = TOTAL_SESSIONS;

export type PacingTier =
  | "summit_bound"
  | "off_the_trail"
  | "lost_in_the_woods"
  | "rockslide"
  | "avalanche_warning"
  | "anchor_failure"
  | "completed"
  | "not_started";

export interface PacingTierConfig {
  key: PacingTier;
  label: string;
  emoji: string;
  headerBg: string;
  headerText: string;
  bodyBg: string;
  bodyText: string;
  borderColor: string;
  message: string;
}

export const PACING_TIERS: Record<PacingTier, PacingTierConfig> = {
  summit_bound: {
    key: "summit_bound",
    label: "Summit Bound",
    emoji: "🧗🏻‍♂️",
    headerBg: "#1B4332",
    headerText: "#D1FAE5",
    bodyBg: "#D1FAE5",
    bodyText: "#1B4332",
    borderColor: "#2D6A4F",
    message: "You're right on pace — keep climbing!",
  },
  off_the_trail: {
    key: "off_the_trail",
    label: "Off the Trail",
    emoji: "🧭",
    headerBg: "#92400E",
    headerText: "#FEF3C7",
    bodyBg: "#FEF3C7",
    bodyText: "#92400E",
    borderColor: "#B45309",
    message: "You're a little behind — time to get back on the trail.",
  },
  lost_in_the_woods: {
    key: "lost_in_the_woods",
    label: "Lost in the Woods",
    emoji: "🌲",
    headerBg: "#9A3412",
    headerText: "#FFEDD5",
    bodyBg: "#FFEDD5",
    bodyText: "#9A3412",
    borderColor: "#C2410C",
    message: "You've fallen a few days behind — let's find the trail again.",
  },
  rockslide: {
    key: "rockslide",
    label: "Rockslide",
    emoji: "🪨",
    headerBg: "#991B1B",
    headerText: "#FEE2E2",
    bodyBg: "#FEE2E2",
    bodyText: "#991B1B",
    borderColor: "#B91C1C",
    message: "You're significantly behind — but it's not too late to catch up.",
  },
  avalanche_warning: {
    key: "avalanche_warning",
    label: "Avalanche Warning",
    emoji: "❄️",
    headerBg: "#1E3A5F",
    headerText: "#DBEAFE",
    bodyBg: "#DBEAFE",
    bodyText: "#1E3A5F",
    borderColor: "#2563EB",
    message: "You're at risk of falling too far behind — let's get moving today.",
  },
  anchor_failure: {
    key: "anchor_failure",
    label: "Anchor Failure",
    emoji: "⛓️‍💥",
    headerBg: "#1C1917",
    headerText: "#FBBF24",
    bodyBg: "#FEF3C7",
    bodyText: "#1C1917",
    borderColor: "#DC2626",
    message: "You've passed your Summit Day deadline — let's get back on track.",
  },
  completed: {
    key: "completed",
    label: "Summit Reached",
    emoji: "🏔️✨",
    headerBg: "#1B4332",
    headerText: "#D1FAE5",
    bodyBg: "#D1FAE5",
    bodyText: "#1B4332",
    borderColor: "#2D6A4F",
    message: "You've completed every clip — congratulations!",
  },
  not_started: {
    key: "not_started",
    label: "Not Started",
    emoji: "🏕️",
    headerBg: "#6B7280",
    headerText: "#F3F4F6",
    bodyBg: "#F3F4F6",
    bodyText: "#6B7280",
    borderColor: "#9CA3AF",
    message: "Your Ascent awaits — start your first clip today!",
  },
};

/**
 * Count weekdays (Mon–Fri) between two dates, inclusive of startDate.
 * If today < startDate, returns 0.
 */
export function countWeekdays(startDate: Date, endDate: Date): number {
  // Normalize to midnight
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Get the number of sessions (clips + topic days) a learner should have
 * completed by now. Since sort_orders are consecutive 1–19, this also
 * equals the max sort_order that should be done.
 */
export function getExpectedSessions(weekdaysElapsed: number): number {
  const capped = Math.min(weekdaysElapsed, TOTAL_WEEKDAYS);
  return EXPECTED_SESSIONS_BY_WEEKDAY[capped] ?? TOTAL_SESSIONS;
}

/**
 * Get the number of topic-days a learner is behind.
 * Returns 0 if on pace or ahead.
 * sessionsCompleted = total completed rows (video clips + topic days).
 */
export function getTopicDaysBehind(sessionsCompleted: number, weekdaysElapsed: number): number {
  if (sessionsCompleted >= TOTAL_SESSIONS) return 0;

  // Find which weekday the learner's completed sessions correspond to
  let learnerWeekday = 0;
  for (let i = 1; i < EXPECTED_SESSIONS_BY_WEEKDAY.length; i++) {
    if (sessionsCompleted >= EXPECTED_SESSIONS_BY_WEEKDAY[i]) {
      learnerWeekday = i;
    } else {
      break;
    }
  }

  const cappedElapsed = Math.min(weekdaysElapsed, TOTAL_WEEKDAYS);
  return Math.max(0, cappedElapsed - learnerWeekday);
}

/**
 * Determine the pacing tier based on topic-days behind.
 */
export function getPacingTier(
  sessionsCompleted: number,
  weekdaysElapsed: number,
  hasStarted: boolean,
  afterSummitDay?: boolean,
): PacingTier {
  if (!hasStarted) return "not_started";
  if (sessionsCompleted >= TOTAL_SESSIONS) return "completed";

  // Past summit day and still incomplete → anchor failure (no recovery)
  if (afterSummitDay) return "anchor_failure";

  const daysBehind = getTopicDaysBehind(sessionsCompleted, weekdaysElapsed);

  if (daysBehind <= 0) return "summit_bound";
  if (daysBehind <= 2) return "off_the_trail";
  if (daysBehind <= 5) return "lost_in_the_woods";
  if (daysBehind <= 9) return "rockslide";
  return "avalanche_warning";
}

export interface MissedClip {
  weekNumber: number;
  dayLabel: string;
  title: string;
}

/**
 * Build the list of clips a learner is behind on.
 * Compares expected sort orders vs completed sort orders.
 */
export function getMissedClips(
  clips: Array<{ sortOrder: number; weekNumber: number | null; dayLabel: string | null; title: string; completed: boolean }>,
  weekdaysElapsed: number,
): MissedClip[] {
  const maxExpectedSortOrder = getExpectedSessions(weekdaysElapsed);
  const missed: MissedClip[] = [];

  for (const clip of clips) {
    if (clip.sortOrder > maxExpectedSortOrder) break; // beyond what's expected
    if (!clip.completed) {
      missed.push({
        weekNumber: clip.weekNumber ?? 0,
        dayLabel: clip.dayLabel ?? `Sort ${clip.sortOrder}`,
        title: clip.title,
      });
    }
  }

  return missed;
}

/**
 * Calculate a learner's Summit Day — the date they should finish by.
 * Summit Day = start date + 15 weekdays (the last weekday of the program).
 */
export function getSummitDay(startDate: Date): Date {
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let weekdaysCounted = 0;
  while (weekdaysCounted < TOTAL_WEEKDAYS) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) weekdaysCounted++;
  }
  return cursor;
}

/**
 * Calculate the Ascent Adjustment deadline.
 * = summitDay + N weekdays, where N = number of incomplete sessions.
 */
export function getAscentAdjustmentDay(summitDay: Date, incompleteSessions: number): Date {
  const cursor = new Date(summitDay.getFullYear(), summitDay.getMonth(), summitDay.getDate());
  let added = 0;
  while (added < incompleteSessions) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return cursor;
}

/**
 * Check if today is past a given date (inclusive check — true if today > date).
 */
export function isAfterDate(date: Date): boolean {
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return todayNorm > dateNorm;
}

/**
 * Check if today is the day before Summit Day (weekday 14 of 15).
 */
export function isDayBeforeSummitDay(summitDay: Date): boolean {
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const summitNorm = new Date(summitDay.getFullYear(), summitDay.getMonth(), summitDay.getDate());
  // Walk backward from summit day to find the previous weekday
  const prevWeekday = new Date(summitNorm);
  prevWeekday.setDate(prevWeekday.getDate() - 1);
  while (prevWeekday.getDay() === 0 || prevWeekday.getDay() === 6) {
    prevWeekday.setDate(prevWeekday.getDate() - 1);
  }
  return todayNorm.getTime() === prevWeekday.getTime();
}

// --- Week 1 (The Approach) pacing ---

export type Week1PacingStatus = 'on_track' | 'behind' | 'complete';

/**
 * Week 1 expected completion count by weekday:
 *   Day 1: 2 items (MEDDPICC + 1 academy course)
 *   Day 2: 4 items
 *   Day 3: 5 items
 *   Day 4: 6 items
 *   Day 5: 7 items (all done — 3 modules + W&D = 4 sign-offs, but we track 7 granular items)
 */
const WEEK1_EXPECTED_BY_DAY = [0, 2, 4, 5, 6, 7];
const WEEK1_TOTAL_ITEMS = 7; // 3 module signoffs + 4 academy screenshots... but W&D also needed

/**
 * Get Week 1 progress status.
 * completedItems = number of completed items (module signoffs + academy screenshots + W&D)
 * Max = 8 (3 modules + 4 academy + 1 W&D)
 */
export function getWeek1PacingStatus(
  completedItems: number,
  weekdaysElapsed: number,
): Week1PacingStatus {
  if (completedItems >= 8) return 'complete';
  if (weekdaysElapsed <= 0) return 'on_track';
  const day = Math.min(weekdaysElapsed, 5);
  const expected = WEEK1_EXPECTED_BY_DAY[day] ?? 7;
  return completedItems >= expected ? 'on_track' : 'behind';
}

export { TOTAL_CLIPS, TOTAL_SESSIONS, TOTAL_WEEKDAYS, WEEK1_WEEKDAYS, EXPECTED_SESSIONS_BY_WEEKDAY };
