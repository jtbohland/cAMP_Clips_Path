import { memo, useState, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { Skeleton } from "@/components/ui/skeleton";

const CHECKIN_LABELS: Record<string, { emoji: string; label: string }> = {
  approach: { emoji: "🚡", label: "Approach" },
  week2: { emoji: "🧗", label: "Week 2" },
  week3: { emoji: "⛰️", label: "Week 3" },
  summit: { emoji: "🏔️", label: "Summit" },
};

function ManagerFeedbackSection() {
  const { data, loading, isError, error } = useApiData("GetManagerFeedback", {});
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const feedback = useMemo(() => data?.feedback ?? [], [data]);

  if (loading) {
    return (
      <div className="py-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 py-3">
        Failed to load: {(error as any)?.message ?? "Unknown error"}
      </p>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-3xl block mb-2">📋</span>
        <p className="text-sm">No manager feedback submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-2">
      {feedback.map((fb, i) => {
        const checkin = CHECKIN_LABELS[fb.checkinType] ?? { emoji: "📋", label: fb.checkinType };
        const expanded = expandedIdx === i;
        return (
          <button
            key={fb.id}
            onClick={() => setExpandedIdx(expanded ? null : i)}
            className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{checkin.emoji}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {fb.viewerName}
                </span>
                <span className="text-xs text-gray-500">
                  — {checkin.label} Check-in
                </span>
              </div>
              <span className="text-[10px] text-gray-400">
                {new Date(fb.submittedAt).toLocaleDateString()}
              </span>
            </div>
            {expanded && (
              <div
                className="mt-3 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-blue-50 rounded px-3 py-2 border border-blue-100">
                  <p className="text-xs font-medium text-blue-800 mb-1">
                    Manager Response
                  </p>
                  <p className="text-sm text-gray-700">{fb.response}</p>
                </div>
                {fb.comment && (
                  <div className="bg-gray-50 rounded px-3 py-2 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Additional Comments
                    </p>
                    <p className="text-sm text-gray-700">{fb.comment}</p>
                  </div>
                )}
                {fb.managerEmail && (
                  <p className="text-[10px] text-gray-400">
                    Submitted by: {fb.managerEmail}
                  </p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(ManagerFeedbackSection);
