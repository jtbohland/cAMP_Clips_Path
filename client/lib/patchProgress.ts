/**
 * Today's Patch Progress — calculates which badges a learner could potentially earn
 * on their next clip session, shown in the pacing modal as motivational pills.
 *
 * PATH-AWARE: thresholds and game XP adjust per path (AE, SDR, Promo).
 */

export interface PatchPill {
  emoji: string;
  name: string;
  xp: number;
}

export type PathKey = "AE" | "SDR" | "Promo";

interface PatchProgressInput {
  /** Sort order of the next uncompleted clip (10–200). null if all done. */
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
  /** Learner's path key — determines thresholds + game XP */
  pathKey?: PathKey;
  /** Total clip count for this learner's path */
  totalClips?: number;
}

export interface PatchProgressResult {
  pills: PatchPill[];
  bestCaseXp: number;
}

// ─── Path-specific config ──────────────────────────────────────────

interface PathConfig {
  totalClips: number;
  /** Sort orders where "No Detours" (5-clip streak) could trigger */
  noDetoursSortOrders: number[];
  /** Sort orders where "Leave No Trace" (3-clip streak) could trigger */
  leaveNoTraceSortOrders: number[];
  /** Sort order of the final clip (for Ranger's Secret / Free Solo) */
  finalSortOrder: number;
  /** Sort order that triggers "Into the Summit Push" (week 4 entry) */
  summitPushSortOrder: number | null;
  /** Resource day sort orders → game info (for game XP pills) */
  gameDays: { sortOrder: number; gameName: string; gameEmoji: string; xpRange: string }[];
}

// AE path: 20 clips (sort 10–200), resource days at 60 (DEARR) and 120 (Price is Right)
const AE_CONFIG: PathConfig = {
  totalClips: 20,
  noDetoursSortOrders: [50, 100, 150],    // 5th, 10th, 15th clip
  leaveNoTraceSortOrders: [30, 60, 90, 120, 150], // every 3rd clip
  finalSortOrder: 200,
  summitPushSortOrder: 130, // clip that starts week 4 push (Leveraging Partners)
  gameDays: [
    { sortOrder: 60, gameName: "DEARR Crossing", gameEmoji: "🦌", xpRange: "+15 to +45" },
    { sortOrder: 120, gameName: "The Price is Right", gameEmoji: "💰", xpRange: "+10 to +30" },
  ],
};

// SDR path: 18 clips (sort 10–165), resource days at 60 (DEARR), 120 (Price), 165 (Ridge/ROE)
const SDR_CONFIG: PathConfig = {
  totalClips: 18,
  noDetoursSortOrders: [50, 90, 130],      // 5th, 10th, 15th clip
  leaveNoTraceSortOrders: [30, 56, 80, 110, 130], // every 3rd clip
  finalSortOrder: 165,
  summitPushSortOrder: 160, // Customer Stories = week 4 entry for SDR
  gameDays: [
    { sortOrder: 60, gameName: "DEARR Crossing", gameEmoji: "🦌", xpRange: "+15 to +45" },
    { sortOrder: 120, gameName: "The Price is Right", gameEmoji: "💰", xpRange: "+10 to +30" },
    { sortOrder: 165, gameName: "Rules of the Ridge", gameEmoji: "⛰️", xpRange: "+10 to +30" },
  ],
};

// Promo path: 7 clips (sort 60–200), resource day at 60 (DEARR)
const PROMO_CONFIG: PathConfig = {
  totalClips: 7,
  noDetoursSortOrders: [180],              // 5th clip
  leaveNoTraceSortOrders: [150, 200],      // 3rd and 6th clip
  finalSortOrder: 200,
  summitPushSortOrder: null, // Promo has no week 4 milestone split
  gameDays: [
    { sortOrder: 60, gameName: "DEARR Crossing", gameEmoji: "🦌", xpRange: "+15 to +45" },
  ],
};

function getPathConfig(pathKey?: PathKey): PathConfig {
  switch (pathKey) {
    case "SDR": return SDR_CONFIG;
    case "Promo": return PROMO_CONFIG;
    default: return AE_CONFIG;
  }
}

// ─── Pacing streak thresholds ──────────────────────────────────────

const PACING_STREAKS = [
  { badgeId: "ridge_runner", name: "Ridge Runner", emoji: "🥾", xp: 10, daysNeeded: 5 },
  { badgeId: "alpine_endurance", name: "Alpine Endurance", emoji: "🏔️", xp: 15, daysNeeded: 10 },
  { badgeId: "iron_legs", name: "Iron Legs", emoji: "🦿", xp: 20, daysNeeded: 15 },
  { badgeId: "mountain_goat", name: "Mountain Goat", emoji: "🐐", xp: 30, daysNeeded: 20 },
];

