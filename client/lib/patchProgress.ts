/**
 * Today's Patch Progress — calculates which badges a learner could potentially earn
 * on their next clip session, shown in the pacing modal as motivational pills.
 *
 * This is a CLIENT-SIDE heuristic based on available data. Some badges (Storm Chaser,
 * Double Summit) require runtime data we don't have, so they're shown as "possible"
 * when their window is still open.
 */

export interface PatchPill {
  emoji: string;
  name: string;
  xp: number;
}

interface PatchProgressInput {
  /** Sort order of the next uncompleted clip (1–20). null if all done. */
  nextClipSortOrder: number | null;
  /** Set of already-earned badge IDs (from GetLearnerProgress) */
  earnedBadgeIds: Set<string>;
  /** Whether this is a legacy learner (cannot earn pacing streak badges) */
  isLegacyLearner: boolean;
  /** Current pacing tier — used to determine if pacing streak is active */
  pacingTier: string;
  /** Weekdays elapsed since Ascent Day 1 (for estimating pacing streak length) */
  weekdaysElapsed: number;
  /** Whether Weather the Storm has ever been triggered (for Ranger's Secret). Defaults to false if unknown. */
  hasTriggeredWeatherStorm?: boolean;
}

export interface PatchProgressResult {
  pills: PatchPill[];
  bestCaseXp: number;
}

// ─── Per-clip bonuses (available to everyone) ──────────────────────

const PER_CLIP_BONUSES: PatchPill[] = [
  { emoji: "🌲", name: "Perfect Hiker", xp: 8 },
  { emoji: "🥾", name: "Speed Hiker", xp: 5 },
];

// Badges that can be earned multiple times (keyed by badgeId pattern)
// These are always shown as possible since we can't easily check client-side
const MULTI_AWARD_BADGES = new Set(["no_detours", "leave_no_trace", "double_summit"]);

// ─── Pacing streak thresholds ──────────────────────────────────────

const PACING_STREAKS = [
  { badgeId: "ridge_runner", name: "Ridge Runner", emoji: "🥾", xp: 10, daysNeeded: 5 },
  { badgeId: "alpine_endurance", name: "Alpine Endurance", emoji: "🏔️", xp: 15, daysNeeded: 10 },
  { badgeId: "iron_legs", name: "Iron Legs", emoji: "🦿", xp: 20, daysNeeded: 15 },
  { badgeId: "mountain_goat", name: "Mountain Goat", emoji: "🐐", xp: 30, daysNeeded: 20 },
];

// ─── Main calculator ───────────────────────────────────────────────

export function calculatePatchProgress(input: PatchProgressInput): PatchProgressResult {
  const { nextClipSortOrder, earnedBadgeIds, isLegacyLearner, pacingTier, weekdaysElapsed, hasTriggeredWeatherStorm = false } = input;
  const pills: PatchPill[] = [];

  // If all clips are done, no patch progress to show
  if (nextClipSortOrder === null) return { pills, bestCaseXp: 0 };

  // ─── Always-available per-clip bonuses ───────────────────────────
  // Perfect Hiker + Speed Hiker: possible on any clip
  for (const bonus of PER_CLIP_BONUSES) {
    pills.push(bonus);
  }

  // S&R Hero: always possible (if they fail trail markers)
  pills.push({ emoji: "🚁", name: "Search & Rescue Hero", xp: 8 });

  // Storm Chaser: if they've previously had WtS, they might earn this
  if (hasTriggeredWeatherStorm) {
    pills.push({ emoji: "⛈️", name: "Storm Chaser", xp: 3 });
  }

  // Double Summit: possible if they've done another clip today (or could do another)
  pills.push({ emoji: "⛰️", name: "Double Summit", xp: 5 });

  // ─── Streak bonuses (position-dependent) ────────────────────────
  // No Detours: awarded at sort orders 5, 10, 15
  if ([5, 10, 15].includes(nextClipSortOrder)) {
    pills.push({ emoji: "🧭", name: "No Detours", xp: 10 });
  }

  // Leave No Trace: awarded at sort orders 3, 6, 9, 12, 15
  if ([3, 6, 9, 12, 15].includes(nextClipSortOrder)) {
    pills.push({ emoji: "🌱", name: "Leave No Trace", xp: 15 });
  }

  // ─── Milestone bonuses ──────────────────────────────────────────
  // First Step: clip 1
  if (nextClipSortOrder === 1 && !earnedBadgeIds.has("first_step")) {
    pills.push({ emoji: "🎬", name: "First Step", xp: 5 });
  }

  // Into the Summit Push: clip 10 triggers Week 4 unlock
  if (nextClipSortOrder === 10 && !earnedBadgeIds.has("week_4_entry")) {
    pills.push({ emoji: "🪢", name: "Into the Summit Push", xp: 10 });
  }

  // Ranger's Secret: only possible on clip 20, and only if WtS never triggered
  if (nextClipSortOrder === 20 && !hasTriggeredWeatherStorm && !earnedBadgeIds.has("mystery")) {
    pills.push({ emoji: "🌲", name: "The Ranger's Secret", xp: 20 });
  }

  // ─── Pacing Streak bonuses (new learners only) ──────────────────
  if (!isLegacyLearner && (pacingTier === "summit_bound" || pacingTier === "completed")) {
    // Estimate how many consecutive summit-bound days after today
    // Ascent starts at weekday 6, so ascent days = weekdaysElapsed - 5
    const ascentDays = Math.max(0, weekdaysElapsed - 5);
    // Today could push the streak to ascentDays + 1
    const potentialStreak = ascentDays + 1;

    for (const streak of PACING_STREAKS) {
      if (!earnedBadgeIds.has(streak.badgeId) && potentialStreak >= streak.daysNeeded) {
        pills.push({ emoji: streak.emoji, name: streak.name, xp: streak.xp });
      }
    }

    // Free Solo: if no rockslide/avalanche/anchor_failure across all Ascent days
    // We can't easily check this client-side, but if they're summit_bound they're doing well
    // Only show this on the last clip (sort 20+) when it would be awarded
    if (nextClipSortOrder >= 20 && !earnedBadgeIds.has("free_solo")) {
      pills.push({ emoji: "🧗", name: "Free Solo", xp: 40 });
    }
  }

  const bestCaseXp = pills.reduce((sum, p) => sum + p.xp, 0);
  return { pills, bestCaseXp };
}
