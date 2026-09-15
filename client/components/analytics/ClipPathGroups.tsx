import { useState, useMemo } from "react";

type ClipStat = {
  clipId: string;
  title: string;
  sortOrder: number;
  completedCount: number;
  uniqueViewers: number;
  avgFirstPass: number | null;
  avgFocus: number | null;
  avgRecovery: number | null;
  avgWatchSeconds: number | null;
  srTriggered: number;
  wtsCount: number;
  totalSessions: number;
};

type ClipPathInfo = {
  id: string;
  title: string;
  sort_order: number;
  roles: string[] | null;
  week_number: number | null;
};

type Props = {
  clips: ClipStat[];
  clipPaths: ClipPathInfo[];
};

const PATH_CONFIG: { key: string; label: string; emoji: string; color: string; roles: string[] }[] = [
  {
    key: "shared",
    label: "Shared (All Paths)",
    emoji: "🌲",
    color: "bg-green-50 border-green-200",
    roles: [],
  },
  {
    key: "ae",
    label: "AE Path",
    emoji: "🐾",
    color: "bg-blue-50 border-blue-200",
    roles: ["Emerging AE", "Majors AE", "Strategic AE", "Velocity AE", "PSM", "Renewals"],
  },
  {
    key: "sdr",
    label: "SDR Path",
    emoji: "👣",
    color: "bg-purple-50 border-purple-200",
    roles: ["SDR"],
  },
  {
    key: "promo",
    label: "Promo Path",
    emoji: "🦅",
    color: "bg-amber-50 border-amber-200",
    roles: ["SDR>Velocity Promo"],
  },
];

function engColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 90) return "text-green-600 font-bold";
  if (score >= 80) return "text-green-500";
  if (score >= 70) return "text-amber-500";
  return "text-red-500 font-bold";
}

function formatTime(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

export default function ClipPathGroups({ clips, clipPaths }: Props) {
  const [openPaths, setOpenPaths] = useState<Set<string>>(new Set(["shared", "ae", "sdr", "promo"]));

  const toggle = (key: string) =>
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groups = useMemo(() => {
    const clipStatMap = new Map(clips.map((c) => [c.clipId, c]));
    const pathMap = new Map(clipPaths.map((c) => [c.id, c]));

    return PATH_CONFIG.map((path) => {
      const pathClips = clipPaths
        .filter((cp) => {
          if (path.key === "shared") return cp.roles === null || cp.roles.length === 0;
          if (path.key === "promo") return cp.roles?.includes("SDR>Velocity Promo");
          if (path.key === "sdr") return cp.roles?.includes("SDR") && !cp.roles?.includes("SDR>Velocity Promo");
          // AE: has AE roles but not SDR-only
          return cp.roles?.some((r) => path.roles.includes(r));
        })
        .map((cp) => ({
          ...cp,
          stat: clipStatMap.get(cp.id),
        }))
        .sort((a, b) => a.sort_order - b.sort_order);

      return { ...path, clips: pathClips };
    });
  }, [clips, clipPaths]);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key} className={`rounded-xl border ${group.color} overflow-hidden`}>
          <button
            onClick={() => toggle(group.key)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{group.emoji}</span>
              <span className="font-semibold text-sm">{group.label}</span>
              <span className="text-xs opacity-60">({group.clips.length} clips)</span>
            </div>
            <span className="text-xs opacity-50">{openPaths.has(group.key) ? "▲" : "▼"}</span>
          </button>

          {openPaths.has(group.key) && group.clips.length > 0 && (
            <div className="px-4 pb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-1.5 pr-2 font-medium opacity-60 w-8">#</th>
                    <th className="py-1.5 font-medium opacity-60">Clip</th>
                    <th className="py-1.5 text-center font-medium opacity-60">Done</th>
                    <th className="py-1.5 text-center font-medium opacity-60">Eng%</th>
                    <th className="py-1.5 text-center font-medium opacity-60">Focus%</th>
                    <th className="py-1.5 text-center font-medium opacity-60">Recovery%</th>
                    <th className="py-1.5 text-center font-medium opacity-60">Avg Time</th>
                    <th className="py-1.5 text-center font-medium opacity-60">S&R</th>
                    <th className="py-1.5 text-center font-medium opacity-60">WtS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.clips.map((c, i) => {
                    const s = c.stat;
                    return (
                      <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-white/50">
                        <td className="py-1.5 pr-2 opacity-40">{c.sort_order}</td>
                        <td className="py-1.5 font-medium truncate max-w-[200px]">{c.title}</td>
                        <td className="py-1.5 text-center">{s?.completedCount ?? 0}</td>
                        <td className={`py-1.5 text-center ${engColor(s?.avgFirstPass ?? null)}`}>
                          {s?.avgFirstPass != null ? `${Math.round(s.avgFirstPass)}%` : "—"}
                        </td>
                        <td className={`py-1.5 text-center ${engColor(s?.avgFocus ?? null)}`}>
                          {s?.avgFocus != null ? `${Math.round(s.avgFocus)}%` : "—"}
                        </td>
                        <td className={`py-1.5 text-center ${engColor(s?.avgRecovery ?? null)}`}>
                          {s?.avgRecovery != null ? `${Math.round(s.avgRecovery)}%` : "—"}
                        </td>
                        <td className="py-1.5 text-center opacity-60">{formatTime(s?.avgWatchSeconds ?? null)}</td>
                        <td className="py-1.5 text-center">
                          {(s?.srTriggered ?? 0) > 0 ? (
                            <span className="text-amber-600 font-bold">{s?.srTriggered}</span>
                          ) : (
                            <span className="opacity-30">0</span>
                          )}
                        </td>
                        <td className="py-1.5 text-center">
                          {(s?.wtsCount ?? 0) > 0 ? (
                            <span className="text-red-600 font-bold">{s?.wtsCount}</span>
                          ) : (
                            <span className="opacity-30">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {openPaths.has(group.key) && group.clips.length === 0 && (
            <div className="px-4 pb-3 text-xs opacity-50 italic">No clips in this path</div>
          )}
        </div>
      ))}
    </div>
  );
}