// ─── Main calculator ───────────────────────────────────────────────

export function calculatePatchProgress(input: PatchProgressInput): PatchProgressResult {
  const {
    nextClipSortOrder,
    earnedBadgeIds,
    isLegacyLearner,
    pacingTier,
    weekdaysElapsed,
    hasTriggeredWeatherStorm = false,
    pathKey,
  } = input;
  const pills: PatchPill[] = [];
  const config = getPathConfig(pathKey);

  // If all clips are done, no patch progress to show
  if (nextClipSortOrder === null) return { pills, bestCaseXp: 0 };

  // ─── Always-available per-clip bonuses ───────────────────────────
  pills.push({ emoji: "🌲", name: "Perfect Hiker", xp: 8 });
  pills.push({ emoji: "🥾", name: "Speed Hiker", xp: 5 });

  // S&R Hero: always possible (if they fail trail markers)
  pills.push({ emoji: "🚁", name: "Search & Rescue Hero", xp: 8 });

  // Storm Chaser: if they've previously had WtS, they might earn this
  if (hasTriggeredWeatherStorm) {
    pills.push({ emoji: "⛈️", name: "Storm Chaser", xp: 3 });
  }

  // Double Summit: possible if they do another clip today
  pills.push({ emoji: "⛰️", name: "Double Summit", xp: 5 });

  // ─── Game XP (resource day pills) ───────────────────────────────
  for (const game of config.gameDays) {
    if (nextClipSortOrder === game.sortOrder) {
      pills.push({
        emoji: game.gameEmoji,
        name: `${game.gameName} (${game.xpRange} XP)`,
        xp: 0, // Variable — don't count toward bestCaseXp to avoid inflating
      });
    }
  }

  // ─── Streak bonuses (path-specific sort orders) ─────────────────
  // No Detours: awarded at path-specific milestones
  if (config.noDetoursSortOrders.includes(nextClipSortOrder)) {
    pills.push({ emoji: "🧭", name: "No Detours", xp: 10 });
  }

  // Leave No Trace: awarded at path-specific milestones
  if (config.leaveNoTraceSortOrders.includes(nextClipSortOrder)) {
    pills.push({ emoji: "🌱", name: "Leave No Trace", xp: 15 });
  }

  // ─── Milestone bonuses ──────────────────────────────────────────
  // First Step: first clip in path (always sort 10 for AE/SDR, sort 60 for Promo)
  const firstClipSort = pathKey === "Promo" ? 60 : 10;
  if (nextClipSortOrder === firstClipSort && !earnedBadgeIds.has("first_step")) {
    pills.push({ emoji: "🎬", name: "First Step", xp: 5 });
  }

  // Into the Summit Push: path-specific week 4 entry
  if (config.summitPushSortOrder && nextClipSortOrder === config.summitPushSortOrder && !earnedBadgeIds.has("week_4_entry")) {
    pills.push({ emoji: "🪢", name: "Into the Summit Push", xp: 10 });
  }

  // Ranger's Secret: only possible on final clip, and only if WtS never triggered
  if (nextClipSortOrder === config.finalSortOrder && !hasTriggeredWeatherStorm && !earnedBadgeIds.has("mystery")) {
    pills.push({ emoji: "🌲", name: "The Ranger's Secret", xp: 20 });
  }

  // ─── Pacing Streak bonuses (new learners only) ──────────────────
  if (!isLegacyLearner && (pacingTier === "summit_bound" || pacingTier === "completed")) {
    const ascentDays = Math.max(0, weekdaysElapsed - 5);
    const potentialStreak = ascentDays + 1;

    for (const streak of PACING_STREAKS) {
      // Scale streak thresholds for shorter paths
      const scaledDays = pathKey === "Promo"
        ? Math.max(3, Math.round(streak.daysNeeded * 0.4)) // Promo: ~40% of AE thresholds
        : streak.daysNeeded;
      if (!earnedBadgeIds.has(streak.badgeId) && potentialStreak >= scaledDays) {
        pills.push({ emoji: streak.emoji, name: streak.name, xp: streak.xp });
      }
    }

    // Free Solo: never missed pacing, only on final clip
    if (nextClipSortOrder >= config.finalSortOrder && !earnedBadgeIds.has("free_solo")) {
      pills.push({ emoji: "🧗", name: "Free Solo", xp: 40 });
    }
  }

  const bestCaseXp = pills.reduce((sum, p) => sum + p.xp, 0);
  return { pills, bestCaseXp };
}
