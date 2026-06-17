import { useApiData } from "@/hooks/useApiData";
import { useViewer } from "@/components/ViewerContext";

const BADGE_META: Record<string, { name: string; emoji: string }> = {
  perfect_hiker: { name: "Perfect Hiker", emoji: "🌲" },
  speed_hiker: { name: "Speed Hiker", emoji: "🥾" },
  search_and_rescue_hero: { name: "Search & Rescue Hero", emoji: "🚁" },
  double_summit: { name: "Double Summit", emoji: "⛰️" },
  storm_chaser: { name: "Storm Chaser", emoji: "⛈️" },
  no_detours: { name: "No Detours", emoji: "🧭" },
  leave_no_trace: { name: "Leave No Trace", emoji: "🌱" },
  on_the_trail: { name: "On the Trail", emoji: "📅" },
  the_ascent: { name: "The Ascent", emoji: "🧗" },
  first_step: { name: "First Step", emoji: "🎬" },
  halfway: { name: "Halfway Up", emoji: "🏔️" },
  week_4_entry: { name: "Into the Summit Push", emoji: "🪢" },
  summit: { name: "Summit Reached", emoji: "🏔️✨" },
  mystery: { name: "The Ranger's Secret", emoji: "🌲" },
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
      <div className="w-full rounded-xl bg-card p-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="h-6 bg-muted rounded w-1/3 mb-3" />
        <div className="h-4 bg-muted rounded-full w-full mb-2" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
    );
  }

  const { totalXp, xpBreakdown, tier, nextTier, progressPercent, badges, clipsCompleted } = data;

  return (
    <div className="w-full rounded-xl bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tier.emoji}</span>
          <h3 className="text-sm font-semibold text-foreground">{tier.name}</h3>
        </div>
        <span className="text-lg font-bold text-primary">{totalXp} XP</span>
      </div>

      {/* Subtext row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {clipsCompleted}/17 clips completed
        </p>
        {nextTier && (
          <p className="text-xs text-muted-foreground">
            {nextTier.xpMin - totalXp} XP to {nextTier.name}
          </p>
        )}
        {!nextTier && (
          <p className="text-xs text-green-600 font-medium">
            ✨ Max tier reached!
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Tier labels below bar */}
      {nextTier && (
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>{tier.emoji} {tier.name} ({tier.xpMin})</span>
          <span>{nextTier.emoji} {nextTier.name} ({nextTier.xpMin})</span>
        </div>
      )}
      {!nextTier && (
        <div className="flex justify-center text-xs text-green-600 font-medium mb-3">
          You've conquered the Ascent!
        </div>
      )}

      {/* Breakdown row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3 mb-3">
        <span>📝 Base: <span className="font-medium text-foreground">{xpBreakdown.base}</span></span>
        <span>🏆 Milestones: <span className="font-medium text-foreground">{xpBreakdown.milestones}</span></span>
        <span>⚡ Bonuses: <span className="font-medium text-foreground">{xpBreakdown.bonuses}</span></span>
      </div>

      {/* Earned Badges */}
      {badges.length > 0 && (
        <div className="border-t border-border/50 pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Badges Earned</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => {
              const meta = BADGE_META[b.badgeId];
              return (
                <span
                  key={`${b.badgeId}-${b.clipId ?? "global"}`}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  title={meta?.name ?? b.badgeId}
                >
                  {meta?.emoji ?? "🏅"} {meta?.name ?? b.badgeId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Mystery badge teaser — shows until earned */}
      {!badges.some((b) => b.badgeId === "mystery") && (
        <div className={`${badges.length > 0 ? "mt-2" : "border-t border-border/50 pt-3"}`}>
          {badges.length === 0 && (
            <p className="text-xs font-medium text-muted-foreground mb-2">Badges</p>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground italic">
            🌲 ???
          </span>
        </div>
      )}
    </div>
  );
}
