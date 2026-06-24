import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import ClipLibraryCard from "@/components/ClipLibraryCard";
import RegistrationForm from "@/components/RegistrationForm";
import XpProgressBar from "@/components/XpProgressBar";
import WelcomeModal from "@/components/WelcomeModal";
import SummitModal from "@/components/SummitModal";
import TierUnlockModal from "@/components/TierUnlockModal";

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
  const { viewer, isLoading: viewerLoading } = useViewer();
  const [showBeforeYouBegin, setShowBeforeYouBegin] = useState(true);
  const [showSummit, setShowSummit] = useState(false);
  const [tierUnlock, setTierUnlock] = useState<number | null>(null);

  const { run: logClick } = useApi("LogPitchClick");
  const WHEEL_AND_DEAL_URL = "https://app.superblocks.com/code-mode/applications/fef97ebe-4fb9-401f-b97c-c52c1693b31b/";
  const handleWheelAndDeal = useCallback(() => {
    if (viewer?.id) logClick({ viewerId: viewer.id, pitchName: "Wheel & Deal" });
    window.open(WHEEL_AND_DEAL_URL, "_blank");
  }, [viewer?.id, logClick]);

  // Preview params — only honored on in-editor navigation, NOT on initial page load.
  // On first load, strip test params from URL so "view deployed app" can never carry them.
  const isInitialLoad = useRef(true);
  const [previewMode, setPreviewMode] = useState<string | null>(null);

  useEffect(() => {
    const TEST_PARAMS = ["welcome", "register", "summit", "tier"];
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
    if (searchParams.get("tier") === "test") {
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

  const clips = useMemo(() => data?.clips ?? [], [data]);
  const allCompleted = clips.length === 17 && clips.every((c: any) => c.completed);

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

  const WEEK_EMOJI: Record<number, string> = { 2: "🥾", 3: "🏞️", 4: "🧗🏻‍♂️" };

  const weekGroups = useMemo(() => {
    const grouped = new Map<number, typeof clips>();
    for (const clip of clips) {
      const wk = (clip as any).weekNumber ?? 0;
      if (!grouped.has(wk)) grouped.set(wk, []);
      grouped.get(wk)!.push(clip);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNum, weekClips]) => ({
        label: weekNum > 0 ? `Week ${weekNum}` : "Other",
        emoji: WEEK_EMOJI[weekNum] ?? "📦",
        clips: weekClips,
      }));
  }, [clips]);

  // ──────────────────── RENDER GATES ────────────────────
  // 1. Viewer still loading → skeleton
  if (viewerLoading) {
    return <LoadingSkeleton />;
  }

  // 2. No viewer → registration (this is the ONLY path to RegistrationForm for real users)
  if (!viewer) {
    return <RegistrationForm />;
  }

  // 3. Data still loading → skeleton (prevents ANY modal from rendering prematurely)
  if (!dataReady) {
    return <LoadingSkeleton />;
  }

  // 4. Preview overrides (admin only — never affects real users, even if params leak to deployed URL)
  if (viewer.isAdmin && previewMode === "register") return <RegistrationForm />;
  if (viewer.isAdmin && previewMode === "welcome") {
    return <WelcomeModal viewerId={viewer.id} onDismiss={() => {}} />;
  }

  // ──────────────────── MODALS (only when dataReady) ────────────────────

  // Summit modal (higher priority than tier)
  if (showSummit && previewMode !== "tier") {
    return (
      <SummitModal
        learnerName={viewer.name}
        totalXp={progressData!.totalXp}
        tierName={progressData!.tier.name}
        tierEmoji={progressData!.tier.emoji}
        managerName={progressData!.managerName ?? null}
        onDismiss={() => {
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

  // ──────────────────── MAIN LIBRARY VIEW ────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="border-b border-gray-200 px-6 py-4" style={{ backgroundColor: "#ffffff" }}>
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏕️</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">cAMP Ascent: Sales</h1>
              <p className="text-sm text-gray-500 mt-0.5">🎞️ Watch. Engage. Ascend.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { path: "/xp", label: "XP-lanation", emoji: "🔭" },
              { path: "/analytics", label: "Analytics", emoji: "📊" },
              { path: "/admin", label: "Admin", emoji: "⚙️" },
            ].map((nav) => (
              <button
                key={nav.path}
                onClick={() => navigate(nav.path)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
              >
                <span>{nav.emoji}</span>
                {nav.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full flex-1 overflow-auto">
        {/* XP Progress Bar */}
        <XpProgressBar />

        {/* Before You Begin — collapsible */}
        {showBeforeYouBegin && (
          <div className="bg-[#EEF2FF] rounded-xl border border-indigo-200/60 shadow-sm overflow-hidden mb-2">
            <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-200/40">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  🎬 Before You Begin
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  How cAMP Ascent works — read before watching your first clip
                </p>
              </div>
              <button
                onClick={() => setShowBeforeYouBegin(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>

            <div className="divide-y divide-indigo-100/50 bg-white/70 rounded-b-xl">
              <div className="flex items-start gap-3 px-5 py-3">
                <span className="text-lg mt-0.5">👁️</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Stay on the tab while watching</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Focus time counts toward your engagement score. Switching tabs pauses the video and stops your timer.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3">
                <span className="text-lg mt-0.5">🪧</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Answer Trail Markers as they appear</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Questions pop up during the video and pause playback. You need 80%+ engagement to unlock the next clip.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3">
                <span className="text-lg mt-0.5">🚁</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Didn't pass? Search & Rescue kicks in</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Score below 80%? You'll get a second shot with a fresh set of questions. Pass S&R and you're through.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3 bg-[#FFF7ED]">
                <span className="text-lg mt-0.5">⛈️</span>
                <div>
                  <p className="text-sm font-semibold text-[#92400E]">Fail S&R? Weather the Storm adds 3 minutes</p>
                  <p className="text-xs text-[#92400E]/80 mt-0.5">
                    You'll get a 3-minute study break with the session highlights before the next clip unlocks. Stay engaged and you'll rarely see this.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clip list grouped by week */}
        <div className="flex flex-col gap-6">
          {weekGroups.map((week) =>
            week.clips.length > 0 ? (
              <section key={week.label}>
                <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-4">
                  <span className="text-2xl">{week.emoji}</span>
                  <h2 className="text-lg font-bold text-gray-900">{week.label}</h2>
                </div>

                <div className="flex flex-col gap-3">
                  {week.clips.map((clip: any) => {
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
                      />
                    );
                  })}
                </div>
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
    </div>
  );
}
