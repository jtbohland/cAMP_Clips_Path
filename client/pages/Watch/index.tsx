import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, useBlocker } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { executeApi } from "@/lib/executeApi.js";
import { useViewer } from "@/components/ViewerContext";
import QuizOverlayV2 from "@/components/QuizOverlayV2";
import RangerReport from "@/components/RangerReport";
import SearchRescue from "@/components/SearchRescue";
import WeatherStorm from "@/components/WeatherStorm";
import SearchRescuePassPopup from "@/components/SearchRescuePassPopup";
import ResumePrompt from "@/components/ResumePrompt";
import AscentGuidePanel from "@/components/AscentGuidePanel";
import { getGuideEntryForClip } from "@/config/ascentGuide.js";

import { getLibraryPath } from "@/lib/libraryNav";

import { WistiaPlayer } from "@wistia/wistia-player-react";
import { toast } from "sonner";

/** Sort orders for lite clips — no engagement scoring, no trail markers, no Ranger Report */
const LITE_CLIP_SORTS = new Set([51]);


type WatchPhase =
  | "loading_resume"
  | "resume_prompt"
  | "watching"
  | "trail_marker"
  | "ranger_report"
  | "search_rescue"
  | "search_rescue_passed"
  | "weather_storm"
  | "lite_complete"
  | "complete";

/** Phases where the learner is locked in — no exit until they pass or unlock */
const LOCKED_PHASES: ReadonlySet<WatchPhase> = new Set([
  "ranger_report",
  "search_rescue",
  "weather_storm",
]);

function getWistiaVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? null;
  } catch {
    return null;
  }
}

/** Retry an async fn up to `maxAttempts` times with exponential backoff (500ms, 1s, 2s). */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

