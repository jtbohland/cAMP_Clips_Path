/**
 * Shared pacing logic for cAMP Ascent.
 *
 * Schedule: 20 weekdays total = 5 weekdays (Week 1 "The Approach") + 15 weekdays ("The Ascent").
 * Week 1 (weekdays 1–5): onboarding modules, no video clips.
 * The Ascent (weekdays 6–20): 20 clips across 15 topic-days (1 topic per weekday).
 * Weekends (Sat / Sun) are skipped.
 * Days 5 and 9 (Ascent days 5 & 9) are content-review / resource days (no video clips).
 *
 * PACING counts TOPICS (completed days), not individual clips.
 * A topic is complete when ALL clips for that day_label are marked completed.
 * Multi-clip days (Day 1, 7, 8, 11, 15) require both a/b clips finished.
 *
 * Week 1 pacing (The Approach — modules, not clips):
 *   Weekday 1–5  → Complete MEDDPICC, cAMP 101, Challenger, Wheel & Deal
 *
 * Ascent pacing (weekdays 6–20, mapped to Ascent days 1–15):
 *   Weekday 6   → Day 1   (sorts 1-2)       2 clips  → Topic 1
 *   Weekday 7   → Day 2   (sort 3)          1 clip   → Topic 2
 *   Weekday 8   → Day 3   (sort 4)          1 clip   → Topic 3
 *   Weekday 9   → Day 4   (sort 5)          1 clip   → Topic 4
 *   Weekday 10  → Day 5   (sort 6, RESOURCE) 0 clips → Topic 5
 *   Weekday 11  → Day 6   (sort 7)          1 clip   → Topic 6
 *   Weekday 12  → Day 7   (sorts 8-9)       2 clips  → Topic 7
 *   Weekday 13  → Day 8   (sorts 10-11)     2 clips  → Topic 8
 *   Weekday 14  → Day 9   (sort 12, RESOURCE) 0 clips → Topic 9
 *   Weekday 15  → Day 10  (sort 13)         1 clip   → Topic 10
 *   Weekday 16  → Day 11  (sorts 14-15)     2 clips  → Topic 11
 *   Weekday 17  → Day 12  (sort 16)         1 clip   → Topic 12
 *   Weekday 18  → Day 13  (sort 17)         1 clip   → Topic 13
 *   Weekday 19  → Day 14  (sort 18)         1 clip   → Topic 14
 *   Weekday 20  → Day 15  (sorts 19-20)     2 clips  → Topic 15
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
  0,    // 0 topics → nothing expected
  20,   // 1 topic  (Day 1)  → sorts 10-20  (Industries + Personas)
  30,   // 2 topics (Day 2)  → sort 30
  40,   // 3 topics (Day 3)  → sort 40
  50,   // 4 topics (Day 4)  → sort 50
  60,   // 5 topics (Day 5)  → sort 60  (resource day)
  70,   // 6 topics (Day 6)  → sort 70
  90,   // 7 topics (Day 7)  → sorts 80-90
  110,  // 8 topics (Day 8)  → sorts 100-110
  120,  // 9 topics (Day 9)  → sort 120 (resource day)
  130,  // 10 topics (Day 10) → sort 130
  150,  // 11 topics (Day 11) → sorts 140-150
  160,  // 12 topics (Day 12) → sort 160
  170,  // 13 topics (Day 13) → sort 170
  180,  // 14 topics (Day 14) → sort 180
  200,  // 15 topics (Day 15) → sorts 190-200
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
  return TOPIC_TO_MAX_SORT[expectedTopics] ?? 200;
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
 * Summit Day = start date + (totalWeekdays + extensionDays) weekdays.
 * extensionDays shifts the entire Ascent deadline forward.
 */
