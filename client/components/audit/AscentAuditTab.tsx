/** Admin Ascent Audit tab for Analytics page */
import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { TOPIC_PATH_MAP, PATH_STYLES } from "@/config/auditPaths";
import PendingChangesPanel from "./PendingChangesPanel";

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  not_started: { bg: "bg-gray-100", text: "text-gray-600", label: "Not Started" },
  in_progress: { bg: "bg-amber-50", text: "text-amber-700", label: "In Progress" },
  complete: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Complete" },
};

export default function AscentAuditTab() {
  const navigate = useNavigate();
  // Use a dummy viewerId since this is admin view — all topics shown regardless of assignment
  const { data, loading, fetching, isError, refetch } = useApiData("GetAuditLanding", {
    viewerId: "00000000-0000-0000-0000-000000000000",
  });

  const { data: cycleData, loading: cyclesLoading, refetch: refetchCycles } = useApiData("ManageAuditCycle", {
    action: "list",
    label: null, deadline: null, description: null, cycleType: "quarterly",
    cycleId: null, createdBy: null,
  });

  const { data: viewerData } = useApiData("GetViewers", {});

  // Build a name→viewer lookup for SME registration status (only SME-role viewers count)
  const smeViewerMap = useMemo(() => {
    const map = new Map<string, { registered: boolean; lastActivity: string | null }>();
    const viewers = viewerData?.viewers ?? [];
    for (const v of viewers) {
      if ((v as any).role !== "SME") continue; // Only count actual SME registrations
      map.set(v.name.toLowerCase(), { registered: true, lastActivity: (v as any).lastActivity ?? (v as any).createdAt ?? null });
    }
    return map;
  }, [viewerData]);

  const { run: manageCycle, loading: managingCycle } = useApi("ManageAuditCycle");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const handleCreateCycle = useCallback(async () => {
    if (!newLabel.trim()) { toast.error("Label is required"); return; }
    try {
      await manageCycle({
        action: "create",
        label: newLabel.trim(),
        deadline: newDeadline || null,
        description: null,
        cycleType: "quarterly",
        cycleId: null,
        createdBy: "JT Bohland",
      });
      toast.success("Audit cycle created!");
      setShowCreateForm(false);
      setNewLabel("");
      setNewDeadline("");
      await refetchCycles();
      await refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [newLabel, newDeadline, manageCycle, refetch, refetchCycles]);

  const handleCloseCycle = useCallback(async (cycleId: string) => {
    try {
      await manageCycle({
        action: "close",
        cycleId,
        label: null, deadline: null, description: null, cycleType: "quarterly", createdBy: null,
      });
      toast.success("Cycle closed");
      await refetchCycles();
      await refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [manageCycle, refetch, refetchCycles]);

  if (loading || cyclesLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  }

  if (isError) {
    return <p className="text-red-600 text-sm">Failed to load audit data</p>;
  }

  const { topics, activeCycle, totalTopics, completedTopics } = data ?? { topics: [], activeCycle: null, totalTopics: 0, completedTopics: 0 };
  const cycles = cycleData?.cycles ?? [];
  const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className={`space-y-6 ${fetching && !loading ? "opacity-70" : ""}`}>
      {fetching && !loading && <div className="text-xs text-gray-600">Updating…</div>}

      {/* ─── Escalation Alert ─── */}
      {(() => {
        const inactive: string[] = [];
        for (const t of topics) {
          for (const sme of (t as any).smes ?? []) {
            const match = smeViewerMap.get(sme.name.toLowerCase());
            if (!match?.registered) continue;
            const lastDate = match.lastActivity ? new Date(match.lastActivity) : null;
            const daysSince = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : null;
            if (daysSince === null || daysSince >= 10) {
              if (!inactive.includes(sme.name)) inactive.push(sme.name);
            }
          }
        }
        if (inactive.length === 0) return null;
        return (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm font-bold text-red-800 flex items-center gap-1.5">⚠️ Needs Attention ({inactive.length})</p>
            <p className="text-xs text-red-700 mt-1">
              {inactive.join(", ")} {inactive.length === 1 ? "has" : "have"} not been active for 10+ days. Consider sending a follow-up.
            </p>
          </div>
        );
      })()}

      {/* ─── Admin Quick Actions ─── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/audit")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-indigo-300 bg-indigo-50 text-sm font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
        >
          🍁 View SME Landing Page →
        </button>
        <span className="text-xs text-gray-400">See the full tile grid and click into any topic to review content</span>
      </div>

      {/* ─── Cycle Management ─── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">📋 Audit Cycles</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            + New Cycle
          </button>
        </div>

        {showCreateForm && (
          <div className="border border-indigo-200 rounded-lg p-4 mb-4 bg-indigo-50/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cycle Label</label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Q4 2026"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateCycle}
                disabled={managingCycle}
                className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {managingCycle ? "Creating…" : "Create Cycle"}
              </button>
              <button onClick={() => setShowCreateForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {cycles.length === 0 && !showCreateForm && (
          <p className="text-sm text-gray-400 italic">No audit cycles created yet. Click "+ New Cycle" to start one.</p>
        )}

        {cycles.length > 0 && (
          <div className="space-y-2">
            {cycles.map((c: any) => {
              // Parse deadline as local date to avoid UTC off-by-one
              const deadlineDisplay = c.deadline
                ? (() => {
                    const parts = c.deadline.slice(0, 10).split("-");
                    return new Date(+parts[0], +parts[1] - 1, +parts[2]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  })()
                : null;
              return (
              <div key={c.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                c.status === "active" ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100 bg-gray-50/50"
              }`}>
                <div>
                  <span className="text-sm font-bold text-gray-900">{c.label}</span>
                  <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                  }`}>{c.status}</span>
                  {deadlineDisplay && <span className="text-xs text-gray-400 ml-2">Due: {deadlineDisplay}</span>}
                  <span className="text-xs text-gray-400 ml-2">({c.signoffCount} sign-offs)</span>
                </div>
                {c.status === "active" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const newLabel = prompt("Edit cycle label:", c.label);
                        if (newLabel && newLabel !== c.label) {
                          manageCycle({ action: "update", cycleId: c.id, label: newLabel, deadline: c.deadline, description: c.description, cycleType: c.cycleType, createdBy: null });
                        }
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleCloseCycle(c.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      End Cycle
                    </button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Overall Progress ─── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-900">📊 Audit Progress</h3>
          <span className="text-xs font-bold text-gray-700">{completedTopics} / {totalTopics} complete</span>
        </div>
        <Progress value={progressPct} className="h-2 mb-4" />

        {/* Topic status table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Topic</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Path</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">SMEs</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Status</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Sign-offs</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t: any) => {
                const s = STATUS_PILL[t.status] ?? STATUS_PILL.not_started;
                const pct = t.status === "complete" ? 100 : t.status === "not_started" ? 0 : (t.totalSections > 0 ? Math.round((t.approvedCount / t.totalSections) * 100) : 0);
                return (
                  <tr key={t.topicKey} className="border-b border-gray-100 hover:bg-indigo-50/40 cursor-pointer transition-colors align-top" onClick={() => navigate(`/audit/${t.topicKey}`)}>
                    {/* Topic */}
                    <td className="py-3 px-3 max-w-[280px]">
                      <div className="flex items-start gap-1.5">
                        <span className="flex-shrink-0">{t.emoji}</span>
                        <div>
                          <span className="font-semibold text-gray-900">{t.dayLabel}:</span>{" "}
                          <span className="text-indigo-700 hover:underline font-medium">{t.title}</span>
                        </div>
                      </div>
                    </td>
                    {/* Path */}
                    <td className="py-3 px-3">
                      {(() => {
                        const pathKey = TOPIC_PATH_MAP[t.topicKey];
                        if (pathKey) {
                          const ps = PATH_STYLES[pathKey];
                          return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${ps.bg} ${ps.text} ${ps.border}`}>{ps.label}</span>;
                        }
                        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap bg-blue-100 text-blue-700 border-blue-300">All Roles</span>;
                      })()}
                    </td>
                    {/* SMEs — unified column with name, reg, activity per row */}
                    <td className="py-3 px-3">
                      {t.smes.length > 0 ? (
                        <div className="space-y-2">
                          {t.smes.map((sme: any, si: number) => {
                            const match = smeViewerMap.get(sme.name.toLowerCase());
                            const isRegistered = !!match?.registered;
                            const lastDate = match?.lastActivity ? new Date(match.lastActivity) : null;
                            const daysSince = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : null;
                            const needsAttention = isRegistered && (daysSince === null || daysSince >= 10);
                            return (
                              <div key={si} className="flex items-center gap-2 text-[13px] leading-tight">
                                <span className="text-gray-400 text-[11px] font-mono w-3 flex-shrink-0">{si + 1}.</span>
                                <span className="font-medium text-gray-900 whitespace-nowrap">{sme.name}</span>
                                {isRegistered
                                  ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">✓ Reg</span>
                                  : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">✗ Not reg</span>
                                }
                                {isRegistered && lastDate && !needsAttention && (
                                  <span className="text-[11px] text-gray-400 whitespace-nowrap">{lastDate.toLocaleDateString()}</span>
                                )}
                                {needsAttention && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 whitespace-nowrap" title={daysSince !== null ? `${daysSince} days since last activity` : "No activity recorded"}>
                                    ⚠️ {daysSince !== null ? `${daysSince}d inactive` : "No activity"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : <span className="text-gray-400 text-xs">No SME assigned</span>}
                    </td>
                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${s.bg} ${s.text}`}>
                        {s.label} · {pct}%
                      </span>
                    </td>
                    {/* Sign-offs */}
                    <td className="py-3 px-3 text-xs text-gray-600">
                      {t.signoffs.length > 0
                        ? t.signoffs.map((so: any) => `${so.viewerName} (${new Date(so.signedAt).toLocaleDateString()})`).join(", ")
                        : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Pending SME Changes ─── */}
      <PendingChangesPanel />
    </div>
  );
}
