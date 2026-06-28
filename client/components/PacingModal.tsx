import { useCallback } from "react";
import {
  type PacingTier,
  type MissedClip,
  PACING_TIERS,
  getTopicDaysBehind,
} from "@/lib/pacing";

interface PacingModalProps {
  tier: PacingTier;
  daysBehind: number;
  clipsCompleted: number;
  totalClips: number;
  weekdaysElapsed: number;
  missedClips: MissedClip[];
  summitDay: Date | null;
  isDayBeforeSummit?: boolean;
  onDismiss: () => void;
}

export default function PacingModal({
  tier,
  daysBehind,
  clipsCompleted,
  totalClips,
  weekdaysElapsed,
  missedClips,
  summitDay,
  isDayBeforeSummit,
  onDismiss,
}: PacingModalProps) {
  const config = PACING_TIERS[tier];

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss]
  );

  const showCatchUpList = missedClips.length > 0 && tier !== "summit_bound" && tier !== "completed" && tier !== "not_started";

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
              <p className="text-sm font-bold">Clips Completed</p>
              <p className="text-2xl font-bold">{clipsCompleted} / {totalClips}</p>
            </div>
            {daysBehind > 0 && (
              <div className="text-right">
                <p className="text-sm font-bold">Days Behind</p>
                <p className="text-2xl font-bold">{daysBehind}</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: `${config.headerBg}20` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(Math.round((clipsCompleted / totalClips) * 100), 100)}%`,
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
                You're keeping up with your Ascent schedule. Keep this pace and you'll reach the summit right on time.
              </p>
            </div>
          )}

          {/* Completed celebration */}
          {tier === "completed" && (
            <div
              className="rounded-lg px-4 py-3 text-sm mb-4"
              style={{ backgroundColor: `${config.headerBg}15` }}
            >
              <p className="font-semibold">🏆 Summit Reached!</p>
              <p className="mt-1 opacity-90">
                You've completed every clip in your Ascent journey. Amazing work!
              </p>
            </div>
          )}

          {/* Not started */}
          {tier === "not_started" && (
            <div
              className="rounded-lg px-4 py-3 text-sm mb-4"
              style={{ backgroundColor: `${config.headerBg}15` }}
            >
              <p className="font-semibold">⛺ Ready to begin?</p>
              <p className="mt-1 opacity-90">
                Your Ascent is waiting. Start your first clip today and begin the climb!
              </p>
            </div>
          )}

          {/* Catch-up list */}
          {showCatchUpList && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">Clips to catch up on:</p>
              <div
                className="rounded-lg px-4 py-3 space-y-1.5 max-h-48 overflow-y-auto"
                style={{ backgroundColor: `${config.headerBg}10` }}
              >
                {missedClips.map((clip, i) => (
                  <p key={i} className="text-sm">
                    <span className="font-semibold">
                      Week {clip.weekNumber} {clip.dayLabel}:
                    </span>{" "}
                    {clip.title}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Pre-Summit warning banner */}
          {tier === "avalanche_warning" && isDayBeforeSummit && (
            <div className="rounded-lg px-4 py-3 mb-4 border border-amber-400 bg-amber-50">
              <p className="text-sm font-bold text-amber-800">⚠️ Tomorrow is Summit Day</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                If you're unable to finish by then, there will be additional steps to complete
                starting the following day to keep your Ascent moving forward.
              </p>
            </div>
          )}

          {/* Summit Day */}
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
            🎞️ Continue to Clips
          </button>
        </div>
      </div>
    </div>
  );
}
