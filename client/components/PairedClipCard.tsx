import { toast } from "sonner";
import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Merged A/B clip card — renders two clips in one tile for dual-session days.
 * Follows the same visual pattern as the Sort 4 Reachdesk card.
 *
 * Pairs: Sort 6+7 (Day 7), Sort 8+9 (Day 8), Sort 11+12 (Day 11), Sort 16+17 (Day 15)
 */

type ClipData = {
  id: string;
  title: string;
  sortOrder: number;
  weekNumber: number | null;
  dayLabel: string | null;
  videoUrl: string | null;
  durationSeconds: number | null;
  questionCount: number;
};

type ClipState = {
  isLocked: boolean;
  isCompleted: boolean;
  pausedElapsedSeconds: number;
  xpEarned: number;
};

type PairedClipCardProps = {
  clipA: ClipData;
  clipB: ClipData;
  stateA: ClipState;
  stateB: ClipState;
  previousClipTitle?: string;
  onWatchA: () => void;
  onWatchB: () => void;
  onReviewA?: () => void;
  onReviewB?: () => void;
  onWheelAndDeal?: () => void;
  onCampQuiz?: () => void;
};

// Clips that show the cAMP Quiz button
const CAMP_QUIZ_SORT_ORDERS = new Set([1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 14, 15, 16, 17, 19]);
// Clips that show the Wheel & Deal practice button
const WHEEL_AND_DEAL_SORT_ORDERS = new Set([3, 7, 10, 14, 17]);

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

/** For paired cards, map sort orders to the clean day number (no A/B suffix) */
const PAIRED_DAY_MAP: Record<number, number> = {
  7: 7, 8: 7,
  9: 8, 10: 8,
  13: 11, 14: 11,
  18: 15, 19: 15,
};

