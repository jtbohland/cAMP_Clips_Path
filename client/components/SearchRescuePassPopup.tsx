type XpData = {
  sessionBreakdown: { base: number; milestones: number; bonuses: number };
  totalXp: number;
  tier: { name: string; emoji: string };
};

type SearchRescuePassPopupProps = {
  clipTitle: string;
  srCorrect: number;
  srTotal: number;
  srScore: number;
  newEngagementScore: number | null;
  xpData?: XpData;
  onBackToClips: () => void;
  onContinueToNext?: () => void;
};

export default function SearchRescuePassPopup({
  clipTitle,
  srCorrect,
  srTotal,
  srScore,
  newEngagementScore,
  xpData,
  onBackToClips,
  onContinueToNext,
}: SearchRescuePassPopupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🚁</span>
            <h2 className="text-xl font-bold text-gray-900">You've been Rescued!</h2>
          </div>
          <p className="text-sm text-indigo-600 font-medium">{clipTitle}</p>
        </div>

        {/* Score tiles */}
        <div className="px-6 pb-5">
          <div className="flex items-stretch gap-3">
            {/* Tile 1: S&R correct/total */}
            <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">
                {srCorrect}/{srTotal}
              </div>
              <p className="text-xs font-medium text-gray-700 mt-1.5">
                🚁 Search & Rescue
              </p>
            </div>

            {/* Tile 2: Recovery Score percentage */}
            <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{srScore}%</div>
              <p className="text-xs font-medium text-gray-700 mt-1.5">
                ✅ Recovery Score
              </p>
            </div>

            {/* Tile 3: New Engagement Score */}
            <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
              <div
                className={`text-3xl font-bold ${
                  newEngagementScore !== null && newEngagementScore >= 80
                    ? "text-green-600"
                    : "text-gray-900"
                }`}
              >
                {newEngagementScore !== null ? `${newEngagementScore}%` : "—"}
              </div>
              <p className="text-xs font-medium text-gray-700 mt-1.5">
                🦉 NEW Engagement Score
              </p>
            </div>
          </div>
        </div>

        {/* XP Collected This Session */}
        {xpData && (
          <div className="mx-6 mb-5 rounded-xl bg-indigo-50/60 border border-indigo-100 px-4 py-3">
            <p className="text-sm font-bold text-gray-900 mb-2">
              🪵 XP Collected This Session
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                ☀️ Base: {xpData.sessionBreakdown.base}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                🏆 Milestones: {xpData.sessionBreakdown.milestones}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                ⚡ Bonuses: {xpData.sessionBreakdown.bonuses}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Total earned:{" "}
              <span className="font-semibold text-indigo-600">
                {xpData.sessionBreakdown.base +
                  xpData.sessionBreakdown.milestones +
                  xpData.sessionBreakdown.bonuses}{" "}
                XP
              </span>
            </p>
            <div className="mt-2 pt-2 border-t border-indigo-100">
              <p className="text-xs font-medium text-gray-500">📊 Your Progress</p>
              <p className="text-sm text-gray-800 mt-0.5">
                {xpData.tier.emoji} {xpData.tier.name} —{" "}
                <span className="font-semibold text-indigo-600">
                  {xpData.totalXp.toLocaleString()} XP
                </span>{" "}
                total
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6">
          <div className="flex gap-3">
            <button
              onClick={onBackToClips}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
            >
              🎞️ Back to cAMP Clips
            </button>
            {onContinueToNext ? (
              <button
                onClick={onContinueToNext}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                🚵🏼‍♂️ Continue to Next Clip
              </button>
            ) : (
              <button
                onClick={onBackToClips}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                🏕️ Back to cAMP Clips
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
