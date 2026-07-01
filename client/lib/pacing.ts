/**
 * Shared pacing logic for cAMP Ascent.
 *
 * Schedule: 20 weekdays total = 5 weekdays (Week 1 "The Approach") + 15 weekdays ("The Ascent").
 * Week 1 (weekdays 1–5): onboarding modules, no video clips.
 * The Ascent (weekdays 6–20): 19 clips across 15 topic-days (1 topic per weekday).
 * Weekends (Sat / Sun) are skipped.
 * Days 5 and 9 (Ascent days 5 & 9) are content-review / resource days (no video clips).
 *
 * PACING counts TOPICS (completed days), not individual clips.
 * A topic is complete when ALL clips for that day_label are marked completed.
 * Multi-clip days (Day 7, 8, 11, 15) require both a/b clips finished.
 *
 * Week 1 pacing (The Approach — modules, not clips):
 *   Weekday 1–5  → Complete MEDDPICC, cAMP 101, Challenger, Wheel & Deal
 *
 * Ascent pacing (weekdays 6–20, mapped to Ascent days 1–15):
 *   Weekday 6   → Day 1   (sort 1)          1 clip   → Topic 1
 *   Weekday 7   → Day 2   (sort 2)          1 clip   → Topic 2
 *   Weekday 8   → Day 3   (sort 3)          1 clip   → Topic 3
 *   Weekday 9   → Day 4   (sort 4)          1 clip   → Topic 4
 *   Weekday 10  → Day 5   (sort 5, RESOURCE) 0 clips → Topic 5
 *   Weekday 11  → Day 6   (sort 6)          1 clip   → Topic 6
 *   Weekday 12  → Day 7   (sorts 7-8)       2 clips  → Topic 7
 *   Weekday 13  → Day 8   (sorts 9-10)      2 clips  → Topic 8
 *   Weekday 14  → Day 9   (sort 11, RESOURCE) 0 clips → Topic 9
 *   Weekday 15  → Day 10  (sort 12)         1 clip   → Topic 10
 *   Weekday 16  → Day 11  (sorts 13-14)     2 clips  → Topic 11
 *   Weekday 17  → Day 12  (sort 15)         1 clip   → Topic 12
 *   Weekday 18  → Day 13  (sort 16)         1 clip   → Topic 13
 *   Weekday 19  → Day 14  (sort 17)         1 clip   → Topic 14
 *   Weekday 20  → Day 15  (sorts 18-19)     2 clips  → Topic 15
 */

// Week 1 (The Approach) has no clip sessions — it's module-based.
// The Ascent starts at weekday 6 and maps to the old weekday 1–15 clip schedule.
// Cumulative TOPICS expected after each weekday (indices 0–20).
// One topic per Ascent weekday — each day is either done or not.
const EXPECTED_SESSIONS_BY_WEEKDAY = [
  0,   // 0 weekdays elapsed
  0,   // weekday 1  → Week 1 (Approach)
  0,   // weekday 2  → Week 1 (Approach)
  0,   // weekday 3  → Week 1 (Approach)
  0,   // weekday 4  → Week 1 (Approach)
  0,   // weekday 5  → Week 1 (Approach)
  1,   // weekday 6  → Ascent Day 1   → Topic 1
  2,   // weekday 7  → Ascent Day 2   → Topic 2
  3,   // weekday 8  → Ascent Day 3   → Topic 3
  4,   // weekday 9  → Ascent Day 4   → Topic 4
  5,   // weekday 10 → Ascent Day 5   → Topic 5  (resource day)
  6,   // weekday 11 → Ascent Day 6   → Topic 6
  7,   // weekday 12 → Ascent Day 7   → Topic 7  (2 clips: a/b)
  8,   // weekday 13 → Ascent Day 8   → Topic 8  (2 clips: a/b)
  9,   // weekday 14 → Ascent Day 9   → Topic 9  (resource day)
  10,  // weekday 15 → Ascent Day 10  → Topic 10
  11,  // weekday 16 → Ascent Day 11  → Topic 11 (2 clips: a/b)
  12,  // weekday 17 → Ascent Day 12  → Topic 12
  13,  // weekday 18 → Ascent Day 13  → Topic 13
  14,  // weekday 19 → Ascent Day 14  → Topic 14
  15,  // weekday 20 → Ascent Day 15  → Topic 15 (2 clips: a/b — all done)
];

/**
 * Maps cumulative topic count → highest sort_order that should be completed.
 * Used by getMissedClips to determine which individual clips should be done by now.
 * Example: 7 topics done → all clips through sort_order 8 should be complete.
 */
