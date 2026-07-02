import { useApiData } from "@/hooks/useApiData";
import { useViewer } from "@/components/ViewerContext";

const BADGE_META: Record<string, { name: string; emoji: string }> = {
  // Per-clip performance
  perfect_hiker: { name: "Perfect Hiker", emoji: "🌲" },
  speed_hiker: { name: "Speed Hiker", emoji: "🥾" },
  search_and_rescue_hero: { name: "Search & Rescue Hero", emoji: "🚁" },
  double_summit: { name: "Double Summit", emoji: "⛰️" },
  storm_chaser: { name: "Storm Chaser", emoji: "⛈️" },
  swiss_army_knife: { name: "Swiss Army Knife", emoji: "🪓" },
  // Engagement streaks
  no_detours: { name: "No Detours", emoji: "🧭" },
  leave_no_trace: { name: "Leave No Trace", emoji: "🌱" },
  // Pacing streaks (new learners only)
  ridge_runner: { name: "Ridge Runner", emoji: "🥾" },
  alpine_endurance: { name: "Alpine Endurance", emoji: "🏔️" },
  iron_legs: { name: "Iron Legs", emoji: "🦿" },
  mountain_goat: { name: "Mountain Goat", emoji: "🐐" },
  free_solo: { name: "Free Solo", emoji: "🧗" },
  // Summit rewards
  golden_summit: { name: "Golden Summit", emoji: "🌄" },
  speed_ascent: { name: "Speed Ascent", emoji: "⛷️" },
  second_wind: { name: "Second Wind", emoji: "💨" },
  every_step_counts: { name: "Every Step Counts", emoji: "👣" },
  // Grip Strength
  grip_strength: { name: "Grip Strength", emoji: "💪" },
  // Milestones
  first_step: { name: "First Step", emoji: "🎬" },
  peak_lift: { name: "Peak Lift", emoji: "🚡" },
  halfway: { name: "Halfway Up", emoji: "🏔️" },
  week_4_entry: { name: "Into the Summit Push", emoji: "🪢" },
  mystery: { name: "The Ranger's Secret", emoji: "🌲" },
  podcast_cast: { name: "The Full Cast", emoji: "🎣" },
  // Legacy (no longer awarded)
  on_the_trail: { name: "On the Trail", emoji: "📅" },
  the_ascent: { name: "The Ascent", emoji: "🧗" },
  summit: { name: "Summit Reached", emoji: "🏔️✨" },
};

export default function XpProgressBar() {
  const { viewer } = useViewer();
  const { data, loading } = useApiData(
    "GetLearnerProgress",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  if (loading || !data) {
    return (
      <div className="w-full rounded-xl bg-white p-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-4 bg-gray-200 rounded-full w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
    );
  }

  const { totalXp, xpBreakdown, tier, nextTier, progressPercent, badges, clipsCompleted } = data;

  return (
    <div className="w-full rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tier.emoji}</span>
          <h3 className="text-sm font-semibold text-gray-900">{tier.name}</h3>
        </div>
        <span className="text-lg font-bold text-indigo-600">{totalXp} XP</span>
      </div>

      {/* Subtext row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {clipsCompleted}/17 clips completed
        </p>
        {nextTier ? (
          <p className="text-xs text-gray-500">
            {nextTier.xpMin - totalXp} XP to {nextTier.name}
          </p>
        ) : (
          <p className="text-xs text-green-600 font-medium">
            ✨ Max tier reached!
          </p>
        )}
      </div>

      {/* Progress Bar — indigo-to-purple gradient */}
      <div className="relative h-3 w-full rounded-full bg-gray-200 overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Tier labels below bar */}
      {nextTier ? (
        <div className="flex justify-between text-xs text-gray-500 mb-3">
          <span>
            {tier.emoji} {tier.name} ({tier.xpMin})
          </span>
          <span>
            {nextTier.emoji} {nextTier.name} ({nextTier.xpMin})
          </span>
        </div>
      ) : (
        <div className="flex justify-center text-xs text-green-600 font-medium mb-3">
          You've conquered the Ascent!
        </div>
      )}

      {/* Breakdown row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-200/70 pt-3 mb-3">
        <span>
          ☀️ Base:{" "}
          <span className="font-medium text-gray-900">{xpBreakdown.base}</span>
        </span>
        <span>
          🏆 Milestones:{" "}
          <span className="font-medium text-gray-900">{xpBreakdown.milestones}</span>
        </span>
        <span>
          ⚡ Bonuses:{" "}
          <span className="font-medium text-gray-900">{xpBreakdown.bonuses}</span>
        </span>
      </div>

      {/* Earned Bonuses — yellow pill badges */}
      {badges.length > 0 && (
        <div className="border-t border-gray-200/70 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Earned Bonuses</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b: any) => {
              const meta = BADGE_META[b.badgeId];
              return (
                <span
                  key={`${b.badgeId}-${b.clipId ?? "global"}`}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#FEF9C3", color: "#92400E" }}
                  title={meta?.name ?? b.badgeId}
                >
                  {meta?.emoji ?? "🏅"} {meta?.name ?? b.badgeId}
                </span>
              );
            })}
          </div>
        </div>
      )}


    </div>
  );
}
