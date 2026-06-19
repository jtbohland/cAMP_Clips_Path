import { useState, useMemo, useCallback } from "react";
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
  search_and_rescue_hero: { name: "Search & Rescue Hero", emoji: "🚁" },
  storm_chaser: { name: "Storm Chaser", emoji: "⛈️" },
  no_detours: { name: "No Detours", emoji: "🧭" },
  leave_no_trace: { name: "Leave No Trace", emoji: "🌱" },
  first_step: { name: "First Step", emoji: "🎬" },
  halfway: { name: "Halfway Up", emoji: "🏔️" },
  week_4_entry: { name: "Into the Summit Push", emoji: "🪢" },
  summit: { name: "Summit Reached", emoji: "🏔️✨" },
  mystery: { name: "The Ranger's Secret", emoji: "🌲" },
  double_summit: { name: "Double Summit", emoji: "⛰️" },
  on_the_trail: { name: "On the Trail", emoji: "🗓️" },
  the_ascent: { name: "The Ascent", emoji: "🧗" },
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
function Section({ title, emoji, defaultOpen = true, children }: {
  title: string;
  emoji: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        style={{ backgroundColor: open ? "#ffffff" : "#ffffff" }}
      >
        <span className="text-lg">{emoji}</span>
        <span className="font-semibold text-sm text-gray-900 flex-1">{title}</span>
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
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ffffff" }}>
        <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />
        <div className="p-6 max-w-5xl mx-auto space-y-4 w-full">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ffffff" }}>
        <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />
        <div className="p-6 text-center">
          <p className="text-red-600">Failed to load analytics: {error?.message ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const { overview, learners, clipBreakdown, questions, xpSummary, leaderboard } = data ?? {};

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ffffff" }}>
      <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />

      {fetching && !loading && <div className="text-xs text-gray-500 px-6 pt-3">Updating…</div>}

      <div className={`p-6 max-w-5xl mx-auto w-full space-y-4 ${fetching && !loading ? "opacity-70" : ""}`}>

        {/* 1. Overview */}
        <Section title="Overview" emoji="📈" defaultOpen>
          <OverviewSection overview={overview} />
        </Section>

        {/* 2. Learner Table */}
        <Section title="Learners" emoji="🧑‍🎓" defaultOpen>
          <LearnersSection learners={learners ?? []} />
        </Section>

        {/* 3. Clip Breakdown */}
        <Section title="Clip Performance" emoji="🎬" defaultOpen>
          <ClipBreakdownSection clips={clipBreakdown ?? []} />
        </Section>

        {/* 4. Trail Marker Questions */}
        <Section title="Trail Markers" emoji="🪧" defaultOpen={false}>
          <QuestionsSection questions={questions ?? []} />
        </Section>

        {/* 5. XP & Badges */}
        <Section title="XP & Badges" emoji="✨" defaultOpen={false}>
          <XpBadgesSection xpSummary={xpSummary} />
        </Section>

        {/* 6. Leaderboard */}
        <Section title="XP Leaderboard" emoji="🏆" defaultOpen={false}>
          <LeaderboardSection leaderboard={leaderboard ?? []} />
        </Section>
      </div>
    </div>
  );
}

// --- Section components ---

function OverviewSection({ overview }: { overview: any }) {
  if (!overview) return <p className="text-sm text-gray-500 py-4">No data</p>;
  const stats = [
    { label: "Live Clips", value: overview.totalClips, icon: "🎬" },
    { label: "Total Sessions", value: overview.totalSessions, icon: "▶️" },
    { label: "Unique Learners", value: overview.uniqueViewers, icon: "🧑‍🎓" },
    { label: "Avg Engagement", value: overview.avgEngagement != null ? `${overview.avgEngagement}%` : "—", icon: "📊" },
    { label: "Completion Rate", value: overview.completionRate != null ? `${overview.completionRate}%` : "—", icon: "✅" },
  ];
  return (
    <div className="grid grid-cols-5 gap-3 pt-4">
      {stats.map(s => (
        <div key={s.label} className="text-center p-3 rounded-lg border border-gray-100" style={{ backgroundColor: "#fafafa" }}>
          <div className="text-lg mb-1">{s.icon}</div>
          <div className="text-xl font-bold text-gray-900">{s.value}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function LearnersSection({ learners }: { learners: any[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    if (!search) return learners;
    const q = search.toLowerCase();
    return learners.filter(l =>
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
          placeholder="Search learners…"
          value={search}
          onChange={handleSearch}
        />
        <span className="text-xs text-gray-500">{filtered.length} learners</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_60px_60px_70px_80px] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3">
        <span>Name / Email</span>
        <span className="text-center">Role</span>
        <span className="text-center">Clips</span>
        <span className="text-center">Avg %</span>
        <span className="text-center">XP</span>
        <span className="text-center">Pacing</span>
      </div>

      <div className="space-y-1">
        {pageData.map(l => {
          const pacing = PACING_LABEL[l.pacingStatus] ?? PACING_LABEL.not_started;
          return (
            <div key={l.viewerId} className="grid grid-cols-[1fr_80px_60px_60px_70px_80px] gap-2 items-center px-3 py-2 rounded-md border border-gray-100" style={{ backgroundColor: "#ffffff" }}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{l.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{l.email}</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-[10px]">{l.role}</Badge>
              </div>
              <div className="text-center text-sm font-medium text-gray-900">{l.clipsCompleted}</div>
              <div className="text-center text-sm font-medium text-gray-900">{l.avgScore != null ? `${l.avgScore}%` : "—"}</div>
              <div className="text-center text-sm font-bold text-[#4F46E5]">{l.totalXp}</div>
              <div className={`text-center text-[11px] font-semibold ${pacing.color}`}>{pacing.label}</div>
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
        <p className="text-sm text-gray-500 text-center py-6">No learners found</p>
      )}
    </div>
  );
}

function ClipBreakdownSection({ clips }: { clips: any[] }) {
  return (
    <div className="space-y-2 pt-4">
      {clips.map(clip => {
        const completionPct = clip.uniqueViewers > 0 ? Math.round((clip.completedCount / clip.uniqueViewers) * 100) : 0;
        return (
          <div key={clip.clipId} className="flex items-center gap-4 p-3 rounded-md border border-gray-100" style={{ backgroundColor: "#ffffff" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-700">{clip.sortOrder}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{clip.title}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                <span>{clip.uniqueViewers} viewers</span>
                <span>{clip.completedCount} completed</span>
                <span>Avg: {clip.avgEngagement != null ? `${clip.avgEngagement}%` : "—"}</span>
                <span>Focus: {clip.avgFocus != null ? `${clip.avgFocus}%` : "—"}</span>
                {clip.srTriggered > 0 && <span className="text-amber-600">🚁 {clip.srTriggered} S&R</span>}
                {clip.wtsHasCard > 0 && <span className="text-blue-600">⛈️ WtS</span>}
              </div>
            </div>
            <div className="w-24 shrink-0">
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
  // Group by clip
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
                <div key={q.questionId} className="flex items-center gap-3 p-2.5 rounded border border-gray-100" style={{ backgroundColor: "#ffffff" }}>
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

function XpBadgesSection({ xpSummary }: { xpSummary: any }) {
  if (!xpSummary) return <p className="text-sm text-gray-500 py-4">No data</p>;
  return (
    <div className="space-y-4 pt-4">
      <div className="flex gap-4">
        <div className="flex-1 text-center p-4 rounded-lg border border-gray-100" style={{ backgroundColor: "#fafafa" }}>
          <div className="text-2xl font-bold text-[#4F46E5]">{xpSummary.totalXpDistributed.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 mt-1">Total XP Distributed</div>
        </div>
        <div className="flex-1 text-center p-4 rounded-lg border border-gray-100" style={{ backgroundColor: "#fafafa" }}>
          <div className="text-2xl font-bold text-[#4F46E5]">{xpSummary.totalBadgesEarned}</div>
          <div className="text-[11px] text-gray-500 mt-1">Total Badges Earned</div>
        </div>
      </div>
      {xpSummary.badgeCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {xpSummary.badgeCounts.map((b: any) => {
            const info = BADGE_MAP[b.badgeId] ?? { name: b.badgeId, emoji: "🎖️" };
            return (
              <span key={b.badgeId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700" style={{ backgroundColor: "#ffffff" }}>
                <span>{info.emoji}</span>
                <span>{info.name}</span>
                <span className="text-[10px] text-gray-400 ml-1">×{b.totalEarned}</span>
              </span>
            );
          })}
        </div>
      )}
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
