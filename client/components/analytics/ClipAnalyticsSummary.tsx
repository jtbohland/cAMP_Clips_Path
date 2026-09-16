import { useMemo } from "react";

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

type Props = { clips: ClipStat[] };

export default function ClipAnalyticsSummary({ clips }: Props) {
  const stats = useMemo(() => {
    const completed = clips.filter((c) => c.completedCount > 0);
    const totalCompleted = completed.reduce((s, c) => s + c.completedCount, 0);
    const totalSR = clips.reduce((s, c) => s + c.srTriggered, 0);
    const totalWtS = clips.reduce((s, c) => s + c.wtsCount, 0);

    // Exclude resource-day / no-marker clips from avg (no real engagement score)
    const engScores = completed
      .filter((c) => c.avgFocus !== null)
      .map((c) => c.avgFirstPass)
      .filter((v): v is number => v !== null);
    const avgEng = engScores.length
      ? Math.round(engScores.reduce((s, v) => s + v, 0) / engScores.length)
      : null;

    const mostSR = clips.reduce(
      (best, c) => (c.srTriggered > (best?.srTriggered ?? 0) ? c : best),
      null as ClipStat | null
    );
    // Exclude clips with no real engagement score (resource days / no markers)
    // — only consider clips that have focus data (means EndSession scored them)
    const scoredClips = completed.filter((c) => c.avgFocus !== null);
    const bestClip = scoredClips.reduce(
      (best, c) =>
        (c.avgFirstPass ?? 0) > (best?.avgFirstPass ?? 0) ? c : best,
      null as ClipStat | null
    );
    const worstClip = scoredClips.reduce(
      (worst, c) =>
        (c.avgFirstPass ?? 999) < (worst?.avgFirstPass ?? 999) ? c : worst,
      null as ClipStat | null
    );

    return { totalCompleted, avgEng, totalSR, totalWtS, mostSR, bestClip, worstClip };
  }, [clips]);

  const tiles = [
    {
      label: "Total Completions",
      value: stats.totalCompleted.toLocaleString(),
      emoji: "✅",
      color: "bg-green-50 border-green-200 text-green-800",
    },
    {
      label: "Avg Engagement",
      value: stats.avgEng !== null ? `${stats.avgEng}%` : "—",
      subtitle: "First-pass only (excl. S&R/WtS)",
      emoji: "📊",
      color: "bg-blue-50 border-blue-200 text-blue-800",
    },
    {
      label: "S&R Triggered",
      value: stats.totalSR.toString(),
      subtitle: stats.totalCompleted > 0
        ? `${Math.round((stats.totalSR / stats.totalCompleted) * 100)}% of ${stats.totalCompleted} completions`
        : undefined,
      emoji: "🔍",
      color: "bg-amber-50 border-amber-200 text-amber-800",
    },
    {
      label: "WtS Triggered",
      value: stats.totalWtS.toString(),
      subtitle: stats.totalCompleted > 0
        ? `${Math.round((stats.totalWtS / stats.totalCompleted) * 100)}% of ${stats.totalCompleted} completions`
        : undefined,
      emoji: "⚠️",
      color: "bg-red-50 border-red-200 text-red-800",
    },
    {
      label: "Highest Engagement",
      value: stats.bestClip?.avgFirstPass
        ? `${Math.round(stats.bestClip.avgFirstPass)}%`
        : "—",
      subtitle: stats.bestClip
        ? stats.bestClip.title.slice(0, 25) + "…"
        : undefined,
      emoji: "🏆",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    },
    {
      label: "Lowest Engagement",
      value: stats.worstClip?.avgFirstPass
        ? `${Math.round(stats.worstClip.avgFirstPass)}%`
        : "—",
      subtitle: stats.worstClip
        ? stats.worstClip.title.slice(0, 25) + "…"
        : undefined,
      emoji: "📉",
      color: "bg-rose-50 border-rose-200 text-rose-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={`rounded-xl border px-3 py-3 ${t.color}`}
        >
          <div className="text-xs font-medium opacity-70 mb-1">
            {t.emoji} {t.label}
          </div>
          <div className="text-2xl font-bold">{t.value}</div>
          {t.subtitle && (
            <div className="text-[10px] opacity-60 mt-0.5 truncate">
              {t.subtitle}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
