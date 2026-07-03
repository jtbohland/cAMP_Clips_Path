import { useEffect } from "react";
import confetti from "canvas-confetti";

type TierUnlockModalProps = {
  tierName: string;
  tierEmoji: string;
  totalXp: number;
  leaderboardRank: number;
  nextTierName: string | null;
  nextTierEmoji: string | null;
  xpToNextTier: number | null;
  onDismiss: () => void;
};

export default function TierUnlockModal({
  tierName,
  tierEmoji,
  totalXp,
  leaderboardRank,
  nextTierName,
  nextTierEmoji,
  xpToNextTier,
  onDismiss,
}: TierUnlockModalProps) {
  // Exploding tier emojis on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const emojiShape = (confetti as any).shapeFromText({ text: tierEmoji, scalar: 2 });
    const starShape = (confetti as any).shapeFromText({ text: "⭐️", scalar: 2 });
    // Alpinist All-Star (💫) gets extra sparkle ✨
    const shapes = tierEmoji === "💫"
      ? [emojiShape, starShape, (confetti as any).shapeFromText({ text: "✨", scalar: 2 })]
      : [emojiShape, starShape];

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      // Left burst
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        shapes,
        scalar: 2,
        flat: true,
      });
      // Right burst
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        shapes,
        scalar: 2,
        flat: true,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);

    return () => {
      document.body.style.overflow = "";
    };
  }, [tierEmoji]);

  // Ordinal suffix for rank (1st, 2nd, 3rd, etc.)
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-5 text-center">
          <p className="text-2xl font-bold uppercase tracking-widest text-white">
            New Achievement!
          </p>
          <p className="mt-1 text-sm text-white/80">
            You unlocked a new tier
          </p>
        </div>

        {/* Big tier display */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="text-7xl mb-3">{tierEmoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{tierName}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {totalXp.toLocaleString()} XP earned
          </p>
        </div>

        {/* Stats cards */}
        <div className="px-8 pb-6 space-y-2">
          {/* Leaderboard position */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <span className="text-sm text-gray-600">Leaderboard position</span>
            </div>
            <span className="text-sm font-bold text-indigo-600">
              {ordinal(leaderboardRank)}
            </span>
          </div>

          {/* XP to next tier */}
          {nextTierName && xpToNextTier != null && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{nextTierEmoji ?? "⬆️"}</span>
                <span className="text-sm text-gray-600">
                  XP to unlock {nextTierName}
                </span>
              </div>
              <span className="text-sm font-bold text-amber-600">
                {xpToNextTier.toLocaleString()} XP
              </span>
            </div>
          )}
          {!nextTierName && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-3.5 text-center">
              <p className="text-sm font-medium text-amber-700">
                ✨ You've reached the highest tier — max altitude!
              </p>
            </div>
          )}
        </div>

        {/* Keep Climbing button */}
        <div className="px-8 pb-8">
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-lg text-sm font-bold bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            ⭐️ Keep Climbing Clips
          </button>
        </div>
      </div>
    </div>
  );
}
