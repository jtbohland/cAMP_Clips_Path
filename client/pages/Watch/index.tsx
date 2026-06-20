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

/** Extract Wistia video ID from URL like https://amplitude.wistia.com/medias/abc123 */
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

  // API data
  const { data: clipData, loading: clipLoading } = useApiData(
    "GetClipForWatching",
    { clipId: clipId ?? "", viewerId: viewer?.id ?? "" },
    { enabled: !!clipId && !!viewer?.id }
  );

  // Wistia video ID from clip URL
  const wistiaVideoId = useMemo(
    () => (clipData?.clip?.videoUrl ? getWistiaVideoId(clipData.clip.videoUrl) : null),
    [clipData]
  );

  // Wistia iframe ref — used for postMessage-based video control
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { run: startSession } = useApi("StartSession");
  const { run: submitAnswer } = useApi("SubmitAnswer");
  const { run: endSession } = useApi("EndSession");
  const { run: awardXP } = useApi("AwardXP");
  const { run: completeClipPath } = useApi("CompleteClipPath");
  const { run: pauseSession } = useApi("PauseSession");

  // State
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

  // Elapsed tracking now tied to actual video time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [blurSeconds, setBlurSeconds] = useState(0);
  const isFocusedRef = useRef(true);
  const lastTimeRef = useRef(0);

  // Focus time tracking interval — only counts when video is playing AND tab visible
  const focusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // B3-1: Tab-away pause state
  const [tabAway, setTabAway] = useState(false);

  // B3-4: Transcript panel
  const [showTranscript, setShowTranscript] = useState(false);

  // B3-2: Track if we already auto-triggered end
  const autoEndedRef = useRef(false);

  // Track resume-from position for paused sessions
  const resumeFromSecondsRef = useRef<number | null>(null);

  // Refs for stale-closure-safe access inside event handlers
  const phaseRef = useRef<WatchPhase>("loading_resume");
  const trailMarkersRef = useRef<any[]>([]);
  const answeredQuestionsRef = useRef<Set<string>>(new Set());

  // Separate trail marker questions from recovery questions
  const trailMarkers = useMemo(
    () =>
      (clipData?.questions ?? [])
        .filter((q: any) => !q.isRecovery)
        .sort((a: any, b: any) => a.triggerAtSeconds - b.triggerAtSeconds),
    [clipData]
  );

  // Keep refs in sync with state
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { trailMarkersRef.current = trailMarkers; }, [trailMarkers]);
  useEffect(() => { answeredQuestionsRef.current = answeredQuestions; }, [answeredQuestions]);

  const recoveryQuestions = useMemo(
    () =>
      (clipData?.questions ?? [])
        .filter((q: any) => q.isRecovery)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    [clipData]
  );

  // Focus/blur time tracking — only increments when video is playing
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

  // Wistia iframe postMessage listener — handles all video events
  useEffect(() => {
    if (!wistiaVideoId || phase !== "watching") return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      // Wistia's actual postMessage format: {method: "_trigger", args: [eventName, value]}
      if (data.method !== "_trigger") return;

      const eventType = data.args?.[0];
      const eventValue = data.args?.[1];

      if (eventType === "secondchange") {
        const t = typeof eventValue === "number" ? Math.floor(eventValue) : 0;
        setElapsedSeconds(t);
        lastTimeRef.current = t;
        if (trailMarkersRef.current.length > 0) {
          const next = trailMarkersRef.current.find(
            (q: any) =>
              !answeredQuestionsRef.current.has(q.id) &&
              t >= q.triggerAtSeconds
          );
          if (next) {
            const idx = trailMarkersRef.current.indexOf(next);
            setCurrentQuestionIdx(idx);
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ method: "pause" }),
              "*"
            );
            setPhase("trail_marker");
          }
        }
      }

      if (eventType === "play") setIsVideoPlaying(true);
      if (eventType === "pause") setIsVideoPlaying(false);
      if (eventType === "end") setIsVideoPlaying(false);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [wistiaVideoId, phase]);

  // Check for paused session on mount
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

  // Resume handler — restore session state + seek video to saved position
  const handleResume = useCallback(() => {
    if (!pausedSessionData) return;
    setSessionId(pausedSessionData.id);
    setElapsedSeconds(pausedSessionData.elapsedSeconds);
    setFocusSeconds(pausedSessionData.focusSeconds);
    setBlurSeconds(pausedSessionData.blurSeconds);
    setAnsweredQuestions(new Set(pausedSessionData.answeredQuestionIds));
    setCorrectCount(pausedSessionData.correctCount);
    // Store resume position so the Wistia player seeks on bind
    resumeFromSecondsRef.current = pausedSessionData.elapsedSeconds;
    setPhase("watching");
  }, [pausedSessionData]);

  // Start fresh handler
  const handleStartFresh = useCallback(() => {
    if (!clipId || !viewer?.id) return;
    startSession({ clipId, viewerId: viewer.id })
      .then((res: any) => {
        setSessionId(res?.sessionId ?? null);
        setPhase("watching");
      })
      .catch(console.error);
  }, [clipId, viewer?.id, startSession]);

  // Pause and navigate back
  const handlePauseAndBack = useCallback(async () => {
    if (sessionId && phase === "watching") {
      // Pause the Wistia video via postMessage
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: "pause" }),
        "*"
      );
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

  // visibilitychange + beforeunload best-effort save
  useEffect(() => {
    if (phase !== "watching" || !sessionId) return;
    const saveOnHide = () => {
      if (document.visibilityState === "hidden") {
        executeApi("PauseSession", {
          sessionId,
          elapsedSeconds,
          focusSeconds,
          blurSeconds,
          answeredQuestionIds: Array.from(answeredQuestions),
          correctCount,
          phase: "watching",
        }).catch(() => {});
      }
    };
    const saveOnUnload = () => {
      executeApi("PauseSession", {
        sessionId,
        elapsedSeconds,
        focusSeconds,
        blurSeconds,
        answeredQuestionIds: Array.from(answeredQuestions),
        correctCount,
        phase: "watching",
      }).catch(() => {});
    };
    document.addEventListener("visibilitychange", saveOnHide);
    window.addEventListener("beforeunload", saveOnUnload);
    return () => {
      document.removeEventListener("visibilitychange", saveOnHide);
      window.removeEventListener("beforeunload", saveOnUnload);
    };
  }, [phase, sessionId, elapsedSeconds, focusSeconds, blurSeconds, answeredQuestions, correctCount]);

  // B3-1: Tab visibility — pause Wistia video + show overlay when tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        isFocusedRef.current = false;
        if (phase === "watching") {
          // Pause the Wistia video when tab goes hidden
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ method: "pause" }),
            "*"
          );
          setTabAway(true);
        }
      } else {
        isFocusedRef.current = true;
        // Do NOT auto-resume — leave paused for manual restart
      }
    };
    const handleFocus = () => {
      isFocusedRef.current = true;
    };
    const handleBlur = () => {
      isFocusedRef.current = false;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [phase]);

  // B3-1: Dismiss tab-away overlay and resume video
  const handleDismissTabOverlay = useCallback(() => {
    setTabAway(false);
    // Resume the Wistia video via postMessage
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: "play" }),
      "*"
    );
  }, []);

  // Trail marker checking is now handled directly in onTimeUpdate (seek-safe).

  // B3-2: Auto-trigger Ranger Report when video reaches duration
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

  // Handle trail marker answer
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
      }).catch(console.error);
    },
    [trailMarkers, currentQuestionIdx, sessionId, submitAnswer]
  );

  // Trail marker dismissed — resume video from where it was paused
  const handleTrailMarkerContinue = useCallback(() => {
    setPhase("watching");
    // Resume the Wistia video via postMessage
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: "play" }),
      "*"
    );
  }, []);

  // End video — called by auto-trigger or manual
  const handleFinishWatching = useCallback(() => {
    // Pause the video via postMessage
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: "pause" }),
      "*"
    );

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
        })
        .catch(console.error);
    }

    setPhase("ranger_report");
  }, [
    trailMarkers, totalTrailMarkers, correctCount, sessionId, endSession,
    elapsedSeconds, focusSeconds, blurSeconds, viewer, clipId, clipData, awardXP,
  ]);

  // Stable ref for handleFinishWatching — used by auto-end effect
  const handleFinishWatchingRef = useRef(handleFinishWatching);
  useEffect(() => { handleFinishWatchingRef.current = handleFinishWatching; }, [handleFinishWatching]);

  // Search & Rescue complete
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

  // Weather the Storm timer expired
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

  // Transcript seek handler — seek the Wistia player to the given position
  const handleTranscriptSeek = useCallback((seconds: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: "time", value: seconds }),
      "*"
    );
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: "play" }),
      "*"
    );
  }, []);

  // Loading state
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

  // Resume prompt
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
      {/* B3-3: Two-row header */}
      <div className="bg-white border-b border-gray-200">
        {/* Row 1: Back + Transcript toggle + Timer */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={handlePauseAndBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            ← Back to cAMP Clips
          </button>
          <div className="flex items-center gap-3">
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
          </div>
        </div>

        {/* Row 2: Clip info + metadata */}
        <div className="px-4 pb-2">
          <h2 className="text-sm font-bold text-gray-900">
            {getClipEmoji(clip.sortOrder)} {clip.title}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {durationFormatted && <><span>⏱️ {durationFormatted}</span><span className="mx-1.5 text-gray-300">·</span></>}
            <span>🪧 {trailMarkers.length} Trail Markers</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span>💬 CC available — click CC on the video for captions & auto-translation</span>
          </p>
        </div>
      </div>

      {/* Video + optional transcript panel */}
      <div className="flex-1 min-h-0 flex">
        {/* Wistia video embed */}
        <div className="flex-1 min-w-0 flex items-center justify-center bg-black relative">
          {wistiaVideoId ? (
            <div style={{ position: "relative", width: "100%", maxHeight: "100%", aspectRatio: "16 / 9" }}>
              <iframe
                ref={iframeRef}
                src={`https://fast.wistia.net/embed/iframe/${wistiaVideoId}?autoPlay=false&silentAutoPlay=false&playerColor=ff5733${resumeFromSecondsRef.current ? `&time=${resumeFromSecondsRef.current}` : ""}`}
                allowFullScreen
                allow="autoplay; fullscreen"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                title={clip.title}
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

          {/* B3-1: Tab-away overlay */}
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

        {/* B3-4: Transcript panel */}
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
          onContinue={() => navigate("/library")}
          onSearchRescue={() => setPhase("search_rescue")}
          incorrectQuestions={incorrectQuestions}
          onTimestampClick={(seconds) => {
            setPhase("watching");
            // Seek the Wistia player to the clicked timestamp via postMessage
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ method: "time", value: seconds }),
              "*"
            );
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ method: "play" }),
              "*"
            );
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
            timerMinutes={clipData.weatherStorm.timerMinutes}
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
