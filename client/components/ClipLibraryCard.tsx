import { toast } from "sonner";
import { useCallback } from "react";

type ClipLibraryCardProps = {
  clip: {
    id: string;
    title: string;
    sortOrder: number;
    weekNumber: number | null;
    dayLabel: string | null;
    videoUrl: string | null;
    durationSeconds: number | null;
    questionCount: number;
  };
  isLocked: boolean;
  isCompleted: boolean;
  score: number | null;
  attempts: number;
  xpEarned: number;
  previousClipTitle?: string;
  onWatch: () => void;
  onReview?: () => void;
};

function getWeekLabel(weekNumber: number | null, sortOrder: number): string {
  if (weekNumber != null) return `WEEK ${weekNumber}`;
  // Fallback for clips without week_number
  if (sortOrder <= 4) return "WEEK 2";
  if (sortOrder <= 9) return "WEEK 3";
  return "WEEK 4";
}

function getDayLabel(dayLabel: string | null, sortOrder: number): string {
  if (dayLabel) return dayLabel.toUpperCase();
  return `DAY ${sortOrder}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/** Extract the session title without the "Day X:" prefix */
function getSessionTitle(title: string): string {
  const match = title.match(/^Day \d+\w?:\s*(.+)$/);
  return match ? match[1] : title;
}

type ClipState = "not_started" | "in_progress" | "completed" | "locked";

function getClipState(isLocked: boolean, isCompleted: boolean, attempts: number): ClipState {
  if (isLocked) return "locked";
  if (isCompleted) return "completed";
  if (attempts > 0) return "in_progress";
  return "not_started";
}

export default function ClipLibraryCard({
  clip,
  isLocked,
  isCompleted,
  score,
  attempts,
  xpEarned,
  previousClipTitle,
  onWatch,
  onReview,
}: ClipLibraryCardProps) {
  const state = getClipState(isLocked, isCompleted, attempts);

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const deepLink = `${window.location.origin}/clip/${clip.id}`;
      navigator.clipboard
        .writeText(deepLink)
        .then(() => toast("✅ Link copied!", { style: { backgroundColor: "#ffffff", color: "#111827", border: "1px solid #E5E7EB" } }))
        .catch(() => toast.error("Failed to copy link"));
    },
    [clip.id]
  );

  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 ${
        state === "locked"
          ? "opacity-55 cursor-default"
          : "hover:shadow-md cursor-pointer"
      }`}
      onClick={state !== "locked" ? onWatch : undefined}
    >
      <div className="flex flex-col gap-3">
        {/* Row 1: Week/Day label + status badge + share */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.12em] text-indigo-600 uppercase">
            {getWeekLabel(clip.weekNumber, clip.sortOrder)} · {getDayLabel(clip.dayLabel, clip.sortOrder)}
          </span>
          <div className="flex items-center gap-2">
            {state === "completed" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                ✅ Completed
                {score !== null && <span className="ml-0.5">({score}%)</span>}
                {xpEarned > 0 && (
                  <span className="ml-1 text-indigo-600">+{xpEarned} XP</span>
                )}
              </span>
            )}
            {state === "in_progress" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                ▶ In Progress
              </span>
            )}
            {state !== "locked" && (
              <button
                onClick={handleShare}
                className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                title="Copy share link"
              >
                🔗
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Title (emoji is embedded in the title from DB) */}
        <h3 className="text-base font-bold text-gray-900 leading-snug">
          {getSessionTitle(clip.title)}
        </h3>

        {/* Row 3: Metadata line */}
        <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
          {clip.durationSeconds ? (
            <>
              <span>⏱️ {formatDuration(clip.durationSeconds)}</span>
              <span className="text-gray-300">·</span>
            </>
          ) : null}
          <span>🪧 {clip.questionCount} Trail Markers</span>
          <span className="text-gray-300">·</span>
          <span>80% engagement required</span>
          <span className="text-gray-300">·</span>
          <span>Ranger Report ✨</span>
        </p>

        {/* Row 4: Action button */}
        <ActionButton
          state={state}
          previousClipTitle={previousClipTitle}
          onWatch={onWatch}
          onReview={onReview}
        />
      </div>
    </div>
  );
}

function ActionButton({
  state,
  previousClipTitle,
  onWatch,
  onReview,
}: {
  state: ClipState;
  previousClipTitle?: string;
  onWatch: () => void;
  onReview?: () => void;
}) {
  switch (state) {
    case "not_started":
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWatch();
          }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          🚣🏼‍♂️ Watch Clip
        </button>
      );
    case "in_progress":
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWatch();
          }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          🧗🏼 Resume Clip
        </button>
      );
    case "completed":
      return (
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReview ? onReview() : onWatch();
            }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            🗺️ Review Ranger Report
          </button>
          <p className="text-xs text-gray-400 mt-1">
            Scores • key takeaways • missed markers • XP collected • resources
          </p>
        </div>
      );
    case "locked":
      return (
        <button
          disabled
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
        >
          🔒 Watch & pass{" "}
          {previousClipTitle
            ? getPreviousClipShortName(previousClipTitle)
            : "the previous clip"}{" "}
          to unlock
        </button>
      );
  }
}

function getPreviousClipShortName(title: string): string {
  const match = title.match(/^Day \d+\w?:\s*(.+)$/);
  return match ? match[1] : title;
}
