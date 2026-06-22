import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { executeApi } from "@/lib/executeApi.js";
import { useViewer } from "@/components/ViewerContext";
import QuizOverlayV2 from "@/components/QuizOverlayV2";
import RangerReport from "@/components/RangerReport";
import SearchRescue from "@/components/SearchRescue";
import WeatherStorm from "@/components/WeatherStorm";
import ResumePrompt from "@/components/ResumePrompt";
import TranscriptPanel from "@/components/TranscriptPanel";
import { WistiaPlayer } from "@wistia/wistia-player-react";
import { toast } from "sonner";
import { getClipEmoji } from "@/lib/clip-emojis";

type WatchPhase =
  | "loading_resume"
  | "resume_prompt"
  | "watching"
  | "trail_marker"
  | "ranger_report"
  | "search_rescue"
  | "weather_storm"
  | "complete";

function getWistiaVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? null;
  } catch {
    return null;
  }
}

export default function WatchPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();

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
  const [searchRescueTriggered, setSearchRescueTriggered] = useState(false);
  const [engagementScore, setEngagementScore] = useState<number | null>(null);
  const [incorrectQuestions, setIncorrectQuestions] = useState<
    Array<{ id: string; triggerAtSeconds: number; questionText: string }>
  >([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [blurSeconds, setBlurSeconds] = useState(0);
  const isFocusedRef = useRef(true);
  const lastTimeRef = useRef(0);
  const focusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tabAway, setTabAway] = useState(false);
  const tabAwayCountRef = useRef(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [xpData, setXpData] = useState<{
    sessionBreakdown: { base: number; milestones: number; bonuses: number };
    totalXp: number;
    tier: { name: string; emoji: string };
  } | null>(null);
  const autoEndedRef = useRef(false);
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

  // Keep refs in sync with latest state on every render
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { trailMarkersRef.current = trailMarkers; }, [trailMarkers]);
  useEffect(() => { answeredQuestionsRef.current = answeredQuestions; }, [answeredQuestions]);

  // Focus/blur time tracking
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
      }
    }, 1000);
    return () => {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    };
  }, [phase, isVideoPlaying]);

  // ─── WistiaPlayer event handlers (React props, not addEventListener) ────────
  // These callbacks are passed as props to <WistiaPlayer> so they work reliably
  // regardless of web component lifecycle timing. They use refs for stale-closure safety.
  const handleWistiaPlay = useCallback(() => setIsVideoPlaying(true), []);
  const handleWistiaPause = useCallback(() => setIsVideoPlaying(false), []);
  const handleWistiaEnded = useCallback(() => setIsVideoPlaying(false), []);

  const handleWistiaSecondChange = useCallback((e: any) => {
    const t: number = typeof e?.detail?.second === "number"
      ? e.detail.second
      : Math.floor(playerRef.current?.currentTime ?? 0);

    if (t === lastTimeRef.current) return;
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

    // Auto-end detection
    const player = playerRef.current;
    if (player && (player.ended || (clipData?.clip?.durationSeconds && t >= clipData.clip.durationSeconds))) {
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

  // Session init on mount
  useEffect(() => {
    if (!clipId || !viewer?.id) return;
    executeApi("GetPausedSession", { clipId, viewerId: viewer.id })
      .then((result: any) => {
        if (result?.hasPausedSession && result.session) {
          setPausedSessionData(result.session);
          setPhase("resume_prompt");
        } else {
          startSession({ clipId, viewerId: viewer.id })
            .then((res: any) => {
              setSessionId(res?.sessionId ?? null);
              setPhase("watching");
            })
            .catch(console.error);
        }
      })
      .catch(() => {
        startSession({ clipId, viewerId: viewer.id })
          .then((res: any) => {
            setSessionId(res?.sessionId ?? null);
            setPhase("watching");
          })
          .catch(console.error);
      });
  }, [clipId, viewer?.id, startSession]);

  const handleResume = useCallback(() => {
    if (!pausedSessionData) return;
    setSessionId(pausedSessionData.id);
    setElapsedSeconds(pausedSessionData.elapsedSeconds);
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
    setCorrectCount(0);
    setAnsweredQuestions(new Set());
    startSession({ clipId, viewerId: viewer.id })
      .then((res: any) => {
        setSessionId(res?.sessionId ?? null);
        setPhase("watching");
      })
      .catch(console.error);
  }, [clipId, viewer?.id, startSession]);

  const handlePauseAndBack = useCallback(async () => {
    if (sessionId && phase === "watching") {
      playerRef.current?.pause();
      try {
        await pauseSession({
          sessionId,
          elapsedSeconds,
          focusSeconds,
          blurSeconds,
          answeredQuestionIds: Array.from(answeredQuestions),
          correctCount,
          phase: "watching",
        });
      } catch (e) {
        console.error("Pause save failed:", e);
      }
    }
    navigate("/library");
  }, [sessionId, phase, pauseSession, elapsedSeconds, focusSeconds, blurSeconds, answeredQuestions, correctCount, navigate]);

  // 30-second autosave
  useEffect(() => {
    if (phase !== "watching" || !sessionId) return;
    const autosaveInterval = setInterval(() => {
      executeApi("PauseSession", {
        sessionId,
        elapsedSeconds,
        focusSeconds,
        blurSeconds,
        answeredQuestionIds: Array.from(answeredQuestions),
        correctCount,
        phase: "watching",
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(autosaveInterval);
  }, [phase, sessionId, elapsedSeconds, focusSeconds, blurSeconds, answeredQuestions, correctCount]);

  // Save on hide/unload
  useEffect(() => {
    if (phase !== "watching" || !sessionId) return;
    const saveOnHide = () => {
      if (document.visibilityState === "hidden") {
        executeApi("PauseSession", {
          sessionId, elapsedSeconds, focusSeconds, blurSeconds,
          answeredQuestionIds: Array.from(answeredQuestions),
          correctCount, phase: "watching",
        }).catch(() => {});
      }
    };
    const saveOnUnload = () => {
      executeApi("PauseSession", {
        sessionId, elapsedSeconds, focusSeconds, blurSeconds,
        answeredQuestionIds: Array.from(answeredQuestions),
        correctCount, phase: "watching",
      }).catch(() => {});
    };
    document.addEventListener("visibilitychange", saveOnHide);
    window.addEventListener("beforeunload", saveOnUnload);
    return () => {
      document.removeEventListener("visibilitychange", saveOnHide);
      window.removeEventListener("beforeunload", saveOnUnload);
    };
  }, [phase, sessionId, elapsedSeconds, focusSeconds, blurSeconds, answeredQuestions, correctCount]);

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
    const handleFocus = () => { isFocusedRef.current = true; };
    const handleBlur = () => { isFocusedRef.current = false; };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []); // No phase dependency needed — uses phaseRef

  const handleDismissTabOverlay = useCallback(() => {
    setTabAway(false);
    playerRef.current?.play();
  }, []);

  // Auto-trigger Ranger Report at end of video
  useEffect(() => {
    if (phase !== "watching" || autoEndedRef.current) return;
    const clipDuration = clipData?.clip?.durationSeconds;
    if (!clipDuration || clipDuration <= 0) return;
    if (elapsedSeconds >= clipDuration) {
      const allAnswered = trailMarkers.every((q: any) => answeredQuestions.has(q.id));
      if (allAnswered || trailMarkers.length === 0) {
        autoEndedRef.current = true;
        handleFinishWatchingRef.current();
      }
    }
  }, [elapsedSeconds, phase, clipData, trailMarkers, answeredQuestions]);

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
      setAnsweredQuestions((prev) => new Set(prev).add(question.id));
      setTotalTrailMarkers((t) => t + 1);
      submitAnswer({
        sessionId,
        questionId: question.id,
        selectedOption,
        isCorrect: correct,
        timeToAnswer: null,
      }).catch(console.error);
    },
    [trailMarkers, currentQuestionIdx, sessionId, submitAnswer]
  );

  const handleTrailMarkerContinue = useCallback(() => {
    setPhase("watching");
    playerRef.current?.play();
  }, []);

  const handleFinishWatching = useCallback(() => {
    playerRef.current?.pause();

    const allTrailMarkerCount = trailMarkers.length;
    setTotalTrailMarkers(allTrailMarkerCount || totalTrailMarkers);
    const finalTotal = allTrailMarkerCount || 1;
    const pct = Math.round((correctCount / finalTotal) * 100);
    setScore(pct);

    if (sessionId) {
      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      endSession({
        sessionId,
        totalFocusSeconds: focusSeconds,
        totalBlurSeconds: blurSeconds,
        totalTimeSeconds: elapsedSeconds,
        clipDurationSeconds: clipDuration,
        tabAwayCount: tabAwayCountRef.current,
      })
        .then((res: any) => {
          if (res?.engagementScore !== undefined) {
            setEngagementScore(res.engagementScore);
            setScore(res.engagementScore);
          }
          setReportReady(true);
        })
        .catch(console.error);
    }

    const passedFirstPass =
      Math.round((correctCount / (allTrailMarkerCount || 1)) * 100) >= 80;
    if (passedFirstPass && viewer?.id && clipId && sessionId) {
      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      awardXP({
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
        totalTimeSeconds: elapsedSeconds,
        clipDurationSeconds: clipDuration,
      })
        .then((res: any) => {
          if (res?.badgesEarned?.length > 0) {
            res.badgesEarned.forEach((b: any) => {
              toast.success(`${b.emoji} Badge earned: ${b.name} (+${b.xp} XP)`);
            });
          }
          if (res?.newTier) {
            toast.success(`${res.newTier.emoji} Tier up! You're now a ${res.newTier.name}!`);
          }
          // Store session breakdown from awardXP, then fetch cumulative totals
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
                // Even if progress fetch fails, still show session data
                setXpData({
                  sessionBreakdown,
                  totalXp: res?.totalXp ?? 0,
                  tier: { name: "Base Camper", emoji: "🏕️" },
                });
              });
          }
        })
        .catch(console.error);
    }

    setPhase("ranger_report");
  }, [
    trailMarkers, totalTrailMarkers, correctCount, sessionId, endSession,
    elapsedSeconds, focusSeconds, blurSeconds, viewer, clipId, clipData, awardXP,
  ]);

  const handleFinishWatchingRef = useRef(handleFinishWatching);
  useEffect(() => { handleFinishWatchingRef.current = handleFinishWatching; }, [handleFinishWatching]);

  const handleSearchRescueComplete = useCallback(
    (passed: boolean, rescueScore: number) => {
      setSearchRescueTriggered(true);
      setSearchRescueScore(rescueScore);

      if (viewer?.id && clipId && sessionId) {
        const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
        const srTotal = recoveryQuestions.length;
        awardXP({
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
          totalTimeSeconds: elapsedSeconds,
          clipDurationSeconds: clipDuration,
        })
          .then((res: any) => {
            if (res?.badgesEarned?.length > 0) {
              res.badgesEarned.forEach((b: any) => {
                toast.success(`${b.emoji} Badge earned: ${b.name} (+${b.xp} XP)`);
              });
            }
            if (res?.newTier) {
              toast.success(`${res.newTier.emoji} Tier up! You're now a ${res.newTier.name}!`);
            }
          })
          .catch(console.error);
      }

      if (passed) {
        if (viewer?.id && clipId && sessionId) {
          completeClipPath({
            viewerId: viewer.id,
            clipId,
            sessionId,
            path: "search_rescue",
          }).catch(console.error);
        }
        navigate("/library");
      } else {
        setPhase("weather_storm");
      }
    },
    [navigate, viewer, clipId, sessionId, clipData, elapsedSeconds, recoveryQuestions, correctCount, trailMarkers, awardXP, completeClipPath]
  );

  const handleWeatherExpire = useCallback(() => {
    if (viewer?.id && clipId && sessionId) {
      completeClipPath({
        viewerId: viewer.id,
        clipId,
        sessionId,
        path: "weather_storm",
      }).catch(console.error);

      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      awardXP({
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
        totalTimeSeconds: elapsedSeconds,
        clipDurationSeconds: clipDuration,
      })
        .then((res: any) => {
          if (res?.xpAwarded) {
            toast.success(`+${res.xpAwarded} XP — persistence pays off!`);
          }
        })
        .catch(console.error);
    }
    navigate("/library");
  }, [navigate, viewer, clipId, sessionId, clipData, elapsedSeconds, correctCount, trailMarkers, searchRescueScore, recoveryQuestions, awardXP, completeClipPath]);

  const handleTranscriptSeek = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (p) {
      p.currentTime = seconds;
      p.play();
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

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
        clipTitle={`${getClipEmoji(clip.sortOrder)} Clip ${clip.sortOrder}: ${clip.title}`}
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">
            {getClipEmoji(clip.sortOrder)} {clip.title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {durationFormatted && <><span>⏱️ {durationFormatted}</span><span className="mx-1.5 text-gray-300">·</span></>}
            <span>🪧 {trailMarkers.length} Trail Markers</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span>💬 CC available — click CC on the video for captions & auto-translation</span>
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-4 pb-2">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
              showTranscript
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            📄 Transcript
          </button>
          <span
            className={`text-xs font-mono px-3 py-1 rounded-full ${
              !isVideoPlaying && phase === "watching"
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            ⏱ {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")}
            {!isVideoPlaying && phase === "watching" && " ⏸"}
          </span>
          <button
            onClick={handlePauseAndBack}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
          >
            🎞️ Back to Clips
          </button>
        </div>
      </div>

      {/* Video + transcript */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex items-center justify-center bg-black relative">
          {wistiaVideoId ? (
            <div style={{ position: "relative", width: "100%", maxHeight: "100%", aspectRatio: "16 / 9" }}>
              <WistiaPlayer
                ref={playerRef}
                mediaId={wistiaVideoId}
                playerColor="ff5733"
                fullscreenButton={false}
                autoPlay={false}
                silentAutoPlay={false}
                time={resumeFromSecondsRef.current ?? undefined}
                onPlay={handleWistiaPlay}
                onPause={handleWistiaPause}
                onEnded={handleWistiaEnded}
                onSecondChange={handleWistiaSecondChange}
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

        {showTranscript && (
          <div className="w-[300px] flex-shrink-0">
            <TranscriptPanel
              transcript={clip.transcript ?? null}
              currentSeconds={elapsedSeconds}
              onSeek={handleTranscriptSeek}
            />
          </div>
        )}
      </div>

      {/* Trail Marker Overlay */}
      {phase === "trail_marker" && trailMarkers[currentQuestionIdx] && (
        <QuizOverlayV2
          question={trailMarkers[currentQuestionIdx]}
          onAnswer={handleTrailMarkerAnswer}
          onContinue={handleTrailMarkerContinue}
        />
      )}

      {/* Ranger Report */}
      {phase === "ranger_report" && reportReady && (
        <RangerReport
          clipTitle={`${getClipEmoji(clip.sortOrder)} ${clip.title}`}
          totalQuestions={trailMarkers.length || 1}
          correctAnswers={correctCount}
          score={score}
          needsRecovery={score < 80 && recoveryQuestions.length > 0}
          onBackToClips={() => navigate("/library")}
          onContinueToNext={clipData?.nextClipId ? () => navigate(`/watch/${clipData.nextClipId}`) : undefined}
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
          questions={recoveryQuestions}
          onComplete={handleSearchRescueComplete}
        />
      )}

      {/* Weather the Storm */}
      {phase === "weather_storm" && (
        clipData.weatherStorm ? (
          <WeatherStorm
            overview={clipData.weatherStorm.overview}
            takeaways={clipData.weatherStorm.takeaways}
            timerMinutes={2}
            clipTitle={`${getClipEmoji(clip.sortOrder)} ${clip.title}`}
            onTimerExpire={handleWeatherExpire}
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