const TOPIC_TO_MAX_SORT: number[] = [
  0,   // 0 topics → nothing expected
  1,   // 1 topic  (Day 1)  → sort 1
  2,   // 2 topics (Day 2)  → sort 2
  3,   // 3 topics (Day 3)  → sort 3
  4,   // 4 topics (Day 4)  → sort 4
  5,   // 5 topics (Day 5)  → sort 5  (resource day)
  6,   // 6 topics (Day 6)  → sort 6
  8,   // 7 topics (Day 7)  → sorts 7-8
  10,  // 8 topics (Day 8)  → sorts 9-10
  11,  // 9 topics (Day 9)  → sort 11 (resource day)
  12,  // 10 topics (Day 10) → sort 12
  14,  // 11 topics (Day 11) → sorts 13-14
  15,  // 12 topics (Day 12) → sort 15
  16,  // 13 topics (Day 13) → sort 16
  17,  // 14 topics (Day 14) → sort 17
  19,  // 15 topics (Day 15) → sorts 18-19
];

const TOTAL_WEEKDAYS = 20;
const TOTAL_SESSIONS = 15;  // 15 topic-days in the Ascent
const WEEK1_WEEKDAYS = 5;

// Legacy alias — some consumers still reference TOTAL_CLIPS.
// This equals TOTAL_SESSIONS (topic count) for pacing purposes.
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
 * Get the number of topics a learner should have completed by now.
 * Returns 0–15 based on weekdays elapsed.
 */
export function getExpectedSessions(weekdaysElapsed: number): number {
  const capped = Math.min(weekdaysElapsed, TOTAL_WEEKDAYS);
  return EXPECTED_SESSIONS_BY_WEEKDAY[capped] ?? TOTAL_SESSIONS;
}

/**
 * Get the max sort_order that should be completed based on expected topics.
 * Used by getMissedClips to determine which individual clips are behind.
 */
export function getExpectedMaxSortOrder(weekdaysElapsed: number): number {
  const expectedTopics = getExpectedSessions(weekdaysElapsed);
  return TOPIC_TO_MAX_SORT[expectedTopics] ?? 19;
}

/**
 * Count completed topics (days where ALL clips for that day_label are done).
 * A topic = a unique day_label. Complete = every clip with that label is completed.
 */
export function countCompletedTopics(
  clips: Array<{ dayLabel?: string | null; completed: boolean }>
): number {
  const dayMap = new Map<string, { total: number; completed: number }>();
  for (const clip of clips) {
    const day = clip.dayLabel ?? "unknown";
    if (!dayMap.has(day)) dayMap.set(day, { total: 0, completed: 0 });
    const entry = dayMap.get(day)!;
    entry.total++;
    if (clip.completed) entry.completed++;
  }
  let count = 0;
  for (const [, { total, completed }] of dayMap) {
    if (completed >= total) count++;
  }
  return count;
}

/**
 * Get the number of topic-days a learner is behind.
 * Returns 0 if on pace or ahead.
 * topicsCompleted = number of completed topic-days (not individual clips).
 */
export function getTopicDaysBehind(topicsCompleted: number, weekdaysElapsed: number): number {
  if (topicsCompleted >= TOTAL_SESSIONS) return 0;

  // Find which weekday the learner's completed topics correspond to
  let learnerWeekday = 0;
  for (let i = 1; i < EXPECTED_SESSIONS_BY_WEEKDAY.length; i++) {
    if (topicsCompleted >= EXPECTED_SESSIONS_BY_WEEKDAY[i]) {
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
  topicsCompleted: number,
  weekdaysElapsed: number,
  hasStarted: boolean,
  afterSummitDay?: boolean,
): PacingTier {
  if (!hasStarted) return "not_started";
  if (topicsCompleted >= TOTAL_SESSIONS) return "completed";

  // Past summit day and still incomplete → anchor failure (no recovery)
  if (afterSummitDay) return "anchor_failure";

  const daysBehind = getTopicDaysBehind(topicsCompleted, weekdaysElapsed);

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
 * Uses topic-based sort_order threshold: maps expected topics → max sort_order.
 */
export function getMissedClips(
  clips: Array<{ sortOrder: number; weekNumber: number | null; dayLabel: string | null; title: string; completed: boolean }>,
  weekdaysElapsed: number,
): MissedClip[] {
  const maxExpectedSortOrder = getExpectedMaxSortOrder(weekdaysElapsed);
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
 * Summit Day = start date + 20 weekdays (the last weekday of the program).
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
 * = summitDay + N weekdays, where N = number of incomplete topics.
 */
export function getAscentAdjustmentDay(summitDay: Date, incompleteTopics: number): Date {
  const cursor = new Date(summitDay.getFullYear(), summitDay.getMonth(), summitDay.getDate());
  let added = 0;
  while (added < incompleteTopics) {
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
