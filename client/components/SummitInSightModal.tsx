import { useCallback } from "react";

interface ApproachCatchUpItem {
  emoji: string;
  label: string;
}

interface SummitInSightModalProps {
  /** Missed approach modules to display */
  catchUpItems: ApproachCatchUpItem[];
  /** Learner's summit day date */
  summitDay?: Date;
  /** Navigate to the Approach tab */
  onGoToApproach: () => void;
  onDismiss: () => void;
}

/**
 * 🌤️ Summit in Sight! modal
 * Fires when all 15 Ascent clip-days are complete but Approach items remain.
 * Shows missed modules and directs the learner back to The Approach tab.
 */
export default function SummitInSightModal({
  catchUpItems,
  summitDay,
  onGoToApproach,
  onDismiss,
}: SummitInSightModalProps) {
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
        style={{ border: "2px solid #2D6A4F" }}
      >
        {/* Header — warm sunrise gradient for "almost there" feel */}
        <div className="px-6 py-5 text-center bg-gradient-to-r from-amber-500 to-orange-400">
          <div className="text-5xl mb-2">🌤️</div>
          <h2 className="text-xl font-bold text-white">Summit in Sight!</h2>
          <p className="text-sm mt-1 text-white/90">
            You've completed every Ascent clip — the summit is right there.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-amber-50 text-amber-900">
          {/* Congratulations message */}
          <div className="rounded-lg px-4 py-3 text-sm mb-4 border border-green-300 bg-green-50">
            <p className="font-semibold text-green-800">🧗 All 15 Ascent days complete!</p>
            <p className="mt-1 text-green-700 leading-relaxed">
              You've finished every clip in The Ascent. Just a few Approach items left
              before you officially reach the summit.
            </p>
          </div>

          {/* Missed modules */}
          {catchUpItems.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">🚡 Modules Still Needed</p>
              <div className="rounded-lg px-4 py-3 space-y-1.5 bg-white border border-amber-200">
                {catchUpItems.map((item, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span>☐</span>
                    <span>{item.label}</span>
                    <span>{item.emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summit Day */}
          {summitDay && (
            <div className="rounded-lg px-4 py-2.5 text-center mb-4 bg-amber-100 border border-amber-300">
              <p className="text-xs font-semibold text-amber-700">🏔️ Summit Day</p>
              <p className="text-lg font-bold text-amber-900">
                {summitDay.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => {
              onGoToApproach();
              onDismiss();
            }}
            className="w-full py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 bg-[#1B4332] text-[#D1FAE5]"
          >
            🚡 Back to Approach
          </button>
        </div>
      </div>
    </div>
  );
}
