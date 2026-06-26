import type { AscentGuideEntry } from "@/config/ascentGuide.js";

type AscentGuidePanelProps = {
  entry: AscentGuideEntry;
  isOpen: boolean;
  onSwatAway: () => void;
};

export default function AscentGuidePanel({ entry, isOpen, onSwatAway }: AscentGuidePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="mx-4 mb-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      {/* Summary */}
      <p className="text-sm text-gray-700 leading-relaxed">{entry.summary}</p>

      {/* Learning Objectives */}
      {entry.learningObjectives.length > 0 && (
        <div className="mt-2.5">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">
            🏹 Learning Objectives
          </p>
          <ul className="space-y-1">
            {entry.learningObjectives.map((obj, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="mt-0.5 shrink-0 text-green-600">•</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SMEs */}
      {entry.smes.length > 0 && (
        <div className="mt-2.5">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">
            🧢 Subject Matter Expert{entry.smes.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {entry.smes.map((sme, i) => (
              <span key={i} className="text-sm text-gray-700">
                <span className="font-medium">{sme.name}</span>
                <span className="text-gray-500"> · {sme.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Swat Away button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={onSwatAway}
          className="text-xs text-green-700 hover:text-green-900 font-medium px-2 py-0.5 rounded hover:bg-green-100 transition-colors"
        >
          🦟 Swat Away
        </button>
      </div>
    </div>
  );
}
