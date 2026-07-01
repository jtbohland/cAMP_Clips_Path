import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { useApi } from "@/hooks/useApi.js";

type FirstAchievementModalProps = {
  viewerId: string;
  earnedXp: number;
  earnedBadge: boolean;
  onDismiss: () => void;
};

/**
 * First Achievement modal — shown once when a learner transitions from
 * The Approach (Week 1) to The Ascent, celebrating their first XP and
 * Peak Lift badge (if earned within 5 weekdays).
 */
export default function FirstAchievementModal({
  viewerId,
  earnedXp,
  earnedBadge,
  onDismiss,
}: FirstAchievementModalProps) {
  const { run: markShown } = useApi("MarkFirstAchievement");

  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Celebration confetti — gondolas
    const gondolaShape = (confetti as any).shapeFromText({ text: "🚡", scalar: 2 });
    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        shapes: [gondolaShape],
        scalar: 2,
        flat: true,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        shapes: [gondolaShape],
        scalar: 2,
        flat: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // Mark as shown in DB
    markShown({ viewerId }).catch(() => {});

    return () => {
      document.body.style.overflow = "";
    };
  }, [viewerId, markShown]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className={`px-8 pt-6 pb-5 text-center ${earnedBadge ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-yellow-500'}`}>
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <span className="text-4xl">🚡</span>
          </div>
          <p className="text-2xl font-bold uppercase tracking-widest text-white">
            The Approach is Complete!
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 text-center space-y-4">
          <div className="text-5xl">🏕️</div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">Welcome to The Ascent!</h3>
            <p className="text-sm text-gray-500 mt-1">
              You've conquered The Approach and earned your first milestone.
              The real climb starts now.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            {earnedBadge && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
                <span className="text-lg">🚡</span>
                <span className="text-sm font-bold text-amber-700">Peak Lift Badge</span>
              </div>
            )}
            {earnedXp > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-bold text-indigo-700">+{earnedXp} XP</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 leading-relaxed">
            Your cAMP Clips journey is just beginning. Each clip earns XP,
            unlocks badges, and moves you toward the summit.
            Your manager can track your progress along the way.
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex justify-center">
          <button
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Continue climbing! 🧗
          </button>
        </div>
      </div>
    </div>
  );
}
