import type { CSSProperties } from "react";

interface Resource {
  label: string;
  url: string;
  type: string;
}

interface CampGearSectionProps {
  resources: Resource[];
}

const BADGE_STYLES: Record<string, string> = {
  slides: "bg-yellow-100 text-yellow-800",
  spekit: "bg-pink-100 text-pink-800",
  gdrive: "bg-green-100 text-green-800",
  zoom: "bg-blue-100 text-blue-800",
  slack: "bg-orange-200 text-orange-900",
  glean: "bg-indigo-100 text-indigo-800",
  mindtickle: "bg-orange-100 text-orange-800",
};

const SFDC_STYLE: CSSProperties = {
  backgroundColor: "#e0f7ff",
  color: "#0077b6",
};

const TYPE_LABELS: Record<string, string> = {
  slides: "Slides",
  spekit: "Spekit",
  gdrive: "Google Drive",
  zoom: "Zoom",
  slack: "Slack",
  glean: "Glean",
  mindtickle: "MindTickle",
  sfdc: "Salesforce",
};

export default function CampGearSection({ resources }: CampGearSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎒</span>
        <h2 className="text-base font-bold text-gray-900">cAMP Gear</h2>
      </div>
      <ul className="space-y-2">
        {resources.map((r) => {
          const isSfdc = r.type === "sfdc";
          const badgeClass = isSfdc ? "" : (BADGE_STYLES[r.type] ?? "bg-gray-100 text-gray-700");
          const typeLabel = TYPE_LABELS[r.type] ?? r.type;

          return (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${badgeClass}`}
                  style={isSfdc ? SFDC_STYLE : undefined}
                >
                  {typeLabel}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">
                  {r.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
