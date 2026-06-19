type ResumePromptProps = {
  clipTitle: string;
  elapsedSeconds: number;
  durationSeconds: number | null;
  answeredCount: number;
  totalQuestions: number;
  onResume: () => void;
  onStartFresh: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ResumePrompt({
  clipTitle,
  elapsedSeconds,
  durationSeconds,
  answeredCount,
  totalQuestions,
  onResume,
  onStartFresh,
}: ResumePromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-2xl">
        {/* "You paused" — small muted centered */}
        <p className="text-sm text-gray-500 text-center mb-1">You paused</p>

        {/* Clip title — bold, centered, own line */}
        <h2 className="text-lg font-bold text-gray-900 text-center mb-5">{clipTitle}</h2>

        {/* Stats card with divider between two rows */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-6">
          {/* Row 1: Time elapsed */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>⏱️</span>
            <span>
              <span className="font-mono font-semibold text-indigo-600">{formatTime(elapsedSeconds)}</span>
              {durationSeconds ? (
                <span className="text-gray-500"> of {formatDuration(durationSeconds)} complete</span>
              ) : (
                <span className="text-gray-500"> elapsed</span>
              )}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-3" />

          {/* Row 2: Trail Markers */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>🪧</span>
            <span>
              <span className="font-semibold text-gray-900">{answeredCount}</span>
              <span className="text-gray-500"> of </span>
              <span className="font-semibold text-gray-900">{totalQuestions}</span>
              <span className="text-gray-500"> Trail Markers answered</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md"
          >
            🥾 Resume Where I Left Off
          </button>
          <button
            onClick={onStartFresh}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
          >
            🌬️ Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
