import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import ClipLibraryCard from "@/components/ClipLibraryCard";
import PairedClipCard from "@/components/PairedClipCard";
import RegistrationForm from "@/components/RegistrationForm";
import MaintenancePage from "@/components/MaintenancePage";
import XpProgressBar from "@/components/XpProgressBar";
import WelcomeModal from "@/components/WelcomeModal";

import TierUnlockModal from "@/components/TierUnlockModal";
import PacingModal from "@/components/PacingModal";
import AnchorFailureModal from "@/components/AnchorFailureModal";
import LightAnchorModal from "@/components/LightAnchorModal";
import TrailManifesto from "@/components/TrailManifesto";
import FirstAchievementModal from "@/components/FirstAchievementModal";
import LearnerCheckinModal from "@/components/LearnerCheckinModal";
import Week1Page from "@/components/week1/Week1Page";
import {
  countWeekdays,
  getTopicDaysBehind,
  getPacingTier,
  getMissedClips,
  getSummitDay,
  getAscentAdjustmentDay,
  isAfterDate,
  isDayBeforeSummitDay,
  TOTAL_SESSIONS,
} from "@/lib/pacing";

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
      <div className="h-10 w-48 bg-gray-100 rounded-lg animate-pulse" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { viewer, isLoading: viewerLoading, lookupError } = useViewer();
  const [showSummit, setShowSummit] = useState(false);
  const [tierUnlock, setTierUnlock] = useState<number | null>(null);
  const [showPacing, setShowPacing] = useState(false);
  const [showAnchorFailure, setShowAnchorFailure] = useState(false);
  const [showLightAnchor, setShowLightAnchor] = useState(false);
  const [showAnchorEscalated, setShowAnchorEscalated] = useState(false);
  const [showFirstAchievement, setShowFirstAchievement] = useState(false);
  const [firstAchievementData, setFirstAchievementData] = useState<{ earnedXp: number; earnedBadge: boolean }>({ earnedXp: 0, earnedBadge: false });
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinType, setCheckinType] = useState<"approach" | "week2" | "week3" | "summit">("approach");
  const [checkinAdminTest, setCheckinAdminTest] = useState(false);
  const checkinTriggeredRef = useRef(false);
  const pacingShownRef = useRef(false);

  // Tab state: "approach" (Week 1) vs "ascent" (existing clips)
  const initialTab = searchParams.get("tab") === "ascent" ? "ascent" : "approach";
  const [activeTab, setActiveTab] = useState<"approach" | "ascent">(initialTab);

  // Persist active tab so "Back to clips" returns to the correct tab
  useEffect(() => {
    sessionStorage.setItem("library_active_tab", activeTab);
  }, [activeTab]);

  // Admin "Test as New Learner" toggle for The Ascent tab
  const [ascentTestMode, setAscentTestMode] = useState(false);

  const { run: logClick } = useApi("LogPitchClick");
  const { run: trackLogin } = useApi("TrackLogin");

  // Track login — update last_login_at once per session
  useEffect(() => {
    if (!viewer?.id) return;
    const key = `login_tracked_${viewer.id}_${new Date().toLocaleDateString()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackLogin({ viewerId: viewer.id }).catch(() => {});
  }, [viewer?.id, trackLogin]);
  const WHEEL_AND_DEAL_URL = "https://app.superblocks.com/code-mode/applications/fef97ebe-4fb9-401f-b97c-c52c1693b31b/";
  const handleWheelAndDeal = useCallback(() => {
    if (viewer?.id) logClick({ viewerId: viewer.id, pitchName: "Wheel & Deal" });
    window.open(WHEEL_AND_DEAL_URL, "_blank");
  }, [viewer?.id, logClick]);

  const CAMP_QUIZ_URL = "https://app.superblocks.com/code-mode/applications/303818de-7c76-409c-a430-4404529ab864/";
  const handleCampQuiz = useCallback(() => {
    if (viewer?.id) logClick({ viewerId: viewer.id, pitchName: "cAMP Quiz" });
    window.open(CAMP_QUIZ_URL, "_blank");
  }, [viewer?.id, logClick]);

  // Reachdesk Zoom clip (sort order 4) — tracked via localStorage
  const REACHDESK_ZOOM_URL = "https://amplitude.zoom.us/clips/share/1HnN8co4TT-XfIREH0ZodQ?pageType=web";
  const reachdeskStorageKey = viewer?.id ? `reachdesk_watched_${viewer.id}` : null;
  const [reachdeskWatched, setReachdeskWatched] = useState(() => {
    if (!reachdeskStorageKey) return false;
    return localStorage.getItem(reachdeskStorageKey) === "true";
  });
  const handleReachdeskWatch = useCallback(() => {
    if (viewer?.id) logClick({ viewerId: viewer.id, pitchName: "Reachdesk Zoom Clip" });
    window.open(REACHDESK_ZOOM_URL, "_blank");
    // Mark as watched — unlocks the Reachdesk report
    if (reachdeskStorageKey) {
      localStorage.setItem(reachdeskStorageKey, "true");
      setReachdeskWatched(true);
    }
    // Auto-navigate to the Reachdesk Ranger Report
    navigate("/report/reachdesk");
  }, [viewer?.id, logClick, reachdeskStorageKey, navigate]);

  // Deal Desk bonus clips (sort order 17 after topic day insertion) — tracked via localStorage
  const bonus1StorageKey = viewer?.id ? `deal_desk_bonus1_watched_${viewer.id}` : null;
  const bonus2StorageKey = viewer?.id ? `deal_desk_bonus2_watched_${viewer.id}` : null;
  const [bonus1Watched, setBonus1Watched] = useState(() => {
    if (!bonus1StorageKey) return false;
    return localStorage.getItem(bonus1StorageKey) === "true";
  });
  const [bonus2Watched, setBonus2Watched] = useState(() => {
    if (!bonus2StorageKey) return false;
    return localStorage.getItem(bonus2StorageKey) === "true";
  });
  const handleBonusClip1Watch = useCallback(() => {
    navigate("/bonus-watch/support-case");
  }, [navigate]);
  const handleBonusClip1Review = useCallback(() => {
    navigate("/bonus-watch/support-case");
  }, [navigate]);
  const handleBonusClip2Watch = useCallback(() => {
    navigate("/bonus-watch/stage-65");
  }, [navigate]);
  const handleBonusClip2Review = useCallback(() => {
    navigate("/bonus-watch/stage-65");
  }, [navigate]);

  // Sync bonus clip watched state when viewer changes (e.g. coming back from BonusWatch page)
  useEffect(() => {
    if (bonus1StorageKey && localStorage.getItem(bonus1StorageKey) === "true") {
      setBonus1Watched(true);
    }
    if (bonus2StorageKey && localStorage.getItem(bonus2StorageKey) === "true") {
      setBonus2Watched(true);
    }
  }, [bonus1StorageKey, bonus2StorageKey]);

  // Preview params — only honored on in-editor navigation, NOT on initial page load.
  // On first load, strip test params from URL so "view deployed app" can never carry them.
  const isInitialLoad = useRef(true);
  const [previewMode, setPreviewMode] = useState<string | null>(null);

  useEffect(() => {
    const TEST_PARAMS = ["welcome", "register", "summit", "tier", "pacing"];
    const hasTestParams = TEST_PARAMS.some((p) => searchParams.get(p) === "test");

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      // Strip test params on initial page load — don't process them
      if (hasTestParams) {
        const cleaned = new URLSearchParams(searchParams);
        TEST_PARAMS.forEach((p) => cleaned.delete(p));
        const cleanUrl = cleaned.toString()
          ? `${window.location.pathname}?${cleaned.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }
      return;
    }

    // Subsequent navigations (editor preview) — honor test params
    if (searchParams.get("pacing") === "test") {
      setPreviewMode("pacing");
      setShowPacing(true);
    } else if (searchParams.get("tier") === "test") {
      setPreviewMode("tier");
      setTierUnlock(-1);
    } else if (searchParams.get("summit") === "test") {
      setPreviewMode("summit");
      setShowSummit(true);
    } else if (searchParams.get("register") === "test") {
      setPreviewMode("register");
    } else if (searchParams.get("welcome") === "test") {
      setPreviewMode("welcome");
    } else {
      setPreviewMode(null);
    }
  }, [searchParams]);

  const { data, loading } = useApiData(
    "GetClipLibrary",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  const { data: progressData } = useApiData(
    "GetLearnerProgress",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  const rawClips = useMemo(() => data?.clips ?? [], [data]);

  // In ascent test mode, reset all clips to fresh state (only clip 1 unlocked, none completed)
  const clips = useMemo(() => {
    if (!ascentTestMode) return rawClips;
    return rawClips.map((c: any, i: number) => ({
      ...c,
      unlocked: i === 0,
      completed: false,
      xpEarned: 0,
      pausedElapsedSeconds: 0,
    }));
  }, [rawClips, ascentTestMode]);
  const allCompleted = clips.length >= TOTAL_SESSIONS && clips.every((c: any) => c.completed);

  // A/B pair sort orders — updated after Day 5 + Day 9 topic day insertion
  // Old: [6,7],[8,9],[11,12],[16,17] → New: [7,8],[9,10],[13,14],[18,19]
  const AB_PAIRS: [number, number][] = [[7, 8], [9, 10], [13, 14], [18, 19]];
  const pairedSortOrders = new Set(AB_PAIRS.flat());

  // ── Pacing calculation ──
  const pacingInfo = useMemo(() => {
    if (!progressData?.ascentDay1 || clips.length === 0) return null;
    const startDate = new Date(progressData.ascentDay1 + "T00:00:00");
    const today = new Date();
    const weekdaysElapsed = countWeekdays(startDate, today);
    // Count ALL completed rows (video clips + topic days) for pacing
    const sessionsCompleted = clips.filter((c: any) => c.completed).length;
    const summitDay = getSummitDay(startDate);
    const afterSummitDay = isAfterDate(summitDay);
    const tier = getPacingTier(sessionsCompleted, weekdaysElapsed, true, afterSummitDay);
    const daysBehind = getTopicDaysBehind(sessionsCompleted, weekdaysElapsed);
    const missedClips = getMissedClips(
      clips.map((c: any) => ({
        sortOrder: c.sortOrder,
        weekNumber: c.weekNumber,
        dayLabel: c.dayLabel,
        title: c.title,
        completed: c.completed,
      })),
      weekdaysElapsed
    );
    const incompleteSessions = TOTAL_SESSIONS - sessionsCompleted;
    const adjustmentDay = getAscentAdjustmentDay(summitDay, incompleteSessions);
    const afterAdjustmentDay = isAfterDate(adjustmentDay);
    const dayBeforeSummit = isDayBeforeSummitDay(summitDay);
    return {
      tier, daysBehind, clipsCompleted: sessionsCompleted, weekdaysElapsed, missedClips, summitDay,
      startDate, adjustmentDay, afterSummitDay, afterAdjustmentDay, dayBeforeSummit,
      incompleteSessions,
    };
  }, [progressData, clips]);

  // Gate: ALL data must be loaded before any modal logic runs
  const dataReady = !!viewer && !!data && !!progressData;

  // Auto-trigger Tier Unlock — only after all data ready
  useEffect(() => {
    if (!dataReady || previewMode === "tier") return;
    const currentTierNum = progressData!.tier.tier;
    const storageKey = `tier_celebrated_${viewer!.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored === null) {
      // First encounter — seed with current tier, no retroactive celebration
      localStorage.setItem(storageKey, String(currentTierNum));
      return;
    }
    const lastCelebrated = parseInt(stored, 10);
    if (currentTierNum > lastCelebrated && tierUnlock === null) {
      setTierUnlock(currentTierNum);
    }
  }, [dataReady, previewMode, progressData, viewer, tierUnlock]);

  // ── Determine which anchor modal to show (when tier is anchor_failure) ──
  const showAnchorModal = useCallback((vi: typeof viewer, pi: NonNullable<typeof pacingInfo>) => {
    const anchorSlackKey = `anchor_failure_slack_sent_${vi!.id}`;
    const adjustmentDeadlineKey = `anchor_adjustment_deadline_${vi!.id}`;
    const adjustmentSlackKey = `anchor_adjustment_slack_sent_${vi!.id}`;

    const anchorSlackSent = localStorage.getItem(anchorSlackKey) === "true";
    const adjustmentSlackSent = localStorage.getItem(adjustmentSlackKey) === "true";

    // Freeze the adjustment deadline the first time anchor failure triggers
    if (!localStorage.getItem(adjustmentDeadlineKey) && pi.adjustmentDay) {
      localStorage.setItem(adjustmentDeadlineKey, pi.adjustmentDay.toISOString());
    }

    // Read stored adjustment day (frozen from first trigger)
    const storedAdjStr = localStorage.getItem(adjustmentDeadlineKey);
    const storedAdjDay = storedAdjStr ? new Date(storedAdjStr) : pi.adjustmentDay;
    const afterAdj = storedAdjDay ? isAfterDate(storedAdjDay) : false;

    if (!anchorSlackSent) {
      setShowAnchorFailure(true);           // #1 — first time, requires Slack
    } else if (afterAdj && !adjustmentSlackSent) {
      setShowAnchorEscalated(true);         // #2 — escalated, missed adjustment deadline
    } else {
      setShowLightAnchor(true);             // Daily reminder
    }
  }, []);

  // Auto-trigger Pacing / Anchor — once per calendar day
  // The pacing ladder is one system: summit_bound → … → avalanche_warning → anchor_failure.
  // When tier is anchor_failure, we dispatch the appropriate anchor modal instead of PacingModal.
  useEffect(() => {
    if (!dataReady || !pacingInfo || previewMode === "pacing") return;
    if (pacingShownRef.current) return;
    if (showSummit || tierUnlock !== null) return; // don't stack modals

    const storageKey = `pacing_shown_${viewer!.id}`;
    const todayStr = new Date().toLocaleDateString();
    const lastShown = localStorage.getItem(storageKey);

    if (lastShown !== todayStr) {
      pacingShownRef.current = true;
      localStorage.setItem(storageKey, todayStr);

      if (pacingInfo.tier === "anchor_failure") {
        showAnchorModal(viewer, pacingInfo);
      } else {
        setShowPacing(true);
      }
    }
  }, [dataReady, pacingInfo, showSummit, tierUnlock, previewMode, viewer, showAnchorModal]);

  // visibilitychange — re-trigger pacing/anchor modal for stale tabs (new day)
  useEffect(() => {
    if (!dataReady || !viewer) return;

    const handleVisibility = () => {
      if (document.hidden) return;
      const storageKey = `pacing_shown_${viewer.id}`;
      const todayStr = new Date().toLocaleDateString();
      const lastShown = localStorage.getItem(storageKey);
      if (lastShown !== todayStr && pacingInfo && !showSummit && tierUnlock === null) {
        localStorage.setItem(storageKey, todayStr);

        if (pacingInfo.tier === "anchor_failure") {
          showAnchorModal(viewer, pacingInfo);
        } else {
          setShowPacing(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [dataReady, viewer, pacingInfo, showSummit, tierUnlock, showAnchorModal]);

  // Auto-trigger Summit — only after all data ready
  useEffect(() => {
    if (!dataReady || previewMode === "tier") return;
    const key = `summit_dismissed_${viewer!.id}`;
    const stored = localStorage.getItem(key);
    if (stored === null) {
      // First encounter — seed based on current completion state
      localStorage.setItem(key, allCompleted ? "true" : "false");
      return;
    }
    if (stored === "true") return; // Already dismissed
    // Not dismissed + all completed = show summit
    if (allCompleted && !showSummit) {
      setShowSummit(true);
    }
  }, [dataReady, allCompleted, showSummit, previewMode, viewer]);

  // (Anchor failure detection is now handled by the unified pacing trigger above —
  //  getPacingTier returns "anchor_failure" when past summit day + incomplete)

  const WEEK_META: Record<number, { emoji: string; title: string; time: string; note: string }> = {
    2: {
      emoji: "🥾",
      title: "Building Your Revenue Engine Foundations",
      time: "⏱ Total: 7h 18m | Daily average: ~1h 28m per day",
      note: "These times are approximate and reflect course + video durations, plus ~20 minutes per day for quizzes. They do not include any extra time you spend reading or reviewing linked resources.",
    },
    3: {
      emoji: "🏞️",
      title: "Designing & Winning Strategic Deals",
      time: "⏱ Total: 7h 16m | Daily average: ~1h 27m per day",
      note: "These times are approximate and reflect course + video durations, plus ~20 minutes per day for quizzes. They do not include any extra time you spend reading or reviewing linked resources.",
    },
    4: {
      emoji: "🧗🏻‍♂️",
      title: "Executing, Governing & Scaling Deals",
      time: "⏱ Total: 9h 55m | Daily average: ~2h per day",
      note: "These times are approximate and reflect course + video durations, plus ~20 minutes per day for quizzes. They do not include any extra time you spend reading or reviewing linked resources.",
    },
  };

  const weekGroups = useMemo(() => {
    const grouped = new Map<number, typeof clips>();
    for (const clip of clips) {
      const wk = (clip as any).weekNumber ?? 0;
      if (!grouped.has(wk)) grouped.set(wk, []);
      grouped.get(wk)!.push(clip);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNum, weekClips]) => {
        const meta = WEEK_META[weekNum];
        const allLocked = weekClips.every((c: any) => !c.unlocked);
        const completedCount = weekClips.filter((c: any) => c.completed).length;
        return {
          weekNum,
          label: weekNum > 0 ? `Week ${weekNum}` : "Other",
          emoji: meta?.emoji ?? "📦",
          title: meta?.title ?? null,
          time: meta?.time ?? null,
          note: meta?.note ?? null,
          clips: weekClips,
          allLocked,
          completedCount,
        };
      });
  }, [clips]);

  // ── Auto-trigger Week 2 / Week 3 check-ins based on clip milestones ──
  useEffect(() => {
    if (!dataReady || !progressData || checkinTriggeredRef.current) return;
    if (showSummit || showFirstAchievement || tierUnlock !== null || showCheckin) return;

    const completed = progressData.clipsCompleted;

    // Week 3 check-in: 10+ clips, week3 not sent yet.
    // Bypasses week 2 check-in — learners already in week 2/3 when check-in
    // feature launched skip week 2 and start sending at end of Week 3.
    if (
      completed >= 10 &&
      !progressData.week3CheckinSentAt
    ) {
      const sessionKey = `checkin_week3_prompted_${viewer!.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        checkinTriggeredRef.current = true;
        setCheckinType("week3");
        setShowCheckin(true);
      }
      return;
    }

    // Week 2 check-in: 5+ clips, approach sent, week2 not sent, AND less than 10 clips
    // (once they hit 10 clips, week 3 takes priority above)
    if (
      completed >= 5 &&
      completed < 10 &&
      progressData.approachCheckinSentAt &&
      !progressData.week2CheckinSentAt
    ) {
      const sessionKey = `checkin_week2_prompted_${viewer!.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        checkinTriggeredRef.current = true;
        setCheckinType("week2");
        setShowCheckin(true);
      }
      return;
    }
  }, [dataReady, progressData, showSummit, showFirstAchievement, tierUnlock, showCheckin, viewer]);

  // ──────────────────── RENDER GATES ────────────────────
  // 1. Viewer still loading → skeleton
  if (viewerLoading) {
    return <LoadingSkeleton />;
  }

  // 2. No viewer + API error → maintenance page (DB unreachable, don't show registration)
  if (!viewer && lookupError) {
    return <MaintenancePage />;
  }

  // 3. No viewer + no error → genuinely new user → registration
  if (!viewer) {
    return <RegistrationForm />;
  }

  // 4. Data still loading → skeleton (prevents ANY modal from rendering prematurely)
  if (!dataReady) {
    return <LoadingSkeleton />;
  }

  // 4. Preview overrides (admin only — never affects real users, even if params leak to deployed URL)
  if (viewer.isAdmin && previewMode === "register") return <RegistrationForm />;
  if (viewer.isAdmin && previewMode === "welcome") {
    return <WelcomeModal viewerId={viewer.id} onDismiss={() => {}} />;
  }
  if (viewer.isAdmin && previewMode === "pacing" && pacingInfo) {
    return (
      <div className="h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PacingModal
          tier={pacingInfo.tier}
          daysBehind={pacingInfo.daysBehind}
          clipsCompleted={pacingInfo.clipsCompleted}
          totalClips={TOTAL_SESSIONS}
          weekdaysElapsed={pacingInfo.weekdaysElapsed}
          missedClips={pacingInfo.missedClips}
          summitDay={pacingInfo.summitDay}
          isDayBeforeSummit={pacingInfo.dayBeforeSummit}
          onDismiss={() => setShowPacing(false)}
        />
      </div>
    );
}

  // ──────────────────── MODALS (only when dataReady) ────────────────────

  // Summit celebration — opens merged LearnerCheckinModal with celebrate step
  if (showSummit && previewMode !== "tier") {
    return (
      <LearnerCheckinModal
        viewerId={viewer.id}
        checkinType="summit"
        onClose={() => {
          setShowSummit(false);
          if (previewMode !== "summit") {
            localStorage.setItem(`summit_dismissed_${viewer.id}`, "true");
          }
        }}
      />
    );
  }

  // Tier unlock modal
  if (tierUnlock !== null) {
    const tier = progressData!.tier;
    const nextTier = progressData!.nextTier;
    const xpNeeded = nextTier ? nextTier.xpMin - progressData!.totalXp : null;
    return (
      <TierUnlockModal
        tierName={tier.name}
        tierEmoji={tier.emoji}
        totalXp={progressData!.totalXp}
        leaderboardRank={progressData!.leaderboardRank}
        nextTierName={nextTier?.name ?? null}
        nextTierEmoji={nextTier?.emoji ?? null}
        xpToNextTier={xpNeeded}
        onDismiss={() => {
          setTierUnlock(null);
          if (previewMode !== "tier") {
            localStorage.setItem(`tier_celebrated_${viewer.id}`, String(tier.tier));
          }
        }}
      />
    );
  }

  // First Achievement modal — Approach → Ascent transition
  if (showFirstAchievement) {
    return (
      <FirstAchievementModal
        viewerId={viewer.id}
        earnedXp={firstAchievementData.earnedXp}
        earnedBadge={firstAchievementData.earnedBadge}
        onDismiss={() => {
          setShowFirstAchievement(false);
          // After dismissing First Achievement, trigger Approach check-in if not yet sent
          if (progressData && !progressData.approachCheckinSentAt) {
            setCheckinType("approach");
            setShowCheckin(true);
          }
        }}
      />
    );
  }

  // ──────────────────── MAIN LIBRARY VIEW ────────────────────
  return (
    <>
    {/* Learner Check-In Modal — overlay on top of library */}
    {showCheckin && (
      <div className="fixed inset-0 z-50">
        <LearnerCheckinModal
          viewerId={viewer!.id}
          checkinType={checkinType}
          onClose={() => { setShowCheckin(false); setCheckinAdminTest(false); }}
          onSent={() => {
            setShowCheckin(false);
            setCheckinAdminTest(false);
            toast.success("Check-in email marked as sent!");
          }}
          allowClose={checkinAdminTest}
        />
      </div>
    )}
    {showPacing && pacingInfo && (
      <PacingModal
        tier={pacingInfo.tier}
        daysBehind={pacingInfo.daysBehind}
        clipsCompleted={pacingInfo.clipsCompleted}
        totalClips={TOTAL_SESSIONS}
        weekdaysElapsed={pacingInfo.weekdaysElapsed}
        missedClips={pacingInfo.missedClips}
        summitDay={pacingInfo.summitDay}
        isDayBeforeSummit={pacingInfo.dayBeforeSummit}
        onDismiss={() => setShowPacing(false)}
      />
    )}
    {/* Anchor Failure #1 — first time past Summit Day */}
    {showAnchorFailure && pacingInfo && (
      <AnchorFailureModal
        learnerName={viewer.name}
        managerName={progressData!.managerName ?? null}
        startDate={pacingInfo.startDate}
        summitDay={pacingInfo.summitDay}
        adjustmentDay={pacingInfo.adjustmentDay}
        sessionsBehind={pacingInfo.incompleteSessions}
        missedClips={pacingInfo.missedClips}
        onDismiss={() => {
          localStorage.setItem(`anchor_failure_slack_sent_${viewer.id}`, "true");
          if (!localStorage.getItem(`anchor_adjustment_deadline_${viewer.id}`)) {
            localStorage.setItem(`anchor_adjustment_deadline_${viewer.id}`, pacingInfo.adjustmentDay.toISOString());
          }
          setShowAnchorFailure(false);
        }}
      />
    )}
    {/* Anchor Failure #2 — escalated, missed Ascent Adjustment too */}
    {showAnchorEscalated && pacingInfo && (
      <AnchorFailureModal
        learnerName={viewer.name}
        managerName={progressData!.managerName ?? null}
        startDate={pacingInfo.startDate}
        summitDay={pacingInfo.summitDay}
        adjustmentDay={(() => {
          const stored = localStorage.getItem(`anchor_adjustment_deadline_${viewer.id}`);
          return stored ? new Date(stored) : pacingInfo.adjustmentDay;
        })()}
        sessionsBehind={pacingInfo.incompleteSessions}
        missedClips={pacingInfo.missedClips}
        isEscalated
        onDismiss={() => {
          localStorage.setItem(`anchor_adjustment_slack_sent_${viewer.id}`, "true");
          setShowAnchorEscalated(false);
        }}
      />
    )}
    {/* Light Anchor — daily reminder */}
    {showLightAnchor && pacingInfo && (
      <LightAnchorModal
        summitDay={pacingInfo.summitDay}
        adjustmentDay={(() => {
          const stored = localStorage.getItem(`anchor_adjustment_deadline_${viewer.id}`);
          return stored ? new Date(stored) : pacingInfo.adjustmentDay;
        })()}
        adjustmentMissed={(() => {
          const stored = localStorage.getItem(`anchor_adjustment_deadline_${viewer.id}`);
          return stored ? isAfterDate(new Date(stored)) : false;
        })()}
        clipsCompleted={pacingInfo.clipsCompleted}
        totalClips={TOTAL_SESSIONS}
        missedClips={pacingInfo.missedClips}
        onDismiss={() => setShowLightAnchor(false)}
      />
    )}
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#ECFDF5" }}>
      {/* Page header */}
      <div className="border-b border-green-900/20 px-6 py-4" style={{ backgroundColor: "#1B4332" }}>
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏕️</span>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">cAMP Ascent: Sales</h1>
              <p className="text-sm text-green-200 mt-0.5">🎞️ Watch. Engage. Ascend.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://docs.google.com/document/d/13f7KQNiPEcTdtVl4vBM2izuwewNA1zA1NWY0Bj91hDo/edit?tab=t.0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-200/30 bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors shadow-sm"
            >
              <span>🧭</span>
              Ascent Guide
            </a>
            {[
              { path: "/xp", label: "XP-lanation", emoji: "🔭" },
              { path: "/analytics", label: "Analytics", emoji: "📊" },
              { path: "/admin", label: "Admin", emoji: "⚙️" },
            ].map((nav) => (
              <button
                key={nav.path}
                onClick={() => navigate(nav.path)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-200/30 bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors shadow-sm"
              >
                <span>{nav.emoji}</span>
                {nav.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-green-900/20 bg-[#2D6A4F]">
        <div className="flex max-w-4xl mx-auto w-full">
          <button
            onClick={() => setActiveTab("approach")}
            className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
              activeTab === "approach"
                ? "text-white border-b-2 border-white bg-white/10"
                : "text-green-200/70 hover:text-white hover:bg-white/5"
            }`}
          >
            🚡 The Approach
          </button>
          <button
            onClick={() => setActiveTab("ascent")}
            className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
              activeTab === "ascent"
                ? "text-white border-b-2 border-white bg-white/10"
                : "text-green-200/70 hover:text-white hover:bg-white/5"
            }`}
          >
            🧗 The Ascent
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "approach" ? (
        <div className="flex-1 overflow-auto">
          <Week1Page
            viewerId={viewer.id}
            viewerName={viewer.name}
            isAdmin={viewer.isAdmin}
            onBeginAscent={(unlockResult) => {
              setActiveTab("ascent");
              // Show First Achievement modal if they earned XP/badge
              if (unlockResult && !unlockResult.alreadyUnlocked) {
                setFirstAchievementData({
                  earnedXp: unlockResult.earnedXp ?? 0,
                  earnedBadge: unlockResult.earnedBadge ?? false,
                });
                setShowFirstAchievement(true);
              }
            }}
          />
        </div>
      ) : (
      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full flex-1 overflow-auto">
        {/* Admin test mode toggle */}
        {viewer.isAdmin && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔧</span>
              <span className="text-sm font-semibold text-purple-900">Admin View</span>
              <span className="text-xs text-purple-600">
                {ascentTestMode ? "Showing fresh learner view" : "Showing your real progress"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setCheckinType(e.target.value as "approach" | "week2" | "week3" | "summit");
                    setCheckinAdminTest(true);
                    setShowCheckin(true);
                    e.target.value = "";
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>📧 Test Check-In…</option>
                <option value="approach">🚡 Approach</option>
                <option value="week2">🏕️ Week 2</option>
                <option value="week3">🧗 Week 3</option>
                <option value="summit">🏔️ Summit</option>
              </select>
              <button
                onClick={() => navigate("/modal-museum")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-purple-700 border border-purple-300 hover:bg-purple-100 transition-colors"
              >
                🖼️ Modal Museum
              </button>
              <button
                onClick={() => setAscentTestMode((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  ascentTestMode
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-white text-purple-700 border border-purple-300 hover:bg-purple-100"
                }`}
              >
                {ascentTestMode ? "👁️ Show My Progress" : "🧪 Test as New Learner"}
              </button>
            </div>
          </div>
        )}

        {/* XP Progress Bar */}
        {!ascentTestMode && <XpProgressBar />}

        {/* Welcome to the Trail — Weeks 2-4 manifesto */}
        <TrailManifesto viewerId={viewer.id} />

        {/* Before You Begin — collapsible */}
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-2">
            <div className="px-5 py-3 bg-[#1B4332] rounded-t-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                🎬 Before You Begin
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                How cAMP Ascent works — read before watching your first clip
              </p>
            </div>

            <div className="divide-y divide-gray-100 rounded-b-xl">
              <div className="flex items-start gap-3 px-5 py-3 bg-white">
                <span className="text-lg mt-0.5">🔇</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Stay on the tab & keep your volume on</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Engagement is scored on two factors: tab focus (60%) and volume (40%). Switching tabs pauses the video and stops your timer. Muting won't pause it, but it drops your volume score — so keep it on.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3 bg-white">
                <span className="text-lg mt-0.5">🪧</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Answer Trail Markers as they appear</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Questions pop up during the video and pause playback. You need 80%+ engagement to unlock the next clip.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3 bg-white">
                <span className="text-lg mt-0.5">🚁</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Didn't pass? Search & Rescue kicks in</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Score below 80%? You'll get a second shot with a fresh set of questions. Pass S&R and you're through.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3 bg-[#BBF7D0]">
                <span className="text-lg mt-0.5">⛈️</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Fail S&R? Weather the Storm adds 2 minutes</p>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    You'll get a 2-minute study break with the session highlights before the next clip unlocks. Stay engaged and you'll rarely see this.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3 bg-[#A7F3D0]">
                <span className="text-lg mt-0.5">🔭</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Check out the XP-lanation tab</p>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    Everything you need to know about how XP works across clips. Earn points to maximize your Ascent and climb the leaderboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

        {/* Clip list grouped by week */}
        <div className="flex flex-col gap-6">
          {weekGroups.map((week) =>
            week.clips.length > 0 ? (
              <section key={week.label}>
                <div
                  className={`flex flex-col items-center rounded-xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-4 text-center ${
                    week.allLocked ? "opacity-60" : ""
                  }`}
                  style={{ backgroundColor: "#1B4332" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{week.allLocked ? "🔒" : week.emoji}</span>
                    <h2 className="text-lg font-bold text-white">{week.label}</h2>
                    {!week.allLocked && week.completedCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/30 text-[10px] font-semibold text-emerald-200">
                        {week.completedCount}/{week.clips.length} done
                      </span>
                    )}
                  </div>
                  {week.title && (
                    <p className="text-sm font-semibold text-emerald-200 mt-1">{week.title}</p>
                  )}
                  {week.allLocked ? (
                    <p className="text-xs text-amber-300 mt-1">Complete the previous week to unlock</p>
                  ) : (
                    <>
                      {week.time && (
                        <p className="text-xs text-white mt-1">{week.time}</p>
                      )}
                      {week.note && (
                        <p className="text-[10px] text-gray-300 mt-1.5 max-w-xl leading-snug">{week.note}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Hide clip list when entire week is locked */}
                {!week.allLocked && (
                <div className="flex flex-col gap-3">
                  {(() => {
                    const rendered = new Set<string>();
                    return week.clips.map((clip: any) => {
                      if (rendered.has(clip.id)) return null;

                      // Check if this clip is part of an A/B pair
                      const pair = AB_PAIRS.find(([a, b]) => clip.sortOrder === a);
                      if (pair) {
                        const clipB = week.clips.find((c: any) => c.sortOrder === pair[1]);
                        if (clipB) {
                          rendered.add(clip.id);
                          rendered.add(clipB.id);
                          const overallIdxA = clips.findIndex((c: any) => c.id === clip.id);
                          const prevClipA = overallIdxA > 0 ? clips[overallIdxA - 1] : undefined;
                          return (
                            <PairedClipCard
                              key={`pair-${clip.id}`}
                              clipA={clip}
                              clipB={clipB}
                              stateA={{
                                isLocked: !clip.unlocked,
                                isCompleted: clip.completed,
                                pausedElapsedSeconds: clip.pausedElapsedSeconds ?? 0,
                                xpEarned: clip.xpEarned ?? 0,
                              }}
                              stateB={{
                                isLocked: !clipB.unlocked,
                                isCompleted: clipB.completed,
                                pausedElapsedSeconds: clipB.pausedElapsedSeconds ?? 0,
                                xpEarned: clipB.xpEarned ?? 0,
                              }}
                              previousClipTitle={prevClipA ? prevClipA.title : undefined}
                              onWatchA={() => navigate(`/watch/${clip.id}?source=library`)}
                              onWatchB={() => navigate(`/watch/${clipB.id}?source=library`)}
                              onReviewA={() => navigate(`/report/${clip.id}`)}
                              onReviewB={() => navigate(`/report/${clipB.id}`)}
                              onWheelAndDeal={handleWheelAndDeal}
                              onCampQuiz={handleCampQuiz}
                            />
                          );
                        }
                      }

                      // Skip B clips that are already rendered in a pair
                      if (AB_PAIRS.some(([, b]) => clip.sortOrder === b)) {
                        return null;
                      }

                      // Standard single clip card
                      rendered.add(clip.id);
                      const overallIdx = clips.findIndex((c: any) => c.id === clip.id);
                      const prevClip = overallIdx > 0 ? clips[overallIdx - 1] : undefined;
                      return (
                        <ClipLibraryCard
                          key={clip.id}
                          clip={clip}
                          isLocked={!clip.unlocked}
                          isCompleted={clip.completed}
                          pausedElapsedSeconds={clip.pausedElapsedSeconds ?? 0}
                          xpEarned={clip.xpEarned ?? 0}
                          previousClipTitle={prevClip ? prevClip.title : undefined}
                          onWatch={() => navigate(`/watch/${clip.id}?source=library`)}
                          onReview={() => navigate(`/report/${clip.id}`)}
                          onWheelAndDeal={handleWheelAndDeal}
                          onCampQuiz={handleCampQuiz}
                          onViewGear={
                            clip.isTopicDay
                              ? () => navigate(`/topic-gear/${clip.sortOrder === 5 ? "day5" : "day9"}/${clip.id}`)
                              : undefined
                          }
                          onZoomClipWatch={clip.sortOrder === 4 ? handleReachdeskWatch : undefined}
                          onZoomClipReview={clip.sortOrder === 4 ? () => navigate(`/report/reachdesk`) : undefined}
                          zoomClipWatched={clip.sortOrder === 4 ? reachdeskWatched : undefined}
                          onPodcasts={clip.sortOrder === 15 ? () => navigate("/podcasts") : undefined}
                          onBonusClip1Watch={clip.sortOrder === 17 ? handleBonusClip1Watch : undefined}
                          onBonusClip1Review={clip.sortOrder === 17 ? handleBonusClip1Review : undefined}
                          bonusClip1Watched={clip.sortOrder === 17 ? bonus1Watched : undefined}
                          onBonusClip2Watch={clip.sortOrder === 17 ? handleBonusClip2Watch : undefined}
                          onBonusClip2Review={clip.sortOrder === 17 ? handleBonusClip2Review : undefined}
                          bonusClip2Watched={clip.sortOrder === 17 ? bonus2Watched : undefined}
                        />
                      );
                    });
                  })()}
                </div>
                )}
              </section>
            ) : null
          )}
        </div>

        {clips.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl block mb-3">🌲</span>
            <p className="text-sm">No clips available yet. Check back soon!</p>
          </div>
        )}
      </div>
      )}
    </div>
    </>
  );
}
