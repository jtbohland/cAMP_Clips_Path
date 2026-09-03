/** Audit topic tile for the SME landing page grid */
import { getPathForTopic, PATH_STYLES } from "@/config/auditPaths";

interface AuditTopic {
  topicKey: string;
  dayLabel: string;
  title: string;
  emoji: string | null;
  pathLabel: string | null;
  hasVideo: boolean;
  smes: Array<{ name: string; title: string; note?: string | null }>;
  status: "not_started" | "in_progress" | "complete";
  isAssignedToMe: boolean;
  signoffs: Array<{ viewerName: string; signedAt: string }>;
}

const STATUS_CONFIG = {
  not_started: { label: "Not Started", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" },
  in_progress: { label: "In Progress", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  complete: { label: "Complete", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
};

export default function AuditTopicTile({
  topic,
  onClick,
  isAdmin = false,
}: {
  topic: AuditTopic;
  onClick: (topicKey: string) => void;
  isAdmin?: boolean;
}) {
  const s = STATUS_CONFIG[topic.status];
  const isClickable = isAdmin || topic.isAssignedToMe;
  const audiencePath = getPathForTopic(topic.topicKey);
  const pathStyle = audiencePath ? PATH_STYLES[audiencePath] : null;

  return (
    <button
      onClick={() => isClickable && onClick(topic.topicKey)}
      disabled={!isClickable}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        isClickable
          ? "border-gray-200 bg-white hover:shadow-md hover:border-indigo-300 cursor-pointer"
          : "border-gray-100 bg-gray-50/60 cursor-default opacity-75"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{topic.emoji ?? "📋"}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-indigo-600">{topic.dayLabel}</p>
            <h3 className="text-sm font-bold text-gray-900 leading-snug truncate">{topic.title}</h3>
          </div>
        </div>
        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text} border ${s.border} flex-shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      {/* Audience path pill */}
      {pathStyle && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${pathStyle.bg} ${pathStyle.text} border ${pathStyle.border} mb-2`}>
          {pathStyle.label}
        </span>
      )}

      {/* Resource-only note */}
      {!topic.hasVideo && (
        <p className="text-[11px] text-amber-600 italic mb-2">
          📂 Resource-only training day — no video clip attached
        </p>
      )}

      {/* SMEs */}
      {topic.smes.length > 0 && (
        <div className="space-y-0.5 mt-1">
          {topic.smes.map((sme, i) => (
            <p key={i} className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{sme.name}</span>
              <span className="text-gray-400"> · {sme.title}</span>
              {sme.note && <span className="text-amber-500 italic"> ({sme.note})</span>}
            </p>
          ))}
        </div>
      )}

      {/* Sign-offs */}
      {topic.signoffs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {topic.signoffs.map((so, i) => (
            <p key={i} className="text-[10px] text-emerald-600">
              ✅ {so.viewerName} — {new Date(so.signedAt).toLocaleDateString()}
            </p>
          ))}
        </div>
      )}

      {/* Assigned indicator */}
      {topic.isAssignedToMe && topic.status !== "complete" && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-indigo-600">🎯 Assigned to you</p>
        </div>
      )}
    </button>
  );
}
