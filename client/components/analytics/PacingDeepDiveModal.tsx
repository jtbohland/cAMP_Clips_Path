import { memo, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Learner {
  viewerId: string;
  name: string;
  role: string;
  timezone: string | null;
  ascentDay1: string | null;
  clipsCompleted: number;
  effectiveTotal: number;
  pacingStatus: string;
  summitDay: string | null;
  isAnchorFailure: boolean;
  approachComplete: boolean;
  approachCompletedCount: number;
  extensionDays: number;
  lastCompletedAt: string | null;
}

interface PacingDeepDiveModalProps {
  learners: Learner[];
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Count weekdays between two dates (inclusive of both endpoints) */
function countWeekdays(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (e < s) return 0;
  let count = 0;
  const cursor = new Date(s);
  while (cursor <= e) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Format date as "Mon DD" */
function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Format full date with year */
function fmtDateFull(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const SDR_EFFECTIVE_TOTALS = [17, 14]; // base or with exemptions

type LearningPathType = "legacy_ae" | "approach_20" | "approach_21" | "ae_as_sdr" | "legacy_sdr" | "approach_sdr";

function getLearningPath(l: Learner): { type: LearningPathType; label: string } {
  const isSDR = l.role === "SDR";
  const didApproach = l.approachCompletedCount > 0;

  if (isSDR) {
    // Kate case: SDR role but completed AE-level clips (20+)
    if (l.clipsCompleted > 17) {
      return { type: "ae_as_sdr", label: "AE Path (as SDR)" };
    }
    if (didApproach) {
      return { type: "approach_sdr", label: `Approach + ${l.effectiveTotal} clips` };
    }
    return { type: "legacy_sdr", label: `${l.effectiveTotal} clips (Legacy)` };
  }

  // AE / PSM / Renewals
  if (!didApproach) {
    return { type: "legacy_ae", label: `${l.effectiveTotal} clips (Legacy)` };
  }

  return {
    type: l.effectiveTotal >= 21 ? "approach_21" : "approach_20",
    label: `Approach + ${l.effectiveTotal} clips`,
  };
}

type PacingResult = "on_time" | "anchor_failure" | "in_progress";

function getPacingResult(l: Learner): PacingResult {
  if (l.pacingStatus === "completed") {
    // Determine if on time: finished before summit AND pacing >= 70% at completion
    if (!l.summitDay || !l.lastCompletedAt) return "on_time"; // no data to compare
    const summit = new Date(l.summitDay);
    const completed = new Date(l.lastCompletedAt);
    const summitNorm = new Date(summit.getFullYear(), summit.getMonth(), summit.getDate());
    const completedNorm = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());
    if (completedNorm > summitNorm) return "anchor_failure";
    return "on_time";
  }
  if (l.isAnchorFailure || l.pacingStatus === "anchor_failure") return "anchor_failure";
  return "in_progress";
}

function getDeltaDays(l: Learner): { value: number; label: string } | null {
  if (!l.summitDay) return null;
  const summit = new Date(l.summitDay);
  const summitNorm = new Date(summit.getFullYear(), summit.getMonth(), summit.getDate());

  if (l.pacingStatus === "completed" && l.lastCompletedAt) {
    const completed = new Date(l.lastCompletedAt);
    const completedNorm = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());
    const diffMs = completedNorm.getTime() - summitNorm.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { value: diffDays, label: `${Math.abs(diffDays)}d early` };
    if (diffDays === 0) return { value: 0, label: "on summit day" };
    return { value: diffDays, label: `${diffDays}d late` };
  }

  if (l.isAnchorFailure) {
    // Past summit and incomplete
    const now = new Date();
    const nowNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = nowNorm.getTime() - summitNorm.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return { value: diffDays, label: `${diffDays}d over` };
  }

  // In progress — days until summit
  const now = new Date();
  const nowNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = summitNorm.getTime() - nowNorm.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return { value: -diffDays, label: `${diffDays}d left` };
  return { value: 0, label: "today" };
}

function getNote(l: Learner, path: { type: LearningPathType }): string {
  const notes: string[] = [];

  if (path.type === "ae_as_sdr") {
    notes.push("Moved to SDR mid-path; completed AE clips");
  }
  if (path.type === "legacy_ae" || path.type === "legacy_sdr") {
    notes.push("Pre-Approach learner");
  }
  if (l.extensionDays > 0) {
    notes.push(`+${l.extensionDays}d extension`);
  }
  if (l.timezone === "EMEA") {
    notes.push("EMEA");
  }
  if (l.timezone === "AAPJ") {
    notes.push("AAPJ");
  }
  if (l.pacingStatus === "anchor_failure" && l.clipsCompleted < (l.effectiveTotal / 2)) {
    notes.push("Stalled — minimal progress");
  }

  return notes.join(" · ");
}

// ─── Status pills ────────────────────────────────────────────────────────────

const PACING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  summit_bound:      { label: "Summit Bound",      color: "bg-green-100 text-green-800 border-green-200" },
  off_the_trail:     { label: "Off the Trail",     color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  lost_in_the_woods: { label: "Lost in the Woods", color: "bg-orange-100 text-orange-800 border-orange-200" },
  rockslide:         { label: "Rockslide",          color: "bg-red-100 text-red-800 border-red-200" },
  avalanche_warning: { label: "Avalanche Warning",  color: "bg-red-200 text-red-900 border-red-300" },
  anchor_failure:    { label: "Anchor Failure",      color: "bg-red-300 text-red-900 border-red-400" },
  completed:         { label: "Completed",           color: "bg-blue-100 text-blue-800 border-blue-200" },
  not_started:       { label: "Not Started",         color: "bg-gray-100 text-gray-600 border-gray-200" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = PACING_STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-medium whitespace-nowrap ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const ROLE_COLORS: Record<string, string> = {
  SDR:          "bg-purple-100 text-purple-700 border-purple-200",
  "Velocity AE": "bg-purple-50 text-purple-700 border-purple-300",
  "Emerging AE": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Majors AE":   "bg-blue-100 text-blue-800 border-blue-300",
  PSM:           "bg-orange-50 text-orange-700 border-orange-200",
};

function RolePill({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-medium whitespace-nowrap ${c}`}>
      {role}
    </span>
  );
}

function ResultBadge({ result }: { result: PacingResult }) {
  if (result === "on_time") return <span className="text-green-600 font-semibold text-[10px]">✅ On Time</span>;
  if (result === "anchor_failure") return <span className="text-red-600 font-semibold text-[10px]">❌ Failure</span>;
  return <span className="text-blue-600 font-semibold text-[10px]">🔄 Active</span>;
}

// ─── Row data ────────────────────────────────────────────────────────────────

interface RowData {
  learner: Learner;
  path: { type: LearningPathType; label: string };
  result: PacingResult;
  delta: { value: number; label: string } | null;
  note: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

function PacingDeepDiveModal({ learners, onClose }: PacingDeepDiveModalProps) {
  const rows: RowData[] = useMemo(() => {
    // Sort: on_time first, then anchor_failure, then in_progress; within each group by ascentDay1
    const mapped = learners
      .filter(l => l.ascentDay1) // only learners who started
      .map(l => {
        const path = getLearningPath(l);
        const result = getPacingResult(l);
        const delta = getDeltaDays(l);
        const note = getNote(l, path);
        return { learner: l, path, result, delta, note };
      });

    const order: Record<PacingResult, number> = { on_time: 0, anchor_failure: 1, in_progress: 2 };
    mapped.sort((a, b) => {
      const o = order[a.result] - order[b.result];
      if (o !== 0) return o;
      return (a.learner.ascentDay1 ?? "").localeCompare(b.learner.ascentDay1 ?? "");
    });

    return mapped;
  }, [learners]);

  const onTimeCount = rows.filter(r => r.result === "on_time").length;
  const failureCount = rows.filter(r => r.result === "anchor_failure").length;
  const activeCount = rows.filter(r => r.result === "in_progress").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🏁 Pacing Deep Dive</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Complete learner pacing breakdown — summit timing, learning paths, and status
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-600 font-semibold">{onTimeCount} On Time</span>
              <span className="text-gray-300">|</span>
              <span className="text-red-600 font-semibold">{failureCount} Failure</span>
              <span className="text-gray-300">|</span>
              <span className="text-blue-600 font-semibold">{activeCount} Active</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 px-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left py-2.5 px-3">Learner</th>
                <th className="text-left py-2.5 px-2">Role</th>
                <th className="text-left py-2.5 px-2">Path</th>
                <th className="text-center py-2.5 px-2">Start</th>
                <th className="text-center py-2.5 px-2">Ext</th>
                <th className="text-center py-2.5 px-2">Summit</th>
                <th className="text-center py-2.5 px-2">Clips</th>
                <th className="text-center py-2.5 px-2">Finished</th>
                <th className="text-center py-2.5 px-2">Delta</th>
                <th className="text-center py-2.5 px-2">Result</th>
                <th className="text-left py-2.5 px-2">Status Tag</th>
                <th className="text-left py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const l = row.learner;
                const prevResult = i > 0 ? rows[i - 1].result : null;
                const showDivider = prevResult !== null && prevResult !== row.result;

                return (
                  <tr
                    key={l.viewerId}
                    className={`
                      border-b border-gray-50 hover:bg-gray-50/50 transition-colors
                      ${showDivider ? "border-t-2 border-t-gray-200" : ""}
                      ${row.result === "on_time" ? "bg-green-50/30" : ""}
                      ${row.result === "anchor_failure" ? "bg-red-50/20" : ""}
                    `}
                  >
                    <td className="py-2 px-3 font-medium text-gray-900 whitespace-nowrap">{l.name}</td>
                    <td className="py-2 px-2"><RolePill role={l.role} /></td>
                    <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{row.path.label}</td>
                    <td className="py-2 px-2 text-center text-gray-600 whitespace-nowrap">{fmtDate(l.ascentDay1)}</td>
                    <td className="py-2 px-2 text-center text-gray-600">
                      {l.extensionDays > 0 ? <span className="text-amber-600 font-medium">+{l.extensionDays}</span> : "—"}
                    </td>
                    <td className="py-2 px-2 text-center text-gray-600 whitespace-nowrap">{fmtDate(l.summitDay)}</td>
                    <td className="py-2 px-2 text-center font-medium whitespace-nowrap">
                      <span className={l.clipsCompleted >= l.effectiveTotal ? "text-green-700" : "text-gray-700"}>
                        {l.clipsCompleted}
                      </span>
                      <span className="text-gray-400">/{l.effectiveTotal}</span>
                    </td>
                    <td className="py-2 px-2 text-center text-gray-600 whitespace-nowrap">
                      {l.pacingStatus === "completed" ? fmtDate(l.lastCompletedAt) : "—"}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {row.delta ? (
                        <span className={`font-medium ${
                          row.delta.value < 0 ? "text-green-600" :
                          row.delta.value === 0 ? "text-green-600" :
                          row.delta.value <= 3 ? "text-amber-600" :
                          "text-red-600"
                        }`}>
                          {row.delta.label}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2 px-2 text-center"><ResultBadge result={row.result} /></td>
                    <td className="py-2 px-2">
                      {row.result !== "in_progress" ? null : <StatusPill status={l.pacingStatus} />}
                    </td>
                    <td className="py-2 px-3 text-gray-500 text-[10px] max-w-[180px] truncate" title={row.note}>
                      {row.note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer legend */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <div className="flex flex-wrap gap-4 text-[9px] text-gray-500">
            <span><strong>On Time</strong> = finished before summit day with ≥70% pacing</span>
            <span><strong>Anchor Failure</strong> = finished after summit, or past summit &amp; incomplete</span>
            <span><strong>Active</strong> = still in progress, summit not yet reached</span>
            <span><strong>Legacy</strong> = pre-Approach learner (approach auto-completed)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PacingDeepDiveModal);
