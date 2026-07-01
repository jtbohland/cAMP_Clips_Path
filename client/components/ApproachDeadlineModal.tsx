import { useCallback } from "react";
import {
  PACING_TIERS,
  WEEK1_TOTAL_ITEMS,
} from "@/lib/pacing";

interface TodoItem {
  emoji: string;
  label: string;
  done: boolean;
}

interface ApproachDeadlineModalProps {
  /** "day6" | "day7" — which deadline modal */
  variant: "day6" | "day7";
  completedItems: number;
  /** List of incomplete approach modules to show */
  incompleteModules: TodoItem[];
  onDismiss: () => void;
}

/**
 * Day 6-7 missed deadline modal for The Approach.
 * Uses anchor_failure styling (same as Ascent anchor failure).
 * No Slack accountability — just a warning.
 */
export default function ApproachDeadlineModal({
  variant,
  completedItems,
  incompleteModules,
  onDismiss,
}: ApproachDeadlineModalProps) {
  const config = PACING_TIERS.anchor_failure;

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss]
  );

  const isDay7 = variant === "day7";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: `2px solid ${config.borderColor}` }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 text-center"
          style={{ backgroundColor: config.headerBg, color: config.headerText }}
        >
          <div className="text-4xl mb-2">⛓️‍💥</div>
          <h2 className="text-xl font-bold">Anchor Failure</h2>
          <p className="text-sm mt-1 opacity-90">
            {isDay7
              ? "Final day to complete The Approach on your own"
              : "You've missed the Week 1 deadline"}
          </p>
        </div>

        {/* Body */}
        <div
          className="px-6 py-5"
          style={{ backgroundColor: config.bodyBg, color: config.bodyText }}
        >
          {/* Progress summary */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold">Modules Completed</p>
              <p className="text-2xl font-bold">{completedItems} / {WEEK1_TOTAL_ITEMS}</p>
            </div>
          </div>

          {/* Message */}
          <div className="rounded-lg px-4 py-3 text-sm mb-4 border border-red-300 bg-red-50">
            {isDay7 ? (
              <>
                <p className="font-semibold text-red-800">⏰ Last chance</p>
                <p className="mt-1 text-red-700 leading-relaxed">
                  If you don't finish The Approach today, your Ascent path opens tomorrow and you'll be expected to start Day 1: ICP.
                  You're also off pace, so you'll need to catch up to reach your summit on time.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-red-800">📅 Deadline missed</p>
                <p className="mt-1 text-red-700 leading-relaxed">
                  You have until tomorrow to catch up. After Day 7, we auto-unlock your Ascent path and you'll be expected to begin.
                  You can revisit the Approach tab to finish what you missed, but all modules must be done before you can reach the summit.
                </p>
              </>
            )}
          </div>

          {/* Incomplete modules */}
          {incompleteModules.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">Modules to complete:</p>
              <div className="rounded-lg px-4 py-3 space-y-1.5 bg-gray-50 border border-gray-200">
                {incompleteModules.map((item, i) => (
                  <p key={i} className="text-sm flex items-center gap-2">
                    <span>{item.done ? "✅" : "☐"}</span>
                    <span className={item.done ? "line-through opacity-50" : ""}>{item.label}</span>
                    <span>{item.emoji}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Catch-up XP note */}
          <div className="rounded-lg px-4 py-2.5 text-center mb-4 bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800">
              Complete The Approach now → +17 XP (no 🚡 Peak Lift badge for late finish)
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: config.headerBg,
              color: config.headerText,
            }}
          >
            🚡 Continue to Approach
          </button>
        </div>
      </div>
    </div>
  );
}
