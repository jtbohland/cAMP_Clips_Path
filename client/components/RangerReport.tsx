type IncorrectQuestion = {
  id: string;
  triggerAtSeconds: number;
  questionText: string;
};

type XpData = {
  sessionBreakdown: { base: number; milestones: number; bonuses: number };
  totalXp: number;
  tier: { name: string; emoji: string };
};

type RangerReportProps = {
  clipTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  onBackToClips: () => void;
  onContinueToNext?: () => void;
  nextIsResourceDay?: boolean;
  onSearchRescue: () => void;
  needsRecovery: boolean;
  incorrectQuestions?: IncorrectQuestion[];
  onTimestampClick?: (seconds: number) => void;
  xpData?: XpData;
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RangerReport({
  clipTitle,
  totalQuestions,
  correctAnswers,
  score,
  onBackToClips,
  onContinueToNext,
  nextIsResourceDay = false,
  onSearchRescue,
  needsRecovery,
  incorrectQuestions = [],
  onTimestampClick,
  xpData,
}: RangerReportProps) {
  const missedCount = totalQuestions - correctAnswers;
  const passed = !needsRecovery;
  const isPerfect = missedCount === 0 && passed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📋</span>
            <h2 className="text-xl font-bold text-gray-900">Ranger Report</h2>
          </div>
          <p className="text-sm text-gray-500">{clipTitle}</p>
        </div>

        {/* Score section */}
        <div className="px-6 pb-5">
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="text-center">
              <div
                className={`text-5xl font-bold ${
                  score >= 80 ? "text-green-600" : score > 0 ? "text-red-500" : "text-gray-300"
                }`}
              >
                {score > 0 ? `${score}%` : "—"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Engagement</p>
            </div>
            <div className="h-14 w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {correctAnswers}/{totalQuestions}
              </div>
              <p className="text-xs text-gray-500 mt-1">Trail Markers</p>
            </div>
          </div>
        </div>

        {/* Smokey Says — only if missed ≥ 1 */}
        {!isPerfect && (
          <div className="mx-6 mb-5 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">🐻</span>
              <div>
                <p className="font-bold text-sm text-gray-900">
                  Smokey Says — Only YOU Can Prevent Knowledge Gaps!
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {missedCount === 1
                    ? "You missed 1 Trail Marker. Review the moment below to solidify that concept."
                    : `You missed ${missedCount} Trail Markers. Review the moments below — these concepts will come up in the field.`}
                </p>
              </div>
            </div>

            {/* Timestamp list — clickable only on review (pass), plain text on initial fail */}
            {incorrectQuestions.length > 0 && (
              <div className="mt-3 pl-12 space-y-1.5">
                {incorrectQuestions.map((q) =>
                  !needsRecovery && onTimestampClick ? (
                    <button
                      key={q.id}
                      onClick={() => onTimestampClick(q.triggerAtSeconds)}
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:underline cursor-pointer w-full text-left"
                    >
                      <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-xs">
                        {formatTimestamp(q.triggerAtSeconds)}
                      </span>
                      <span className="text-gray-600 truncate">{q.questionText}</span>
                    </button>
                  ) : (
                    <div
                      key={q.id}
                      className="flex items-center gap-2 text-sm w-full text-left"
                    >
                      <span className="font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-xs">
                        {formatTimestamp(q.triggerAtSeconds)}
                      </span>
                      <span className="text-gray-600 truncate">{q.questionText}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Perfect score celebration — only when markers perfect AND engagement passed */}
        {isPerfect && (
          <div className="mx-6 mb-5 rounded-xl bg-green-50 border border-green-200 p-4 text-center">
            <span className="text-3xl">🌲</span>
            <p className="font-bold text-sm text-green-700 mt-1">
              Leave No Trace! The trail is pristine.
            </p>
          </div>
        )}

        {/* 🔥 Wildfire Warning — engagement below 80% */}
        {needsRecovery && (
          <div className="mx-6 mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">🔥</span>
              <div>
                <p className="font-bold text-sm text-gray-900">
                  Wildfire Warning
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Your engagement score dropped below the 80% safety line. The forest is at risk.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🪂 Smokejumper Briefing — explains S&R before they click */}
        {needsRecovery && (
          <div className="mx-6 mb-5 rounded-xl bg-indigo-50 border border-indigo-200 p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">🪂</span>
              <div>
                <p className="font-bold text-sm text-gray-900">
                  Smokejumper Briefing
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Search & Rescue deploys a short set of targeted questions to contain the damage. Score ≥80% to clear the fire line and unlock your next clip.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🪵 XP Collected This Session — pass only */}
        {passed && xpData && (
          <div className="mx-6 mb-5 rounded-xl bg-indigo-50/60 border border-indigo-100 px-4 py-3">
            <p className="text-sm font-bold text-gray-900 mb-2">🪵 XP Collected This Session</p>
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
              Total earned: <span className="font-semibold text-indigo-600">{xpData.sessionBreakdown.base + xpData.sessionBreakdown.milestones + xpData.sessionBreakdown.bonuses} XP</span>
            </p>
            <div className="mt-2 pt-2 border-t border-indigo-100">
              <p className="text-xs font-medium text-gray-500">📊 Your Progress</p>
              <p className="text-sm text-gray-800 mt-0.5">
                {xpData.tier.emoji} {xpData.tier.name} — <span className="font-semibold text-indigo-600">{xpData.totalXp.toLocaleString()} XP</span> total
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6">
          {needsRecovery ? (
            /* Score < 80%: ONLY S&R button — no back, no skip, no escape */
            <button
              onClick={onSearchRescue}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              → Continue to Search & Rescue 🚁
            </button>
          ) : (
            /* Score >= 80%: Two side-by-side buttons */
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
                  {nextIsResourceDay ? "🎒 Continue to cAMP Gear" : "🚵🏼‍♂️ Continue to Next Clip"}
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
          )}
        </div>
      </div>
    </div>
  );
}
