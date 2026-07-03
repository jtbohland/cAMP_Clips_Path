import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { useApi } from "@/hooks/useApi.js";

// ─── Types ──────────────────────────────────────────────────────────

interface BadgeEarned {
  badgeId: string;
  name: string;
  emoji: string;
  xp: number;
}

export interface FinalAchievementResult {
  summitReward: BadgeEarned | null;
  pacingStreaks: BadgeEarned[];
  gripStrength: BadgeEarned | null;
  totalXpAwarded: number;
  alreadyAwarded: boolean;
}

interface FinalAchievementModalProps {
  viewerId: string;
  onDismiss: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export default function FinalAchievementModal({ viewerId, onDismiss }: FinalAchievementModalProps) {
  const { run: awardFinal, loading, data, error } = useApi("AwardFinalAchievement");
  const [awarded, setAwarded] = useState(false);

  // Fire the API once on mount
  useEffect(() => {
    if (!awarded) {
      setAwarded(true);
      awardFinal({ viewerId }).catch(() => {
        // error handled via hook's error state
      });
    }
  }, [viewerId, awardFinal, awarded]);

  // Fire personalized confetti when data arrives
  const confettiFired = useRef(false);
  useEffect(() => {
    if (!data || confettiFired.current) return;
    confettiFired.current = true;

    const result = data as FinalAchievementResult;
    // Collect the best emoji from each earned category
    const emojis: string[] = [];
    if (result.summitReward) emojis.push(result.summitReward.emoji);
    if (result.pacingStreaks.length > 0) {
      // Highest XP pacing streak = best
      const best = result.pacingStreaks.reduce((a, b) => (b.xp > a.xp ? b : a));
      emojis.push(best.emoji);
    }
    if (result.gripStrength) emojis.push(result.gripStrength.emoji);

    if (emojis.length === 0) return;

    const shapes = emojis.map((e) => (confetti as any).shapeFromText({ text: e, scalar: 2 }));
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        shapes,
        scalar: 2,
        flat: true,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        shapes,
        scalar: 2,
        flat: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [data]);

  // Collect all earned badges for display
  const earnedBadges = useMemo(() => {
    if (!data) return [];
    const result = data as FinalAchievementResult;
    const badges: BadgeEarned[] = [];
    if (result.summitReward) badges.push(result.summitReward);
    for (const s of result.pacingStreaks) badges.push(s);
    if (result.gripStrength) badges.push(result.gripStrength);
    return badges;
  }, [data]);

  const totalXp = (data as FinalAchievementResult | undefined)?.totalXpAwarded ?? 0;

  // Loading state
  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl p-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="text-5xl">🏆</div>
            <p className="text-lg font-semibold text-gray-700">Calculating your final achievements...</p>
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state — still allow dismissal
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-sm text-gray-600">We couldn't load your final achievements, but don't worry — your XP is safe!</p>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg"
          >
            🪝 Final Anchor Point — Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-8 pt-8 pb-6 text-center shrink-0">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4 text-4xl">
            🏆
          </div>
          <h2 className="text-2xl font-bold text-white">Final Achievement Unlocked!</h2>
          <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-md mx-auto">
            Your journey defined your rewards. Here's what you earned on the way to the summit.
          </p>
        </div>

        {/* Badge grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {earnedBadges.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No additional achievements this time — but you made it to the summit!</p>
            </div>
          ) : (
            <>
              {/* Summit Reward — featured card */}
              {(data as FinalAchievementResult).summitReward && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Summit Reward</h3>
                  <SummitRewardCard badge={(data as FinalAchievementResult).summitReward!} />
                </div>
              )}

              {/* Pacing Streaks */}
              {(data as FinalAchievementResult).pacingStreaks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pacing Streaks</h3>
                  <div className="grid gap-2">
                    {(data as FinalAchievementResult).pacingStreaks.map((badge) => (
                      <BadgeCard key={badge.badgeId} badge={badge} />
                    ))}
                  </div>
                </div>
              )}

              {/* Grip Strength */}
              {(data as FinalAchievementResult).gripStrength && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Performance</h3>
                  <BadgeCard badge={(data as FinalAchievementResult).gripStrength!} />
                </div>
              )}
            </>
          )}

          {/* Total XP earned */}
          {totalXp > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-700">Summit achievement bonus</span>
              <span className="text-xl font-bold text-amber-700">+{totalXp} XP</span>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <div className="px-8 pb-8 pt-2 shrink-0">
          <button
            onClick={onDismiss}
            className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg"
          >
            🪝 Final Anchor Point
          </button>
          <p className="text-xs text-center text-gray-400 mt-2">
            Continue to your Summit Celebration
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Badge descriptions ─────────────────────────────────────────────

const BADGE_DESCRIPTIONS: Record<string, string> = {
  // Summit Rewards
  golden_summit: "Approach complete + Ascent finished by Summit Day",
  speed_ascent: "Ascent finished by Summit Day, Approach incomplete",
  second_wind: "Finished by Adjustment Day",
  every_step_counts: "Completed after Adjustment Day",
  // Pacing Streaks
  ridge_runner: "5 consecutive days Summit Bound",
  alpine_endurance: "10 consecutive days Summit Bound",
  iron_legs: "15 consecutive days Summit Bound",
  mountain_goat: "20 consecutive days Summit Bound",
  free_solo: "Zero rockslide or worse across all Ascent days",
  // Performance
  grip_strength: "Avg engagement score ≥85% across all 17 clips",
};

// ─── Sub-components ─────────────────────────────────────────────────

/** Featured card for the Summit Reward — larger with gradient accent */
function SummitRewardCard({ badge }: { badge: BadgeEarned }) {
  const gradients: Record<string, string> = {
    golden_summit: "from-yellow-400 to-amber-500",
    speed_ascent: "from-sky-400 to-blue-500",
    second_wind: "from-slate-300 to-slate-500",
    every_step_counts: "from-stone-300 to-stone-500",
  };
  const gradient = gradients[badge.badgeId] ?? "from-amber-400 to-yellow-500";
  const desc = BADGE_DESCRIPTIONS[badge.badgeId] ?? "Summit completion reward";

  return (
    <div className={`rounded-xl bg-gradient-to-r ${gradient} p-[2px]`}>
      <div className="rounded-[10px] bg-white px-5 py-4 flex items-center gap-4">
        <span className="text-3xl">{badge.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900">{badge.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-amber-600">+{badge.xp}</p>
          <p className="text-xs text-gray-400">XP</p>
        </div>
      </div>
    </div>
  );
}

/** Standard badge card */
function BadgeCard({ badge }: { badge: BadgeEarned }) {
  const desc = BADGE_DESCRIPTIONS[badge.badgeId];
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3.5 flex items-center gap-3">
      <span className="text-2xl">{badge.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{badge.name}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold text-amber-600">+{badge.xp}</p>
        <p className="text-xs text-gray-400">XP</p>
      </div>
    </div>
  );
}
