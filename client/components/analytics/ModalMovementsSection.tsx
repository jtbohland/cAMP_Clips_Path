import { memo, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";

/** Human-readable labels for modal_type values */
const MODAL_LABELS: Record<string, { label: string; emoji: string }> = {
  pacing:            { label: "Pacing",              emoji: "🥾" },
  summit_in_sight:   { label: "Summit in Sight",     emoji: "🏔️" },
  anchor_failure:    { label: "Anchor Failure",      emoji: "⚓" },
  anchor_escalated:  { label: "Anchor Escalated",    emoji: "🚨" },
  light_anchor:      { label: "Light Anchor",        emoji: "💡" },
  tier_unlock:       { label: "Tier Unlock",         emoji: "🏅" },
  checkin_approach:  { label: "Check-in: Approach",  emoji: "🚡" },
  checkin_week2:     { label: "Check-in: Week 2",    emoji: "📮" },
  checkin_week3:     { label: "Check-in: Week 3",    emoji: "📮" },
  checkin_summit:    { label: "Check-in: Summit",    emoji: "🏕️" },
};

const ACTION_COLORS: Record<string, string> = {
  shown:     "bg-blue-100 text-blue-700",
  dismissed: "bg-gray-100 text-gray-600",
  sent:      "bg-green-100 text-green-700",
};

function getModalLabel(type: string) {
  return MODAL_LABELS[type] ?? { label: type, emoji: "📦" };
}

const ModalMovementsSection = memo(function ModalMovementsSection() {
  const { data, loading } = useApiData("GetModalInteractions", {});

  const summaryByModal = useMemo(() => {
    if (!data?.summary) return [];
    const map = new Map<string, { shown: number; dismissed: number; sent: number; uniqueViewers: number }>();
    for (const row of data.summary) {
      if (!map.has(row.modal_type)) {
        map.set(row.modal_type, { shown: 0, dismissed: 0, sent: 0, uniqueViewers: 0 });
      }
      const entry = map.get(row.modal_type)!;
      if (row.action === "shown") {
        entry.shown = row.count;
        entry.uniqueViewers = Math.max(entry.uniqueViewers, row.unique_viewers);
      } else if (row.action === "dismissed") {
        entry.dismissed = row.count;
        entry.uniqueViewers = Math.max(entry.uniqueViewers, row.unique_viewers);
      } else if (row.action === "sent") {
        entry.sent = row.count;
        entry.uniqueViewers = Math.max(entry.uniqueViewers, row.unique_viewers);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, counts]) => ({ type, ...counts }));
  }, [data?.summary]);

  if (loading) {
    return <div className="py-4"><Skeleton className="h-40" /></div>;
  }

  const interactions = data?.interactions ?? [];

  if (summaryByModal.length === 0 && interactions.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-6">No modal interactions recorded yet</p>;
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Summary grid */}
      {summaryByModal.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {summaryByModal.map((m) => {
            const info = getModalLabel(m.type);
            return (
              <div key={m.type} className="p-3 rounded-lg border border-gray-100 bg-[#fafafa]">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{info.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900 truncate">{info.label}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-blue-600 font-medium">{m.shown} shown</span>
                  <span className="text-gray-500">{m.dismissed} dismissed</span>
                  {m.sent > 0 && <span className="text-green-600">{m.sent} sent</span>}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {m.uniqueViewers} unique {m.uniqueViewers === 1 ? "viewer" : "viewers"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent interactions */}
      {interactions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Interactions</h4>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_80px_140px] gap-2 px-3 py-2 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <div>cAMPer</div>
              <div>Modal</div>
              <div>Action</div>
              <div>When</div>
            </div>
            {interactions.slice(0, 30).map((i) => {
              const info = getModalLabel(i.modal_type);
              const actionColor = ACTION_COLORS[i.action] ?? "bg-gray-100 text-gray-600";
              return (
                <div key={i.id} className="grid grid-cols-[1fr_120px_80px_140px] gap-2 px-3 py-2 border-b border-gray-50 last:border-0 items-center">
                  <div className="text-sm text-gray-900 truncate">{i.viewer_name}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-700 truncate">
                    <span className="text-xs">{info.emoji}</span>
                    <span className="truncate">{info.label}</span>
                  </div>
                  <div>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${actionColor}`}>
                      {i.action}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    {new Date(i.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
          {interactions.length > 30 && (
            <p className="text-xs text-gray-400 mt-1 text-center">Showing 30 of {interactions.length} interactions</p>
          )}
        </div>
      )}
    </div>
  );
});

export default ModalMovementsSection;
