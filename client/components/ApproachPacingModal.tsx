import { useCallback } from "react";
import {
  type PacingTier,
  PACING_TIERS,
  WEEK1_TOTAL_ITEMS,
} from "@/lib/pacing";

/**
 * Prescriptive daily to-do lists for Approach Week 1.
 * Each day has items with an emoji, label, and whether they're trackable (checkbox).
 */
interface TodoItem {
  emoji: string;
  label: string;
  /** Optional time estimate shown as subtext */
  time?: string;
  /** If truthy, the item maps to a trackable module/academy key */
  trackKey?: string;
}

const DAY_TODOS: Record<number, TodoItem[]> = {
  2: [
    { emoji: "🎓", label: "Academy: Getting Started with Experiment", time: "40m + assessment", trackKey: "academy:experiment" },
    { emoji: "🎓", label: "Academy: Session Replay", time: "15m + assessment", trackKey: "academy:session_replay" },
    { emoji: "📖", label: "Start Challenger reading", time: "6 modules, 4h 30m total" },
  ],
  3: [
    { emoji: "🎓", label: "Academy: Guides & Surveys", time: "30m + assessment", trackKey: "academy:guides_surveys" },
    { emoji: "📖", label: "Continue Challenger" },
  ],
  4: [
    { emoji: "✍🏽", label: "Finish Challenger sign-off", trackKey: "module:challenger" },
  ],
  5: [
    { emoji: "🎡", label: "Wheel & Deal with your manager", time: "10–15m", trackKey: "wd" },
    { emoji: "🧗", label: "Begin The Ascent!" },
  ],
};

/** Items the learner should have already done by each day (for catch-up) */
const CUMULATIVE_TODOS: Record<number, TodoItem[]> = {
  1: [
    { emoji: "✍🏽", label: "MEDDPICC sign-off", trackKey: "module:meddpicc" },
    { emoji: "🎓", label: "Academy: Getting Started with Analytics", time: "40m + assessment", trackKey: "academy:analytics" },
  ],
  2: [
    { emoji: "✍🏽", label: "MEDDPICC sign-off", trackKey: "module:meddpicc" },
    { emoji: "🎓", label: "Academy: Analytics", time: "40m + assessment", trackKey: "academy:analytics" },
    { emoji: "🎓", label: "Academy: Experiment", time: "40m + assessment", trackKey: "academy:experiment" },
    { emoji: "🎓", label: "Academy: Session Replay", time: "15m + assessment", trackKey: "academy:session_replay" },
  ],
  3: [
    { emoji: "✍🏽", label: "MEDDPICC sign-off", trackKey: "module:meddpicc" },
    { emoji: "🎓", label: "Academy: Analytics", time: "40m + assessment", trackKey: "academy:analytics" },
    { emoji: "🎓", label: "Academy: Experiment", time: "40m + assessment", trackKey: "academy:experiment" },
    { emoji: "🎓", label: "Academy: Session Replay", time: "15m + assessment", trackKey: "academy:session_replay" },
    { emoji: "🎓", label: "Academy: Guides & Surveys", time: "30m + assessment", trackKey: "academy:guides_surveys" },
  ],
  4: [
    { emoji: "✍🏽", label: "MEDDPICC sign-off", trackKey: "module:meddpicc" },
    { emoji: "🎓", label: "Academy: Analytics", time: "40m + assessment", trackKey: "academy:analytics" },
    { emoji: "🎓", label: "Academy: Experiment", time: "40m + assessment", trackKey: "academy:experiment" },
    { emoji: "🎓", label: "Academy: Session Replay", time: "15m + assessment", trackKey: "academy:session_replay" },
    { emoji: "🎓", label: "Academy: Guides & Surveys", time: "30m + assessment", trackKey: "academy:guides_surveys" },
    { emoji: "✍🏽", label: "Challenger sign-off", trackKey: "module:challenger" },
  ],
};

interface ApproachPacingModalProps {
  tier: PacingTier;
  approachDay: number; // 2–5
  completedItems: number;
  /** Set of completed trackable keys like "module:meddpicc", "academy:analytics", "wd" */
  completedKeys: Set<string>;
  itemsBehind: number;
  /** Learner's summit day date — shown as footer for urgency/context */
  summitDay?: Date;
  onDismiss: () => void;
}