export function getSummitDay(startDate: Date, extensionDays: number = 0, role: string = "AE"): Date {
  const totalDays = getRoleTotalWeekdays(role) + extensionDays;
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let weekdaysCounted = 0;
  while (weekdaysCounted < totalDays) {
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

export const WEEK1_TOTAL_ITEMS = 7; // MEDDPICC + 4 academies + Challenger + W&D (cAMP 101 sign-off is not a separate item)

/**
 * Week 1 expected completion count by weekday (7 items):
 *   Day 0: 0 items (before start)
 *   Day 1: 2 items  (MEDDPICC + Analytics Academy)
 *   Day 2: 4 items  (Experiment Academy + Session Replay Academy)
 *   Day 3: 5 items  (Guides & Surveys Academy)
 *   Day 4: 6 items  (Challenger signoff)
 *   Day 5: 7 items  (Wheel & Deal → Begin Ascent!)
 */
export const WEEK1_EXPECTED_BY_DAY = [0, 2, 4, 5, 6, 7];

/**
 * Determine the Approach pacing tier based on completed items vs expected.
 * Uses the same tier system as Ascent for visual consistency.
 * Returns a PacingTier string.
 */
export function getApproachPacingTier(
  completedItems: number,
  approachWeekdaysElapsed: number,
  role: string = "",
): PacingTier {
  const isVP = isVelocityPromo(role);
  const totalItems = isVP ? WEEK1_TOTAL_ITEMS_VP : WEEK1_TOTAL_ITEMS;
  const expectedByDay = isVP ? WEEK1_EXPECTED_BY_DAY_VP : WEEK1_EXPECTED_BY_DAY;
  const deadlineDays = isVP ? WEEK1_WEEKDAYS_VP : 5; // 3 for VP, 5 for others

  if (completedItems >= totalItems) return "completed";
  if (approachWeekdaysElapsed <= 0) return "not_started";

  // Past Oh Deer threshold (deadline + 3): auto-unlock zone
  if (approachWeekdaysElapsed >= deadlineDays + 3) return "anchor_failure";
  // Past deadline: missed, anchor failure (catch-up window)
  if (approachWeekdaysElapsed > deadlineDays) return "anchor_failure";

  // Days 1 to deadline: compare to expected
  const day = Math.min(approachWeekdaysElapsed, deadlineDays);
  const expected = expectedByDay[day] ?? totalItems;
  const itemsBehind = Math.max(0, expected - completedItems);

  if (itemsBehind <= 0) return "summit_bound";
  if (itemsBehind <= 1) return "off_the_trail";
  if (itemsBehind <= 3) return "lost_in_the_woods";
  if (itemsBehind <= 5) return "rockslide";
  return "avalanche_warning";
}

/**
 * Get the number of Approach items a learner is behind.
 */
export function getApproachItemsBehind(completedItems: number, approachWeekdaysElapsed: number, role: string = ""): number {
  const isVP = isVelocityPromo(role);
  const totalItems = isVP ? WEEK1_TOTAL_ITEMS_VP : WEEK1_TOTAL_ITEMS;
  const expectedByDay = isVP ? WEEK1_EXPECTED_BY_DAY_VP : WEEK1_EXPECTED_BY_DAY;
  const deadlineDays = isVP ? WEEK1_WEEKDAYS_VP : 5;
  if (completedItems >= totalItems) return 0;
  const day = Math.min(approachWeekdaysElapsed, deadlineDays);
  const expected = expectedByDay[day] ?? totalItems;
  return Math.max(0, expected - completedItems);
}

/**
 * Check if today IS a specific date (same calendar day).
 */
export function isSameDay(date: Date): boolean {
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return todayNorm.getTime() === dateNorm.getTime();
}

// ─── Clip-Level Pacing (Unified Formula) ─────────────────────────────
// New unified pacing: counts INDIVIDUAL clips done (not topics), plus Approach items.
// 28 total items = 7 Approach + 21 Ascent clips across 20 weekdays from registration.
// Pacing % = (approach_done + clips_done) / (approach_expected + clips_expected) × 100

/**
 * Cumulative CLIPS expected by each weekday (indices 0–20).
 * Approach (weekdays 1-5): 0 clips (modules tracked separately).
 * Ascent (weekdays 6-20): individual clips, not topics.
 *
 *   Weekday 6  → Day 1  → 2 clips (sorts 1-2)
 *   Weekday 7  → Day 2  → 1 clip  (sort 3)       = 3 total
 *   Weekday 8  → Day 3  → 2 clips (sorts 4-4b)  = 5
 *   Weekday 9  → Day 4  → 1 clip  (sort 5)       = 6
 *   Weekday 10 → Day 5  → 1 "clip" (resource day) = 7
 *   Weekday 11 → Day 6  → 1 clip  (sort 7)       = 8
 *   Weekday 12 → Day 7  → 2 clips (sorts 8-9)    = 10
 *   Weekday 13 → Day 8  → 2 clips (sorts 10-11)  = 12
 *   Weekday 14 → Day 9  → 1 "clip" (resource day) = 13
 *   Weekday 15 → Day 10 → 1 clip  (sort 13)      = 14
 *   Weekday 16 → Day 11 → 2 clips (sorts 14-15)  = 16
 *   Weekday 17 → Day 12 → 1 clip  (sort 16)      = 17
 *   Weekday 18 → Day 13 → 1 clip  (sort 17)      = 18
 *   Weekday 19 → Day 14 → 1 clip  (sort 18)      = 19
 *   Weekday 20 → Day 15 → 2 clips (sorts 19-20)  = 21
 */
// ─── AE / PSM / Renewals clip schedule ──────────────────────────────
export const CLIPS_EXPECTED_BY_WEEKDAY_AE = [
  0,   // 0 weekdays elapsed
  0,   // weekday 1  → Week 1 (Approach — no clips)
  0,   // weekday 2  → Week 1
  0,   // weekday 3  → Week 1
  0,   // weekday 4  → Week 1
  0,   // weekday 5  → Week 1
  2,   // weekday 6  → Day 1  (2 clips)
  3,   // weekday 7  → Day 2  (1 clip)
  5,   // weekday 8  → Day 3  (2 clips: GTM Launch Pad + Pod Tower)
  6,   // weekday 9  → Day 4  (1 clip)
  7,   // weekday 10 → Day 5  (1 resource "clip")
  8,   // weekday 11 → Day 6  (1 clip)
  10,  // weekday 12 → Day 7  (2 clips)
  12,  // weekday 13 → Day 8  (2 clips)
  13,  // weekday 14 → Day 9  (1 resource "clip")
  14,  // weekday 15 → Day 10 (1 clip)
  16,  // weekday 16 → Day 11 (2 clips)
  17,  // weekday 17 → Day 12 (1 clip)
  18,  // weekday 18 → Day 13 (1 clip)
  19,  // weekday 19 → Day 14 (1 clip)
  21,  // weekday 20 → Day 15 (2 clips)
];

// ─── SDR clip schedule ──────────────────────────────────────────────
// SDR has 14 Ascent days (vs 15 for AE) → 19 total weekdays
// Day 14 = Rules of Engagement (resource day, SDR-only)
export const CLIPS_EXPECTED_BY_WEEKDAY_SDR = [
  0,   // 0 weekdays elapsed
  0, 0, 0, 0, 0,            // weekdays 1-5: Approach (no clips)
  2,   // weekday 6  → Day 1  (Verticals + Personas)
  3,   // weekday 7  → Day 2  (TOFU)
  5,   // weekday 8  → Day 3  (GTM LP + Pod Tower)
  6,   // weekday 9  → Day 4  (Prospecting)
  8,   // weekday 10 → Day 5  (Cold Calling + Nooks)
  9,   // weekday 11 → Day 6  (resource day)
  10,  // weekday 12 → Day 7  (Competitive Landscape)
  12,  // weekday 13 → Day 8  (Account Planning × 2)
  14,  // weekday 14 → Day 9  (Discovery × 2)
  15,  // weekday 15 → Day 10 (resource day)
  16,  // weekday 16 → Day 11 (Pricing & Packaging)
  16,  // weekday 17 → Day 12 (Partners)
  16,  // weekday 18 → Day 13 (Customer Stories)
  17,  // weekday 19 → Day 14 (ROE — resource day, Ridge game)
];

/** Legacy alias — AE schedule */
export const CLIPS_EXPECTED_BY_WEEKDAY = CLIPS_EXPECTED_BY_WEEKDAY_AE;

export const TOTAL_ASCENT_CLIPS_AE = 21;
export const TOTAL_ASCENT_CLIPS_SDR = 17;
export const TOTAL_ASCENT_CLIPS_VP = 9;
export const TOTAL_WEEKDAYS_AE = 20;
export const TOTAL_WEEKDAYS_SDR = 19;
export const TOTAL_WEEKDAYS_VP = 10; // 3 Approach + 7 Ascent days

/** Legacy alias */
export const TOTAL_ASCENT_CLIPS = TOTAL_ASCENT_CLIPS_AE;
export const TOTAL_UNIFIED_ITEMS = WEEK1_TOTAL_ITEMS + TOTAL_ASCENT_CLIPS_AE; // 28

// ─── SDR>Velocity Promo clip schedule ─────────────────────────────
// Approach is only 3 weekdays; Ascent is 7 days (weekdays 4–10)
export const CLIPS_EXPECTED_BY_WEEKDAY_VP = [
  0,   // 0 weekdays elapsed
  0, 0, 0,                   // weekdays 1-3: Approach (no clips)
  1,                         // weekday 4  → Day 1 (Renewal Ops)
  2,                         // weekday 5  → Day 2 (P&P)
  3,                         // weekday 6  → Day 3 (Partners)
  5,                         // weekday 7  → Day 4 (Forecasting ×2)
  6,                         // weekday 8  → Day 5 (CLM)
  7,                         // weekday 9  → Day 6 (Deal Desk)
  9,                         // weekday 10 → Day 7 (SE+PS ×2)
];

/** Approach schedule for Velocity Promo: 5 items over 3 weekdays */
export const WEEK1_EXPECTED_BY_DAY_VP = [0, 2, 4, 5];
export const WEEK1_TOTAL_ITEMS_VP = 5;
export const WEEK1_WEEKDAYS_VP = 3;

// ─── Exempt clip sort orders (newly added clips) ────────────────────
const EXEMPT_CLIP_SORT_ORDERS = [45, 55, 56] as const;

const SDR_ROLES = ["SDR"];
const VELOCITY_PROMO_ROLES = ["SDR>Velocity Promo"];
function isSDR(role: string): boolean {
  return SDR_ROLES.includes(role);
}
function isVelocityPromo(role: string): boolean {
  return VELOCITY_PROMO_ROLES.includes(role);
}

/** Get the schedule for a role. */
export function getClipsExpectedByWeekday(role: string): readonly number[] {
  if (isVelocityPromo(role)) return CLIPS_EXPECTED_BY_WEEKDAY_VP;
  return isSDR(role) ? CLIPS_EXPECTED_BY_WEEKDAY_SDR : CLIPS_EXPECTED_BY_WEEKDAY_AE;
}

/** Get total weekdays for a role's path. */
export function getRoleTotalWeekdays(role: string): number {
  if (isVelocityPromo(role)) return TOTAL_WEEKDAYS_VP;
  return isSDR(role) ? TOTAL_WEEKDAYS_SDR : TOTAL_WEEKDAYS_AE;
}

/** Get base clip total for a role. */
export function getRoleTotalClips(role: string): number {
  if (isVelocityPromo(role)) return TOTAL_ASCENT_CLIPS_VP;
  return isSDR(role) ? TOTAL_ASCENT_CLIPS_SDR : TOTAL_ASCENT_CLIPS_AE;
}

/**
 * Get the effective clip total for a role, accounting for legacy exemptions.
 * Mirrors server/apis/v2/pacing-helpers.ts getEffectiveClipTotal.
 */
export function getEffectiveClipTotal(role: string, maxSortDone: number): number {
  if (isVelocityPromo(role)) return TOTAL_ASCENT_CLIPS_VP; // VP has no legacy exemptions
  const baseTotal = getRoleTotalClips(role);
  if (maxSortDone <= 0) return baseTotal;

  let exemptions = 0;
  for (const sortOrder of EXEMPT_CLIP_SORT_ORDERS) {
    if (maxSortDone > sortOrder) {
      if (sortOrder === 45) exemptions++;
      else if ((sortOrder === 55 || sortOrder === 56) && isSDR(role)) exemptions++;
    }
  }
  return baseTotal - exemptions;
}

/**
 * Compute the unified pacing percentage (clip-level).
 * Pacing % = (approach_done + clips_done) / (approach_expected + clips_expected) × 100
 *
 * @param weekdaysElapsed  Effective weekdays elapsed (after subtracting extensions)
 * @param approachDone     Number of Approach items completed (0-7)
 * @param clipsDone        Number of individual Ascent clips completed
 * @param role             Learner's role (for role-aware schedule)
 * @param effectiveTotal   Role-aware effective clip total (from getEffectiveClipTotal)
 * @returns Pacing percentage (0-100+, uncapped — can exceed 100 if ahead)
 */
export function computeUnifiedPacingPercent(
  weekdaysElapsed: number,
  approachDone: number,
  clipsDone: number,
  role: string = "AE",
  effectiveTotal?: number,
): number {
  const totalWeekdays = getRoleTotalWeekdays(role);
  const schedule = getClipsExpectedByWeekday(role);
  const total = effectiveTotal ?? getRoleTotalClips(role);
  const capped = Math.min(Math.max(weekdaysElapsed, 0), totalWeekdays);

  const totalApproachItems = isVelocityPromo(role) ? WEEK1_TOTAL_ITEMS_VP : WEEK1_TOTAL_ITEMS;
  const approachDeadline = isVelocityPromo(role) ? WEEK1_WEEKDAYS_VP : 5;
  const approachExpected = capped >= approachDeadline
    ? totalApproachItems
    : (isVelocityPromo(role) ? WEEK1_EXPECTED_BY_DAY_VP[capped] : WEEK1_EXPECTED_BY_DAY[capped]) ?? 0;

  // Clips expected by this weekday
  const clipsExpected = schedule[capped] ?? total;

  const totalExpected = approachExpected + clipsExpected;
  const totalDone = Math.min(approachDone, totalApproachItems) + Math.min(clipsDone, total);

  if (totalExpected <= 0) {
    return 100;
  }

  return Math.round((totalDone / totalExpected) * 100);
}

/**
 * Determine pacing status from a percentage using the new bracket system.
 * Does NOT handle the Summit Day deadline gate — caller must check that separately.
 *
 * Brackets:
 *   ≥90% → summit_bound
 *   80-89% → off_the_trail
 *   70-79% → lost_in_the_woods
 *   60-69% → rockslide
 *   50-59% → avalanche_warning
 *   <50% → anchor_failure
 */
export function getPacingStatusFromPercent(percent: number): PacingTier {
  if (percent >= 90) return "summit_bound";
  if (percent >= 80) return "off_the_trail";
  if (percent >= 70) return "lost_in_the_woods";
  if (percent >= 60) return "rockslide";
  if (percent >= 50) return "avalanche_warning";
  return "anchor_failure";
}

/**
 * Full unified pacing tier determination (clip-level + Summit Day gate).
 * Combines % brackets with the dual Anchor Failure trigger:
 *   1. Pacing % < 50%
 *   2. Past Summit Day + incomplete
 */
export function getUnifiedPacingTier(
  weekdaysElapsed: number,
  approachDone: number,
  clipsDone: number,
  allComplete: boolean,
  afterSummitDay: boolean,
  role: string = "AE",
  effectiveTotal?: number,
): PacingTier {
  // allComplete is based on clips only (approach is a pre-req, not a gate)
  if (allComplete) return "completed";
  if (afterSummitDay) return "anchor_failure";

  const percent = computeUnifiedPacingPercent(weekdaysElapsed, approachDone, clipsDone, role, effectiveTotal);
  return getPacingStatusFromPercent(percent);
}

export { TOTAL_CLIPS, TOTAL_SESSIONS, TOTAL_WEEKDAYS, WEEK1_WEEKDAYS, EXPECTED_SESSIONS_BY_WEEKDAY };
