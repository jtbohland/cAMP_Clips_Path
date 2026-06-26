import { useState, useMemo, useCallback, memo } from "react";
import PasswordGate from "@/components/PasswordGate";
import PageHeader from "@/components/PageHeader";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Badge ID → display info */
const BADGE_MAP: Record<string, { name: string; emoji: string }> = {
  perfect_hiker: { name: "Perfect Hiker", emoji: "🌲" },
  speed_hiker: { name: "Speed Hiker", emoji: "🥾" },
  search_and_rescue_hero: { name: "S&R Hero", emoji: "🚁" },
  storm_chaser: { name: "Storm Chaser", emoji: "⛈️" },
  no_detours: { name: "No Detours", emoji: "🧭" },
  leave_no_trace: { name: "Leave No Trace", emoji: "🌱" },
  first_step: { name: "First Step", emoji: "🎬" },
  halfway: { name: "Halfway Up", emoji: "🏔️" },
  week_4_entry: { name: "Summit Push", emoji: "🪢" },
  summit: { name: "Summit Reached", emoji: "🏔️✨" },
  mystery: { name: "Ranger's Secret", emoji: "🌲" },
  double_summit: { name: "Double Summit", emoji: "⛰️" },
  on_the_trail: { name: "On the Trail", emoji: "🗓️" },
  the_ascent: { name: "The Ascent", emoji: "🧗" },
  podcast_cast: { name: "The Full Cast", emoji: "🎣" },
};

const PACING_LABEL: Record<string, { label: string; color: string }> = {
  on_track: { label: "On Track", color: "text-green-600" },
  behind: { label: "Behind", color: "text-amber-600" },
  completed: { label: "Completed", color: "text-[#4F46E5]" },
  not_started: { label: "Not Started", color: "text-gray-400" },
};

export default function AnalyticsPage() {
  return (
    <PasswordGate>
      <AnalyticsContent />
    </PasswordGate>
  );
}

