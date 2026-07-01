import { WistiaPlayer } from "@wistia/wistia-player-react";

type RewatchPlayerProps = {
  videoId: string;
  clipTitle: string;
  onClose: () => void;
};

/**
 * Read-only Wistia video player for rewatching a completed clip.
 *
 * ZERO side effects:
 * - No session created (no StartSession call)
 * - No XP tracking or engagement scoring
 * - No trail markers fire
 * - No Ranger Report triggered
 * - No DB writes of any kind
 *
 * The learner can freely seek, fast-forward, and rewatch at their own pace.
 */
export default function RewatchPlayer({ videoId, clipTitle, onClose }: RewatchPlayerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🌱</span>
          <h2 className="text-sm font-semibold text-white truncate">Rewatch: {clipTitle}</h2>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* Video player — takes full remaining space */}
      <div className="flex-1 flex items-center justify-center">
        <div style={{ width: "100%", maxWidth: 1280, aspectRatio: "16 / 9" }}>
          <WistiaPlayer
            mediaId={videoId}
            playerColor="4F46E5"
            autoplay={true}
          />
        </div>
      </div>
    </div>
  );
}
