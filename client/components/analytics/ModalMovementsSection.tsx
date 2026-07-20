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

/** Pacing tier labels — matches PACING_TIERS in pacing.ts */
const PACING_TIER_LABELS: Record<string, { label: string; emoji: string }> = {
  summit_bound:      { label: "Summit Bound",        emoji: "🧗🏻‍♂️" },
  off_the_trail:     { label: "Off the Trail",       emoji: "🧭" },
  lost_in_the_woods: { label: "Lost in the Woods",   emoji: "🌲" },
  rockslide:         { label: "Rockslide",            emoji: "🪨" },
  avalanche_warning: { label: "Avalanche Warning",   emoji: "❄️" },
  anchor_failure:    { label: "Anchor Failure",       emoji: "⛓️‍💥" },
};

const ACTION_COLORS: Record<string, string> = {
  shown:     "bg-blue-100 text-blue-700",
  dismissed: "bg-gray-100 text-gray-600",
  sent:      "bg-green-100 text-green-700",
};

function getModalLabel(type: string) {
  return MODAL_LABELS[type] ?? { label: type, emoji: "📦" };
}

/** Extract the pacing tier from metadata, if present */
function extractTier(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "tier" in metadata) {
    return String((metadata as Record<string, unknown>).tier);
  }
  return null;
}

/** Build a display label that includes pacing tier when available */
function getDisplayLabel(modalType: string, metadata: unknown): { label: string; emoji: string } {
  if (modalType === "pacing") {
    const tier = extractTier(metadata);
    if (tier && PACING_TIER_LABELS[tier]) {
      const t = PACING_TIER_LABELS[tier];
      return { label: `Pacing: ${t.label}`, emoji: t.emoji };
    }
    return { label: "Pacing", emoji: "🥾" };
  }
  return getModalLabel(modalType);
}

/** Build a summary key that splits pacing by tier */
function getSummaryKey(modalType: string, metadata: unknown): string {
  if (modalType === "pacing") {
    const tier = extractTier(metadata);
    if (tier) return `pacing::${tier}`;
  }
  return modalType;
}

const ModalMovementsSection = memo(function ModalMovementsSection() {
  const { data, loading } = useApiData("GetModalInteractions", {});

  // Build summary from raw interactions so we can split pacing by tier
  const summaryByModal = useMemo(() => {
    if (!data?.interactions) return [];
    const map = new Map<string, { label: string; emoji: string; shown: number; dismissed: number; sent: number; shownViewers: Set<string>; dismissedViewers: Set<string>; sentViewers: Set<string> }>();

    for (const row of data.interactions) {
      const key = getSummaryKey(row.modal_type, row.metadata);
      if (!map.has(key)) {
        const info = getDisplayLabel(row.modal_type, row.metadata);
        map.set(key, { ...info, shown: 0, dismissed: 0, sent: 0, shownViewers: new Set(), dismissedViewers: new Set(), sentViewers: new Set() });
      }
      const entry = map.get(key)!;
      if (row.action === "shown") {
        entry.shown++;
        entry.shownViewers.add(row.viewer_id);
      } else if (row.action === "dismissed") {
        entry.dismissed++;
        entry.dismissedViewers.add(row.viewer_id);
      } else if (row.action === "sent") {
        entry.sent++;
        entry.sentViewers.add(row.viewer_id);
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { shownViewers, dismissedViewers, sentViewers, ...rest }]) => {
        const allViewers = new Set([...shownViewers, ...dismissedViewers, ...sentViewers]);
        return { key, ...rest, uniqueViewers: allViewers.size };
      });
  }, [data?.interactions]);

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
          {summaryByModal.map((m) => (
            <div key={m.key} className="p-3 rounded-lg border border-gray-100 bg-[#fafafa]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{m.emoji}</span>
                <span className="text-sm font-semibold text-gray-900 truncate">{m.label}</span>
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
          ))}
        </div>
      )}

      {/* Recent interactions */}
      {interactions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Interactions</h4>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_180px_80px_140px] gap-2 px-3 py-2 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <div>cAMPer</div>
              <div>Modal</div>
              <div>Action</div>
              <div>When</div>
            </div>
            {interactions.slice(0, 30).map((i) => {
              const info = getDisplayLabel(i.modal_type, i.metadata);
              const actionColor = ACTION_COLORS[i.action] ?? "bg-gray-100 text-gray-600";
              return (
                <div key={i.id} className="grid grid-cols-[1fr_180px_80px_140px] gap-2 px-3 py-2 border-b border-gray-50 last:border-0 items-center">
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
