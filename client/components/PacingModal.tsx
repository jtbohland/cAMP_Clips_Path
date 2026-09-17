import { useCallback, useEffect, useState, useRef } from "react";
import {
  type PacingTier,
  type MissedClip,
  PACING_TIERS,
} from "@/lib/pacing";
import type { PatchPill } from "@/lib/patchProgress";
import PacingPerformanceSection, { type PacingLearner } from "@/components/PacingPerformanceSection";

/** Incomplete approach module for catch-up display */
export interface ApproachCatchUpItem {
  emoji: string;
  label: string;
}

interface PacingModalProps {
  tier: PacingTier;
  daysBehind: number;
  clipsCompleted: number;
  totalClips: number;
  weekdaysElapsed: number;
  missedClips: MissedClip[];
  summitDay: Date | null;
  isDayBeforeSummit?: boolean;
  isSummitDay?: boolean;
  /** Whether The Approach is fully complete */
  approachComplete?: boolean;
  /** Incomplete approach modules to show in catch-up list */
  approachCatchUpItems?: ApproachCatchUpItem[];
  /** Today's Patch Progress — possible badges/XP for today */
  patchPills?: PatchPill[];
  patchBestCaseXp?: number;
  /** Pacing performance data for inline leaderboard */
  pacingLearners?: PacingLearner[];
  pacingLoading?: boolean;
  currentViewerId?: string;
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
  isSummitDay,
  approachComplete,
  approachCatchUpItems,
  patchPills,
  patchBestCaseXp,
  pacingLearners,
  pacingLoading,
  currentViewerId,
  onDismiss,
}: PacingModalProps) {
  const config = PACING_TIERS[tier];

  // 15-second read timer — Summit Bound skips it
  const skipTimer = tier === "summit_bound" || tier === "completed";
  const [secondsLeft, setSecondsLeft] = useState(skipTimer ? 0 : 15);

  useEffect(() => {
    if (skipTimer) { setSecondsLeft(0); return; }
    setSecondsLeft(15);
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1_000);
    return () => clearInterval(id);
  }, [skipTimer]);

  const timerActive = secondsLeft > 0;

  // Scroll indicator + gate — detect if body is overflowing and if user has reached bottom
  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true); // default true (no overflow = already at bottom)

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setCanScrollDown(distanceFromBottom > 20);
      // Once they've scrolled within 20px of the bottom, unlock permanently
      if (distanceFromBottom <= 20) setHasScrolledToBottom(true);
    };
    // Initial check: if content doesn't overflow, they're already "at bottom"
    const initialOverflow = el.scrollHeight > el.clientHeight + 20;
    if (!initialOverflow) {
      setHasScrolledToBottom(true);
      setCanScrollDown(false);
    } else {
      setHasScrolledToBottom(false);
      setCanScrollDown(true);
    }
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(() => {
      const overflow = el.scrollHeight > el.clientHeight + 20;
      if (!overflow) { setHasScrolledToBottom(true); setCanScrollDown(false); }
      else { check(); }
    });
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // No backdrop dismiss — learner must use the CTA button
    },
    []
  );

  const showCatchUpList = missedClips.length > 0 && tier !== "summit_bound" && tier !== "completed" && tier !== "not_started";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ border: `2px solid ${config.borderColor}`, maxHeight: "90vh" }}
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

        {/* Body — scrollable when content overflows */}
        <div
          ref={bodyRef}
          className="px-6 py-5 overflow-y-auto flex-1 min-h-0"
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
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: `${config.headerBg}20` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(Math.round((clipsCompleted / totalClips) * 100), 100)}%`,
                backgroundColor: config.headerBg,
              }}
            />
          </div>

          {/* Pacing Performance */}
          {pacingLearners && currentViewerId && (
            <div className="mb-4">
              <PacingPerformanceSection
                learners={pacingLearners}
                currentViewerId={currentViewerId}
                loading={pacingLoading}
                headerBg={config.headerBg}
              />
            </div>
          )}

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
              <p className="text-sm font-bold mb-2">🎞️ Cold Clips</p>
              <div
                className="rounded-lg px-4 py-3 space-y-1.5 max-h-48 overflow-y-auto"
                style={{ backgroundColor: `${config.headerBg}10` }}
              >
                {missedClips.map((clip, i) => {
                  // Tag resource days that include games
                  const gameTag = clip.sortOrder === 60
                    ? " 🦌 includes DEARR Crossing"
                    : clip.sortOrder === 120
                    ? " 💰 includes The Price is Right"
                    : clip.sortOrder === 165
                    ? " ⛰️ includes Rules of the Ridge"
                    : null;
                  return (
                    <div key={i} className="text-sm">
                      <span className="font-semibold">
                        Week {clip.weekNumber} {clip.dayLabel}:
                      </span>{" "}
                      {clip.title}
                      {gameTag && (
                        <span className="block text-xs opacity-70 ml-4 mt-0.5 italic">{gameTag}</span>
                      )}
                    </div>
                  );
                })}
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
              <div
                className="rounded-lg px-4 py-3 space-y-1.5"
                style={{ backgroundColor: `${config.headerBg}10` }}
              >
                {approachCatchUpItems.map((item, i) => (
                  <p key={i} className="text-sm">
                    {item.label} {item.emoji}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Pre-Summit warning banner — ALL tiers */}
          {isDayBeforeSummit && !isSummitDay && (
            <div className="rounded-lg px-4 py-3 mb-4 border border-amber-400 bg-amber-50">
              <p className="text-sm font-bold text-amber-800">⚠️ Tomorrow is Summit Day</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                If you're unable to finish by then, there will be additional steps to complete
                starting the following day to keep your Ascent moving forward.
              </p>
            </div>
          )}

          {/* Today is Summit Day banner — ALL tiers */}
          {isSummitDay && (
            <div className="rounded-lg px-4 py-3 mb-4 border border-amber-400 bg-amber-50">
              <p className="text-sm font-bold text-amber-800">🏔️ Today is Summit Day!</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Today is the target finish line for your Ascent. Wrap up any remaining clips to reach the summit!
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

          {/* Today's Patch Progress */}
          {patchPills && patchPills.length > 0 && tier !== "completed" && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-1">🎖️ Today's Patch Progress</p>
              <p className="text-xs opacity-75 mb-2 italic">
                Complete the task, earn your emblems, advance your rank! Here's what's at stake...
              </p>
              <div
                className="rounded-lg px-4 py-3 space-y-1.5"
                style={{ backgroundColor: `${config.headerBg}10` }}
              >
                {patchPills.map((pill, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="mr-1.5">{pill.emoji}</span>
                      {pill.name}
                    </span>
                    <span className="font-bold text-amber-600">+{pill.xp} XP</span>
                  </div>
                ))}
              </div>
              {patchBestCaseXp !== undefined && patchBestCaseXp > 0 && (
                <p className="text-xs font-semibold mt-2 text-center opacity-80">
                  🕶️ Best case today: +{patchBestCaseXp} XP
                </p>
              )}
            </div>
          )}

          {/* Scroll-down indicator — fades out when user scrolls to bottom */}
          {canScrollDown && (
            <div className="flex justify-center mt-3 animate-bounce opacity-40">
              <span className="text-xs font-medium">↓ Scroll for more ↓</span>
            </div>
          )}

        </div>
        <div
          className="px-6 py-4 shrink-0"
          style={{ backgroundColor: config.bodyBg }}
        >
          {(() => {
            const locked = timerActive || !hasScrolledToBottom;
            return (
              <button
                onClick={onDismiss}
                disabled={locked}
                className="w-full py-3 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: locked ? `${config.headerBg}60` : config.headerBg,
                  color: config.headerText,
                  cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked ? 0.6 : 1,
                }}
              >
                {timerActive
                  ? `⏳ ${secondsLeft}s`
                  : !hasScrolledToBottom
                  ? "↓ Scroll down to continue"
                  : "🎞️ Continue to Clips"}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
