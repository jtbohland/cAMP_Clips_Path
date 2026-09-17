import { useState, useCallback, useRef, useEffect } from "react";
import { useApi } from "@/hooks/useApi.js";
import { PACING_TIERS, type MissedClip } from "@/lib/pacing";
import type { ApproachCatchUpItem } from "@/components/PacingModal";
import PacingPerformanceSection, { type PacingLearner } from "@/components/PacingPerformanceSection";

/**
 * Anchor Failure Modal — shown when a learner misses their Summit Day (or Ascent Adjustment).
 * Requires learner to select a reason, then sends a Slack message via the cAMP bot
 * to a group DM with JT + manager + belay buddy.
 */

const ANCHOR_REASONS = [
  { value: "workload", emoji: "📊", label: "My workload made it hard to keep up" },
  { value: "travel", emoji: "✈️", label: "I was traveling or out of office" },
  { value: "unclear", emoji: "❓", label: "I wasn't sure what was expected of me" },
  { value: "motivation", emoji: "🔋", label: "I lost motivation along the way" },
  { value: "other", emoji: "💬", label: "Something else (I'll explain in my message)" },
];

interface AnchorFailureModalProps {
  learnerName: string;
  managerName: string | null;
  belayBuddyName?: string | null;
  startDate: Date;
  summitDay: Date;
  adjustmentDay: Date;
  approachSessionsBehind?: number;
  ascentSessionsBehind?: number;
  /** @deprecated Use approachSessionsBehind + ascentSessionsBehind instead */
  sessionsBehind: number;
  missedClips: MissedClip[];
  isEscalated?: boolean;
  onDismiss: () => void;
  approachComplete?: boolean;
  approachCatchUpItems?: ApproachCatchUpItem[];
  defaultReason?: string;
  pacingLearners?: PacingLearner[];
  pacingLoading?: boolean;
  currentViewerId?: string;
  /** Required for Slack send */
  viewerId?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function AnchorFailureModal({
  learnerName,
  managerName,
  belayBuddyName,
  startDate,
  summitDay,
  adjustmentDay,
  approachSessionsBehind,
  ascentSessionsBehind,
  sessionsBehind,
  missedClips,
  isEscalated = false,
  onDismiss,
  approachComplete,
  approachCatchUpItems,
  defaultReason,
  pacingLearners,
  pacingLoading,
  currentViewerId,
  viewerId,
}: AnchorFailureModalProps) {
  const config = PACING_TIERS.anchor_failure;
  const [selectedReason, setSelectedReason] = useState<string | null>(defaultReason ?? null);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { run: sendSlackMessage, loading: sending } = useApi("SendAnchorSlackMessage");

  // Scroll indicator — detect if body is overflowing
  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 20);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [selectedReason, sent]); // re-check when content changes

  const reasonObj = ANCHOR_REASONS.find(r => r.value === selectedReason);

  // Extract first names
  const managerFirst = managerName
    ? (managerName.includes("@")
        ? managerName.split("@")[0].split(".")[0].charAt(0).toUpperCase() + managerName.split("@")[0].split(".")[0].slice(1)
        : managerName.split(" ")[0])
    : "[Manager]";

  const belayFirst = belayBuddyName
    ? belayBuddyName.split(" ")[0]
    : null;

  // Build recipient greeting
  const recipientGreeting = belayFirst
    ? `Hi ${managerFirst}, ${belayFirst} & @JT 👋`
    : `Hi ${managerFirst} & @JT 👋`;

  // Session counts — use split values if available, fall back to combined
  const approachCount = approachSessionsBehind ?? 0;
  const ascentCount = ascentSessionsBehind ?? sessionsBehind;

  // Build Slack message
  const slackMessage = selectedReason
    ? isEscalated
      ? `${recipientGreeting} I started Ascent on *${formatDate(startDate)}* and missed both my original Summit Day of *${formatDate(summitDay)}* and my Ascent Adjustment deadline of *${formatDate(adjustmentDay)}*.\n\nReason: ${reasonObj?.label ?? selectedReason}\n🚡 Approach Sessions remaining: ${approachCount}\n🧗🏻 Ascent Sessions remaining: ${ascentCount}\n\nI'm sending JT time today so we can align on next steps and lock a plan to finish. 📅\n\n— ${learnerName}`
      : `${recipientGreeting} I started Ascent on *${formatDate(startDate)}* and missed my Summit Day of *${formatDate(summitDay)}*.\n\nReason: ${reasonObj?.label ?? selectedReason}\n🚡 Approach Sessions remaining: ${approachCount}\n🧗🏻 Ascent Sessions remaining: ${ascentCount}\n\nMy Ascent Adjustment deadline is *${formatDate(adjustmentDay)}*, and I'm committed to finishing by then. 💪\n\n— ${learnerName}`
    : "";

  const handleSendSlack = useCallback(async () => {
    if (!viewerId || !slackMessage) return;
    setSendError(null);
    try {
      const result = await sendSlackMessage({ viewerId, message: slackMessage });
      if (result && typeof result === "object" && "success" in result && result.success) {
        setSent(true);
      } else {
        const errMsg = result && typeof result === "object" && "error" in result
          ? String(result.error)
          : "Failed to send Slack message";
        setSendError(errMsg);
      }
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      setSendError(message);
    }
  }, [viewerId, slackMessage, sendSlackMessage]);

  const handleBackdropClick = useCallback(
    (_e: React.MouseEvent) => {
      // No backdrop dismiss allowed — must send first
    },
    []
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: `2px solid ${config.borderColor}` }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 text-center"
          style={{ backgroundColor: config.headerBg, color: config.headerText }}
        >
          <div className="text-4xl mb-2">{config.emoji}</div>
          <h2 className="text-xl font-bold">
            {isEscalated ? "Anchor Failure — Escalated" : "Anchor Failure"}
          </h2>
          <p className="text-sm mt-1 opacity-90">
            {isEscalated
              ? "You've missed both your Summit Day and Ascent Adjustment deadlines."
              : config.message}
          </p>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className="px-6 py-5 max-h-[70vh] overflow-y-auto"
          style={{ backgroundColor: config.bodyBg, color: config.bodyText }}
        >
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
              {isEscalated && (
                <p className="text-[10px] text-red-600 font-semibold mt-0.5">Missed</p>
              )}
            </div>
          </div>

          {/* Session counts — split by approach/ascent */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg px-4 py-2.5 text-center" style={{ backgroundColor: "#1C191712" }}>
              <p className="text-xs font-semibold opacity-75">🚡 Approach Remaining</p>
              <p className="text-lg font-bold">{approachCount}</p>
            </div>
            <div className="rounded-lg px-4 py-2.5 text-center" style={{ backgroundColor: "#1C191712" }}>
              <p className="text-xs font-semibold opacity-75">🧗🏻 Ascent Remaining</p>
              <p className="text-lg font-bold">{ascentCount}</p>
            </div>
          </div>

          {/* Catch-up list */}
          {missedClips.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">Sessions to complete ({missedClips.length}):</p>
              <div className="rounded-lg px-4 py-3 space-y-1.5 max-h-32 overflow-y-auto" style={{ backgroundColor: "#1C191710" }}>
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

          {/* Reason dropdown */}
          <div className="mb-4">
            <label className="text-sm font-bold block mb-2">
              {isEscalated ? "Why did you miss both deadlines?" : "What held you back?"}
            </label>
            <select
              value={selectedReason ?? ""}
              onChange={e => { setSelectedReason(e.target.value || null); setSent(false); setSendError(null); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white text-gray-900"
            >
              <option value="">Select a reason…</option>
              {ANCHOR_REASONS.map(r => (
                <option key={r.value} value={r.value}>
                  {r.emoji} {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pre-drafted Slack message */}
          {selectedReason && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">
                This message will be sent to your manager{belayFirst ? `, ${belayFirst},` : ""} & JT on Slack:
              </p>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {slackMessage}
              </div>

              {/* Send button */}
              <button
                onClick={handleSendSlack}
                disabled={sent || sending || !viewerId}
                className={`w-full mt-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  sent
                    ? "bg-green-600 text-white cursor-default"
                    : sending
                    ? "bg-gray-400 text-white cursor-wait"
                    : "bg-purple-700 hover:bg-purple-800 text-white"
                }`}
              >
                {sent
                  ? "✅ Sent in Slack"
                  : sending
                  ? "⏳ Sending..."
                  : "💬 Send in Slack"}
              </button>

              {sendError && (
                <p className="text-xs text-red-600 mt-1 text-center">{sendError}</p>
              )}
            </div>
          )}

          {/* CTA — only enabled after send */}
          <button
            onClick={onDismiss}
            disabled={!sent}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-opacity ${
              sent
                ? "hover:opacity-90"
                : "opacity-40 cursor-not-allowed"
            }`}
            style={{
              backgroundColor: config.headerBg,
              color: config.headerText,
            }}
          >
            🎞️ Continue to Clips
          </button>
          {!sent && (
            <p className="text-[11px] text-center mt-2 opacity-60">
              Select a reason and send the Slack message to continue
            </p>
          )}

          {/* Scroll-down indicator — fades out when user scrolls to bottom */}
          {canScrollDown && (
            <div className="flex justify-center mt-3 animate-bounce opacity-40 transition-opacity">
              <span className="text-xs font-medium">↓ Scroll for more ↓</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
