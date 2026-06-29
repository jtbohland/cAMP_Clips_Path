import type { CSSProperties } from "react";
import type { TopicResource } from "@/config/topicDays";

interface TopicResourceListProps {
  resources: TopicResource[];
  clickedIndices: Set<number>;
  onResourceClick: (index: number, url: string) => void;
  badgeStyles: Record<string, string>;
  sfdcStyle: CSSProperties;
  typeLabels: Record<string, string>;
}

/**
 * Resource list with click tracking for topic days.
 * Each resource shows a pill badge, label, optional note, and a checkmark when clicked.
 */
export default function TopicResourceList({
  resources,
  clickedIndices,
  onResourceClick,
  badgeStyles,
  sfdcStyle,
  typeLabels,
}: TopicResourceListProps) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎒</span>
        <h2 className="text-base font-bold text-gray-900">cAMP Gear</h2>
        <span className="text-xs text-gray-400 ml-1">(click each to review — opens in new tab)</span>
      </div>
      <ul className="space-y-2">
        {resources.map((r, i) => {
          const isClicked = clickedIndices.has(i);
          const isSfdc = r.type === "sfdc";
          const badgeClass = isSfdc ? "" : (badgeStyles[r.type] ?? "bg-gray-100 text-gray-700");
          const typeLabel = typeLabels[r.type] ?? r.type;

          return (
            <li key={i}>
              <button
                onClick={() => onResourceClick(i, r.url)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group ${
                  isClicked
                    ? "bg-green-50 border border-green-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                {/* Checkmark / index */}
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isClicked
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {isClicked ? "✓" : i + 1}
                </span>

                {/* Emoji */}
                <span className="text-lg flex-shrink-0">{r.emoji}</span>

                {/* Badge pill */}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${badgeClass}`}
                  style={isSfdc ? sfdcStyle : undefined}
                >
                  {typeLabel}
                </span>

                {/* Label + note */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm transition-colors ${
                    isClicked
                      ? "text-green-800 font-medium"
                      : "text-gray-700 group-hover:text-indigo-600"
                  }`}>
                    {r.label}
                  </span>
                  {r.note && (
                    <span className="block text-xs text-gray-400 mt-0.5">{r.note}</span>
                  )}
                </div>

                {/* Status indicator */}
                {isClicked && (
                  <span className="text-xs font-semibold text-green-600 flex-shrink-0">Reviewed</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
