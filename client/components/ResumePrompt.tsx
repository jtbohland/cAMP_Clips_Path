type ResumePromptProps = {
  clipTitle: string;
  elapsedSeconds: number;
  answeredCount: number;
  totalQuestions: number;
  onResume: () => void;
  onStartFresh: () => void;
};

export default function ResumePrompt({
  clipTitle,
  elapsedSeconds,
  answeredCount,
  totalQuestions,
  onResume,
  onStartFresh,
}: ResumePromptProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⏸️</span>
          <h2 className="text-xl font-bold text-gray-900">Resume Your Session?</h2>
        </div>

        {/* Stats card */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            You paused <span className="font-semibold text-gray-900">{clipTitle}</span>{" "}
            <span className="font-mono text-indigo-600 font-semibold">{timeStr}</span> in,
            with{" "}
            <span className="font-semibold text-gray-900">
              {answeredCount}/{totalQuestions}
            </span>{" "}
            Trail Markers answered.
          </p>
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
            className="w-full py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            🌬️ Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
