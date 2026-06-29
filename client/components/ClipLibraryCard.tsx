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
  pausedElapsedSeconds: number;
  xpEarned: number;
  previousClipTitle?: string;
  onWatch: () => void;
  onReview?: () => void;
  onWheelAndDeal?: () => void;
  onCampQuiz?: () => void;
  onZoomClipWatch?: () => void;
  onZoomClipReview?: () => void;
  zoomClipWatched?: boolean;
  onPodcasts?: () => void;
  onBonusClip1Watch?: () => void;
  onBonusClip1Review?: () => void;
  bonusClip1Watched?: boolean;
  onBonusClip2Watch?: () => void;
  onBonusClip2Review?: () => void;
  bonusClip2Watched?: boolean;
};

function getWeekLabel(weekNumber: number | null, sortOrder: number): string {
  if (weekNumber != null) return `WEEK ${weekNumber}`;
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

function getSessionTitle(title: string): string {
  const match = title.match(/^Day \d+\w?:\s*(.+)$/);
  return match ? match[1] : title;
}

/**
 * Exactly 3 button states (+ locked):
 * - "watch"   → no session OR paused_elapsed_seconds ≤ 1
 * - "resume"  → paused_elapsed_seconds > 1 (has meaningful progress)
 * - "report"  → next clip is unlocked (completed=true AND score≥80)
 * - "locked"  → previous clip not passed
 */
type ButtonState = "watch" | "resume" | "report" | "locked";

function getButtonState(
  isLocked: boolean,
  isCompleted: boolean,
  pausedElapsedSeconds: number,
): ButtonState {
  if (isLocked) return "locked";
  if (isCompleted) return "report";
  if (pausedElapsedSeconds > 1) return "resume";
  return "watch";
}

// Clips that show the cAMP Quiz button
const CAMP_QUIZ_SORT_ORDERS = new Set([1, 2, 3, 4, 5, 7, 9, 10, 12, 13, 14, 15, 17]);
// Clips that show the Wheel & Deal practice button (every 3rd: 3, 6, 9, 12, 15)
const WHEEL_AND_DEAL_SORT_ORDERS = new Set([3, 6, 9, 12, 15]);
// Sort order 4 has an additional Zoom clip (Reachdesk) — shows extra button
const REACHDESK_SORT_ORDER = 4;

// Sort order 15 (Deal Desk & CPQ) has two bonus Wistia clips
const DEAL_DESK_SORT_ORDER = 15;

export default function ClipLibraryCard({
  clip,
  isLocked,
  isCompleted,
  pausedElapsedSeconds,
  xpEarned,
  previousClipTitle,
  onWatch,
  onReview,
  onWheelAndDeal,
  onCampQuiz,
  onZoomClipWatch,
  onZoomClipReview,
  zoomClipWatched,
  onPodcasts,
  onBonusClip1Watch,
  onBonusClip1Review,
  bonusClip1Watched,
  onBonusClip2Watch,
  onBonusClip2Review,
  bonusClip2Watched,
}: ClipLibraryCardProps) {
  const buttonState = getButtonState(isLocked, isCompleted, pausedElapsedSeconds);

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const deepLink = `https://app.superblocks.com/code-mode/applications/fbc1d457-949d-4756-9cd4-ca723f3cb5ac/watch/${clip.id}`;
      navigator.clipboard
        .writeText(deepLink)
        .then(() => toast("🔗 Link Copied!", { style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" } }))
        .catch(() => toast.error("Failed to copy link"));
    },
    [clip.id]
  );

  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 ${
        buttonState === "locked"
          ? "opacity-55 cursor-default"
          : "hover:shadow-md cursor-pointer"
      }`}
      onClick={buttonState !== "locked" ? (buttonState === "report" ? onReview : onWatch) : undefined}
    >
      <div className="flex flex-col gap-3">
        {/* Row 1: Week/Day label + status badge + share */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.12em] text-indigo-600 uppercase">
            {getWeekLabel(clip.weekNumber, clip.sortOrder)} · {getDayLabel(clip.dayLabel, clip.sortOrder)}
          </span>
          <div className="flex items-center gap-2">
            {buttonState === "report" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                ✅ Completed
                {xpEarned > 0 && (
                  <span className="ml-1 text-indigo-600">+{xpEarned} XP</span>
                )}
              </span>
            )}
            {buttonState === "resume" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                🐌 In Progress
              </span>
            )}
            <button
              onClick={handleShare}
              className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              title="Copy share link"
            >
              🔗
            </button>
          </div>
        </div>

        {/* Row 2: Title */}
        <h3 className="text-base font-bold text-gray-900 leading-snug">
          {clip.sortOrder === REACHDESK_SORT_ORDER ? "📇 Prospecting Process + Reachdesk" : getSessionTitle(clip.title)}
        </h3>

        {/* Row 3: Metadata — standard for all clips */}
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
          <span>📋 Ranger Report</span>
        </p>

        {/* Row 4: Action button — standard for ALL clips */}
        <ActionButton
          buttonState={buttonState}
          previousClipTitle={previousClipTitle}
          onWatch={onWatch}
          onReview={onReview}
        />

        {/* Reachdesk Zoom Clip — additional button for sort order 4 only */}
        {clip.sortOrder === REACHDESK_SORT_ORDER && buttonState !== "locked" && onZoomClipWatch && (
          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap mb-2">
              <span>⏱️ 44m</span>
              <span className="text-gray-300">·</span>
              <span>🪧 0 Trail Markers</span>
              <span className="text-gray-300">·</span>
              <span>👀 View tracked in Zoom</span>
            </p>
            {zoomClipWatched ? (
              <button
                onClick={(e) => { e.stopPropagation(); onZoomClipReview ? onZoomClipReview() : onZoomClipWatch(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                🗺️ Review Reachdesk Report
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onZoomClipWatch(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                🚣🏼‍♂️ Watch Clip
              </button>
            )}
          </div>
        )}

        {/* Deal Desk Bonus Clips — sort order 15 only, unlocked when main clip is completed */}
        {clip.sortOrder === DEAL_DESK_SORT_ORDER && buttonState === "report" && onBonusClip1Watch && (
          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap mb-2">
              <span>⏱️ 2m</span>
              <span className="text-gray-300">·</span>
              <span>🪧 0 Trail Markers</span>
              <span className="text-gray-300">·</span>
              <span>👀 View tracked in Wistia</span>
            </p>
            {bonusClip1Watched ? (
              <button
                onClick={(e) => { e.stopPropagation(); onBonusClip1Review ? onBonusClip1Review() : onBonusClip1Watch(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                🗺️ Review Clip — How to Create a Support Case
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onBonusClip1Watch(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                🚣🏼‍♂️ Watch Clip — How to Create a Support Case
              </button>
            )}
          </div>
        )}

        {clip.sortOrder === DEAL_DESK_SORT_ORDER && buttonState === "report" && onBonusClip2Watch && (
          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap mb-2">
              <span>⏱️ 5m</span>
              <span className="text-gray-300">·</span>
              <span>🪧 0 Trail Markers</span>
              <span className="text-gray-300">·</span>
              <span>👀 View tracked in Wistia</span>
            </p>
            {bonusClip2Watched ? (
              <button
                onClick={(e) => { e.stopPropagation(); onBonusClip2Review ? onBonusClip2Review() : onBonusClip2Watch(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                🗺️ Review Clip — Sales Stage 6.5
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onBonusClip2Watch(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                🚣🏼‍♂️ Watch Clip — Sales Stage 6.5
              </button>
            )}
          </div>
        )}

        {/* cAMP Quiz button — always visible on qualifying tiles */}
        {CAMP_QUIZ_SORT_ORDERS.has(clip.sortOrder) && onCampQuiz && (
          <button
            onClick={(e) => { e.stopPropagation(); onCampQuiz(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#EA580C] hover:bg-[#C2410C] text-white transition-colors"
          >
            🧠 cAMP Quiz
          </button>
        )}
        {CAMP_QUIZ_SORT_ORDERS.has(clip.sortOrder) && onCampQuiz && (
          <p className="text-[11px] text-gray-400 text-center -mt-1">
            Content Knowledge Checks — validate your learning after each session
          </p>
        )}

        {/* Wheel & Deal button — always visible on qualifying tiles */}
        {WHEEL_AND_DEAL_SORT_ORDERS.has(clip.sortOrder) && onWheelAndDeal && (
          <button
            onClick={(e) => { e.stopPropagation(); onWheelAndDeal(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
          >
            🎡 Wheel & Deal
          </button>
        )}
        {WHEEL_AND_DEAL_SORT_ORDERS.has(clip.sortOrder) && onWheelAndDeal && (
          <p className="text-[11px] text-gray-400 text-center -mt-1">
            REMEMBER: product-fluency practice — solo or multiplayer — as prep for cAMP 201.
          </p>
        )}

        {/* PODcast button — sort order 13 (Customer Stories) */}
        {clip.sortOrder === 13 && onPodcasts && (
          <button
            onClick={(e) => { e.stopPropagation(); onPodcasts(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#fec302] hover:bg-[#e5b002] text-gray-900 transition-colors"
          >
            🎧 Listen to PODcasts
          </button>
        )}
        {clip.sortOrder === 13 && onPodcasts && (
          <p className="text-[11px] text-gray-400 text-center -mt-1">
            Real Amplitude PODs break down complex wins — listen at your own pace
          </p>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  buttonState,
  previousClipTitle,
  onWatch,
  onReview,
}: {
  buttonState: ButtonState;
  previousClipTitle?: string;
  onWatch: () => void;
  onReview?: () => void;
}) {
  switch (buttonState) {
    case "watch":
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onWatch(); }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          🚣🏼‍♂️ Watch Clip
        </button>
      );
    case "resume":
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onWatch(); }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          🧗🏼 Resume Clip
        </button>
      );
    case "report":
      return (
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onReview ? onReview() : onWatch(); }}
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