export default function WatchPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const { viewer, isLoading: viewerLoading } = useViewer();

  const { data: clipData, loading: clipLoading } = useApiData(
    "GetClipForWatching",
    { clipId: clipId ?? "", viewerId: viewer?.id ?? "" },
    { enabled: !!clipId && !!viewer?.id }
  );

  const wistiaVideoId = useMemo(
    () => (clipData?.clip?.videoUrl ? getWistiaVideoId(clipData.clip.videoUrl) : null),
    [clipData]
  );

  const playerRef = useRef<any>(null);

  const { run: startSession } = useApi("StartSession");
  const { run: resetSession } = useApi("ResetSession");
  const { run: submitAnswer } = useApi("SubmitAnswer");
  const { run: endSession } = useApi("EndSession");
  const { run: awardXP } = useApi("AwardXP");
  const { run: completeClipPath } = useApi("CompleteClipPath");
  const { run: pauseSession } = useApi("PauseSession");

  const [phase, setPhase] = useState<WatchPhase>("loading_resume");
  const [pausedSessionData, setPausedSessionData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [totalTrailMarkers, setTotalTrailMarkers] = useState(0);
  const [score, setScore] = useState(0);
  const [searchRescueScore, setSearchRescueScore] = useState<number | null>(null);
  const [srCorrectCount, setSrCorrectCount] = useState(0);
  const [searchRescueTriggered, setSearchRescueTriggered] = useState(false);
  const [newEngagementScore, setNewEngagementScore] = useState<number | null>(null);
  const [engagementScore, setEngagementScore] = useState<number | null>(null);
  const [incorrectQuestions, setIncorrectQuestions] = useState<
    Array<{ id: string; triggerAtSeconds: number; questionText: string }>
  >([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [blurSeconds, setBlurSeconds] = useState(0);
  const isFocusedRef = useRef(true);
  const lastTimeRef = useRef(0);
  const lastWatchedTimeRef = useRef(0);
  const focusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tabAway, setTabAway] = useState(false);
  const tabAwayCountRef = useRef(0);
  const lowVolumeSecondsRef = useRef(0);
  const isLowVolumeRef = useRef(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // ─── Completion error state (visible retry) ────────────────────────────────
  const [completionError, setCompletionError] = useState<"lite" | "first_pass" | "search_rescue" | "weather_storm" | null>(null);

  // ─── Play-start fade toast ─────────────────────────────────────────────────
  // Shows a brief reminder on first play, then fades out automatically.
  const hasShownPlayToastRef = useRef(false);
  const [playToastVisible, setPlayToastVisible] = useState(false);
  const [playToastFading, setPlayToastFading] = useState(false);

  // ─── Backward seek detection ───────────────────────────────────────────────
  // Detects when a learner seeks backward and shows a warning modal.
  const [showSeekWarning, setShowSeekWarning] = useState(false);
  const showSeekWarningRef = useRef(false);
  const seekSnapbackTimeRef = useRef<number | null>(null);
  const highWaterMarkRef = useRef(0);

  // ─── Nudge banner at ~80% watched ─────────────────────────────────────────
  const [showNudgeBanner, setShowNudgeBanner] = useState(false);
  const nudgeDismissedRef = useRef(false);

  // Ascent Guide panel — summary + learning objectives shown on clip open
  // Lite clip detection — no engagement scoring, no trail markers, no Ranger Report
  const isLite = useMemo(() => {
    const sortOrder = clipData?.clip?.sortOrder;
    return sortOrder ? LITE_CLIP_SORTS.has(sortOrder) : false;
  }, [clipData?.clip?.sortOrder]);

  const guideEntry = useMemo(
    () => {
      const sortOrder = clipData?.clip?.sortOrder;
      return sortOrder ? getGuideEntryForClip(sortOrder) : null;
    },
    [clipData?.clip?.sortOrder]
  );
  const guideStorageKey = clipId ? `camp_guide_dismissed_${clipId}` : null;
  const [showGuide, setShowGuide] = useState(() => {
    if (!guideStorageKey) return false;
    return localStorage.getItem(guideStorageKey) !== "true";
  });
  const handleSwatAway = useCallback(() => {
    setShowGuide(false);
    if (guideStorageKey) localStorage.setItem(guideStorageKey, "true");
  }, [guideStorageKey]);

  // Follow Along popover — tool link for clips with a hands-on demo
  const [showFollowAlong, setShowFollowAlong] = useState(false);
  const followAlongRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showFollowAlong) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (followAlongRef.current && !followAlongRef.current.contains(e.target as Node)) {
        setShowFollowAlong(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFollowAlong]);

  const [xpData, setXpData] = useState<{
    sessionBreakdown: { base: number; milestones: number; bonuses: number };
    totalXp: number;
    tier: { name: string; emoji: string };
  } | null>(null);
  const autoEndedRef = useRef(false);
  const videoEndedWhileQuizRef = useRef(false);
  const resumeFromSecondsRef = useRef<number | null>(null);

  // Use refs for stale-closure-safe access — these are updated on every render cycle
  const phaseRef = useRef<WatchPhase>("loading_resume");
  const trailMarkersRef = useRef<any[]>([]);
  const answeredQuestionsRef = useRef<Set<string>>(new Set());

  const trailMarkers = useMemo(
    () =>
      (clipData?.questions ?? [])
        .filter((q: any) => !q.isRecovery)
        .sort((a: any, b: any) => a.triggerAtSeconds - b.triggerAtSeconds),
    [clipData]
  );

  const recoveryQuestions = useMemo(
    () =>
      (clipData?.questions ?? [])
        .filter((q: any) => q.isRecovery)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    [clipData]
  );

  // ─── Refs for autosave / visibility handlers (stale-closure-safe) ─────────
  // These refs always hold the latest counter values so that timer callbacks
  // (setInterval, visibilitychange, beforeunload) never read stale closures.
  const sessionIdRef = useRef<string | null>(null);
  const elapsedSecondsRef = useRef(0);
  const focusSecondsRef = useRef(0);
  const blurSecondsRef = useRef(0);
  const watchedSecondsRef = useRef(0);
  const correctCountRef = useRef(0);

  // Keep refs in sync with latest state on every render
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { trailMarkersRef.current = trailMarkers; }, [trailMarkers]);
  useEffect(() => { answeredQuestionsRef.current = answeredQuestions; }, [answeredQuestions]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
  useEffect(() => { focusSecondsRef.current = focusSeconds; }, [focusSeconds]);
  useEffect(() => { blurSecondsRef.current = blurSeconds; }, [blurSeconds]);
  useEffect(() => { watchedSecondsRef.current = watchedSeconds; }, [watchedSeconds]);
  useEffect(() => { correctCountRef.current = correctCount; }, [correctCount]);

  // Focus/blur + low-volume time tracking
  useEffect(() => {
    if (phase !== "watching") {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
      return;
    }
    focusTimerRef.current = setInterval(() => {
      if (isVideoPlaying) {
        if (isFocusedRef.current) {
          setFocusSeconds((s) => s + 1);
        } else {
          setBlurSeconds((s) => s + 1);
        }
        // Accumulate low-volume seconds (muted or volume < 10%)
        if (isLowVolumeRef.current) {
          lowVolumeSecondsRef.current += 1;
        }
      }
    }, 1000);
    return () => {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    };
  }, [phase, isVideoPlaying]);

  // ─── Wistia volumechange tracking ──────────────────────────────────────────
  // Detect when volume drops below 10% or is muted → flag for low-volume accumulation
  const handleWistiaVolumeChange = useCallback((e: any) => {
    const volume: number = typeof e?.detail?.volume === "number" ? e.detail.volume : 1;
    const isMuted: boolean = e?.detail?.isMuted === true;
    isLowVolumeRef.current = isMuted || volume < 0.1;
  }, []);

  // ─── WistiaPlayer event handlers (React props, not addEventListener) ────────
  // These callbacks are passed as props to <WistiaPlayer> so they work reliably
  // regardless of web component lifecycle timing. They use refs for stale-closure safety.
  const handleWistiaPlay = useCallback(() => {
    setIsVideoPlaying(true);
    // Show fade toast on first play only (not on resume from pause modal)
    if (!hasShownPlayToastRef.current && phaseRef.current === "watching") {
      hasShownPlayToastRef.current = true;
      setPlayToastVisible(true);
      setPlayToastFading(false);
      // Start fade-out after 3s, then hide after animation completes
      setTimeout(() => setPlayToastFading(true), 3000);
      setTimeout(() => { setPlayToastVisible(false); setPlayToastFading(false); }, 4000);
    }
  }, []);
  const handleWistiaPause = useCallback(() => setIsVideoPlaying(false), []);
  const handleWistiaEnded = useCallback(() => {
    setIsVideoPlaying(false);
    // When Wistia fires "ended", the video reached the end — trigger completion
    // if we're in watching phase and all trail markers are answered.
    // At 2x speed, "ended" can fire while a trail marker quiz is showing (phase !== "watching").
    // In that case, flag it so handleTrailMarkerContinue picks it up after the quiz.
    if (autoEndedRef.current) return;
    const allAnswered = trailMarkersRef.current.every(
      (q: any) => answeredQuestionsRef.current.has(q.id)
    );
    if (phaseRef.current === "watching") {
      if (allAnswered || trailMarkersRef.current.length === 0) {
        autoEndedRef.current = true;
        handleFinishWatchingRef.current();
      }
    } else {
      // Video ended while quiz overlay is showing (2x speed race) — remember it
      videoEndedWhileQuizRef.current = true;
    }
  }, []);



  const handleSeekWarningKeepWatching = useCallback(() => {
    showSeekWarningRef.current = false;
    setShowSeekWarning(false);
    // Snap back to where they were before seeking backward
    if (seekSnapbackTimeRef.current !== null) {
      const p = playerRef.current;
      if (p) p.currentTime = seekSnapbackTimeRef.current;
      seekSnapbackTimeRef.current = null;
    }
    playerRef.current?.play();
  }, []);

  const handleSeekWarningRewindAnyway = useCallback(() => {
    showSeekWarningRef.current = false;
    setShowSeekWarning(false);
    seekSnapbackTimeRef.current = null;
    // Let the seek stand — player is already at the rewound position
    playerRef.current?.play();
  }, []);

  const handleWistiaSecondChange = useCallback((e: any) => {
    const t: number = typeof e?.detail?.second === "number"
      ? e.detail.second
      : Math.floor(playerRef.current?.currentTime ?? 0);

    if (t === lastTimeRef.current) return;

    // ── Backward seek detection ──
    // If the current time drops well below the high-water mark, the learner rewound.
    // A delta of -5 or more (allowing for small jitter) signals a deliberate backward seek.
    if (highWaterMarkRef.current > 5 && t < highWaterMarkRef.current - 5 && !showSeekWarningRef.current) {
      if (phaseRef.current === "watching") {
        playerRef.current?.pause();
        seekSnapbackTimeRef.current = highWaterMarkRef.current;
        showSeekWarningRef.current = true;
        setShowSeekWarning(true);
      }
    }
    // Track high-water mark
    if (t > highWaterMarkRef.current) highWaterMarkRef.current = t;

    // ── Seek/scrub protection ──
    // Only count time that advances organically (≤ 3s delta covers up to ~2x speed).
    // Seeking/scrubbing forward produces a large delta → not counted.
    const delta = t - lastWatchedTimeRef.current;
    if (delta > 0 && delta <= 3) {
      setWatchedSeconds((prev) => prev + delta);
    }
    lastWatchedTimeRef.current = t;

    lastTimeRef.current = t;
    setElapsedSeconds(t);

    // Only check trail markers when in watching phase
    if (phaseRef.current !== "watching") return;
    if (trailMarkersRef.current.length === 0) return;

    const next = trailMarkersRef.current.find(
      (q: any) =>
        !answeredQuestionsRef.current.has(q.id) &&
        t >= q.triggerAtSeconds
    );

    if (next) {
      const idx = trailMarkersRef.current.indexOf(next);
      setCurrentQuestionIdx(idx);
      playerRef.current?.pause();
      setPhase("trail_marker");
    }

    // Auto-end detection — use Wistia player's actual duration (not DB durationSeconds
    // which can be inaccurate/rounded). Fall back to DB value if player duration unavailable.
    const player = playerRef.current;
    const actualDur = player?.duration;
    const clipDur = actualDur && actualDur > 0 ? actualDur : clipData?.clip?.durationSeconds;
    if (player && (player.ended || (clipDur && t >= clipDur - 30))) {
      if (!autoEndedRef.current) {
        const allAnswered = trailMarkersRef.current.every(
          (q: any) => answeredQuestionsRef.current.has(q.id)
        );
        if (allAnswered || trailMarkersRef.current.length === 0) {
          autoEndedRef.current = true;
          handleFinishWatchingRef.current();
        }
      }
    }
  }, [clipData]);
  // ────────────────────────────────────────────────────────────────────────────

  // Read and clear source param ("library" = clicked from Library, absent = deep link)
  const [searchParams, setSearchParams] = useSearchParams();
  const fromLibrary = useRef(searchParams.get("source") === "library");
  useEffect(() => {
    if (searchParams.has("source")) {
      searchParams.delete("source");
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Session init — runs on mount AND when clipId changes (e.g. "Continue to Next")
  useEffect(() => {
    if (!clipId || !viewer?.id) return;

    // Reset all session-specific state so nothing carries over between clips
    setPhase("loading_resume");
    setPausedSessionData(null);
    setSessionId(null);
    setCurrentQuestionIdx(0);
    setAnsweredQuestions(new Set());
    answeredQuestionsRef.current = new Set();
    setCorrectCount(0);
    setTotalTrailMarkers(0);
    setScore(0);
    setSearchRescueScore(null);
    setSrCorrectCount(0);
    setSearchRescueTriggered(false);
    setNewEngagementScore(null);
    setEngagementScore(null);
    setIncorrectQuestions([]);
    setReportReady(false);
    setElapsedSeconds(0);
    setWatchedSeconds(0);
    setFocusSeconds(0);
    setBlurSeconds(0);
    setXpData(null);
    autoEndedRef.current = false;
    videoEndedWhileQuizRef.current = false;
    resumeFromSecondsRef.current = null;
    lastTimeRef.current = 0;
    lastWatchedTimeRef.current = 0;
    tabAwayCountRef.current = 0;
    lowVolumeSecondsRef.current = 0;
    isLowVolumeRef.current = false;
    hasShownPlayToastRef.current = false;
    setPlayToastVisible(false);
    setPlayToastFading(false);
    showSeekWarningRef.current = false;
    setShowSeekWarning(false);
    seekSnapbackTimeRef.current = null;
    highWaterMarkRef.current = 0;

    executeApi("GetPausedSession", { clipId, viewerId: viewer.id })
      .then((result: any) => {
        // 1. Passed clip via deep link (no ?source=library) → redirect to report
        if (result?.hasCompletedSession && !fromLibrary.current) {
          navigate(`/report/${clipId}`, { replace: true });
          return;
        }
        // 2. Paused session → show resume prompt
        if (result?.hasPausedSession && result.session) {
          setPausedSessionData(result.session);
          setPhase("resume_prompt");
          return;
        }
        // 3. No paused, not passed → start/get session
        startSession({ clipId, viewerId: viewer.id })
          .then((res: any) => {
            if (res?.alreadyPassed) {
              // Safety: shouldn't reach here, but redirect if passed
              navigate(`/report/${clipId}`, { replace: true });
              return;
            }
            setSessionId(res?.sessionId ?? null);
            setPhase("watching");
          })
          .catch(console.error);
      })
      .catch(() => {
        startSession({ clipId, viewerId: viewer.id })
          .then((res: any) => {
            setSessionId(res?.sessionId ?? null);
            setPhase("watching");
          })
          .catch(console.error);
      });
  }, [clipId, viewer?.id, startSession, navigate]);

  const handleResume = useCallback(() => {
    if (!pausedSessionData) return;
    setSessionId(pausedSessionData.id);
    setElapsedSeconds(pausedSessionData.elapsedSeconds);
    setWatchedSeconds(pausedSessionData.watchedSeconds ?? pausedSessionData.elapsedSeconds);
    lastWatchedTimeRef.current = pausedSessionData.elapsedSeconds;
    lowVolumeSecondsRef.current = pausedSessionData.lowVolumeSeconds ?? 0;
    setFocusSeconds(pausedSessionData.focusSeconds);
    setBlurSeconds(pausedSessionData.blurSeconds);
    setAnsweredQuestions(new Set(pausedSessionData.answeredQuestionIds));
    setCorrectCount(pausedSessionData.correctCount);
    resumeFromSecondsRef.current = pausedSessionData.elapsedSeconds;
    setPhase("watching");
  }, [pausedSessionData]);

  const handleStartFresh = useCallback(() => {
    if (!clipId || !viewer?.id) return;
    // Reset all progress state for a truly fresh start
    resumeFromSecondsRef.current = 0;
    setElapsedSeconds(0);
    setFocusSeconds(0);
    setBlurSeconds(0);
    tabAwayCountRef.current = 0;
    lowVolumeSecondsRef.current = 0;
    setCorrectCount(0);
    setAnsweredQuestions(new Set());
    setWatchedSeconds(0);
    lastWatchedTimeRef.current = 0;
    // Use ResetSession to wipe responses + reset existing session row (not create a new one)
    resetSession({ clipId, viewerId: viewer.id, adminForce: false })
      .then((res: any) => {
        if (res?.alreadyPassed) {
          // Clip is done — shouldn't be able to Fresh Start a passed clip
          navigate(`/report/${clipId}`, { replace: true });
          return;
        }
        setSessionId(res?.sessionId ?? null);
        setPhase("watching");
      })
      .catch(console.error);
  }, [clipId, viewer?.id, resetSession, navigate]);

  const handlePauseAndBack = useCallback(async () => {
    if (sessionId && phase === "watching") {
      // ── Layer 1: Intercept "Back to Clips" at ≥85% + all markers answered ──
      // Instead of pausing and navigating away, trigger the completion flow.
      // The Ranger Report will overlay while the video keeps playing underneath.
      const clipDuration = clipData?.clip?.durationSeconds;
      const watchPct = clipDuration && clipDuration > 0 ? watchedSeconds / clipDuration : 0;
      const allAnswered = trailMarkersRef.current.length === 0 ||
        trailMarkersRef.current.every((q: any) => answeredQuestionsRef.current.has(q.id));

      if (watchPct >= 0.85 && allAnswered && !autoEndedRef.current) {
        autoEndedRef.current = true;
        handleFinishWatchingRef.current();
        return; // Don't navigate — Ranger Report will show
      }

      playerRef.current?.pause();
      try {
        await pauseSession({
          sessionId,
          elapsedSeconds,
          focusSeconds,
          blurSeconds,
          watchedSeconds,
          answeredQuestionIds: Array.from(answeredQuestions),
          correctCount,
          phase: "watching",
          lowVolumeSeconds: lowVolumeSecondsRef.current,
        });
      } catch (e) {
        console.error("Pause save failed:", e);
      }
    }
    navigate(getLibraryPath());
  }, [sessionId, phase, clipData, pauseSession, elapsedSeconds, focusSeconds, blurSeconds, watchedSeconds, answeredQuestions, correctCount, navigate]);

  // 30-second autosave — reads from refs so the interval never resets
  useEffect(() => {
    if (phase !== "watching" || !sessionId) return;
    const autosaveInterval = setInterval(() => {
      executeApi("PauseSession", {
        sessionId: sessionIdRef.current!,
        elapsedSeconds: elapsedSecondsRef.current,
        focusSeconds: focusSecondsRef.current,
        blurSeconds: blurSecondsRef.current,
        watchedSeconds: watchedSecondsRef.current,
        answeredQuestionIds: Array.from(answeredQuestionsRef.current),
        correctCount: correctCountRef.current,
        phase: "watching",
        lowVolumeSeconds: lowVolumeSecondsRef.current,
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(autosaveInterval);
  }, [phase, sessionId]); // Only phase + sessionId — counter refs are always fresh

  // Save on hide/unload — refs-based so handlers are stable and always current
  // Layer 4: If learner is at ≥85% watched + all markers answered, save with
  // phase "near_complete" so the Library can auto-complete on next visit.
  const clipDurationRef = useRef<number | null>(null);
  useEffect(() => { clipDurationRef.current = clipData?.clip?.durationSeconds ?? null; }, [clipData?.clip?.durationSeconds]);

  useEffect(() => {
    if (phase !== "watching" || !sessionId) return;

    const getNearCompletePhase = (): string => {
      const dur = clipDurationRef.current;
      if (!dur || dur <= 0) return "watching";
      const pct = watchedSecondsRef.current / dur;
      const allAnswered = trailMarkersRef.current.length === 0 ||
        trailMarkersRef.current.every((q: any) => answeredQuestionsRef.current.has(q.id));
      return (pct >= 0.85 && allAnswered) ? "near_complete" : "watching";
    };

    const buildPayload = () => ({
      sessionId: sessionIdRef.current!,
      elapsedSeconds: elapsedSecondsRef.current,
      focusSeconds: focusSecondsRef.current,
      blurSeconds: blurSecondsRef.current,
      watchedSeconds: watchedSecondsRef.current,
      answeredQuestionIds: Array.from(answeredQuestionsRef.current),
      correctCount: correctCountRef.current,
      phase: getNearCompletePhase(),
      lowVolumeSeconds: lowVolumeSecondsRef.current,
    });

    const saveOnHide = () => {
      if (document.visibilityState === "hidden") {
        executeApi("PauseSession", buildPayload()).catch(() => {});
      }
    };
    const saveOnUnload = () => {
      executeApi("PauseSession", buildPayload()).catch(() => {});
    };
    document.addEventListener("visibilitychange", saveOnHide);
    window.addEventListener("beforeunload", saveOnUnload);
    return () => {
      document.removeEventListener("visibilitychange", saveOnHide);
      window.removeEventListener("beforeunload", saveOnUnload);
    };
  }, [phase, sessionId]); // Only phase + sessionId — all data read from refs

  // Tab visibility — pause video when tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        isFocusedRef.current = false;
        if (phaseRef.current === "watching") {
          playerRef.current?.pause();
          tabAwayCountRef.current += 1;
          setTabAway(true);
        }
      } else {
        isFocusedRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // No phase dependency needed — uses phaseRef

  // ──────────────────────────────────────────────────────────
  // LOCKDOWN: Once the Ranger Report fires, the learner is
  // locked in until they pass S&R or complete WtS.
  // Three layers: React Router blocker, beforeunload, and
  // history-stack guard (browser back button).
  // ──────────────────────────────────────────────────────────
  const isLocked = LOCKED_PHASES.has(phase);

  // 1. React Router navigation blocker — prevents in-app navigation
  useBlocker(() => {
    if (LOCKED_PHASES.has(phaseRef.current)) {
      return true; // block navigation
    }
    return false;
  });

  // 2. beforeunload — warns on tab close / reload during locked phases
  useEffect(() => {
    if (!isLocked) return;
    const warnBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isLocked]);

  // 3. History-stack guard — traps browser back button
  useEffect(() => {
    if (!isLocked) return;
    // Push a guard entry so pressing back stays on this page
    window.history.pushState({ locked: true }, "");
    const trapBack = (e: PopStateEvent) => {
      if (LOCKED_PHASES.has(phaseRef.current)) {
        // Re-push to keep them on the page
        window.history.pushState({ locked: true }, "");
      }
    };
    window.addEventListener("popstate", trapBack);
    return () => window.removeEventListener("popstate", trapBack);
  }, [isLocked]);

  const handleDismissTabOverlay = useCallback(() => {
    setTabAway(false);
    playerRef.current?.play();
  }, []);

  // Auto-trigger Ranger Report at end of video
  useEffect(() => {
    if (phase !== "watching" || autoEndedRef.current) return;
    const clipDuration = clipData?.clip?.durationSeconds;
    if (!clipDuration || clipDuration <= 0) return;
    if (elapsedSeconds >= clipDuration - 30) {
      const allAnswered = trailMarkers.every((q: any) => answeredQuestions.has(q.id));
      if (allAnswered || trailMarkers.length === 0) {
        autoEndedRef.current = true;
        handleFinishWatchingRef.current();
      }
    }
  }, [elapsedSeconds, phase, clipData, trailMarkers, answeredQuestions]);

  // ── Layer 2: Nudge banner at ~80% watched ──
  // Shows a subtle, camp-themed reminder when the learner is near the end.
  useEffect(() => {
    if (phase !== "watching" || nudgeDismissedRef.current || isLite) return;
    const clipDuration = clipData?.clip?.durationSeconds;
    if (!clipDuration || clipDuration <= 0) return;
    const pct = watchedSeconds / clipDuration;
    if (pct >= 0.80 && !showNudgeBanner) {
      setShowNudgeBanner(true);
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        nudgeDismissedRef.current = true;
        setShowNudgeBanner(false);
      }, 10_000);
      return () => clearTimeout(timer);
    }
  }, [watchedSeconds, phase, clipData, isLite, showNudgeBanner]);

  const handleTrailMarkerAnswer = useCallback(
    (selectedOption: number) => {
      const question = trailMarkers[currentQuestionIdx];
      if (!question || !sessionId) return;
      const correct = selectedOption === question.correctOption;
      if (correct) setCorrectCount((c) => c + 1);
      if (!correct) {
        setIncorrectQuestions((prev) => [
          ...prev,
          {
            id: question.id,
            triggerAtSeconds: question.triggerAtSeconds,
            questionText: question.questionText,
          },
        ]);
      }
      const updatedSet = new Set(answeredQuestions).add(question.id);
      answeredQuestionsRef.current = updatedSet; // Sync ref immediately — prevents race at 2x speed
      setAnsweredQuestions(updatedSet);
      setTotalTrailMarkers((t) => t + 1);
      submitAnswer({
        sessionId,
        questionId: question.id,
        selectedOption,
        isCorrect: correct,
        timeToAnswer: null,
      }).catch(console.error);
    },
    [trailMarkers, currentQuestionIdx, sessionId, submitAnswer, answeredQuestions]
  );

  const handleTrailMarkerContinue = useCallback(() => {
    // Safety net: if video already ended while quiz was showing, complete now
    const player = playerRef.current;
    const actualDur = player?.duration;
    const clipDur = actualDur && actualDur > 0 ? actualDur : clipData?.clip?.durationSeconds;
    const videoAlreadyEnded = videoEndedWhileQuizRef.current || player?.ended || (clipDur && lastTimeRef.current >= clipDur - 30);
    const allAnswered = trailMarkersRef.current.every(
      (q: any) => answeredQuestionsRef.current.has(q.id)
    );
    if (videoAlreadyEnded && allAnswered && !autoEndedRef.current) {
      autoEndedRef.current = true;
      handleFinishWatchingRef.current();
      return;
    }
    setPhase("watching");
    player?.play();
  }, [clipData]);

  const handleFinishWatching = useCallback(async () => {
    playerRef.current?.pause();

    // ── Lite clip path: skip engagement, skip Ranger Report, complete & go back ──
    if (isLite) {
      if (viewer?.id && clipId && sessionId) {
        try {
          await withRetry(() => completeClipPath({
            viewerId: viewer.id,
            clipId,
            sessionId,
            path: "first_pass",
          }));
        } catch (err) {
          console.error("completeClipPath failed for lite clip after retries:", err);
          toast.error("Progress could not be saved. Please try again.");
          setCompletionError("lite");
          return; // Don't advance — let learner retry
        }
      }
      setCompletionError(null);
      setPhase("lite_complete");
      return;
    }

    const allTrailMarkerCount = trailMarkers.length;
    setTotalTrailMarkers(allTrailMarkerCount || totalTrailMarkers);
    const finalTotal = allTrailMarkerCount || 1;
    const pct = Math.round((correctCount / finalTotal) * 100);
    setScore(pct);

    // Await EndSession to get the REAL engagement score (questions + focus + time)
    // S&R triggers off overall engagement < 80%, not just trail marker %
    let passedFirstPass = false;
    if (sessionId) {
      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      try {
        const res: any = await withRetry(() => endSession({
          sessionId,
          totalFocusSeconds: focusSeconds,
          totalBlurSeconds: blurSeconds,
          totalTimeSeconds: watchedSeconds,
          clipDurationSeconds: clipDuration,
          tabAwayCount: tabAwayCountRef.current,
          lowVolumeSeconds: lowVolumeSecondsRef.current,
        }));
        if (res?.engagementScore !== undefined) {
          setEngagementScore(res.engagementScore);
          setScore(res.engagementScore);
        }
        setReportReady(true);
        passedFirstPass = res?.passed === true;
      } catch (err) {
        console.error("endSession failed after retries:", err);
        // Fallback: use trail marker % if EndSession fails completely
        passedFirstPass = pct >= 80;
        setReportReady(true);
      }
    }

    if (passedFirstPass && viewer?.id && clipId && sessionId) {
      // First-pass success → CompleteClipPath is the sole gatekeeper for completion
      try {
        await withRetry(() => completeClipPath({
          viewerId: viewer.id,
          clipId,
          sessionId,
          path: "first_pass",
        }));
        setCompletionError(null);
      } catch (err) {
        console.error("completeClipPath failed after retries:", err);
        toast.error("Your completion could not be saved. Please tap 'Try Again' to retry.");
        setCompletionError("first_pass");
        // Still show Ranger Report so they see their score, but the error banner will appear
      }

      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      // Award XP with retry — ensures XP is reliably written even on transient failures
      const awardXPWithRetry = async (attempt = 1): Promise<any> => {
        try {
          return await awardXP({
            viewerId: viewer.id,
            clipId,
            sessionId,
            trailMarkerCorrect: correctCount,
            trailMarkerTotal: allTrailMarkerCount,
            passedFirstPass: true,
            searchRescueTriggered: false,
            searchRescueScore: null,
            searchRescueTotal: null,
            weatherStormTriggered: false,
            totalTimeSeconds: watchedSeconds,
            clipDurationSeconds: clipDuration,
          });
        } catch (err) {
          if (attempt < 2) {
            return awardXPWithRetry(attempt + 1);
          }
          throw err;
        }
      };

      awardXPWithRetry()
        .then((res: any) => {
          if (res?.badgesEarned?.length > 0) {
            res.badgesEarned.forEach((b: any) => {
              toast.success(`${b.emoji} Badge earned: ${b.name} (+${b.xp} XP)`);
            });
          }
          if (res?.newTier) {
            toast.success(`${res.newTier.emoji} Tier up! You're now a ${res.newTier.name}!`);
          }
          const sessionBreakdown = res?.sessionBreakdown ?? { base: 0, milestones: 0, bonuses: 0 };
          if (viewer?.id) {
            executeApi("GetLearnerProgress", { viewerId: viewer.id })
              .then((progress: any) => {
                setXpData({
                  sessionBreakdown,
                  totalXp: progress.totalXp,
                  tier: { name: progress.tier.name, emoji: progress.tier.emoji },
                });
              })
              .catch(() => {
                setXpData({
                  sessionBreakdown,
                  totalXp: res?.totalXp ?? 0,
                  tier: { name: "Base Camper", emoji: "🏕️" },
                });
              });
          }
        })
        .catch((err: any) => {
          console.error("awardXP failed after retry:", err);
          toast.error("XP could not be saved. Your progress was recorded — XP will sync shortly.");
        });
    }

    setPhase("ranger_report");
  }, [
    trailMarkers, totalTrailMarkers, correctCount, sessionId, endSession,
    watchedSeconds, focusSeconds, blurSeconds, viewer, clipId, clipData, awardXP, completeClipPath,
    isLite, navigate,
  ]);

  const handleFinishWatchingRef = useRef(handleFinishWatching);
  useEffect(() => { handleFinishWatchingRef.current = handleFinishWatching; }, [handleFinishWatching]);

  // ─── Retry completion after total failure ──────────────────────────────────
  const retryCompletion = useCallback(async () => {
    if (!completionError || !viewer?.id || !clipId || !sessionId) return;
    setCompletionError(null);
    try {
      await withRetry(() => completeClipPath({
        viewerId: viewer.id,
        clipId,
        sessionId,
        path: completionError === "lite" ? "first_pass" : completionError,
      }));
      toast.success("Progress saved successfully!");
      // For lite clips that were blocked, advance to complete phase now
      if (completionError === "lite") {
        setPhase("lite_complete");
      }
    } catch (err) {
      console.error("retryCompletion still failed:", err);
      toast.error("Still unable to save. Check your connection and try again.");
      setCompletionError(completionError); // restore error state
    }
  }, [completionError, viewer?.id, clipId, sessionId, completeClipPath]);

  const handleSearchRescueComplete = useCallback(
    async (passed: boolean, rescueScore: number) => {
      setSearchRescueTriggered(true);
      setSearchRescueScore(rescueScore);

      // Compute actual correct count from percentage
      const srTotal = recoveryQuestions.length;
      const computedCorrect = Math.round((rescueScore / 100) * srTotal);
      setSrCorrectCount(computedCorrect);

      if (viewer?.id && clipId && sessionId) {
        const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;

        // Await awardXP with retry so XP data is ready for the popup before it renders
        let awardRes: any = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            awardRes = await awardXP({
              viewerId: viewer.id,
              clipId,
              sessionId,
              trailMarkerCorrect: correctCount,
              trailMarkerTotal: trailMarkers.length,
              passedFirstPass: false,
              searchRescueTriggered: true,
              searchRescueScore: rescueScore,
              searchRescueTotal: srTotal,
              weatherStormTriggered: false,
              totalTimeSeconds: watchedSeconds,
              clipDurationSeconds: clipDuration,
            });
            break; // success — exit retry loop
          } catch (err) {
            if (attempt >= 2) {
              console.error("awardXP failed after retry:", err);
              toast.error("XP could not be saved. Your progress was recorded — XP will sync shortly.");
            }
          }
        }
        if (awardRes) {
          if (awardRes.badgesEarned?.length > 0) {
            awardRes.badgesEarned.forEach((b: any) => {
              toast.success(`${b.emoji} Badge earned: ${b.name} (+${b.xp} XP)`);
            });
          }
          if (awardRes.newTier) {
            toast.success(`${awardRes.newTier.emoji} Tier up! You're now a ${awardRes.newTier.name}!`);
          }
          // Capture XP data for the S&R pass popup (same pattern as Ranger Report)
          if (passed) {
            const sessionBreakdown = awardRes.sessionBreakdown ?? { base: 0, milestones: 0, bonuses: 0 };
            setXpData({
              sessionBreakdown,
              totalXp: awardRes.totalXp ?? 0,
              tier: { name: "Base Camper", emoji: "🏕️" },
            });
          }
        }

        // Await completeClipPath so completed=true is written BEFORE popup/navigation
        // CompleteClipPath recalculates engagement with combined trail + S&R quiz
        if (passed) {
          try {
            const cpResult: any = await withRetry(() => completeClipPath({
              viewerId: viewer.id,
              clipId,
              sessionId,
              path: "search_rescue",
            }));
            if (cpResult?.newEngagementScore != null) {
              setNewEngagementScore(cpResult.newEngagementScore);
            }
          } catch (err) {
            console.error("completeClipPath (S&R) failed after retries:", err);
            toast.error("Your completion could not be saved. Please tap 'Try Again' to retry.");
            setCompletionError("search_rescue");
          }
        }
      }

      if (passed) {
        setPhase("search_rescue_passed");
      } else {
        setPhase("weather_storm");
      }
    },
    [viewer, clipId, sessionId, clipData, elapsedSeconds, recoveryQuestions, correctCount, trailMarkers, awardXP, completeClipPath]
  );

  const handleWeatherExpire = useCallback(async () => {
    if (viewer?.id && clipId && sessionId) {
      // Await completeClipPath so completed=true is written BEFORE navigating to Library
      try {
        await withRetry(() => completeClipPath({
          viewerId: viewer.id,
          clipId,
          sessionId,
          path: "weather_storm",
        }));
      } catch (err) {
        console.error("completeClipPath (WtS) failed after retries:", err);
        toast.error("Your completion could not be saved. Please tap 'Try Again' to retry.");
        setCompletionError("weather_storm");
      }

      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      let awardRes: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          awardRes = await awardXP({
            viewerId: viewer.id,
            clipId,
            sessionId,
            trailMarkerCorrect: correctCount,
            trailMarkerTotal: trailMarkers.length,
            passedFirstPass: false,
            searchRescueTriggered: true,
            searchRescueScore: searchRescueScore,
            searchRescueTotal: recoveryQuestions.length,
            weatherStormTriggered: true,
            totalTimeSeconds: watchedSeconds,
            clipDurationSeconds: clipDuration,
          });
          break;
        } catch (err) {
          if (attempt >= 2) {
            console.error("awardXP failed after retry:", err);
            toast.error("XP could not be saved. Your progress was recorded — XP will sync shortly.");
          }
        }
      }
      if (awardRes?.xpAwarded) {
        toast.success(`+${awardRes.xpAwarded} XP — persistence pays off!`);
      }
    }
    setPhase("complete"); // Release lockdown before navigating
    navigate(getLibraryPath());
  }, [navigate, viewer, clipId, sessionId, clipData, watchedSeconds, correctCount, trailMarkers, searchRescueScore, recoveryQuestions, awardXP, completeClipPath]);

  // Load Wistia transcript web component script
  useEffect(() => {
    const SCRIPT_SRC = "https://fast.wistia.com/assets/external/transcript.js";
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  // If no valid clipId or viewer (after loading finishes), show fallback
  if (!clipId || (!viewer?.id && !viewerLoading)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500">No clip selected.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Go to Clip Library
          </button>
        </div>
      </div>
    );
  }

  if (clipLoading || !clipData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-500">Loading clip…</p>
        </div>
      </div>
    );
  }

  const clip = clipData.clip;

  // Determine where "Continue to Next" should go. Resource days (no video URL)
  // route to their cAMP Gear landing page, not the video watch page.
  const nextClip = clipData.nextClip;
  const nextIsResourceDay = !!nextClip && nextClip.videoUrl === null;
  const goToNextClip = nextClip
    ? () => {
        if (nextIsResourceDay) {
          const topicKey = nextClip.sortOrder === 60 ? "day5" : nextClip.sortOrder === 165 ? "day13_sdr_roe" : "day9";
          navigate(`/topic-gear/${topicKey}/${nextClip.id}`);
        } else {
          navigate(`/watch/${nextClip.id}`);
        }
      }
    : undefined;

  const durationFormatted = clip.durationSeconds
    ? `${Math.floor(clip.durationSeconds / 3600) > 0 ? Math.floor(clip.durationSeconds / 3600) + "h " : ""}${Math.floor((clip.durationSeconds % 3600) / 60)}m`
    : "";

  if (phase === "loading_resume") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-500">Checking for saved progress…</p>
        </div>
      </div>
    );
  }

  if (phase === "resume_prompt" && pausedSessionData) {
    return (
      <ResumePrompt
        clipTitle={clip.title}
        elapsedSeconds={pausedSessionData.elapsedSeconds}
        durationSeconds={clip.durationSeconds}
        answeredCount={pausedSessionData.answeredQuestionIds.length}
        totalQuestions={trailMarkers.length}
        onResume={handleResume}
        onStartFresh={handleStartFresh}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-57px)] overflow-hidden">
      {/* Completion save error — visible retry banner */}
      {completionError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-800">
            Your progress couldn't be saved. Check your connection and try again.
          </p>
          <button
            onClick={retryCompletion}
            className="shrink-0 px-4 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">
            {clip.title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {durationFormatted && <><span>⏱️ {durationFormatted}</span><span className="mx-1.5 text-gray-300">·</span></>}
            <span>🪧 {trailMarkers.length} Trail Markers</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span>⏮️ Rewatch unlocks after completion</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span>💬 CC available — click CC on the video for captions & auto-translation</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-4 pb-2">
          {/* Timer pill — always yellow */}
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-100 text-amber-700">
            ⏱ {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")}
            {!isVideoPlaying && phase === "watching" && " ⏸"}
          </span>
          {/* "What's the buzz?" — re-open guide panel after swat-away */}
          {guideEntry && !showGuide && (
            <button
              onClick={() => setShowGuide(true)}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              🦟 What's the buzz?
            </button>
          )}

          {/* Follow Along — open the demo'd tool on a 2nd screen */}
          {guideEntry?.followAlongUrl && (
            <div className="relative" ref={followAlongRef}>
              <button
                onClick={() => setShowFollowAlong((v) => !v)}
                className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  showFollowAlong
                    ? "bg-orange-500 text-white"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                🖥️ Follow Along
              </button>
              {showFollowAlong && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-30">
                  <p className="text-sm text-gray-700 font-medium mb-1.5">
                    Open <span className="font-bold">{guideEntry.followAlongLabel}</span> on a second monitor to follow along.
                  </p>
                  <p className="text-xs text-amber-600 mb-3">
                    ⚠️ Switching tabs will pause the video and affect your engagement score.
                  </p>
                  <a
                    href={guideEntry.followAlongUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  >
                    Open {guideEntry.followAlongLabel} ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Transcript — blue outlined button */}
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              showTranscript
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            📄 Transcript
          </button>

          {/* Back to Clips — hidden during locked phases (S&R / WtS / Ranger Report) */}
          {!isLocked && (
            <button
              onClick={handlePauseAndBack}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
            >
              🎞️ Back to Clips
            </button>
          )}
        </div>
      </div>

      {/* Ascent Guide — summary + learning objectives */}
      {guideEntry && showGuide && (
        <AscentGuidePanel entry={guideEntry} isOpen={true} onSwatAway={handleSwatAway} />
      )}

      {/* Video + transcript */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex items-center justify-center bg-black relative">
          {wistiaVideoId ? (
            <div style={{ position: "relative", width: "100%", maxHeight: "100%", aspectRatio: "16 / 9" }}>
              <WistiaPlayer
                ref={playerRef}
                mediaId={wistiaVideoId}
                playerColor="ff5733"
                fullscreenControl={false}
                autoplay={false}
                silentAutoplay={false}
                resumable={false}
                currentTime={resumeFromSecondsRef.current ?? undefined}
                onPlay={handleWistiaPlay}
                onPause={handleWistiaPause}
                onEnded={handleWistiaEnded}
                onSecondChange={handleWistiaSecondChange}
                onVolumeChange={handleWistiaVolumeChange}

                style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <span className="text-3xl">📹</span>
              <p className="text-sm">Video URL not yet configured</p>
              <p className="text-xs text-white/40">
                Clip will be available once the admin adds the video link
              </p>
            </div>
          )}

          {/* Play-start fade toast — non-blocking reminder */}
          {playToastVisible && (
            <div
              className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-1000 ${
                playToastFading ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="bg-black/80 backdrop-blur-sm text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg">
                🎬 Watch straight through — trail markers are synced to the video
              </div>
            </div>
          )}

          {/* Layer 2: Nudge banner — "Almost a wrap" at ~80% watched */}
          {showNudgeBanner && phase === "watching" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-black/85 backdrop-blur-sm text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg flex items-center gap-2">
                <span>🎬 Almost a wrap — your Ranger Report is just around the bend!</span>
                <button
                  onClick={() => { nudgeDismissedRef.current = true; setShowNudgeBanner(false); }}
                  className="text-white/60 hover:text-white ml-1 text-xs"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Backward seek warning modal */}
          {showSeekWarning && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
              <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center shadow-2xl">
                <p className="text-2xl mb-2">⏪</p>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Heads up!
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  Rewinding may cause trail markers to appear out of order.
                </p>
                <p className="text-sm text-gray-500 mb-5">
                  After you finish, <span className="font-semibold text-indigo-600">Rewatch Clip</span> lets you review freely with no trail markers.
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={handleSeekWarningKeepWatching}
                    className="w-full py-2.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md"
                  >
                    ▶ Keep Watching
                  </button>
                  <button
                    onClick={handleSeekWarningRewindAnyway}
                    className="w-full py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Rewind Anyway
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab-away overlay */}
          {tabAway && phase === "watching" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-white text-lg font-semibold mb-3">
                  Video paused — come back to continue 👀
                </p>
                <button
                  onClick={handleDismissTabOverlay}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  ▶ Resume Watching
                </button>
              </div>
            </div>
          )}
        </div>

        {showTranscript && wistiaVideoId && phase === "watching" && (
          <div className="w-[340px] flex-shrink-0 border-l border-gray-200 overflow-y-auto bg-white">
            {/* @ts-expect-error wistia-transcript is a web component */}
            <wistia-transcript media-id={wistiaVideoId} accent-color="#4F46E5" />
          </div>
        )}
      </div>

      {/* Trail Marker Overlay */}
      {phase === "trail_marker" && trailMarkers[currentQuestionIdx] && (
        <QuizOverlayV2
          question={trailMarkers[currentQuestionIdx] as any}
          onAnswer={handleTrailMarkerAnswer}
          onContinue={handleTrailMarkerContinue}
        />
      )}

      {/* Ranger Report */}
      {phase === "ranger_report" && reportReady && (
        <RangerReport
          clipTitle={clip.title}
          totalQuestions={trailMarkers.length || 1}
          correctAnswers={correctCount}
          score={score}
          needsRecovery={score < 80 && recoveryQuestions.length > 0}
          onBackToClips={() => { setPhase("complete"); navigate(getLibraryPath()); }}
          onContinueToNext={goToNextClip ? () => { setPhase("complete"); goToNextClip(); } : undefined}
          nextIsResourceDay={nextIsResourceDay}
          onSearchRescue={() => setPhase("search_rescue")}
          incorrectQuestions={incorrectQuestions}
          xpData={xpData ?? undefined}
          onTimestampClick={(seconds) => {
            setPhase("watching");
            const p = playerRef.current;
            if (p) {
              p.currentTime = seconds;
              p.play();
            }
          }}
        />
      )}

      {/* Search & Rescue */}
      {phase === "search_rescue" && (
        <SearchRescue
          questions={recoveryQuestions as any}
          sessionId={sessionId ?? ""}
          submitAnswer={submitAnswer}
          onComplete={handleSearchRescueComplete}
        />
      )}

      {/* S&R Pass Popup */}
      {phase === "search_rescue_passed" && (
        <SearchRescuePassPopup
          clipTitle={clip.title}
          srCorrect={srCorrectCount}
          srTotal={recoveryQuestions.length}
          srScore={searchRescueScore ?? 0}
          newEngagementScore={newEngagementScore}
          xpData={xpData ?? undefined}
          onBackToClips={() => navigate(getLibraryPath())}
          onContinueToNext={goToNextClip}
          nextIsResourceDay={nextIsResourceDay}
        />
      )}

      {/* Lite clip completion overlay */}
      {phase === "lite_complete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <p className="text-4xl mb-3">✅</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Clip Complete!</h2>
            <p className="text-sm text-gray-700 mb-1">
              📞 <span className="font-semibold">Cold Calling in an AI World</span> is now unlocked.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Up next: the Reachdesk walkthrough — learn how to turn gifts into booked meetings.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => navigate(getLibraryPath())}
                className="w-full py-2.5 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-md"
              >
                🎁 Watch Reachdesk Clip
              </button>
              <button
                onClick={() => navigate(getLibraryPath())}
                className="w-full py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Back to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weather the Storm */}
      {phase === "weather_storm" && (
        clipData.weatherStorm ? (
          <WeatherStorm
            overview={clipData.weatherStorm.overview}
            takeaways={clipData.weatherStorm.takeaways}
            timerMinutes={2}
            clipTitle={clip.title}
            onTimerExpire={handleWeatherExpire}
            trailCorrect={correctCount}
            trailTotal={trailMarkers.length}
            srCorrect={srCorrectCount}
            srTotal={recoveryQuestions.length}
          />
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-white rounded-2xl p-6 text-center max-w-sm">
              <p className="font-semibold mb-3">Loading reflection content…</p>
              <button onClick={handleWeatherExpire} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                Continue anyway →
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
