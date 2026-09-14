import { useCallback } from "react";

const LEGAL_101_URL = "https://deeplinks.mindtickle.com/MxXNN1FIq6b";

interface Legal101ReminderModalProps {
  onContinue: () => void;
}

/**
 * ⚖️ Legal 101 Reminder Modal — one-time nudge shown when learner clicks
 * "Begin The Ascent". Purely informational — no gating or tracking.
 * After clicking "Continue to Ascent", the normal unlock flow proceeds.
 */
export default function Legal101ReminderModal({ onContinue }: Legal101ReminderModalProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onContinue();
    },
    [onContinue]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: "2px solid #4338CA" }}
      >
        {/* Header */}
        <div className="px-6 py-5 text-center bg-gradient-to-r from-indigo-800 to-indigo-700">
          <div className="text-5xl mb-2">⚖️</div>
          <h2 className="text-xl font-bold text-indigo-100">
            Quick Reminder Before You Go!
          </h2>
          <p className="text-sm mt-1 text-indigo-200 opacity-90">
            Have you completed your mandatory Legal 101 training?
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-indigo-50 text-indigo-900 space-y-4">
          <p className="text-sm leading-relaxed">
            All sellers are required to complete <strong>Legal 101</strong> in MindTickle.
            This training covers essential legal guidelines for your role.
          </p>

          <div className="rounded-lg border border-indigo-200 bg-white p-4 text-center">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
              MindTickle Course
            </p>
            <a
              href={LEGAL_101_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              🦉 Open Legal 101 Training
              <span className="text-indigo-200 text-xs">↗</span>
            </a>
          </div>

          <p className="text-xs text-indigo-400 text-center italic">
            This is your only reminder during cAMP Ascent.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-indigo-50 border-t border-indigo-100">
          <button
            onClick={onContinue}
            className="w-full py-3 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#2D6A4F] transition-colors shadow-sm"
          >
            🧗 Continue to Ascent
          </button>
        </div>
      </div>
    </div>
  );
}
