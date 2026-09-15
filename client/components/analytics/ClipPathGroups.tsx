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

type PathStat = {
  clip_id: string;
  path_group: string;
  completed_count: number;
  avg_engagement: number | null;
  avg_focus: number | null;
  avg_recovery: number | null;
  sr_triggered: number;
  wts_count: number;
};

type Props = {
  clips: ClipStat[];
  clipPaths: ClipPathInfo[];
  pathStats: PathStat[];
};

const PATH_CONFIG: {
  key: string;
  label: string;
  emoji: string;
  color: string;
  pathGroup: string; // matches path_group from API
}[] = [
  { key: "shared", label: "Shared (All Paths)", emoji: "🌲", color: "bg-green-50 border-green-200", pathGroup: "" },
  { key: "ae", label: "AE Path", emoji: "🐾", color: "bg-blue-50 border-blue-200", pathGroup: "ae" },
  { key: "sdr", label: "SDR Path", emoji: "👣", color: "bg-purple-50 border-purple-200", pathGroup: "sdr" },
  { key: "promo", label: "Promo Path", emoji: "🦅", color: "bg-amber-50 border-amber-200", pathGroup: "promo" },
];

function engColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 90) return "text-green-600 font-bold";
  if (score >= 80) return "text-green-500";
  if (score >= 70) return "text-amber-500";
  return "text-red-500 font-bold";
}

export default function ClipPathGroups({ clips, clipPaths, pathStats }: Props) {
  const [openPaths, setOpenPaths] = useState<Set<string>>(new Set(["shared", "ae", "sdr", "promo"]));

  const toggle = (key: string) =>
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Build lookup: clip_id + path_group → PathStat
  const statLookup = useMemo(() => {
    const map = new Map<string, PathStat>();
    for (const ps of pathStats) {
      map.set(`${ps.clip_id}:${ps.path_group}`, ps);
    }
    return map;
  }, [pathStats]);

  // Aggregate stats across ALL path groups for shared clips
  const sharedAggLookup = useMemo(() => {
    const map = new Map<string, { count: number; eng: number[]; focus: number[]; recovery: number[]; sr: number; wts: number }>();
    for (const ps of pathStats) {
      const existing = map.get(ps.clip_id) ?? { count: 0, eng: [], focus: [], recovery: [], sr: 0, wts: 0 };
      existing.count += ps.completed_count;
      if (ps.avg_engagement != null) existing.eng.push(ps.avg_engagement * ps.completed_count);
      if (ps.avg_focus != null) existing.focus.push(ps.avg_focus * ps.completed_count);
      if (ps.avg_recovery != null) existing.recovery.push(ps.avg_recovery * ps.completed_count);
      existing.sr += ps.sr_triggered;
      existing.wts += ps.wts_count;
      map.set(ps.clip_id, existing);
    }
    return map;
  }, [pathStats]);

  const groups = useMemo(() => {
    return PATH_CONFIG.map((path) => {
      const pathClips = clipPaths
        .filter((cp) => {
          if (path.key === "shared") return cp.roles === null || cp.roles.length === 0;
          if (path.key === "promo") return cp.roles?.includes("SDR>Velocity Promo");
          if (path.key === "sdr") return cp.roles?.includes("SDR") && !cp.roles?.includes("SDR>Velocity Promo");
          return cp.roles?.some((r) =>
            ["Emerging AE", "Majors AE", "Strategic AE", "Velocity AE", "PSM", "Renewals"].includes(r)
          );
        })
        .map((cp) => {
          // For shared clips, aggregate all path groups
          // For path-specific, use the specific path_group
          let stat: { completed: number; eng: number | null; focus: number | null; recovery: number | null; sr: number; wts: number };

          if (path.key === "shared") {
            const agg = sharedAggLookup.get(cp.id);
            stat = {
              completed: agg?.count ?? 0,
              eng: agg && agg.eng.length > 0 && agg.count > 0
                ? Math.round(agg.eng.reduce((s, v) => s + v, 0) / agg.count)
                : null,
              focus: agg && agg.focus.length > 0 && agg.count > 0
                ? Math.round(agg.focus.reduce((s, v) => s + v, 0) / agg.count)
                : null,
              recovery: agg && agg.recovery.length > 0 && agg.count > 0
                ? Math.round(agg.recovery.reduce((s, v) => s + v, 0) / agg.count)
                : null,
              sr: agg?.sr ?? 0,
              wts: agg?.wts ?? 0,
            };
          } else {
            const ps = statLookup.get(`${cp.id}:${path.pathGroup}`);
            stat = {
              completed: ps?.completed_count ?? 0,
              eng: ps?.avg_engagement ?? null,
              focus: ps?.avg_focus ?? null,
              recovery: ps?.avg_recovery ?? null,
              sr: ps?.sr_triggered ?? 0,
              wts: ps?.wts_count ?? 0,
            };
          }

          return { ...cp, stat };
        })
        .sort((a, b) => a.sort_order - b.sort_order);

      const totalCompleted = pathClips.reduce((s, c) => s + c.stat.completed, 0);

      return { ...path, clips: pathClips, totalCompleted };
    });
  }, [clipPaths, statLookup, sharedAggLookup]);

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
              <span className="text-xs opacity-60">({group.clips.length} clips · {group.totalCompleted} completions)</span>
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
                    <th className="py-1.5 text-center font-medium opacity-60">S&R</th>
                    <th className="py-1.5 text-center font-medium opacity-60">WtS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.clips.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-white/50">
                      <td className="py-1.5 pr-2 opacity-40">{c.sort_order}</td>
                      <td className="py-1.5 font-medium truncate max-w-[220px]">{c.title}</td>
                      <td className="py-1.5 text-center">{c.stat.completed}</td>
                      <td className={`py-1.5 text-center ${engColor(c.stat.eng)}`}>
                        {c.stat.eng != null ? `${c.stat.eng}%` : "—"}
                      </td>
                      <td className={`py-1.5 text-center ${engColor(c.stat.focus)}`}>
                        {c.stat.focus != null ? `${c.stat.focus}%` : "—"}
                      </td>
                      <td className={`py-1.5 text-center ${engColor(c.stat.recovery)}`}>
                        {c.stat.recovery != null ? `${c.stat.recovery}%` : "—"}
                      </td>
                      <td className="py-1.5 text-center">
                        {c.stat.sr > 0 ? (
                          <span className="text-amber-600 font-bold">{c.stat.sr}</span>
                        ) : (
                          <span className="opacity-30">0</span>
                        )}
                      </td>
                      <td className="py-1.5 text-center">
                        {c.stat.wts > 0 ? (
                          <span className="text-red-600 font-bold">{c.stat.wts}</span>
                        ) : (
                          <span className="opacity-30">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
