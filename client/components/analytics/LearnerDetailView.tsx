import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────

const BADGE_MAP: Record<string, { name: string; emoji: string }> = {
  perfect_hiker: { name: "Perfect Hiker", emoji: "🌲" },
  speed_hiker: { name: "Speed Hiker", emoji: "🥾" },
  search_and_rescue_hero: { name: "S&R Hero", emoji: "🚁" },
  storm_chaser: { name: "Storm Chaser", emoji: "⛈️" },
  double_summit: { name: "Double Summit", emoji: "⛰️" },
  swiss_army_knife: { name: "Swiss Army Knife", emoji: "🪓" },
  no_detours: { name: "No Detours", emoji: "🧭" },
  leave_no_trace: { name: "Leave No Trace", emoji: "🌱" },
  ridge_runner: { name: "Ridge Runner", emoji: "🥾" },
  alpine_endurance: { name: "Alpine Endurance", emoji: "🏔️" },
  iron_legs: { name: "Iron Legs", emoji: "🦿" },
  mountain_goat: { name: "Mountain Goat", emoji: "🐐" },
  free_solo: { name: "Free Solo", emoji: "🧗" },
  golden_summit: { name: "Golden Summit", emoji: "🌄" },
  speed_ascent: { name: "Speed Ascent", emoji: "⛷️" },
  second_wind: { name: "Second Wind", emoji: "💨" },
  every_step_counts: { name: "Every Step Counts", emoji: "👣" },
  grip_strength: { name: "Grip Strength", emoji: "💪" },
  first_step: { name: "First Step", emoji: "🎬" },
  peak_lift: { name: "Peak Lift", emoji: "🚡" },
  halfway: { name: "Halfway Up", emoji: "🏔️" },
  week_4_entry: { name: "Summit Push", emoji: "🪢" },
  mystery: { name: "Ranger's Secret", emoji: "🌲" },
  podcast_cast: { name: "The Full Cast", emoji: "🎣" },
  approach_complete: { name: "The Approach", emoji: "🚡" },
  on_the_trail: { name: "On the Trail", emoji: "🗓️" },
  the_ascent: { name: "The Ascent", emoji: "🧗" },
  summit: { name: "Summit Reached", emoji: "🏔️✨" },
};

const PACING: Record<string, { label: string; bg: string; text: string }> = {
  summit_bound:      { label: "🧗🏻‍♂️ Summit Bound",   bg: "bg-green-100",  text: "text-green-800" },
  off_the_trail:     { label: "🧭 Off the Trail",   bg: "bg-amber-100",  text: "text-amber-800" },
  lost_in_the_woods: { label: "🌲 Lost in Woods",   bg: "bg-orange-100", text: "text-orange-800" },
  rockslide:         { label: "🪨 Rockslide",        bg: "bg-red-100",    text: "text-red-800" },
  avalanche_warning: { label: "❄️ Avalanche",        bg: "bg-blue-100",   text: "text-blue-900" },
  anchor_failure:    { label: "⛓️‍💥 Anchor Failure", bg: "bg-red-200",    text: "text-red-900" },
  completed:         { label: "🏔️✨ Completed",      bg: "bg-indigo-100", text: "text-indigo-800" },
  not_started:       { label: "Not Started",         bg: "bg-gray-100",   text: "text-gray-600" },
};

const MODULE_LABELS: Record<string, string> = {
  meddpicc: "MEDDPICC",
  challenger: "Challenger",
  camp101: "cAMP 101",
};

const ACADEMY_LABELS: Record<string, string> = {
  analytics: "Analytics Academy",
  experiment: "Experiment Academy",
  session_replay: "Session Replay Academy",
  guides_surveys: "Guides & Surveys Academy",
};

const CHECKIN_LABELS: Record<string, { emoji: string; label: string }> = {
  approach: { emoji: "🚡", label: "Approach" },
  week2: { emoji: "🧗", label: "Week 2" },
  week3: { emoji: "⛰️", label: "Week 3" },
  summit: { emoji: "🏔️", label: "Summit" },
};

type TabKey = "overview" | "approach" | "ascent" | "journals" | "activity";

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: "overview", label: "Overview", emoji: "📊" },
  { key: "approach", label: "Approach", emoji: "🚡" },
  { key: "ascent", label: "Ascent Clips", emoji: "🎬" },
  { key: "journals", label: "Journals", emoji: "📓" },
  { key: "activity", label: "Activity", emoji: "🔔" },
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtShortDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Main component ──────────────────────────────────────────────────────────

