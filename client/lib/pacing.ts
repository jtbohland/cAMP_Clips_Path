/**
 * Shared pacing logic for cAMP Ascent.
 *
 * Schedule: 15 weekdays → 17 clips. Each weekday = 1 topic-day from the
 * learner's ascent_day_1. Weekends (Sat / Sun) are skipped.
 * Days 5 and 9 are content-review days (no video clips).
 *
 * Topic-day mapping (derived from DB day_label values):
 *   Weekday 1  → Day 1   (sort 1)        1 clip
 *   Weekday 2  → Day 2   (sort 2)        1 clip
 *   Weekday 3  → Day 3   (sort 3)        1 clip
 *   Weekday 4  → Day 4   (sort 4)        1 clip
 *   Weekday 5  → Day 5   (no clips — content review day)
 *   Weekday 6  → Day 6   (sort 5)        1 clip
 *   Weekday 7  → Day 7   (sorts 6-7)     2 clips (a/b)
 *   Weekday 8  → Day 8   (sorts 8-9)     2 clips (a/b)
 *   Weekday 9  → Day 9   (no clips — content review day)
 *   Weekday 10 → Day 10  (sort 10)       1 clip
 *   Weekday 11 → Day 11  (sorts 11-12)   2 clips (a/b)
 *   Weekday 12 → Day 12  (sort 13)       1 clip
 *   Weekday 13 → Day 13  (sort 14)       1 clip
 *   Weekday 14 → Day 14  (sort 15)       1 clip
 *   Weekday 15 → Day 15  (sorts 16-17)   2 clips (a/b)
 */

// Cumulative clips expected after each weekday (index 0 = before start)
const EXPECTED_CLIPS_BY_WEEKDAY = [
  0,   // 0 weekdays elapsed
  1,   // weekday 1  → Day 1
  2,   // weekday 2  → Day 2
  3,   // weekday 3  → Day 3
  4,   // weekday 4  → Day 4
  4,   // weekday 5  → Day 5 (content review — no new clips)
  5,   // weekday 6  → Day 6
  7,   // weekday 7  → Day 7a+7b
  9,   // weekday 8  → Day 8a+8b
  9,   // weekday 9  → Day 9 (content review — no new clips)
  10,  // weekday 10 → Day 10
  12,  // weekday 11 → Day 11a+11b
  13,  // weekday 12 → Day 12
  14,  // weekday 13 → Day 13
  15,  // weekday 14 → Day 14
  17,  // weekday 15 → Day 15a+15b (all done)
];

const TOTAL_WEEKDAYS = 15;
const TOTAL_CLIPS = 17;

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
 * Get the number of clips a learner should have completed by now.
 */
export function getExpectedClips(weekdaysElapsed: number): number {
  const capped = Math.min(weekdaysElapsed, TOTAL_WEEKDAYS);
  return EXPECTED_CLIPS_BY_WEEKDAY[capped] ?? TOTAL_CLIPS;
}

/**
 * Get the number of topic-days a learner is behind.
 * Returns 0 if on pace or ahead.
 */
export function getTopicDaysBehind(clipsCompleted: number, weekdaysElapsed: number): number {
  if (clipsCompleted >= TOTAL_CLIPS) return 0;

  // Find which weekday the learner's completed clips correspond to
  let learnerWeekday = 0;
  for (let i = 1; i < EXPECTED_CLIPS_BY_WEEKDAY.length; i++) {
    if (clipsCompleted >= EXPECTED_CLIPS_BY_WEEKDAY[i]) {
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
  clipsCompleted: number,
  weekdaysElapsed: number,
  hasStarted: boolean,
): PacingTier {
  if (!hasStarted) return "not_started";
  if (clipsCompleted >= TOTAL_CLIPS) return "completed";

  const daysBehind = getTopicDaysBehind(clipsCompleted, weekdaysElapsed);

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
  const expectedClipCount = getExpectedClips(weekdaysElapsed);
  const missed: MissedClip[] = [];

  for (const clip of clips) {
    if (clip.sortOrder > expectedClipCount) break; // beyond what's expected
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

export { TOTAL_CLIPS, TOTAL_WEEKDAYS, EXPECTED_CLIPS_BY_WEEKDAY };
