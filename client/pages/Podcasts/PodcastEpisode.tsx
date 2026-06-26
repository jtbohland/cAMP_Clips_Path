import { useCallback, useEffect, useRef } from "react";
import { WistiaPlayer } from "@wistia/wistia-player-react";

type PodcastEpisodeProps = {
  title: string;
  duration: string;
  mediaId: string;
  isExpanded: boolean;
  isCompleted: boolean;
  percentWatched: number;
  onToggle: () => void;
  onPercentChange: (mediaId: string, percent: number) => void;
};

export default function PodcastEpisode({
  title,
  duration,
  mediaId,
  isExpanded,
  isCompleted,
  percentWatched,
  onToggle,
  onPercentChange,
}: PodcastEpisodeProps) {
  const playerRef = useRef<any>(null);
  const lastReportedRef = useRef(0);

  // When collapsing, stop the video
  useEffect(() => {
    if (!isExpanded && playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {
        // Player may not be ready
      }
    }
  }, [isExpanded]);

  // Override Wistia's default pause-on-tab-hidden behavior
  useEffect(() => {
    if (!isExpanded) return;

    const handleVisibilityChange = () => {
      // When the page becomes hidden, Wistia pauses by default.
      // We resume immediately to allow background listening.
      if (document.hidden && playerRef.current) {
        // Small delay to let Wistia's own handler fire first, then resume
        setTimeout(() => {
          try {
            playerRef.current?.play();
          } catch {
            // ignore
          }
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isExpanded]);

  const handleSecondChange = useCallback(
    (e: CustomEvent) => {
      const player = e.target as any;
      if (!player) return;

      const duration = player.duration;
      if (!duration || duration <= 0) return;

      const currentTime = player.currentTime ?? 0;
      const percent = currentTime / duration;

      // Only report at meaningful intervals (every 5% change)
      if (Math.abs(percent - lastReportedRef.current) >= 0.05) {
        lastReportedRef.current = percent;
        onPercentChange(mediaId, percent);
      }
    },
    [mediaId, onPercentChange]
  );

  const progressPercent = Math.round(percentWatched * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {/* Clickable header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">🍿</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">⏱️ {duration}</span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  ✅ Listened
                </span>
              )}
              {!isCompleted && percentWatched > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  🎧 {progressPercent}%
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-gray-400 text-sm flex-shrink-0 ml-2">
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Progress bar under header */}
      {percentWatched > 0 && !isExpanded && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
              backgroundColor: isCompleted ? "#16a34a" : "#f59e0b",
            }}
          />
        </div>
      )}

      {/* Inline Wistia player */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          <div className="rounded-lg overflow-hidden shadow-sm">
            <WistiaPlayer
              ref={playerRef}
              mediaId={mediaId}
              playerColor="#1B4332"
              fullscreenButton={false}
              volumeControl={false}
              autoPlay={false}
              onSecondChange={handleSecondChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
