type IncorrectQuestion = {
  questionId: string;
  questionText: string;
  triggerAtSeconds: number;
  isRecovery: boolean;
};

type BackTrackSectionProps = {
  incorrectQuestions: IncorrectQuestion[];
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function BackTrackSection({ incorrectQuestions }: BackTrackSectionProps) {
  const trailMarkerMissed = incorrectQuestions.filter((q) => !q.isRecovery);
  const rescueMissed = incorrectQuestions.filter((q) => q.isRecovery);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🐾</span>
        <h2 className="text-base font-bold text-gray-900">Back Track</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        See what you missed. Review these moments in the clip to lock in the concepts.
      </p>

      {/* Trail Marker misses */}
      {trailMarkerMissed.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            🪧 Trail Markers
          </p>
          <div className="space-y-1.5">
            {trailMarkerMissed.map((q) => (
              <div key={q.questionId} className="flex items-start gap-2 text-sm">
                <span className="font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                  {formatTimestamp(q.triggerAtSeconds)}
                </span>
                <span className="text-gray-600">{q.questionText}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* S&R misses */}
      {rescueMissed.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            🚁 Search & Rescue
          </p>
          <div className="space-y-1.5">
            {rescueMissed.map((q) => (
              <div key={q.questionId} className="flex items-start gap-2 text-sm">
                <span className="font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                  {formatTimestamp(q.triggerAtSeconds)}
                </span>
                <span className="text-gray-600">{q.questionText}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
