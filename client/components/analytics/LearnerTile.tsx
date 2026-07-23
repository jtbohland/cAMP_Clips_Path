import { memo } from "react";
import { Progress } from "@/components/ui/progress";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LearnerTileData {
  viewerId: string;
  name: string;
  email: string;
  role: string;
  timezone: string | null;
  managerName: string | null;
  ascentDay1: string | null;
  clipsCompleted: number;
  totalXp: number;
  pacingStatus: string;
  summitDay: string | null;
  isAnchorFailure: boolean;
  lastLogin: string | null;
  approachComplete: boolean;
  approachCompletedCount: number;
  tier: { tier: number; name: string; emoji: string; xpMin: number; xpMax: number | null };
  badges: Array<{ badgeId: string }>;
  gearClicks: number;
  wtsCount: number;
  srCount: number;
  clipScoreAvg: number | null;
}

interface LearnerTileProps {
  learner: LearnerTileData;
  totalClips: number;
  onClick: (viewerId: string) => void;
}

// ─── Pacing config ───────────────────────────────────────────────────────────
const PACING: Record<string, { label: string; shortLabel: string; bg: string; text: string; border: string; barColor: string }> = {
  summit_bound:       { label: "🧗🏻‍♂️ Summit Bound",    shortLabel: "Summit Bound",    bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200",  barColor: "#16a34a" },
  off_the_trail:      { label: "🧭 Off the Trail",    shortLabel: "Off the Trail",    bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  barColor: "#d97706" },
  lost_in_the_woods:  { label: "🌲 Lost in Woods",    shortLabel: "Lost in Woods",    bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200", barColor: "#ea580c" },
  rockslide:          { label: "🪨 Rockslide",         shortLabel: "Rockslide",         bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200",    barColor: "#dc2626" },
  avalanche_warning:  { label: "❄️ Avalanche",         shortLabel: "Avalanche",         bg: "bg-blue-50",    text: "text-blue-900",   border: "border-blue-200",   barColor: "#1e40af" },
  anchor_failure:     { label: "⛓️‍💥 Anchor Failure",  shortLabel: "Anchor Failure",  bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    barColor: "#b91c1c" },
  completed:          { label: "🏔️✨ Completed",       shortLabel: "Completed",        bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-200", barColor: "#4f46e5" },
  not_started:        { label: "Not Started",          shortLabel: "Not Started",       bg: "bg-gray-50",    text: "text-gray-500",   border: "border-gray-200",   barColor: "#9ca3af" },
};

const TZ_EMOJI: Record<string, { emoji: string; label: string }> = {
  NAMER: { emoji: "🌎", label: "NAMER" },
  EMEA:  { emoji: "🌍", label: "EMEA" },
  AAPJ:  { emoji: "🌏", label: "AAPJ" },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626",
  "#7c3aed", "#0284c7", "#15803d", "#b45309", "#b91c1c",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const LearnerTile = memo(function LearnerTile({ learner, totalClips, onClick }: LearnerTileProps) {
  const pacing = PACING[learner.pacingStatus] ?? PACING.not_started;
  const progressPct = totalClips > 0 ? Math.round((learner.clipsCompleted / totalClips) * 100) : 0;
  const isComplete = learner.pacingStatus === "completed" && learner.approachComplete;
  const tz = learner.timezone ? TZ_EMOJI[learner.timezone] : null;
  const initials = getInitials(learner.name);
  const bgColor = avatarColor(learner.name);

  return (
    <button
      onClick={() => onClick(learner.viewerId)}
      className={`w-full text-left rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 bg-white overflow-hidden ${
        isComplete ? "opacity-60 border-gray-200" : `${pacing.border}`
      }`}
      style={{ borderTopWidth: 3, borderTopColor: pacing.barColor }}
    >
      {/* Header: avatar + name + tier */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">{learner.name}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${pacing.bg} ${pacing.text}`}>
                {pacing.shortLabel}
              </span>
            </div>

            {/* Role + Timezone */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-gray-600 font-medium">{learner.role}</span>
              {tz && (
                <span className="text-[10px] text-gray-400">
                  {tz.emoji} {tz.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Email */}
        <p className="text-[10px] text-gray-400 mt-1.5 truncate">{learner.email}</p>

        {/* Manager */}
        {learner.managerName && learner.managerName !== "n/a" && (
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            <span className="text-gray-400">Manager:</span> {learner.managerName}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-4" />

      {/* Stats row */}
      <div className="px-4 py-2.5 grid grid-cols-3 gap-2 text-center">
        {/* XP */}
        <div>
          <p className="text-base font-bold text-[#4f46e5]">{learner.totalXp}</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">XP</p>
        </div>
        {/* Clips */}
        <div>
          <p className="text-base font-bold text-gray-800">{learner.clipsCompleted}<span className="text-xs font-normal text-gray-400">/{totalClips}</span></p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Clips</p>
        </div>
        {/* Tier */}
        <div>
          <p className="text-base">{learner.tier.emoji}</p>
          <p className="text-[9px] text-gray-400 truncate">{learner.tier.name}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-1">
        <Progress value={progressPct} className="h-1" />
      </div>

      {/* Footer: dates + approach */}
      <div className="px-4 py-2.5 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-50">
        <div className="flex items-center gap-2">
          {learner.ascentDay1 && (
            <span title="Ascent started">🧗 {formatDate(learner.ascentDay1)}</span>
          )}
          {learner.summitDay && (
            <span title="Summit day">🏔️ {formatDate(learner.summitDay)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {learner.approachComplete ? (
            <span className="text-emerald-600 font-semibold">🚡 Approach ✓</span>
          ) : (
            <span className="text-gray-400">🚡 {learner.approachCompletedCount}/8</span>
          )}
          {learner.lastLogin && (
            <span title="Last login">🔑 {formatDate(learner.lastLogin)}</span>
          )}
        </div>
      </div>
    </button>
  );
});

export default LearnerTile;
