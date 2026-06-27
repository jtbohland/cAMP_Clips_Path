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

  // --- Anti-scrub: track cumulative real seconds listened ---
  const lastTimeRef = useRef<number>(0);
  const cumulativeSecondsRef = useRef<number>(0);
  const lastReportedPercentRef = useRef<number>(0);

  // --- Pause-on-tab: track whether user manually paused ---
  const userPausedRef = useRef<boolean>(true); // starts paused (autoPlay=false)

  // When collapsing, stop the player
  useEffect(() => {
    if (!isExpanded && playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {
        // Player may not be ready
      }
    }
  }, [isExpanded]);

  // Override Wistia's default pause-on-tab-hidden behavior —
  // but ONLY if the user was actively playing (not manually paused)
  useEffect(() => {
    if (!isExpanded) return;

    const handleVisibilityChange = () => {
      if (document.hidden && playerRef.current && !userPausedRef.current) {
        // Wistia auto-pauses on tab hide — resume after a short delay
        setTimeout(() => {
          try {
            if (!userPausedRef.current) {
              playerRef.current?.play();
            }
          } catch {
            // ignore
          }
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isExpanded]);

  // Track play/pause state from user actions
  const handlePlay = useCallback(() => {
    userPausedRef.current = false;
  }, []);

  const handlePause = useCallback(() => {
    userPausedRef.current = true;
  }, []);

  // Anti-scrub: only count seconds where playback advanced naturally (~1-3s from last tick)
  const handleSecondChange = useCallback(
    (e: CustomEvent) => {
      const player = e.target as any;
      if (!player) return;

      const totalDuration = player.duration;
      if (!totalDuration || totalDuration <= 0) return;

      const currentTime = player.currentTime ?? 0;
      const delta = currentTime - lastTimeRef.current;

      // Natural playback: time advances by 0.5–3s (accounts for speed up to 2×)
      // Scrub jump: delta is large (>3s) or negative — don't count those
      if (delta > 0.5 && delta <= 3) {
        cumulativeSecondsRef.current += delta;
      }

      lastTimeRef.current = currentTime;

      // Report cumulative percent at 5% intervals
      const cumulativePercent = Math.min(cumulativeSecondsRef.current / totalDuration, 1);
      if (cumulativePercent - lastReportedPercentRef.current >= 0.05) {
        lastReportedPercentRef.current = cumulativePercent;
        onPercentChange(mediaId, cumulativePercent);
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
              autoPlay={false}
              volumeControl={false}
              onPlay={handlePlay}
              onPause={handlePause}
              onSecondChange={handleSecondChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
