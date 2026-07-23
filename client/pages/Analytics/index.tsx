import { useState, useMemo, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";
import PageHeader from "@/components/PageHeader";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import LearnerTileGrid from "@/components/analytics/LearnerTileGrid";
import LearnerDetailView from "@/components/analytics/LearnerDetailView";
import { type LearnerTileData } from "@/components/analytics/LearnerTile";
import ManagerFeedbackSection from "@/components/analytics/ManagerFeedbackSection";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_PILL: Record<string, { bg: string; text: string; border: string }> = {
  "SDR":         { bg: "bg-purple-100",  text: "text-purple-500",  border: "border-purple-200" },
  "Velocity AE": { bg: "bg-purple-50",   text: "text-purple-700",  border: "border-purple-300" },
  "Emerging AE": { bg: "bg-cyan-50",     text: "text-cyan-700",    border: "border-cyan-200" },
  "Majors AE":   { bg: "bg-blue-100",    text: "text-blue-800",    border: "border-blue-300" },
  "Strat AE":    { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  "PSM":         { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200" },
  "Renewals":    { bg: "bg-yellow-50",   text: "text-yellow-700",  border: "border-yellow-300" },
};

function RolePill({ role }: { role: string }) {
  const r = ROLE_PILL[role];
  if (!r) return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-600 whitespace-nowrap">{role}</span>;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${r.bg} border ${r.border} ${r.text} text-[10px] font-medium whitespace-nowrap`}>
      {role}
    </span>
  );
}

const TIMEZONE_PILL: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  NAMER: { emoji: "🌎", label: "NAMER", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  EMEA:  { emoji: "🌍", label: "EMEA",  bg: "bg-red-50",  text: "text-red-700",  border: "border-red-200" },
  AAPJ:  { emoji: "🌏", label: "AAPJ",  bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
};

function TimezonePill({ timezone }: { timezone: string | null }) {
  if (!timezone) return null;
  const tz = TIMEZONE_PILL[timezone];
  if (!tz) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${tz.bg} border ${tz.border} ${tz.text} text-[10px] font-medium whitespace-nowrap`}>
      <span>{tz.emoji}</span>
      <span>{tz.label}</span>
    </span>
  );
}

const TIERS = [
  { tier: 1, name: "Base Camper", emoji: "🏕️", xpMin: 0, xpMax: 149 },
  { tier: 2, name: "Trailblazer", emoji: "🥾", xpMin: 150, xpMax: 324 },
  { tier: 3, name: "Summit Seeker", emoji: "🧗🏼", xpMin: 325, xpMax: 499 },
  { tier: 4, name: "Pinnacle Achiever", emoji: "⛰️", xpMin: 500, xpMax: 699 },
  { tier: 5, name: "Alpinist All-Star", emoji: "💫", xpMin: 700, xpMax: null },
];

function getTier(xp: number) {
  return TIERS.reduce((acc, t) => (xp >= t.xpMin ? t : acc), TIERS[0]);
}

// ─── Page entry ──────────────────────────────────────────────────────────────

type MainTab = "dashboard" | "clips";

export default function AnalyticsPage() {
  return (
    <PasswordGate>
      <AnalyticsContent />
    </PasswordGate>
  );
}

// ─── Collapsible section ─────────────────────────────────────────────────────
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

// ─── Main content ────────────────────────────────────────────────────────────

function AnalyticsContent() {
  const { data, loading, fetching, isError, error } = useApiData("GetAnalyticsV3", {});
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");

  const handleLearnerClick = useCallback((viewerId: string) => {
    setSelectedLearnerId(viewerId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedLearnerId(null);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />
        <div className="p-6 max-w-7xl mx-auto space-y-4 w-full">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />
        <div className="p-6 text-center">
          <p className="text-red-600">Failed to load analytics: {(error as any)?.message ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const { overview, learners, clipBreakdown, questions, leaderboard } = data ?? {};

  // ─── Learner detail takeover ─────────────────────────────────────
  if (selectedLearnerId) {
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="📊" title="Analytics" subtitle="Learner Detail" />
        <div className="p-6 max-w-7xl mx-auto w-full">
          <LearnerDetailView viewerId={selectedLearnerId} onBack={handleBack} />
        </div>
      </div>
    );
  }

  // ─── Transform learners → tile data ──────────────────────────────
  const tileData: LearnerTileData[] = useMemo(
    () =>
      (learners ?? []).map((l: any) => ({
        viewerId: l.viewerId,
        name: l.name,
        email: l.email,
        role: l.role,
        timezone: l.timezone,
        managerName: l.managerName,
        ascentDay1: l.ascentDay1,
        clipsCompleted: l.clipsCompleted,
        totalXp: l.totalXp,
        pacingStatus: l.pacingStatus,
        summitDay: l.summitDay,
        isAnchorFailure: l.isAnchorFailure,
        lastLogin: l.lastLogin,
        approachComplete: l.approachComplete,
        approachCompletedCount: l.approachCompletedCount ?? 0,
        tier: l.tier ?? getTier(l.totalXp),
        badges: l.badges ?? [],
        gearClicks: l.gearClicks ?? 0,
        wtsCount: l.wtsCount ?? 0,
        srCount: l.srCount ?? 0,
        clipScoreAvg: l.clipScoreAvg,
      })),
    [learners]
  );

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
      <PageHeader emoji="📊" title="Analytics" subtitle="Performance data across all learners and clips" />

      {fetching && !loading && <div className="text-xs text-gray-600 px-6 pt-3">Updating…</div>}

      {/* ─── Main / Clips tab switcher ─── */}
      <div className="px-6 max-w-7xl mx-auto w-full">
        <div className="flex gap-1 border-b border-gray-300 mt-2">
          <button
            onClick={() => setMainTab("dashboard")}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              mainTab === "dashboard"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setMainTab("clips")}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              mainTab === "clips"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🎬 Clip Analytics
          </button>
        </div>
      </div>

      <div className={`p-6 max-w-7xl mx-auto w-full space-y-4 ${fetching && !loading ? "opacity-70" : ""}`}>

        {mainTab === "dashboard" ? (
          <>
            {/* 1. Overview */}
            <Section title="Overview" emoji="📈" defaultOpen>
              <OverviewSection overview={overview} />
            </Section>

            {/* 2. cAMPers Tile Grid */}
            <Section title="cAMPers" subtitle="Click a tile to see full learner snapshot" emoji="🏕️" defaultOpen>
              <div className="pt-4">
                <LearnerTileGrid
                  learners={tileData}
                  totalClips={overview?.totalClips ?? 0}
                  onLearnerClick={handleLearnerClick}
                />
              </div>
            </Section>

            {/* 3. XP Leaderboard */}
            <Section title="XP Leaderboard" emoji="🏆" defaultOpen>
              <LeaderboardSection leaderboard={leaderboard ?? []} />
            </Section>

            {/* 4. Sherpa Surveys */}
            <Section title="Sherpa Surveys" subtitle="Manager feedback & survey responses" emoji="🚩" defaultOpen={false}>
              <ManagerFeedbackSection />
            </Section>
          </>
        ) : (
          <>
            {/* Clip Analytics tab */}
            <Section title="Clip Performance" emoji="🎬" defaultOpen>
              <ClipBreakdownSection clips={clipBreakdown ?? []} />
            </Section>

            <Section title="Trail Markers" emoji="🪧" defaultOpen>
              <QuestionsSection questions={questions ?? []} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewSection({ overview }: { overview: any }) {
  if (!overview) return <p className="text-sm text-gray-500 py-4">No data</p>;
  const topRow = [
    { label: "Live Clips", desc: "Clips published in Ascent", value: overview.totalClips, icon: "🎬" },
    { label: "Total Sessions", desc: "All sessions started (incl. in-progress)", value: overview.totalSessions, icon: "▶️" },
    { label: "Unique Learners", desc: "Learners who've started Ascent", value: overview.uniqueViewers, icon: "🧑‍🎓" },
    { label: "Avg Engagement", desc: "Mean engagement across completed clips", value: overview.avgEngagement != null ? `${overview.avgEngagement}%` : "—", icon: "📊" },
  ];
  const bottomRow = [
    { label: "Completion Rate", desc: "% of started sessions that are completed", value: overview.completionRate != null ? `${overview.completionRate}%` : "—", icon: "✅" },
    { label: "cAMP Gear", desc: "Total clicks on pitches, PODcasts & resources", value: overview.totalGearClicks ?? 0, icon: "🎒" },
  ];

  const onTime = overview.onTimeFinishers ?? 0;
  const anchor = overview.anchorFailureCount ?? 0;

  return (
    <div className="space-y-3 pt-4">
      <div className="grid grid-cols-4 gap-3">
        {topRow.map(s => (
          <div key={s.label} className="text-center p-3 rounded-lg border border-gray-100 bg-[#fafafa]">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {bottomRow.map(s => (
          <div key={s.label} className="text-center p-3 rounded-lg border border-gray-100 bg-[#fafafa]">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
            <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{s.desc}</div>
          </div>
        ))}
        <div className="text-center p-3 rounded-lg border border-gray-100 bg-[#fafafa]">
          <div className="text-lg mb-1">🏁</div>
          <div className="flex items-center justify-center gap-3">
            <div>
              <div className="text-xl font-bold text-green-600">{onTime}</div>
              <div className="text-[10px] text-gray-500">On Time</div>
            </div>
            <div className="text-gray-300 text-lg font-light">|</div>
            <div>
              <div className="text-xl font-bold text-red-600">{anchor}</div>
              <div className="text-[10px] text-gray-500">Anchor Failure</div>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Pacing</div>
          <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">Finished on time vs triggered Anchor Failure</div>
        </div>
      </div>
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function LeaderboardSection({ leaderboard }: { leaderboard: any[] }) {
  return (
    <div className="space-y-1 pt-4">
      <div className="grid grid-cols-[40px_1fr_80px_70px_60px_60px_60px] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3">
        <span className="text-center">#</span>
        <span>Name</span>
        <span className="text-center">Role</span>
        <span className="text-center">Timezone</span>
        <span className="text-center">XP</span>
        <span className="text-center">Clips</span>
        <span className="text-center">Badges</span>
      </div>

      {leaderboard.map((l: any) => {
        const isTop3 = l.rank <= 3;
        const medalEmoji = l.rank === 1 ? "🥇" : l.rank === 2 ? "🥈" : l.rank === 3 ? "🥉" : "";
        return (
          <div key={l.viewerId} className={`grid grid-cols-[40px_1fr_80px_70px_60px_60px_60px] gap-2 items-center px-3 py-2 rounded-md border ${isTop3 ? "border-[#4F46E5]/20" : "border-gray-100"}`} style={{ backgroundColor: isTop3 ? "#f5f3ff" : "#ffffff" }}>
            <div className="text-center text-sm font-bold text-gray-700">{medalEmoji || l.rank}</div>
            <div className="text-sm font-medium text-gray-900 truncate">{l.name}</div>
            <div className="text-center"><RolePill role={l.role} /></div>
            <div className="text-center"><TimezonePill timezone={l.timezone} /></div>
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

// ─── Clip Performance ────────────────────────────────────────────────────────

function ClipBreakdownSection({ clips }: { clips: any[] }) {
  return (
    <div className="space-y-2 pt-4">
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

      {clips.map((clip: any) => {
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
            <div className="text-center text-sm font-medium text-gray-900">{clip.avgFirstPass != null ? `${clip.avgFirstPass}%` : "—"}</div>
            <div className="text-center text-sm font-medium text-gray-900">{clip.avgRecovery != null ? `${clip.avgRecovery}%` : "—"}</div>
            <div className="text-center text-sm font-medium text-gray-900">{clip.avgFocus != null ? `${clip.avgFocus}%` : "—"}</div>
            <div className="text-center text-sm font-medium">{clip.srTriggered > 0 ? <span className="text-amber-600 font-semibold">{clip.srTriggered}</span> : <span className="text-gray-400">0</span>}</div>
            <div className="text-center text-sm font-medium">{clip.wtsCount > 0 ? <span className="text-red-500 font-semibold">{clip.wtsCount}</span> : <span className="text-gray-400">0</span>}</div>
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

// ─── Trail Markers ───────────────────────────────────────────────────────────

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
            {group.items.map((q: any) => {
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
