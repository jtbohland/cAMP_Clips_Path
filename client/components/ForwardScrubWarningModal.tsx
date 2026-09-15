import { useCallback } from "react";

type ForwardScrubWarningModalProps = {
  onDismiss: () => void;
  scrubCount: number;
};

export default function ForwardScrubWarningModal({
  onDismiss,
  scrubCount,
}: ForwardScrubWarningModalProps) {
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const isFirst = scrubCount <= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-4 text-center">
          <span className="text-3xl">⏭️🚫</span>
          <h2 className="text-xl font-bold text-white mt-1">
            {isFirst ? "Whoa — You Tried to Skip Ahead!" : "Skip Detected Again"}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {isFirst ? (
            <>
              <p className="text-gray-800 text-sm leading-relaxed">
                Your Trail Marker has been answered, but the video will now
                <span className="font-bold text-red-600"> auto-rewind to your marker position</span> so
                you don't miss the content.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium">
                  ⚠️ This is your only warning.
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  Skipping ahead again will <span className="font-bold">penalize your Time score</span>,
                  which directly impacts your overall Engagement score. The more you skip,
                  the bigger the penalty.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-800 text-sm leading-relaxed">
                You've skipped ahead <span className="font-bold text-red-600">{scrubCount} times</span>.
                The video will rewind again, and your Time score is being penalized.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm font-medium">
                  🔥 Time score penalty: -{(scrubCount - 1) * 20}%
                </p>
                <p className="text-red-700 text-xs mt-1">
                  Time counts for 45% of your Engagement score. Keep skipping
                  and you'll trigger Search & Rescue or Weather the Storm.
                </p>
              </div>
            </>
          )}

          <p className="text-gray-500 text-xs text-center italic">
            This behavior is tracked across your entire session.
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-5">
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md"
          >
            {isFirst ? "Got It — Resume Watching" : "I Understand — Resume Watching"}
          </button>
        </div>
      </div>
    </div>
  );
}