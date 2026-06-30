import { memo, useState, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { Skeleton } from "@/components/ui/skeleton";

const MODULE_LABELS: Record<string, { emoji: string; name: string }> = {
  meddpicc: { emoji: "📘", name: "MEDDPICC" },
  camp101: { emoji: "🏕️", name: "cAMP 101" },
  challenger: { emoji: "⚔️", name: "Challenger" },
};

const TOPIC_DAY_LABELS: Record<string, { emoji: string; name: string }> = {
  day5: { emoji: "📅", name: "Topic Day 5" },
  day9: { emoji: "📅", name: "Topic Day 9" },
};

function SherpaSurveysSection() {
  const { data, loading, isError, error } = useApiData("GetSherpaSurveys", {});
  const [activeTab, setActiveTab] = useState<"topic" | "module">("topic");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const topicReflections = useMemo(() => data?.topicReflections ?? [], [data]);
  const moduleReflections = useMemo(() => data?.moduleReflections ?? [], [data]);

  if (loading) {
    return <div className="py-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }
  if (isError) {
    return <p className="text-sm text-red-600 py-3">Failed to load: {error?.message ?? "Unknown error"}</p>;
  }

  const isEmpty = topicReflections.length === 0 && moduleReflections.length === 0;
  if (isEmpty) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-3xl block mb-2">🏔️</span>
        <p className="text-sm">No reflections submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => { setActiveTab("topic"); setExpandedIdx(null); }}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors ${
            activeTab === "topic" ? "bg-emerald-100 text-emerald-800 border-b-2 border-emerald-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📅 Topic Day Reflections ({topicReflections.length})
        </button>
        <button
          onClick={() => { setActiveTab("module"); setExpandedIdx(null); }}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors ${
            activeTab === "module" ? "bg-indigo-100 text-indigo-800 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📚 Module Reflections ({moduleReflections.length})
        </button>
      </div>

      {/* Topic Day Reflections */}
      {activeTab === "topic" && (
        <div className="space-y-2">
          {topicReflections.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No topic day reflections yet.</p>
          ) : (
            topicReflections.map((r, i) => {
              const label = TOPIC_DAY_LABELS[r.topicDay] ?? { emoji: "📅", name: r.topicDay };
              const expanded = expandedIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => setExpandedIdx(expanded ? null : i)}
                  className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{label.emoji}</span>
                      <span className="text-sm font-semibold text-gray-900">{r.viewerName}</span>
                      <span className="text-xs text-gray-500">— {label.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(r.submittedAt).toLocaleDateString()}</span>
                  </div>
                  {expanded && (
                    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="bg-emerald-50 rounded px-3 py-2 border border-emerald-100">
                        <p className="text-xs font-medium text-emerald-800 mb-1">Q: {r.question1}</p>
                        <p className="text-sm text-gray-700">{r.answer1}</p>
                      </div>
                      {r.question2 && r.answer2 && (
                        <div className="bg-emerald-50 rounded px-3 py-2 border border-emerald-100">
                          <p className="text-xs font-medium text-emerald-800 mb-1">Q: {r.question2}</p>
                          <p className="text-sm text-gray-700">{r.answer2}</p>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Module Reflections */}
      {activeTab === "module" && (
        <div className="space-y-2">
          {moduleReflections.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No module reflections yet.</p>
          ) : (
            moduleReflections.map((r, i) => {
              const label = MODULE_LABELS[r.moduleKey] ?? { emoji: "📝", name: r.moduleKey };
              const expanded = expandedIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => setExpandedIdx(expanded ? null : i)}
                  className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{label.emoji}</span>
                      <span className="text-sm font-semibold text-gray-900">{r.viewerName}</span>
                      <span className="text-xs text-gray-500">— {label.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(r.completedAt).toLocaleDateString()}</span>
                  </div>
                  {expanded && r.reflectionResponse && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      {r.reflectionPrompt && (
                        <p className="text-xs font-medium text-indigo-700 mb-1">Q: {r.reflectionPrompt}</p>
                      )}
                      <div className="bg-indigo-50 rounded px-3 py-2 border border-indigo-100">
                        <p className="text-sm text-gray-700">{r.reflectionResponse}</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SherpaSurveysSection);