function getPairedDayLabel(sortOrder: number): string {
  return `DAY ${PAIRED_DAY_MAP[sortOrder] ?? sortOrder}`;
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

/** Strip leading emoji from a title, e.g. "🏎️ Discovery" → ["🏎️", "Discovery"] */
function splitEmoji(title: string): [string, string] {
  // Match any leading emoji sequence (emoji + optional variation selectors / ZWJ)
  const match = title.match(/^((?:\p{Emoji}[\u{FE0E}\u{FE0F}]?(?:\u{200D}\p{Emoji}[\u{FE0E}\u{FE0F}]?)*)+\s*)/u);
  if (match) return [match[1].trim(), title.slice(match[0].length)];
  return ["", title];
}

/** Merged title parts for rendering with pill badges */
function getMergedTitleParts(clipA: ClipData, clipB: ClipData): { emoji: string; nameA: string; nameB: string } {
  const titleA = getSessionTitle(clipA.title);
  const titleB = getSessionTitle(clipB.title);
  const [emojiA, nameA] = splitEmoji(titleA);
  const [, nameB] = splitEmoji(titleB);
  return { emoji: emojiA, nameA, nameB };
}

/** Overall status pill for the card */
function getOverallStatus(stateA: ClipState, stateB: ClipState): "completed" | "in_progress" | "locked" | "ready" {
  if (stateA.isCompleted && stateB.isCompleted) return "completed";
  if (stateA.isLocked && stateB.isLocked) return "locked";
  if (
    stateA.pausedElapsedSeconds > 1 ||
    stateB.pausedElapsedSeconds > 1 ||
    (stateA.isCompleted && !stateB.isCompleted) ||
    (!stateA.isCompleted && stateB.isCompleted)
  )
    return "in_progress";
  return "ready";
}

function getPreviousClipShortName(title: string): string {
  const match = title.match(/^Day \d+\w?:\s*(.+)$/);
  return match ? match[1] : title;
}

export default function PairedClipCard({
  clipA,
  clipB,
  stateA,
  stateB,
  previousClipTitle,
  onWatchA,
  onWatchB,
  onReviewA,
  onReviewB,
  onWheelAndDeal,
  onCampQuiz,
}: PairedClipCardProps) {
  const buttonStateA = getButtonState(stateA.isLocked, stateA.isCompleted, stateA.pausedElapsedSeconds);
  const buttonStateB = getButtonState(stateB.isLocked, stateB.isCompleted, stateB.pausedElapsedSeconds);
  const overallStatus = getOverallStatus(stateA, stateB);
  const totalXp = stateA.xpEarned + stateB.xpEarned;

  const handleShareA = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const deepLink = `https://app.superblocks.com/code-mode/applications/fbc1d457-949d-4756-9cd4-ca723f3cb5ac/watch/${clipA.id}`;
      navigator.clipboard
        .writeText(deepLink)
        .then(() => toast("🔗 Link Copied!", { style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" } }))
        .catch(() => toast.error("Failed to copy link"));
    },
    [clipA.id]
  );

  const handleShareB = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const deepLink = `https://app.superblocks.com/code-mode/applications/fbc1d457-949d-4756-9cd4-ca723f3cb5ac/watch/${clipB.id}`;
      navigator.clipboard
        .writeText(deepLink)
        .then(() => toast("🔗 Link Copied!", { style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" } }))
        .catch(() => toast.error("Failed to copy link"));
    },
    [clipB.id]
  );

  // Determine which quiz/W&D belongs to this pair (use either clip's sort order)
  const showCampQuiz = CAMP_QUIZ_SORT_ORDERS.has(clipA.sortOrder) || CAMP_QUIZ_SORT_ORDERS.has(clipB.sortOrder);
  const showWheelAndDeal = WHEEL_AND_DEAL_SORT_ORDERS.has(clipA.sortOrder) || WHEEL_AND_DEAL_SORT_ORDERS.has(clipB.sortOrder);

  const isLocked = overallStatus === "locked";

  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 ${
        isLocked ? "opacity-55 cursor-default" : "hover:shadow-md cursor-pointer"
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Row 1: Week/Day label + status badge + share links */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.12em] text-indigo-600 uppercase">
            {getWeekLabel(clipA.weekNumber, clipA.sortOrder)} · {getPairedDayLabel(clipA.sortOrder)}
          </span>
          <div className="flex items-center gap-2">
            {overallStatus === "completed" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                ✅ Completed
                {totalXp > 0 && (
                  <span className="ml-1 text-indigo-600">+{totalXp} XP</span>
                )}
              </span>
            )}
            {overallStatus === "in_progress" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                🐌 In Progress
              </span>
            )}
            <ShareDropdown onCopyA={handleShareA} onCopyB={handleShareB} />
          </div>
        </div>

        {/* Row 2: Merged title with pill badges */}
        <h3 className="text-base font-bold text-gray-900 leading-snug flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {(() => {
            const { emoji, nameA, nameB } = getMergedTitleParts(clipA, clipB);
            return (
              <>
                {emoji && <span>{emoji}</span>}
                <span>{nameA}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold tracking-wide uppercase">Clip 1</span>
                <span className="text-gray-400 font-normal">+</span>
                <span>{nameB}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold tracking-wide uppercase">Clip 2</span>
              </>
            );
          })()}
        </h3>

        {/* Clip A section */}
        <div className="flex flex-col gap-2">
          {/* Clip A metadata */}
          <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
            {clipA.durationSeconds ? (
              <>
                <span>⏱️ {formatDuration(clipA.durationSeconds)}</span>
                <span className="text-gray-300">·</span>
              </>
            ) : null}
            <span>🪧 {clipA.questionCount} Trail Markers</span>
            <span className="text-gray-300">·</span>
            <span>80% engagement required</span>
            <span className="text-gray-300">·</span>
            <span>📋 Ranger Report</span>
          </p>

          {/* Clip A button */}
          <ClipButton
            label="Clip 1"
            buttonState={buttonStateA}
            previousClipTitle={previousClipTitle}
            onWatch={onWatchA}
            onReview={onReviewA}
          />
        </div>

        {/* Clip B section — separated by divider */}
        <div className="border-t border-gray-100 pt-3 mt-1">
          {/* Clip B metadata */}
          <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap mb-2">
            {clipB.durationSeconds ? (
              <>
                <span>⏱️ {formatDuration(clipB.durationSeconds)}</span>
                <span className="text-gray-300">·</span>
              </>
            ) : null}
            <span>🪧 {clipB.questionCount} Trail Markers</span>
            <span className="text-gray-300">·</span>
            <span>80% engagement required</span>
            <span className="text-gray-300">·</span>
            <span>📋 Ranger Report</span>
          </p>

          {/* Clip B button */}
          <ClipButton
            label="Clip 2"
            buttonState={buttonStateB}
            previousClipTitle={stateA.isCompleted ? undefined : getSessionTitle(clipA.title)}
            onWatch={onWatchB}
            onReview={onReviewB}
          />
        </div>

        {/* cAMP Quiz button — visible on qualifying tiles */}
        {showCampQuiz && onCampQuiz && (
          <button
            onClick={(e) => { e.stopPropagation(); onCampQuiz(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#EA580C] hover:bg-[#C2410C] text-white transition-colors"
          >
            🧠 cAMP Quiz
          </button>
        )}
        {showCampQuiz && onCampQuiz && (
          <p className="text-[11px] text-gray-400 text-center -mt-1">
            Content Knowledge Checks — validate your learning after each session
          </p>
        )}

        {/* Wheel & Deal button — visible on qualifying tiles */}
        {showWheelAndDeal && onWheelAndDeal && (
          <button
            onClick={(e) => { e.stopPropagation(); onWheelAndDeal(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
          >
            🎡 Wheel & Deal
          </button>
        )}
        {showWheelAndDeal && onWheelAndDeal && (
          <p className="text-[11px] text-gray-400 text-center -mt-1">
            REMEMBER: product-fluency practice — solo or multiplayer — as prep for cAMP 201.
          </p>
        )}
      </div>
    </div>
  );
}

function ClipButton({
  label,
  buttonState,
  previousClipTitle,
  onWatch,
  onReview,
}: {
  label: string;
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
          🚣🏼‍♂️ Watch {label}
        </button>
      );
    case "resume":
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onWatch(); }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          🧗🏼 Resume {label}
        </button>
      );
    case "report":
      return (
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onReview ? onReview() : onWatch(); }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            🗺️ Review {label} Ranger Report
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

function ShareDropdown({ onCopyA, onCopyB }: { onCopyA: (e: React.MouseEvent) => void; onCopyB: (e: React.MouseEvent) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        title="Share clip link"
      >
        🔗
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={(e) => { onCopyA(e); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            📋 Copy Clip 1 Link
          </button>
          <button
            onClick={(e) => { onCopyB(e); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            📋 Copy Clip 2 Link
          </button>
        </div>
      )}
    </div>
  );
}
