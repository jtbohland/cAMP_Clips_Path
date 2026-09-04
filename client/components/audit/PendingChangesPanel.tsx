/** Pending Changes panel for the Ascent Audit admin tab */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";

const CHANGE_LABELS: Record<string, string> = {
  question: "Trail Marker / S&R",
  weather_storm: "Weather the Storm",
  gear_update: "Gear Edit",
  gear_add: "Gear Add",
  gear_remove: "Gear Remove",
  clip_notes: "Clip Notes",
  clip_summary: "Clip Summary",
  clip_objectives: "Learning Objectives",
  video_link: "Video Link",
  smes: "SME List",
  academy_notes: "Academy Notes",
  wheel_notes: "Wheel & Deal Notes",
  game_scenario_edit: "Game Scenario Edit",
};

function formatFull(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val;
  return JSON.stringify(val, null, 2);
}

function formatPreview(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val.length > 100 ? val.slice(0, 100) + "…" : val;
  return JSON.stringify(val).slice(0, 100);
}

/** Single change entry — click to expand full details */
function ChangeEntry({ c }: { c: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="px-4 py-2.5 text-xs hover:bg-orange-50/40 cursor-pointer transition-colors"
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <span className="flex-shrink-0 px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-medium border border-orange-200 whitespace-nowrap">
          {CHANGE_LABELS[c.change_type] ?? c.change_type}
        </span>
        {/* Preview */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {c.field_name && (
            <span className="text-gray-500">Field: <span className="font-medium text-gray-700">{c.field_name}</span></span>
          )}
          {!expanded && c.new_value !== null && (
            <div className="text-gray-700">
              <span className="text-gray-400">→ </span>{formatPreview(c.new_value)}
            </div>
          )}
        </div>
        {/* Meta + expand indicator */}
        <div className="flex-shrink-0 text-right space-y-0.5">
          <div className="font-medium text-gray-700">{c.viewer_name ?? "Unknown"}</div>
          <div className="text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
          <div className="text-[10px] text-orange-500 mt-0.5">{expanded ? "▲ collapse" : "▼ expand"}</div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 ml-[calc(theme(spacing.2)+theme(spacing.0.5)+2px+theme(spacing.3))] bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
          {c.entity_id && (
            <div>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Entity ID</span>
              <p className="text-gray-700 font-mono text-[11px] break-all">{c.entity_id}</p>
            </div>
          )}
          {c.new_value !== null && (
            <div>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">New Value</span>
              <p className="text-gray-800 whitespace-pre-wrap break-words text-xs leading-relaxed">{formatFull(c.new_value)}</p>
            </div>
          )}
          {c.old_value !== null && (
            <div>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Old Value</span>
              <p className="text-gray-500 whitespace-pre-wrap break-words text-xs leading-relaxed line-through">{formatFull(c.old_value)}</p>
            </div>
          )}
          <div className="text-[10px] text-gray-400">
            {new Date(c.created_at).toLocaleString()} · ID: {c.id.slice(0, 8)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PendingChangesPanel() {
  const navigate = useNavigate();
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const { data, loading, fetching } = useApiData("GetAuditPendingChanges", {
    topicKey: topicFilter,
    limit: 50,
  });

  const handleViewTopic = useCallback((topicKey: string) => {
    navigate(`/audit/${topicKey}`);
  }, [navigate]);

  if (loading) return <Skeleton className="h-48" />;

  const changes = data?.changes ?? [];
  const total = data?.totalCount ?? 0;

  // Group by topic
  const grouped = new Map<string, typeof changes>();
  for (const c of changes) {
    const key = c.topic_key;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-white mt-6">
      {/* Header */}
      <div className="bg-orange-600 text-white rounded-t-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-bold text-sm">Pending SME Changes</h3>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{total} entries</span>
        </div>
        {fetching && <span className="text-xs opacity-70">Updating…</span>}
      </div>

      <div className="p-4">
        {changes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No pending changes from SMEs yet.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([topicKey, entries]) => (
              <div key={topicKey} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Topic header — click to navigate to that audit day */}
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{topicKey}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{entries.length} change{entries.length !== 1 ? "s" : ""}</span>
                    <button
                      onClick={() => handleViewTopic(topicKey)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 transition-colors"
                    >
                      View Audit →
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {entries.map((c) => (
                    <ChangeEntry key={c.id} c={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
