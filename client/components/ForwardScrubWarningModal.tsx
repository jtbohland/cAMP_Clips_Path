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
        <div className={`px-6 py-4 text-center ${
          isFirst
            ? "bg-gradient-to-r from-amber-600 to-orange-500"
            : "bg-gradient-to-r from-red-700 to-orange-600"
        }`}>
          <span className="text-3xl">{isFirst ? "🪵" : "🔥"}</span>
          <h2 className="text-xl font-bold text-white mt-1">
            {isFirst
              ? "You're Gathering Kindling..."
              : "You Lost Control of the Campfire!"}
          </h2>
          <p className="text-white/80 text-sm mt-0.5">
            {isFirst
              ? "One spark and the whole forest could go up."
              : "The forest is in danger."}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {isFirst ? (
            <>
              <p className="text-gray-800 text-sm leading-relaxed">
                Skipping ahead is like playing with matches on the trail. Your Trail Marker has been answered,
                but the video will now <span className="font-bold text-amber-700">auto-rewind to your marker position</span> so
                you don't miss the content.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium">
                  🪵 This is your only warning, camper.
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  Skip again and you'll <span className="font-bold">start a fire</span> — your Time score
                  takes a direct hit, which impacts your overall Engagement score. The more you skip,
                  the bigger the blaze.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-800 text-sm leading-relaxed">
                You've skipped ahead <span className="font-bold text-red-600">{scrubCount} times</span> and
                the campfire is spreading. The video will rewind again, but the damage to your Time score is done.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm font-medium">
                  🔥 Forest fire damage: -{(scrubCount - 1) * 20}% Time score
                </p>
                <p className="text-red-700 text-xs mt-1">
                  Time counts for 45% of your Engagement score. Keep feeding the fire
                  and you'll trigger 🚁 Search & Rescue or ⛈️ Weather the Storm.
                </p>
              </div>
            </>
          )}

          <p className="text-gray-500 text-xs text-center italic">
            🏕️ Your campfire activity is tracked across the entire session.
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-5">
          <button
            onClick={handleDismiss}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md ${
              isFirst
                ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
            }`}
          >
            {isFirst ? "🌲 Got It — Back to the Trail" : "🧯 I Understand — Resume Watching"}
          </button>
        </div>
      </div>
    </div>
  );
}
