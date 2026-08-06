import { memo, useMemo } from "react";

// ─── Pacing pill config (same as Leaderboard) ────────────────────────────────

const PACING: Record<string, { label: string; bg: string; text: string }> = {
  summit_bound:      { label: "Summit Bound",   bg: "bg-green-50",   text: "text-green-700" },
  off_the_trail:     { label: "Off the Trail",  bg: "bg-amber-50",   text: "text-amber-700" },
  lost_in_the_woods: { label: "Lost in Woods",  bg: "bg-orange-50",  text: "text-orange-700" },
  rockslide:         { label: "Rockslide",       bg: "bg-red-50",     text: "text-red-700" },
  avalanche_warning: { label: "Avalanche",       bg: "bg-blue-50",    text: "text-blue-900" },
  anchor_failure:    { label: "Anchor Failure",  bg: "bg-red-100",    text: "text-red-800" },
  completed:         { label: "Completed",       bg: "bg-indigo-50",  text: "text-indigo-700" },
  not_started:       { label: "Not Started",     bg: "bg-gray-50",    text: "text-gray-500" },
};

/** Tier → highlight color for the current viewer's row */
const TIER_HIGHLIGHT: Record<string, { bg: string; border: string }> = {
  summit_bound:      { bg: "bg-green-100/60",  border: "border-l-green-500" },
  off_the_trail:     { bg: "bg-amber-100/60",  border: "border-l-amber-500" },
  lost_in_the_woods: { bg: "bg-orange-100/60", border: "border-l-orange-500" },
  rockslide:         { bg: "bg-red-100/60",    border: "border-l-red-500" },
  avalanche_warning: { bg: "bg-blue-100/60",   border: "border-l-blue-500" },
  anchor_failure:    { bg: "bg-gray-200/60",   border: "border-l-gray-600" },
  completed:         { bg: "bg-indigo-100/60",  border: "border-l-indigo-500" },
  not_started:       { bg: "bg-gray-100/60",   border: "border-l-gray-400" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PacingLearner {
  viewerId: string;
  name: string;
  role: string;
  region: string | null;
  managerName: string | null;
  pacingStatus: string;
  pacingPercent: number;
  rank: number;
}

interface PacingPerformanceSectionProps {
  learners: PacingLearner[];
  currentViewerId: string;
  loading?: boolean;
  /** Hex color from the parent modal's header (e.g. config.headerBg) */
  headerBg?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PacingPill({ status }: { status: string }) {
  const p = PACING[status] ?? PACING.not_started;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap ${p.bg} ${p.text}`}>
      {p.label}
    </span>
  );
}

const LearnerRow = memo(function LearnerRow({
  learner,
  isCurrentViewer,
}: {
  learner: PacingLearner;
  isCurrentViewer: boolean;
}) {
  const highlight = isCurrentViewer
    ? TIER_HIGHLIGHT[learner.pacingStatus] ?? TIER_HIGHLIGHT.not_started
    : null;

  // First name only for compact display
  const firstName = learner.name.split(" ")[0];

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
        isCurrentViewer
          ? `${highlight!.bg} border-l-3 ${highlight!.border}`
          : "hover:bg-gray-50"
      }`}
    >
      {/* Rank */}
      <span className={`w-5 text-right tabular-nums shrink-0 ${isCurrentViewer ? "font-bold" : "text-gray-400"}`}>
        {learner.rank}
      </span>

      {/* Name */}
      <span className={`flex-1 min-w-0 truncate ${isCurrentViewer ? "font-semibold" : "text-gray-700"}`}>
        {firstName}
        {isCurrentViewer && <span className="text-[10px] text-gray-500 ml-1">(you)</span>}
      </span>

      {/* Pacing pill */}
      <PacingPill status={learner.pacingStatus} />

      {/* Pacing % */}
      <span className={`w-9 text-right tabular-nums shrink-0 ${isCurrentViewer ? "font-bold" : "text-gray-500"}`}>
        {learner.pacingPercent}%
      </span>
    </div>
  );
});

function Skeleton() {
  return (
    <div className="space-y-1.5 mt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-7 bg-gray-100 rounded-md animate-pulse" />
      ))}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function PacingPerformanceSection({
  learners,
  currentViewerId,
  loading,
  headerBg,
}: PacingPerformanceSectionProps) {
  // Ensure current viewer's row is always visible — if they're beyond
  // the initial viewport, the scrollable list lets them find themselves
  const sortedLearners = useMemo(
    () => [...learners].sort((a, b) => a.rank - b.rank),
    [learners]
  );

  return (
    <div className="mt-3">
      {/* Section header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm font-semibold text-gray-700">🐢 Pacing Performance</span>
        <span className="text-[10px] text-gray-400">({learners.length} campers)</span>
      </div>

      {loading ? (
        <Skeleton />
      ) : sortedLearners.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">No pacing data available.</p>
      ) : (
        <div className="max-h-[200px] overflow-y-auto rounded-lg border border-gray-100 bg-white/50 divide-y divide-gray-50">
          {/* Column headers */}
          <div
            className={`flex items-center gap-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider sticky top-0 border-b ${
              headerBg ? "text-white/90" : "text-gray-400 bg-white/90 backdrop-blur-sm border-gray-100"
            }`}
            style={headerBg ? { backgroundColor: headerBg, borderColor: `${headerBg}40` } : undefined}
          >
            <span className="w-5 text-right shrink-0">#</span>
            <span className="flex-1 min-w-0">Name</span>
            <span>Status</span>
            <span className="w-9 text-right shrink-0">%</span>
          </div>
          {sortedLearners.map((learner) => (
            <LearnerRow
              key={learner.viewerId}
              learner={learner}
              isCurrentViewer={learner.viewerId === currentViewerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
