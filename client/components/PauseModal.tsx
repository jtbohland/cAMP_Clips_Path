type PauseModalProps = {
  clipTitle: string;
  onResume: () => void;
  onStartFresh: () => void;
  onBackToClips: () => void;
};

export default function PauseModal({
  clipTitle,
  onResume,
  onStartFresh,
  onBackToClips,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-2xl">
        {/* "Paused" — small muted centered */}
        <p className="text-sm text-gray-500 text-center mb-1">Paused</p>

        {/* Clip title — bold, centered */}
        <h2 className="text-lg font-bold text-gray-900 text-center mb-5">{clipTitle}</h2>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md"
          >
            ▶ Resume Watching
          </button>
          <button
            onClick={onStartFresh}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
          >
            🌬️ Start Fresh
          </button>
          <button
            onClick={onBackToClips}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            🎞️ Back to Clips
          </button>
          <p className="text-xs text-gray-400 text-center mt-1">
            Your viewing progress and engagement will be saved.
          </p>
        </div>
      </div>
    </div>
  );
}
