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
  approvedCount: number;
  totalSections: number;
  lastActivity: string | null;
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
  viewerName,
}: {
  topic: AuditTopic;
  onClick: (topicKey: string) => void;
  isAdmin?: boolean;
  viewerName?: string;
}) {
  const s = STATUS_CONFIG[topic.status];
  // SME can click their own tile (name on the tile) or admin can click any
  const isMyTile = !!viewerName && topic.smes.some(sme => sme.name.toLowerCase() === viewerName.toLowerCase());
  const isClickable = isAdmin || isMyTile;
  const audiencePath = getPathForTopic(topic.topicKey);
  const pathStyle = audiencePath ? PATH_STYLES[audiencePath] : null;
  const pct = topic.status === "complete" ? 100 : topic.status === "not_started" ? 0 : (topic.totalSections > 0 ? Math.round((topic.approvedCount / topic.totalSections) * 100) : 0);

  return (
    <button
      onClick={() => isClickable && onClick(topic.topicKey)}
      disabled={!isClickable}
      className={`w-full h-full text-left rounded-xl border overflow-hidden transition-all flex flex-col ${
        isClickable
          ? "border-gray-200 bg-white hover:shadow-md hover:border-indigo-300 cursor-pointer"
          : "border-gray-100 bg-gray-50/60 cursor-default opacity-75"
      }`}
    >
      {/* ─── Header bar (darker green) ─── */}
      <div className="bg-emerald-800 px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{topic.emoji ?? "📋"}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">{topic.dayLabel}</p>
            <h3 className="text-sm font-bold text-white leading-snug truncate">{topic.title}</h3>
          </div>
        </div>
        {/* Status pill */}
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text} border ${s.border} flex-shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label} · {pct}%
        </span>
      </div>

      {/* ─── Body ─── */}
      <div className="px-4 py-3 space-y-2 flex-1">
        {/* Pills row: path + last activity */}
        <div className="flex items-center gap-2 flex-wrap">
          {pathStyle && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${pathStyle.bg} ${pathStyle.text} border ${pathStyle.border}`}>
              {pathStyle.label}
            </span>
          )}
          {(() => {
            if (!topic.lastActivity) {
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                  No activity yet
                </span>
              );
            }
            const daysAgo = Math.floor((Date.now() - new Date(topic.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
            const style =
              daysAgo <= 7  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              daysAgo <= 14 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
              daysAgo <= 21 ? "bg-orange-50 text-orange-700 border-orange-200" :
                              "bg-red-50 text-red-700 border-red-200";
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${style}`}>
                Last activity: {new Date(topic.lastActivity).toLocaleDateString()}
              </span>
            );
          })()}
        </div>

        {/* Resource-only note */}
        {!topic.hasVideo && (
          <p className="text-[11px] text-amber-600 italic">
            📂 Resource-only training day — no video clip attached
          </p>
        )}

        {/* SMEs */}
        {topic.smes.length > 0 && (
          <div className="space-y-0.5">
            {topic.smes.map((sme, i) => (
              <p key={i} className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{sme.name}</span>
                <span className="text-gray-400"> · {sme.title}</span>
              </p>
            ))}
          </div>
        )}

        {/* Sign-offs */}
        {topic.signoffs.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            {topic.signoffs.map((so, i) => (
              <p key={i} className="text-[10px] text-emerald-600">
                ✅ {so.viewerName} — {new Date(so.signedAt).toLocaleDateString()}
              </p>
            ))}
          </div>
        )}

        {/* Assigned indicator */}
        {topic.isAssignedToMe && topic.status !== "complete" && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-indigo-600">🎯 Assigned to you</p>
          </div>
        )}
      </div>
    </button>
  );
}