export default function ApproachPacingModal({
  tier,
  approachDay,
  completedItems,
  completedKeys,
  itemsBehind,
  summitDay,
  onDismiss,
}: ApproachPacingModalProps) {
  const config = PACING_TIERS[tier];
  const todaysTodos = DAY_TODOS[approachDay] ?? [];

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // No backdrop dismiss — learner must use the CTA button
    },
    []
  );

  // Build catch-up list: items from previous days that aren't done yet
  const catchUpItems: TodoItem[] = [];
  if (tier !== "summit_bound" && tier !== "completed") {
    const prevDayCumulative = CUMULATIVE_TODOS[approachDay - 1] ?? [];
    for (const item of prevDayCumulative) {
      if (item.trackKey && !completedKeys.has(item.trackKey)) {
        catchUpItems.push(item);
      }
    }
  }

  const isDueTomorrow = approachDay === 4;
  const isDueToday = approachDay === 5;

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
          <div className="text-4xl mb-2">{config.emoji}</div>
          <h2 className="text-xl font-bold">{config.label}</h2>
          <p className="text-sm mt-1 opacity-90">{config.message}</p>
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
            {itemsBehind > 0 && (
              <div className="text-right">
                <p className="text-sm font-bold">Items Behind</p>
                <p className="text-2xl font-bold">{itemsBehind}</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: `${config.headerBg}20` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(Math.round((completedItems / WEEK1_TOTAL_ITEMS) * 100), 100)}%`,
                backgroundColor: config.headerBg,
              }}
            />
          </div>

          {/* On-pace encouragement */}
          {tier === "summit_bound" && (
            <div
              className="rounded-lg px-4 py-3 text-sm mb-4"
              style={{ backgroundColor: `${config.headerBg}15` }}
            >
              <p className="font-semibold">🌟 Great work!</p>
              <p className="mt-1 opacity-90">
                You're keeping up with your Approach schedule. Stay on pace and you'll be ready to begin The Ascent!
              </p>
            </div>
          )}

          {/* Due Tomorrow / Due Today banners */}
          {isDueTomorrow && (
            <div className="rounded-lg px-4 py-3 mb-4 border border-amber-400 bg-amber-50">
              <p className="text-sm font-bold text-amber-800">⚠️ Due Tomorrow</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Tomorrow is your last day to finish The Approach on time. Complete today's tasks so you can start Ascent on pace.
              </p>
            </div>
          )}
          {isDueToday && (
            <div className="rounded-lg px-4 py-3 mb-4 border border-red-400 bg-red-50">
              <p className="text-sm font-bold text-red-800">⏰ Due Today</p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Today is the last day to finish The Approach on time and earn the 🚡 Peak Lift badge (+35 XP). Complete all remaining modules to Begin The Ascent!
              </p>
            </div>
          )}

          {/* Catch-up list (overdue items from previous days) */}
          {catchUpItems.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">⚠️ Catch up — overdue from previous days:</p>
              <div
                className="rounded-lg px-4 py-3 space-y-1.5"
                style={{ backgroundColor: `${config.headerBg}10` }}
              >
                {catchUpItems.map((item, i) => {
                  const done = item.trackKey ? completedKeys.has(item.trackKey) : false;
                  return (
                    <div key={i} className="text-sm flex items-start gap-2">
                      <span className={`mt-0.5 ${done ? "opacity-50" : ""}`}>{done ? "✅" : "☐"}</span>
                      <div className="flex-1">
                        <span className={done ? "line-through opacity-50" : ""}>{item.label}</span>
                        <span className="ml-1">{item.emoji}</span>
                        {item.time && <p className={`text-xs text-gray-500 ${done ? "opacity-50" : ""}`}>{item.time}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Plan */}
          {todaysTodos.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">📋 Today's Plan:</p>
              <div
                className="rounded-lg px-4 py-3 space-y-1.5"
                style={{ backgroundColor: `${config.headerBg}10` }}
              >
                {todaysTodos.map((item, i) => {
                  const done = item.trackKey ? completedKeys.has(item.trackKey) : false;
                  return (
                    <div key={i} className="text-sm flex items-start gap-2">
                      <span className={`mt-0.5 ${done ? "opacity-50" : ""}`}>{done ? "✅" : "☐"}</span>
                      <div className="flex-1">
                        <span className={done ? "line-through opacity-50" : ""}>{item.label}</span>
                        <span className="ml-1">{item.emoji}</span>
                        {item.time && <p className={`text-xs text-gray-500 ${done ? "opacity-50" : ""}`}>{item.time}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summit Day footer */}
          {summitDay && (
            <div
              className="rounded-lg px-4 py-2.5 text-center mb-4"
              style={{ backgroundColor: `${config.headerBg}12` }}
            >
              <p className="text-xs font-semibold opacity-75">🏔️ Summit Day</p>
              <p className="text-lg font-bold">
                {summitDay.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}

          {/* CTA Button */}
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
