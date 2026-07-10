import { useCallback } from "react";
import { WEEK1_TOTAL_ITEMS } from "@/lib/pacing";

interface OhDeerModalProps {
  completedItems: number;
  onDismiss: () => void;
}

/**
 * 🦌 Oh Deer modal — Day 8+ auto-unlock.
 * Fires when a learner hasn't completed Approach by Day 8.
 * No XP, no badge, no FirstAchievementModal.
 * Client triggers auto-unlock via the UnlockAscent API with a separate flag.
 */
export default function OhDeerModal({
  completedItems,
  onDismiss,
}: OhDeerModalProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: "2px solid #92400E" }}
      >
        {/* Header — warm amber/brown for the deer theme */}
        <div className="px-6 py-5 text-center bg-gradient-to-r from-amber-800 to-amber-700">
          <div className="text-5xl mb-2">🦌</div>
          <h2 className="text-xl font-bold text-amber-100">Oh Deer!</h2>
          <p className="text-sm mt-1 text-amber-200 opacity-90">
            Your Approach deadline has passed
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-amber-50 text-amber-900">
          {/* Progress */}
          <div className="mb-4">
            <p className="text-sm font-bold">Modules Completed</p>
            <p className="text-2xl font-bold">{completedItems} / {WEEK1_TOTAL_ITEMS}</p>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-4 bg-amber-200">
            <div
              className="h-full rounded-full transition-all duration-500 bg-amber-700"
              style={{
                width: `${Math.min(Math.round((completedItems / WEEK1_TOTAL_ITEMS) * 100), 100)}%`,
              }}
            />
          </div>

          {/* Message */}
          <div className="rounded-lg px-4 py-3 text-sm mb-4 border border-amber-300 bg-white">
            <p className="font-semibold text-amber-800">🔓 Ascent Unlocked</p>
            <p className="mt-2 text-amber-700 leading-relaxed">
              Click <strong>Begin Ascent</strong> to start the next part of your journey: Day 1: Industries & Personas.
              You still need to finish all Approach modules before you can reach the summit.
            </p>
          </div>

          {/* No XP note */}
          <div className="rounded-lg px-4 py-2.5 text-center mb-4 bg-gray-100 border border-gray-200">
            <p className="text-xs text-gray-600">
              Auto-unlock — no XP or badge awarded. Complete Approach modules to unlock the summit.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 bg-amber-800 text-amber-100"
          >
            🧗🏻‍♂️ Begin Ascent
          </button>
        </div>
      </div>
    </div>
  );
}
