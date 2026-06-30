import { useState, useCallback } from "react";
import { PACING_TIERS, type MissedClip } from "@/lib/pacing";

/**
 * Anchor Failure Modal — first occurrence after missing Summit Day.
 * Requires learner to select a reason, copy pre-drafted Slack message, then dismiss.
 */

const ANCHOR_REASONS = [
  { value: "workload", emoji: "📊", label: "My workload made it hard to keep up" },
  { value: "travel", emoji: "✈️", label: "I was traveling or out of office" },
  { value: "unclear", emoji: "❓", label: "I wasn't sure what was expected of me" },
  { value: "motivation", emoji: "🔋", label: "I lost motivation along the way" },
  { value: "other", emoji: "💬", label: "Something else (I'll explain in my message)" },
];

interface AnchorFailureModalProps {
  /** Learner's display name */
  learnerName: string;
  /** Manager's display name */
  managerName: string | null;
  /** Ascent Day 1 */
  startDate: Date;
  /** Original Summit Day */
  summitDay: Date;
  /** Ascent Adjustment deadline */
  adjustmentDay: Date;
  /** Number of incomplete sessions */
  sessionsBehind: number;
  /** Missed clip list */
  missedClips: MissedClip[];
  /** Whether this is the escalated Anchor #2 (missed Ascent Adjustment too) */
  isEscalated?: boolean;
  /** Called when dismissed */
  onDismiss: () => void;
  /** Pre-select a reason (for museum/demo previews) */
  defaultReason?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function AnchorFailureModal({
  learnerName,
  managerName,
  startDate,
  summitDay,
  adjustmentDay,
  sessionsBehind,
  missedClips,
  isEscalated = false,
  onDismiss,
  defaultReason,
}: AnchorFailureModalProps) {
  const config = PACING_TIERS.anchor_failure;
  const [selectedReason, setSelectedReason] = useState<string | null>(defaultReason ?? null);
  const [copied, setCopied] = useState(false);

  const reasonObj = ANCHOR_REASONS.find(r => r.value === selectedReason);

  // Extract first name only from manager name
  const managerFirst = managerName
    ? (managerName.includes("@")
        ? managerName.split("@")[0].split(".")[0].charAt(0).toUpperCase() + managerName.split("@")[0].split(".")[0].slice(1)
        : managerName.split(" ")[0])
    : "[Manager]";

  // Build Slack message — addressed to manager + JT, emojis, bold dates
  const slackMessage = selectedReason
    ? isEscalated
      ? `Hi ${managerFirst} & @JT 👋 — I started Ascent on *${formatDate(startDate)}* and have now missed both my original summit deadline of *${formatDate(summitDay)}* and my adjusted deadline of *${formatDate(adjustmentDay)}*. ⚠️\n\nReason: ${reasonObj?.label ?? selectedReason}\n\n📊 I still have ${sessionsBehind} session${sessionsBehind !== 1 ? "s" : ""} remaining. I'm sending JT a meeting invite to discuss next steps and create a plan to finish. I'll get that scheduled today. 📅`
      : `Hi ${managerFirst} & @JT 👋 — I started Ascent on *${formatDate(startDate)}* and missed my summit deadline of *${formatDate(summitDay)}*. ⚠️\n\nReason: ${reasonObj?.label ?? selectedReason}\n\n📊 I still have ${sessionsBehind} session${sessionsBehind !== 1 ? "s" : ""} remaining. My Ascent Adjustment date is *${formatDate(adjustmentDay)}* — I'll have everything done by then. 💪`
    : "";

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(slackMessage)
      .then(() => setCopied(true))
      .catch(() => {});
  }, [slackMessage]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // No backdrop dismiss allowed — must copy first
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
          className="px-6 py-5"
          style={{ backgroundColor: config.bodyBg, color: config.bodyText }}
        >
          {/* Date tiles */}
          <div className={`grid ${isEscalated ? "grid-cols-2" : "grid-cols-2"} gap-3 mb-4`}>
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

          {/* Catch-up list */}
          {missedClips.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2">Sessions to complete ({sessionsBehind}):</p>
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

          {/* Reason dropdown */}
          <div className="mb-4">
            <label className="text-sm font-bold block mb-2">
              {isEscalated ? "Why did you miss both deadlines?" : "What held you back?"}
            </label>
            <select
              value={selectedReason ?? ""}
              onChange={e => { setSelectedReason(e.target.value || null); setCopied(false); }}
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
                Send this to your manager & JT on Slack:
              </p>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 leading-relaxed">
                {slackMessage}
              </div>
              <button
                onClick={handleCopy}
                className={`w-full mt-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {copied ? "✅ Copied Slack Message" : "📋 Copy Slack Message"}
              </button>
            </div>
          )}

          {/* CTA — only enabled after copy */}
          <button
            onClick={onDismiss}
            disabled={!copied}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-opacity ${
              copied
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
          {!copied && (
            <p className="text-[11px] text-center mt-2 opacity-60">
              Select a reason and copy the message to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
