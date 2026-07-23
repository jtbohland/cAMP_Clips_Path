import { useCallback } from "react";
import { PACING_TIERS, type MissedClip } from "@/lib/pacing";
import type { ApproachCatchUpItem } from "@/components/PacingModal";

/**
 * Light Anchor Failure Modal — shown daily after the initial Anchor Failure
 * until the learner completes all sessions. No Slack/dropdown required.
 */

interface LightAnchorModalProps {
  /** Original Summit Day */
  summitDay: Date;
  /** Ascent Adjustment deadline */
  adjustmentDay: Date;
  /** Whether the adjustment day has also been missed */
  adjustmentMissed: boolean;
  /** Clips completed / total */
  clipsCompleted: number;
  totalClips: number;
  /** Missed clip list */
  missedClips: MissedClip[];
  /** Approach completion status */
  approachComplete?: boolean;
  /** Missed approach modules */
  approachCatchUpItems?: ApproachCatchUpItem[];
  /** Called when dismissed */
  onDismiss: () => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function LightAnchorModal({
  summitDay,
  adjustmentDay,
  adjustmentMissed,
  clipsCompleted,
  totalClips,
  missedClips,
  approachComplete,
  approachCatchUpItems,
  onDismiss,
}: LightAnchorModalProps) {
  const config = PACING_TIERS.anchor_failure;

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // No backdrop dismiss — learner must use the CTA button
    },
    []
  );

  const sessionsBehind = totalClips - clipsCompleted;

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
          <h2 className="text-xl font-bold">Anchor Failure</h2>
          <p className="text-sm mt-1 opacity-90">
            You have {sessionsBehind} session{sessionsBehind !== 1 ? "s" : ""} remaining — keep going!
          </p>
        </div>

        {/* Body */}
        <div
          className="px-6 py-5"
          style={{ backgroundColor: config.bodyBg, color: config.bodyText }}
        >
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold">Clips Completed</p>
              <p className="text-2xl font-bold">{clipsCompleted} / {totalClips}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">Sessions Left</p>
              <p className="text-2xl font-bold text-red-600">{sessionsBehind}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: "#1C191720" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(Math.round((clipsCompleted / totalClips) * 100), 100)}%`,
                backgroundColor: config.headerBg,
              }}
            />
          </div>

          {/* Date tiles */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg px-4 py-2.5 text-center" style={{ backgroundColor: "#1C191712" }}>
              <p className="text-xs font-semibold opacity-75">🏔️ Summit Day</p>
              <p className="text-sm font-bold">{formatDate(summitDay)}</p>
              <p className="text-[10px] text-red-600 font-semibold mt-0.5">Missed</p>
            </div>
            <div className="rounded-lg px-4 py-2.5 text-center" style={{ backgroundColor: "#1C191712" }}>
              <p className="text-xs font-semibold opacity-75">🌄 Ascent Adjustment</p>
              <p className="text-sm font-bold">{formatDate(adjustmentDay)}</p>
              {adjustmentMissed && (
                <p className="text-[10px] text-red-600 font-semibold mt-0.5">Missed</p>
              )}
            </div>
          </div>

          {/* Catch-up list */}
          {missedClips.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">Clips to catch up on:</p>
              <div className="rounded-lg px-4 py-3 space-y-1.5 max-h-40 overflow-y-auto" style={{ backgroundColor: "#1C191710" }}>
                {missedClips.map((clip, i) => (
                  <p key={i} className="text-sm">
                    <span className="font-semibold">Week {clip.weekNumber} {clip.dayLabel}:</span>{" "}
                    {clip.title}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Approach completion indicator */}
          {approachComplete === true && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 border border-green-300 mb-4">
              <span className="text-sm">✅</span>
              <span className="text-xs font-bold text-green-800">Approach Complete</span>
            </div>
          )}
          {approachComplete === false && approachCatchUpItems && approachCatchUpItems.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">🚡 Modules Missed</p>
              <div className="rounded-lg px-4 py-3 space-y-1.5" style={{ backgroundColor: "#1C191710" }}>
                {approachCatchUpItems.map((item, i) => (
                  <p key={i} className="text-sm">
                    {item.label} {item.emoji}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
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