// --- Collapsible section wrapper ---
function Section({ title, subtitle, emoji, defaultOpen = true, children }: {
  title: string;
  subtitle?: string;
  emoji: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors bg-white"
      >
        <span className="text-lg">{emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-gray-900">{title}</span>
          {subtitle && <span className="text-[11px] text-gray-500 ml-2">{subtitle}</span>}
        </div>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function AnalyticsContent() {
  const { data, loading, fetching, isError, error } = useApiData("GetAnalyticsV3", {});

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />
        <div className="p-6 max-w-6xl mx-auto space-y-4 w-full">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />
        <div className="p-6 text-center">
          <p className="text-red-600">Failed to load analytics: {error?.message ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const { overview, learners, clipBreakdown, questions, leaderboard } = data ?? {};

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
      <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />

      {fetching && !loading && <div className="text-xs text-gray-600 px-6 pt-3">Updating…</div>}

      <div className={`p-6 max-w-6xl mx-auto w-full space-y-4 ${fetching && !loading ? "opacity-70" : ""}`}>

        {/* 1. Overview */}
        <Section title="Overview" emoji="📈" defaultOpen>
          <OverviewSection overview={overview} />
        </Section>

        {/* 2. cAMPers Table */}
        <Section
          title="cAMPers"
          subtitle="Manager view — track each new hire's progress through Ascent"
          emoji="🏕️"
          defaultOpen
        >
          <CampersSection learners={learners ?? []} totalClips={overview?.totalClips ?? 0} />
        </Section>

        {/* 3. XP Leaderboard */}
        <Section title="XP Leaderboard" emoji="🏆" defaultOpen>
          <LeaderboardSection leaderboard={leaderboard ?? []} />
        </Section>

        {/* 4. Clip Performance */}
        <Section title="Clip Performance" emoji="🎬" defaultOpen>
          <ClipBreakdownSection clips={clipBreakdown ?? []} />
        </Section>

        {/* 5. Trail Markers (collapsed by default) */}
        <Section title="Trail Markers" emoji="🪧" defaultOpen={false}>
          <QuestionsSection questions={questions ?? []} />
        </Section>

        {/* 6. cAMP Gear Clicks (collapsed by default) */}
        <Section title="cAMP Gear Clicks" subtitle="Elevator pitches · cAMP Gear resources · Wheel & Deal" emoji="🎒" defaultOpen={false}>
          <PitchClicksSection />
        </Section>
      </div>
    </div>
  );
}

// --- Section components ---

function OverviewSection({ overview }: { overview: any }) {
  if (!overview) return <p className="text-sm text-gray-500 py-4">No data</p>;
  const stats = [
    { label: "Live Clips", desc: "Clips published in Ascent", value: overview.totalClips, icon: "🎬" },
    { label: "Total Sessions", desc: "All sessions started (incl. in-progress)", value: overview.totalSessions, icon: "▶️" },
    { label: "Unique Learners", desc: "Learners who've started Ascent", value: overview.uniqueViewers, icon: "🧑‍🎓" },
    { label: "Avg Engagement", desc: "Mean engagement across completed clips", value: overview.avgEngagement != null ? `${overview.avgEngagement}%` : "—", icon: "📊" },
    { label: "Completion Rate", desc: "% of started sessions that are completed", value: overview.completionRate != null ? `${overview.completionRate}%` : "—", icon: "✅" },
    { label: "cAMP Gear", desc: "Total clicks on pitches, PODcasts & resources", value: overview.totalGearClicks ?? 0, icon: "🎒" },
  ];
  return (
    <div className="grid grid-cols-6 gap-3 pt-4">
      {stats.map(s => (
        <div key={s.label} className="text-center p-3 rounded-lg border border-gray-100 bg-[#fafafa]">
          <div className="text-lg mb-1">{s.icon}</div>
          <div className="text-xl font-bold text-gray-900">{s.value}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
          <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{s.desc}</div>
        </div>
      ))}
    </div>
  );
}

function CampersSection({ learners, totalClips }: { learners: any[]; totalClips: number }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    if (!search) return learners;
    const q = search.toLowerCase();
    return learners.filter((l: any) =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.role.toLowerCase().includes(q)
    );
  }, [learners, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  }, []);

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center gap-3">
        <input
          className="flex h-9 w-64 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900"
          placeholder="Search cAMPers…"
          value={search}
          onChange={handleSearch}
        />
        <span className="text-xs text-gray-500">{filtered.length} cAMPers</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1.4fr_70px_70px_70px_80px_60px_60px_90px_80px_1fr] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3">
        <span>cAMPer</span>
        <span className="text-center">XP Earned</span>
        <span className="text-center">Clip Score</span>
        <span className="text-center">1st Attempt</span>
        <span className="text-center">Recovery Score</span>
        <span className="text-center">⛈️ Storms</span>
        <span className="text-center">🎒 Gear</span>
        <span className="text-center">Progress</span>
        <span className="text-center">On Track?</span>
        <span>Merit Badges</span>
      </div>

      <div className="space-y-1">
        {pageData.map((l: any) => {
          const pacing = PACING_LABEL[l.pacingStatus] ?? PACING_LABEL.not_started;
          const progressPct = totalClips > 0 ? Math.round((l.clipsCompleted / totalClips) * 100) : 0;

          return (
            <div key={l.viewerId} className="grid grid-cols-[1.4fr_70px_70px_70px_80px_60px_60px_90px_80px_1fr] gap-2 items-center px-3 py-2.5 rounded-md border border-gray-100 bg-white">
              {/* cAMPer name + tier */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{l.name}</p>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-600 whitespace-nowrap shrink-0">
                    <span>{l.tier.emoji}</span>
                    <span>{l.tier.name}</span>
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">{l.email}</p>
                {l.managerName && l.managerName !== "n/a" && (
                  <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
                    <span>💼</span>
                    <span>{l.managerName}</span>
                  </span>
                )}
              </div>

              {/* XP Earned */}
              <div className="text-center text-sm font-bold text-[#4F46E5]">{l.totalXp}</div>

              {/* Clip Score (final engagement avg across all completed) */}
              <div className="text-center text-sm font-medium text-gray-900">
                {l.clipScoreAvg != null ? `${l.clipScoreAvg}%` : "—"}
              </div>

              {/* 1st Attempt (initial engagement before S&R improvement) */}
              <div className="text-center text-sm font-medium text-gray-900">
                {l.firstAttemptAvg != null ? `${l.firstAttemptAvg}%` : "—"}
              </div>

              {/* Recovery Score */}
              <div className="text-center text-sm font-medium text-gray-900">
                {l.recoveryAvg != null ? `${l.recoveryAvg}%` : "—"}
              </div>

              {/* Storms */}
              <div className="text-center text-sm font-medium text-gray-900">
                {l.wtsCount > 0 ? (
                  <span className="text-amber-600 font-semibold">{l.wtsCount}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </div>

              {/* Gear Clicks */}
              <div className="text-center text-sm font-medium text-gray-900">
                {l.gearClicks > 0 ? (
                  <span className="text-indigo-600 font-semibold">{l.gearClicks}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </div>

              {/* Progress */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-medium text-gray-700">{l.clipsCompleted} / {totalClips}</span>
                <Progress value={progressPct} className="h-1.5 w-full" />
              </div>

              {/* Pacing */}
              <div className={`text-center text-[11px] font-semibold ${pacing.color}`}>{pacing.label}</div>

              {/* Merit Badges — consolidated with ×N for duplicates */}
              <div className="flex flex-wrap gap-1 min-w-0">
                {l.badges.length > 0 ? (() => {
                  const counts: Record<string, number> = {};
                  l.badges.forEach((b: any) => { counts[b.badgeId] = (counts[b.badgeId] || 0) + 1; });
                  return Object.entries(counts).map(([badgeId, count]) => {
                    const info = BADGE_MAP[badgeId] ?? { name: badgeId, emoji: "🎖️" };
                    return (
                      <span
                        key={badgeId}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-medium text-indigo-700 whitespace-nowrap"
                        title={count > 1 ? `${info.name} ×${count}` : info.name}
                      >
                        <span>{info.emoji}</span>
                        <span>{info.name}{count > 1 && <span className="ml-0.5 text-[9px] font-bold text-amber-600">×{count}</span>}</span>
                      </span>
                    );
                  });
                })() : (
                  <span className="text-[10px] text-gray-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">No cAMPers found</p>
      )}
    </div>
  );
}

function ClipBreakdownSection({ clips }: { clips: any[] }) {
  return (
    <div className="space-y-2 pt-4">
      {/* Column header */}
      <div className="grid grid-cols-[32px_1fr_80px_80px_60px_60px_60px_100px] gap-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3">
        <span>#</span>
        <span>Clip Title</span>
        <span className="text-center">1st Pass Avg</span>
        <span className="text-center">Recovery Avg</span>
        <span className="text-center">Focus</span>
        <span className="text-center">🚁 S&R</span>
        <span className="text-center">⛈️ WtS</span>
        <span className="text-center">Completion</span>
      </div>

      {clips.map(clip => {
        const completionPct = clip.uniqueViewers > 0 ? Math.round((clip.completedCount / clip.uniqueViewers) * 100) : 0;
        return (
          <div key={clip.clipId} className="grid grid-cols-[32px_1fr_80px_80px_60px_60px_60px_100px] gap-3 items-center p-3 rounded-md border border-gray-100 bg-white">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-700">{clip.sortOrder}</div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{clip.title}</p>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                <span>{clip.uniqueViewers} viewers</span>
                <span>{clip.completedCount} completed</span>
              </div>
            </div>
            <div className="text-center text-sm font-medium text-gray-900">
              {clip.avgFirstPass != null ? `${clip.avgFirstPass}%` : "—"}
            </div>
            <div className="text-center text-sm font-medium text-gray-900">
              {clip.avgRecovery != null ? `${clip.avgRecovery}%` : "—"}
            </div>
            <div className="text-center text-sm font-medium text-gray-900">
              {clip.avgFocus != null ? `${clip.avgFocus}%` : "—"}
            </div>
            <div className="text-center text-sm font-medium">
              {clip.srTriggered > 0 ? (
                <span className="text-amber-600 font-semibold">{clip.srTriggered}</span>
              ) : (
                <span className="text-gray-400">0</span>
              )}
            </div>
            <div className="text-center text-sm font-medium">
              {clip.wtsCount > 0 ? (
                <span className="text-red-500 font-semibold">{clip.wtsCount}</span>
              ) : (
                <span className="text-gray-400">0</span>
              )}
            </div>
            <div className="px-1">
              <Progress value={completionPct} className="h-2" />
              <p className="text-[10px] text-gray-500 text-center mt-0.5">{completionPct}% pass</p>
            </div>
          </div>
        );
      })}
      {clips.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No clip data</p>}
    </div>
  );
}

function QuestionsSection({ questions }: { questions: any[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { clipTitle: string; clipSortOrder: number; items: typeof questions }>();
    for (const q of questions) {
      if (!map.has(q.clipId)) {
        map.set(q.clipId, { clipTitle: q.clipTitle, clipSortOrder: q.clipSortOrder, items: [] });
      }
      map.get(q.clipId)!.items.push(q);
    }
    return Array.from(map.values()).sort((a, b) => a.clipSortOrder - b.clipSortOrder);
  }, [questions]);

  return (
    <div className="space-y-4 pt-4">
      {grouped.map(group => (
        <div key={group.clipSortOrder}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Clip {group.clipSortOrder}: {group.clipTitle}
          </h4>
          <div className="space-y-1.5">
            {group.items.map(q => {
              const pct = q.totalAnswers > 0 ? Math.round((q.correctCount / q.totalAnswers) * 100) : 0;
              return (
                <div key={q.questionId} className="flex items-center gap-3 p-2.5 rounded border border-gray-100 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{q.questionText}</p>
                    <div className="flex gap-3 mt-1 text-[11px] text-gray-500">
                      <span className="text-green-600">✓ {q.correctCount}</span>
                      <span className="text-red-500">✗ {q.incorrectCount}</span>
                      <span>{q.totalAnswers} answers</span>
                    </div>
                  </div>
                  <div className="w-16 shrink-0">
                    <Progress value={pct} className="h-2" />
                    <p className="text-[10px] text-gray-500 text-center mt-0.5">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {questions.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No questions data</p>}
    </div>
  );
}

function LeaderboardSection({ leaderboard }: { leaderboard: any[] }) {
  return (
    <div className="space-y-1 pt-4">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_80px_60px_60px_60px] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3">
        <span className="text-center">#</span>
        <span>Name</span>
        <span className="text-center">Role</span>
        <span className="text-center">XP</span>
        <span className="text-center">Clips</span>
        <span className="text-center">Badges</span>
      </div>

      {leaderboard.map(l => {
        const isTop3 = l.rank <= 3;
        const medalEmoji = l.rank === 1 ? "🥇" : l.rank === 2 ? "🥈" : l.rank === 3 ? "🥉" : "";
        return (
          <div key={l.viewerId} className={`grid grid-cols-[40px_1fr_80px_60px_60px_60px] gap-2 items-center px-3 py-2 rounded-md border ${isTop3 ? "border-[#4F46E5]/20" : "border-gray-100"}`} style={{ backgroundColor: isTop3 ? "#f5f3ff" : "#ffffff" }}>
            <div className="text-center text-sm font-bold text-gray-700">{medalEmoji || l.rank}</div>
            <div className="text-sm font-medium text-gray-900 truncate">{l.name}</div>
            <div className="text-center">
              <Badge variant="outline" className="text-[10px]">{l.role}</Badge>
            </div>
            <div className="text-center text-sm font-bold text-[#4F46E5]">{l.totalXp}</div>
            <div className="text-center text-sm text-gray-700">{l.clipsCompleted}</div>
            <div className="text-center text-sm text-gray-700">{l.badgesEarned}</div>
          </div>
        );
      })}
      {leaderboard.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No leaderboard data</p>}
    </div>
  );
}

// --- 6. Elevator Pitch Clicks ---

const PitchClicksSection = memo(function PitchClicksSection() {
  const { data, loading } = useApiData("GetPitchClicks", {});

  if (loading) {
    return <div className="py-4"><Skeleton className="h-32" /></div>;
  }

  const summary = data?.summary ?? [];
  const clicks = data?.clicks ?? [];

  if (summary.length === 0 && clicks.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-6">No clicks recorded yet</p>;
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {summary.map(s => (
            <div key={s.pitchName} className="text-center p-3 rounded-lg border border-gray-100 bg-[#fafafa]">
              <div className="text-lg mb-1">🎒</div>
              <div className="text-sm font-semibold text-gray-900 truncate">{s.pitchName}</div>
              <div className="text-xl font-bold text-[#4F46E5] mt-1">{s.clickCount}</div>
              <div className="text-[10px] text-gray-500">
                {s.uniqueViewers} unique {s.uniqueViewers === 1 ? "viewer" : "viewers"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent clicks table */}
      {clicks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Clicks</h4>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_140px] gap-2 px-3 py-2 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <div>cAMPer</div>
              <div>Pitch</div>
              <div>When</div>
            </div>
            {clicks.slice(0, 20).map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_140px] gap-2 px-3 py-2 border-b border-gray-50 last:border-0">
                <div className="text-sm text-gray-900 truncate">{c.viewerName}</div>
                <div className="text-sm text-gray-700 truncate">{c.pitchName}</div>
                <div className="text-xs text-gray-500">
                  {new Date(c.clickedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  {new Date(c.clickedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
          {clicks.length > 20 && (
            <p className="text-xs text-gray-400 mt-1 text-center">Showing 20 of {clicks.length} clicks</p>
          )}
        </div>
      )}
    </div>
  );
});