interface LearnerDetailViewProps {
  viewerId: string;
  onBack: () => void;
}

function LearnerDetailView({ viewerId, onBack }: LearnerDetailViewProps) {
  const { data, loading, isError, error, fetching } = useApiData("GetLearnerDetail", { viewerId });
  const { run: generateSummary, data: summaryData, loading: summaryLoading, error: summaryError } = useApi("GenerateLearnerSummary");

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [summaryGenerated, setSummaryGenerated] = useState(false);

  // Auto-generate summary when data loads
  useEffect(() => {
    if (!data || summaryGenerated) return;
    setSummaryGenerated(true);

    const d = data;
    const completedClipSessions = d.clips.filter(c => c.completed);
    const avgScore = completedClipSessions.length > 0
      ? Math.round(completedClipSessions.reduce((sum, c) => sum + (c.latestEngagement ?? 0), 0) / completedClipSessions.length * 10) / 10
      : null;

    generateSummary({
      learnerName: d.viewer.name,
      role: d.viewer.role,
      timezone: d.viewer.timezone,
      managerName: d.viewer.managerName,
      ascentDay1: d.viewer.ascentDay1,
      summitDay: d.pacing.summitDay,
      pacingStatus: d.pacing.status,
      daysBehind: d.pacing.daysBehind,
      topicsCompleted: d.pacing.topicsCompleted,
      totalTopics: 15,
      clipsCompleted: d.clipsCompleted,
      totalClips: d.totalLiveClips,
      totalXp: d.xp.total,
      tierName: d.tier.name,
      badgeCount: d.badges.length,
      clipScoreAvg: avgScore,
      firstAttemptAvg: null,
      recoveryAvg: null,
      wtsCount: d.clips.reduce((sum, c) => sum + c.sessions.filter(s => s.attemptNumber >= 3).length, 0),
      srCount: d.clips.reduce((sum, c) => sum + c.sessions.filter(s => s.isRecovery).length, 0),
      gearClicks: d.gearClicks.length,
      approachComplete: d.approach.isComplete,
      approachCompletedCount: d.approach.completedCount,
      journalCount: d.journals.length,
      lastLoginAt: d.viewer.lastLoginAt,
      isAnchorFailure: d.pacing.isAnchorFailure,
      ascentAdjustmentDay: d.pacing.ascentAdjustmentDay,
      extensionDays: d.viewer.extensionDays,
    }).catch(() => {}); // Error is in summaryError
  }, [data, summaryGenerated, generateSummary]);

  const handleCopySummary = useCallback(() => {
    if (summaryData?.summary) {
      navigator.clipboard.writeText(summaryData.summary);
      toast.success("Summary copied to clipboard");
    }
  }, [summaryData]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800 mb-4">← Back to cAMPers</button>
        <p className="text-red-600 text-sm">Failed to load learner: {(error as any)?.message ?? "Unknown error"}</p>
      </div>
    );
  }

  const { viewer, pacing, xp, tier, badges, clips, approach, journals, checkinReflections, gearClicks, modalInteractions, clipsCompleted, totalLiveClips, leaderboardRank } = data;
  const pacingInfo = PACING[pacing.status] ?? PACING.not_started;

  return (
    <div className="space-y-4">
      {fetching && !loading && <div className="text-xs text-gray-500">Updating…</div>}

      {/* ─── Back button + Header ─── */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="mt-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium shrink-0">
          ← Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{viewer.name}</h2>
            <span className="text-lg">{tier.emoji}</span>
            <span className="text-sm font-medium text-gray-500">{tier.name}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${pacingInfo.bg} ${pacingInfo.text}`}>
              {pacingInfo.label}
            </span>
            <span className="text-xs text-gray-400">Rank #{leaderboardRank}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
            <span>{viewer.email}</span>
            <span>•</span>
            <span>{viewer.role}</span>
            {viewer.timezone && <><span>•</span><span>{viewer.timezone}</span></>}
            {viewer.managerName && viewer.managerName !== "n/a" && (
              <><span>•</span><span>Manager: {viewer.managerName}</span></>
            )}
          </div>
        </div>
      </div>

      {/* ─── AI Summary ─── */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">🤖 AI Coaching Snapshot</h3>
          {summaryData?.summary && (
            <button onClick={handleCopySummary} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium">
              📋 Copy
            </button>
          )}
        </div>
        {summaryLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-pulse h-4 bg-indigo-100 rounded w-full" />
          </div>
        ) : summaryError ? (
          <p className="text-sm text-red-600">Failed to generate summary. Try refreshing.</p>
        ) : summaryData?.summary ? (
          <p className="text-sm text-gray-800 leading-relaxed">{summaryData.summary}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Generating summary…</p>
        )}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab content ─── */}
      <div className={fetching && !loading ? "opacity-70" : ""}>
        {activeTab === "overview" && (
          <OverviewTab
            viewer={viewer} pacing={pacing} xp={xp} tier={tier}
            badges={badges} clipsCompleted={clipsCompleted}
            totalLiveClips={totalLiveClips} leaderboardRank={leaderboardRank}
          />
        )}
        {activeTab === "approach" && <ApproachTab approach={approach} />}
        {activeTab === "ascent" && <AscentTab clips={clips} />}
        {activeTab === "journals" && <JournalsTab journals={journals} checkins={checkinReflections} />}
        {activeTab === "activity" && <ActivityTab gearClicks={gearClicks} modals={modalInteractions} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ viewer, pacing, xp, tier, badges, clipsCompleted, totalLiveClips, leaderboardRank }: any) {
  const progressPct = totalLiveClips > 0 ? Math.round((clipsCompleted / totalLiveClips) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon="⭐" label="Total XP" value={xp.total} accent />
        <StatCard icon="🎬" label="Clips Done" value={`${clipsCompleted}/${totalLiveClips}`} />
        <StatCard icon="🏅" label="Badges" value={badges.length} />
        <StatCard icon="🏆" label="Rank" value={`#${leaderboardRank}`} />
        <StatCard icon={tier.emoji} label="Tier" value={tier.name} />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Ascent Progress</span>
          <span className="text-sm font-bold text-indigo-600">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2.5" />
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>Topics: {pacing.topicsCompleted}/15</span>
          {pacing.daysBehind > 0 && <span className="text-red-500 font-semibold">{pacing.daysBehind} day(s) behind</span>}
        </div>
      </div>

      {/* Pacing + Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase">Dates & Pacing</h4>
          <InfoRow label="Member Since" value={fmtDate(viewer.memberSince)} />
          <InfoRow label="Ascent Started" value={fmtDate(viewer.ascentDay1)} />
          <InfoRow label="Summit Day" value={fmtDate(pacing.summitDay)} />
          {pacing.isAnchorFailure && <InfoRow label="Adjustment Day" value={fmtDate(pacing.ascentAdjustmentDay)} alert />}
          {viewer.extensionDays > 0 && <InfoRow label="Extension Days" value={`+${viewer.extensionDays}`} />}
          <InfoRow label="Last Login" value={fmtDate(viewer.lastLoginAt)} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase">XP Breakdown</h4>
          <InfoRow label="Base XP" value={xp.base} />
          <InfoRow label="Milestones" value={xp.milestones} />
          <InfoRow label="Bonuses" value={xp.bonuses} />
          <div className="border-t border-gray-100 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-gray-700">Total</span>
              <span className="text-sm font-bold text-indigo-600">{xp.total} XP</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[10px] text-gray-400 mb-1">Tier Progress ({tier.progressPercent}%)</div>
            <Progress value={tier.progressPercent} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Check-in status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Check-in Emails</h4>
        <div className="flex gap-3">
          {(["approach", "week2", "week3", "summit"] as const).map(key => {
            const label = CHECKIN_LABELS[key] ?? { emoji: "📧", label: key };
            const fieldMap: Record<string, string | null> = {
              approach: viewer.approachCheckinSentAt,
              week2: viewer.week2CheckinSentAt,
              week3: viewer.week3CheckinSentAt,
              summit: null,
            };
            const sent = fieldMap[key];
            return (
              <div key={key} className={`flex-1 text-center rounded-lg border p-3 ${sent ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                <div className="text-lg">{label.emoji}</div>
                <div className="text-[11px] font-semibold text-gray-700 mt-1">{label.label}</div>
                {sent ? (
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">✓ {fmtShortDate(sent)}</div>
                ) : (
                  <div className="text-[10px] text-gray-400 mt-0.5">—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Merit Badges ({badges.length})</h4>
          <div className="flex flex-wrap gap-2">
            {badges.map((b: any, i: number) => {
              const info = BADGE_MAP[b.badgeId] ?? { name: b.badgeId, emoji: "🎖️" };
              return (
                <span
                  key={`${b.badgeId}-${i}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700"
                  title={`Earned ${fmtShortDate(b.earnedAt)}${b.clipTitle ? ` (${b.clipTitle})` : ""}`}
                >
                  {info.emoji} {info.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Approach Tab ────────────────────────────────────────────────────────────

function ApproachTab({ approach }: { approach: any }) {
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);

  const handleImageClick = useCallback((src: string, title: string) => {
    setEnlargedImage({ src, title });
  }, []);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-700">
            🚡 The Approach — {approach.completedCount}/{approach.totalModules} Complete
          </h4>
          {approach.isComplete && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Complete</span>}
        </div>
        <Progress value={(approach.completedCount / approach.totalModules) * 100} className="h-2" />
      </div>

      {/* Module Signoffs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Module Sign-offs</h4>
        {approach.modules.length > 0 ? (
          <div className="space-y-3">
            {approach.modules.map((m: any, i: number) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    ✅ {MODULE_LABELS[m.moduleKey] ?? m.moduleKey}
                  </span>
                  <span className="text-[10px] text-gray-400">{fmtDate(m.completedAt)}</span>
                </div>
                {m.reflectionResponse && (
                  <div className="mt-2 bg-blue-50 rounded px-3 py-2.5 border border-blue-200">
                    {m.reflectionPrompt && (
                      <p className="text-sm font-semibold text-blue-800 mb-2">💬 {m.reflectionPrompt}</p>
                    )}
                    <p className="text-xs text-gray-700 leading-relaxed">{m.reflectionResponse}</p>
                  </div>
                )}
                {m.screenshotData && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1">📎 Screenshot {m.screenshotFilename ? `(${m.screenshotFilename})` : ""}</p>
                    <button
                      onClick={() => handleImageClick(m.screenshotData, MODULE_LABELS[m.moduleKey] ?? m.moduleKey)}
                      className="block rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-indigo-400 transition-shadow cursor-zoom-in"
                    >
                      <img
                        src={m.screenshotData.startsWith("data:") ? m.screenshotData : `data:image/png;base64,${m.screenshotData}`}
                        alt={`${MODULE_LABELS[m.moduleKey] ?? m.moduleKey} screenshot`}
                        className="max-h-32 w-auto object-contain"
                      />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No module sign-offs completed yet.</p>
        )}
      </div>

      {/* Academy Screenshots */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Academy Completions</h4>
        {approach.academyScreenshots.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {approach.academyScreenshots.map((a: any, i: number) => (
              <div key={i} className="rounded border border-gray-100 bg-gray-50 p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🎓</span>
                  <div>
                    <p className="text-xs font-medium text-gray-800">{ACADEMY_LABELS[a.courseKey] ?? a.courseKey}</p>
                    <p className="text-[10px] text-gray-400">{fmtShortDate(a.uploadedAt)}</p>
                  </div>
                </div>
                {a.screenshotData && (
                  <button
                    onClick={() => handleImageClick(a.screenshotData, ACADEMY_LABELS[a.courseKey] ?? a.courseKey)}
                    className="block rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-indigo-400 transition-shadow cursor-zoom-in w-full"
                  >
                    <img
                      src={a.screenshotData.startsWith("data:") ? a.screenshotData : `data:image/png;base64,${a.screenshotData}`}
                      alt={`${ACADEMY_LABELS[a.courseKey] ?? a.courseKey} screenshot`}
                      className="max-h-32 w-full object-contain"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No academy screenshots uploaded yet.</p>
        )}
      </div>

      {/* Wheel & Deal */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Wheel & Deal</h4>
        {approach.wdVerifications.length > 0 ? (
          <div className="space-y-2">
            {approach.wdVerifications.map((w: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded border border-gray-100 bg-gray-50">
                <span className="text-sm">🎡</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-800">{w.product}</p>
                  {w.scenario && <p className="text-[10px] text-gray-500">{w.scenario}</p>}
                </div>
                {w.score != null && <span className="text-sm font-bold text-indigo-600">{w.score}</span>}
                <span className="text-[10px] text-gray-400">{fmtShortDate(w.completedAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No Wheel & Deal verifications yet.</p>
        )}
      </div>

      {/* Enlarged screenshot modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-2 -right-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-600 hover:text-gray-900 text-lg font-bold"
            >
              ×
            </button>
            <div className="bg-white rounded-lg shadow-2xl p-2">
              <p className="text-xs font-semibold text-gray-700 mb-2 px-1">{enlargedImage.title}</p>
              <img
                src={enlargedImage.src.startsWith("data:") ? enlargedImage.src : `data:image/png;base64,${enlargedImage.src}`}
                alt={enlargedImage.title}
                className="max-h-[80vh] max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ascent Tab ──────────────────────────────────────────────────────────────

function AscentTab({ clips }: { clips: any[] }) {
  const [expandedClip, setExpandedClip] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {/* Column header */}
      <div className="grid grid-cols-[32px_1fr_70px_90px_90px_70px_55px] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
        <span>#</span>
        <span>Clip</span>
        <span className="text-center">Status</span>
        <span className="text-center">🪧 Markers</span>
        <span className="text-center">1st Attempt</span>
        <span className="text-center">🚁 S&R</span>
        <span className="text-center">⛈️ WtS</span>
      </div>

      {clips.map(clip => {
        const expanded = expandedClip === clip.clipId;
        return (
          <div key={clip.clipId}>
            <button
              onClick={() => setExpandedClip(expanded ? null : clip.clipId)}
              className={`w-full grid grid-cols-[32px_1fr_70px_90px_90px_70px_55px] gap-2 items-center px-3 py-2.5 rounded-md border text-left transition-colors hover:bg-gray-50 ${
                clip.completed ? "border-gray-100 bg-white" : "border-amber-100 bg-amber-50/30"
              }`}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-700">
                {clip.clipSortOrder}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{clip.clipTitle}</p>
              </div>
              <div className="text-center">
                {clip.completed ? (
                  <span className="text-xs font-bold text-emerald-600">✅</span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
              {/* Trail Markers */}
              <div className="text-center text-xs">
                {clip.trailMarkersTotal > 0 ? (
                  <span className={clip.trailMarkersCorrect === clip.trailMarkersTotal ? "text-emerald-600 font-semibold" : "text-gray-700"}>
                    {clip.trailMarkersCorrect}/{clip.trailMarkersTotal}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              {/* 1st Attempt Engagement */}
              <div className="text-center text-xs font-medium">
                {clip.firstAttemptEngagement != null ? (
                  <span className={clip.firstAttemptEngagement >= 80 ? "text-emerald-600" : clip.firstAttemptEngagement >= 60 ? "text-amber-600" : "text-red-600"}>
                    {clip.firstAttemptEngagement}%
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              {/* S&R */}
              <div className="text-center text-xs">
                {clip.srTriggered ? (
                  <span className="text-amber-600 font-medium">
                    {clip.srScore != null ? `${clip.srScore}%` : "⚠️"}
                  </span>
                ) : clip.completed ? (
                  <span className="text-emerald-500 text-[10px]">✓ None</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              {/* WtS */}
              <div className="text-center text-xs">
                {clip.wtsTriggered ? (
                  <span className="text-red-500 font-semibold">⛈️</span>
                ) : clip.completed ? (
                  <span className="text-emerald-500 text-[10px]">✓</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </button>

            {/* Expanded: session history */}
            {expanded && clip.sessions.length > 0 && (
              <div className="ml-10 mr-3 mt-1 mb-2 space-y-1">
                <div className="grid grid-cols-[60px_1fr_80px_70px_70px_100px] gap-2 text-[9px] font-semibold text-gray-400 uppercase px-2 py-1">
                  <span>Attempt</span>
                  <span>Type</span>
                  <span className="text-center">Engagement</span>
                  <span className="text-center">Questions</span>
                  <span className="text-center">Focus</span>
                  <span>Date</span>
                </div>
                {clip.sessions.map((s: any) => (
                  <div key={s.sessionId} className="grid grid-cols-[60px_1fr_80px_70px_70px_100px] gap-2 items-center px-2 py-1.5 rounded bg-gray-50 border border-gray-100 text-xs">
                    <span className="font-medium text-gray-700">#{s.attemptNumber}</span>
                    <span className={s.isRecovery ? "text-amber-600 font-medium" : "text-gray-600"}>
                      {s.isRecovery ? "🚁 S&R" : "Trail"} {s.completed ? "" : "(incomplete)"}
                    </span>
                    <span className="text-center font-medium">{s.engagementScore != null ? `${s.engagementScore}%` : "—"}</span>
                    <span className="text-center">{s.questionScore != null ? `${s.questionScore}%` : "—"}</span>
                    <span className="text-center">{s.focusScore != null ? `${s.focusScore}%` : "—"}</span>
                    <span className="text-gray-500">{fmtShortDate(s.startedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {clips.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No clip sessions yet.</p>}
    </div>
  );
}

// ─── Journals Tab ────────────────────────────────────────────────────────────

function JournalsTab({ journals, checkins }: { journals: any[]; checkins: any[] }) {
  return (
    <div className="space-y-4">
      {/* Topic Reflections */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">📝 Topic Reflections ({journals.length})</h4>
        {journals.length > 0 ? (
          <div className="space-y-3">
            {journals.map((j: any, i: number) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">{j.topicDay}</span>
                  <span className="text-[10px] text-gray-400">{fmtShortDate(j.submittedAt)}</span>
                </div>
                {j.question1 && j.answer1 && (
                  <div className="bg-blue-50 rounded px-3 py-2 border border-blue-100 mb-2">
                    <p className="text-[10px] text-blue-600 font-medium">{j.question1}</p>
                    <p className="text-xs text-gray-700 mt-1">{j.answer1}</p>
                  </div>
                )}
                {j.question2 && j.answer2 && (
                  <div className="bg-blue-50 rounded px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-medium">{j.question2}</p>
                    <p className="text-xs text-gray-700 mt-1">{j.answer2}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No topic reflections submitted.</p>
        )}
      </div>

      {/* Check-in Reflections */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">💭 Check-in Reflections ({checkins.length})</h4>
        {checkins.length > 0 ? (
          <div className="space-y-2">
            {checkins.map((c: any, i: number) => {
              const label = CHECKIN_LABELS[c.checkinType] ?? { emoji: "📧", label: c.checkinType };
              return (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{label.emoji} {label.label} Check-in</span>
                    <span className="text-[10px] text-gray-400">{fmtShortDate(c.sentAt)}</span>
                  </div>
                  {c.learnerReflection && (
                    <p className="text-xs text-gray-700 mt-2 bg-gray-50 rounded p-2 border border-gray-100">{c.learnerReflection}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No check-in reflections submitted.</p>
        )}
      </div>
    </div>
  );
}

// ─── Activity Tab ────────────────────────────────────────────────────────────

function ActivityTab({ gearClicks, modals }: { gearClicks: any[]; modals: any[] }) {
  // Group gear clicks by pitch
  const gearSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of gearClicks) {
      map.set(g.pitchName, (map.get(g.pitchName) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [gearClicks]);

  // Sort modals by date descending for timeline view
  const sortedModals = useMemo(() =>
    [...modals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [modals]);

  return (
    <div className="space-y-4">
      {/* Gear Clicks */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">🎒 cAMP Gear Clicks ({gearClicks.length})</h4>
        {gearSummary.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {gearSummary.map(g => (
                <div key={g.name} className="text-center p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="text-lg font-bold text-indigo-600">{g.count}</div>
                  <div className="text-[10px] text-gray-500 truncate">{g.name}</div>
                </div>
              ))}
            </div>
            {/* Recent clicks */}
            <div className="mt-3">
              <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Recent</p>
              {gearClicks.slice(0, 8).map((g: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1 text-xs text-gray-600 border-b border-gray-50 last:border-0">
                  <span>{g.pitchName}</span>
                  <span className="text-[10px] text-gray-400">{fmtShortDate(g.clickedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No gear clicks recorded.</p>
        )}
      </div>

      {/* Modal Interactions — Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">🔔 Modal Movements ({modals.length})</h4>
        {sortedModals.length > 0 ? (
          <div className="space-y-1.5">
            {sortedModals.map((m: any, i: number) => {
              const meta = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata;
              const tierLabel = meta?.tier ? `: ${meta.tier.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}` : "";
              const sourceLabel = meta?.source ? ` (${meta.source.replace(/_/g, " ")})` : "";
              const isShown = m.action === "shown";
              const isDismissed = m.action === "dismissed";
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded border border-gray-100 bg-gray-50">
                  <span className={`text-sm ${isDismissed ? "opacity-60" : ""}`}>
                    {isShown ? "📬" : isDismissed ? "✅" : "⚡"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-800 capitalize">
                      {m.modalType.replace(/_/g, " ")}{tierLabel}{sourceLabel}
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    isShown ? "bg-blue-100 text-blue-700" : isDismissed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {m.action}
                  </span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDateTime(m.createdAt)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No modal interactions recorded.</p>
        )}
      </div>
    </div>
  );
}

// ─── Helper components ───────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="text-center p-3 rounded-lg border border-gray-100 bg-white">
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-xl font-bold ${accent ? "text-indigo-600" : "text-gray-900"}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={alert ? "text-red-600 font-semibold" : "text-gray-800 font-medium"}>{value}</span>
    </div>
  );
}

export default memo(LearnerDetailView);
