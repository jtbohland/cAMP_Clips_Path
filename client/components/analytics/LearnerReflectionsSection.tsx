import { memo, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { Skeleton } from "@/components/ui/skeleton";

const CHECKIN_LABELS: Record<string, { emoji: string; name: string; color: string }> = {
  approach: { emoji: "🚡", name: "Approach", color: "bg-amber-100 text-amber-800 border-amber-200" },
  week2: { emoji: "🏕️", name: "Week 2", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  week3: { emoji: "🧗", name: "Week 3", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  summit: { emoji: "🏔️", name: "Summit", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
};

function LearnerReflectionsSection() {
  const { data, loading, isError, error } = useApiData("GetLearnerReflections", {});

  const reflections = useMemo(() => data?.reflections ?? [], [data]);

  // Group by checkin type
  const grouped = useMemo(() => {
    const groups: Record<string, typeof reflections> = {};
    for (const r of reflections) {
      if (!groups[r.checkinType]) groups[r.checkinType] = [];
      groups[r.checkinType].push(r);
    }
    return groups;
  }, [reflections]);

  if (loading) {
    return <div className="py-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }
  if (isError) {
    return <p className="text-sm text-red-600 py-3">Failed to load: {(error as any)?.message ?? "Unknown error"}</p>;
  }

  if (reflections.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-3xl block mb-2">💭</span>
        <p className="text-sm">No check-in reflections submitted yet.</p>
        <p className="text-xs mt-1 text-gray-400">Reflections appear when learners complete check-in emails.</p>
      </div>
    );
  }

  // Sort order: approach, week2, week3, summit
  const typeOrder = ["approach", "week2", "week3", "summit"];
  const sortedTypes = Object.keys(grouped).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  return (
    <div className="pt-4 space-y-6">
      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {typeOrder.map(type => {
          const count = grouped[type]?.length ?? 0;
          const withReflection = grouped[type]?.filter(r => r.learnerReflection).length ?? 0;
          const label = CHECKIN_LABELS[type] ?? { emoji: "📧", name: type, color: "bg-gray-100 text-gray-800 border-gray-200" };
          return (
            <div key={type} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${label.color}`}>
              <span>{label.emoji}</span>
              <span>{label.name}: {count} sent</span>
              {withReflection > 0 && (
                <span className="text-[10px] opacity-70">({withReflection} with reflection)</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Reflections by type */}
      {sortedTypes.map(type => {
        const items = grouped[type];
        const label = CHECKIN_LABELS[type] ?? { emoji: "📧", name: type, color: "bg-gray-100 text-gray-800 border-gray-200" };
        const withReflections = items.filter(r => r.learnerReflection);

        return (
          <div key={type}>
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <span>{label.emoji}</span> {label.name} Check-In
              <span className="text-xs font-normal text-gray-500">({items.length} sent)</span>
            </h4>

            {withReflections.length === 0 ? (
              <p className="text-xs text-gray-400 pl-6">No reflections written for this check-in yet.</p>
            ) : (
              <div className="space-y-2">
                {withReflections.map((r, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{r.viewerName}</span>
                      <span className="text-[10px] text-gray-400">{new Date(r.sentAt).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100">
                      <p className="text-sm text-gray-700">{r.learnerReflection}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(LearnerReflectionsSection);
