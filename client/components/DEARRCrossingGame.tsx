import { useState, useCallback, useMemo } from "react";
import { useApi } from "@/hooks/useApi.js";
import { type DEARRQuestion, LEVEL_CONFIGS, drawQuestions } from "@/config/dearrQuestions";

type GamePhase = "idle" | "playing" | "ante" | "result" | "roadkill" | "level_clear" | "victory" | "completing" | "complete";

type DEARRCrossingGameProps = {
  viewerId: string;
  clipId: string;
  onComplete: () => void;
  onBackToClips: () => void;
};

const QUESTIONS_PER_LEVEL = 5;

/** 🫎 Antler Ante levels — same XP scale as Crux Call */
const ANTE_LEVELS = [
  { level: 1, label: "🫎",      name: "Cautious Crossing", right: "+1 XP", wrong: "−1 XP" },
  { level: 2, label: "🫎🫎",    name: "Confident Trot",    right: "+2 XP", wrong: "−1 XP" },
  { level: 3, label: "🫎🫎🫎",  name: "Full Charge",       right: "+3 XP", wrong: "−2 XP" },
];

// Fisher-Yates shuffle for answer options — unbiased
function shuffleOptions(q: DEARRQuestion): { options: string[]; correctIndex: number } {
  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    options: indices.map(i => q.options[i]),
    correctIndex: indices.indexOf(q.correctIndex),
  };
}

export default function DEARRCrossingGame({ viewerId, clipId, onComplete, onBackToClips }: DEARRCrossingGameProps) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [isReplay, setIsReplay] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [questions, setQuestions] = useState<DEARRQuestion[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<{ options: string[]; correctIndex: number }[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [anteLevel, setAnteLevel] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [lastXpChange, setLastXpChange] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [runningXp, setRunningXp] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([0, 0, 0]);
  const [endData, setEndData] = useState<any>(null);

  const { run: startGame, loading: starting } = useApi("StartDEARRGame");
  const { run: submitResponse } = useApi("SubmitDEARRResponse");
  const { run: completeGame } = useApi("CompleteDEARRGame");

  const levelConfig = LEVEL_CONFIGS[currentLevel];

  // Start a level — draw 5 random questions
  const startLevel = useCallback((levelIdx: number, seen: Set<string>) => {
    const config = LEVEL_CONFIGS[levelIdx];
    const drawn = drawQuestions([...config.bank], QUESTIONS_PER_LEVEL, seen);
    const shuffled = drawn.map(q => shuffleOptions(q));
    setQuestions(drawn);
    setShuffledOptions(shuffled);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnteLevel(null);
    setShowResult(false);
    setStreak(0);
    setCurrentLevel(levelIdx);
    setAttempts(prev => {
      const next = [...prev];
      next[levelIdx]++;
      return next;
    });
    setPhase("playing");
  }, []);

  const handleStartGame = useCallback(async (replay: boolean) => {
    try {
      setIsReplay(replay);
      setRunningXp(0);
      setTotalCorrect(0);
      setAttempts([0, 0, 0]);
      setSeenIds(new Set());
      setEndData(null);
      const result = await startGame({ viewerId, isReplay: replay });
      if (!result) throw new Error("No result from StartDEARRGame");
      setSessionId(result.sessionId);
      startLevel(0, new Set());
    } catch (e) {
      console.error("Failed to start DEARR game", e);
    }
  }, [viewerId, startGame, startLevel]);

  // Player picks an answer (before ante)
  const handleAnswer = useCallback((optionIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    // Move to ante selection
    setPhase("ante");
  }, [selectedAnswer]);

  // Player confirms their Antler Ante and submits
  const handleSubmitAnte = useCallback(async () => {
    if (anteLevel === null || selectedAnswer === null || !sessionId) return;

    const correct = selectedAnswer === shuffledOptions[currentQ].correctIndex;
    setIsCorrect(correct);

    try {
      const result = await submitResponse({
        sessionId,
        questionId: questions[currentQ].id,
        levelNumber: currentLevel,
        isCorrect: correct,
        anteLevel,
        isReplay,
      });

      if (result) {
        setLastXpChange(result.xpChange);
        setRunningXp(prev => prev + result.xpChange);
      }
    } catch (e) {
      console.error("Failed to submit DEARR response", e);
    }

    if (correct) {
      setStreak(s => s + 1);
      setTotalCorrect(t => t + 1);
      setSeenIds(prev => new Set([...prev, questions[currentQ].id]));
    }

    setShowResult(true);
    setPhase("result");
  }, [anteLevel, selectedAnswer, sessionId, shuffledOptions, currentQ, questions, currentLevel, isReplay, submitResponse]);

  const handleNext = useCallback(async () => {
    if (!isCorrect) {
      // ROADKILL! Level failed.
      setPhase("roadkill");
      return;
    }

    if (currentQ < QUESTIONS_PER_LEVEL - 1) {
      // Next question
      setCurrentQ(q => q + 1);
      setSelectedAnswer(null);
      setAnteLevel(null);
      setShowResult(false);
      setPhase("playing");
    } else {
      // Level complete!
      if (currentLevel < 2) {
        setPhase("level_clear");
      } else {
        // All 3 levels done — complete game!
        setPhase("completing");
        try {
          const result = await completeGame({ sessionId: sessionId!, viewerId, clipId, isReplay });
          setEndData(result);
          setPhase("complete");
          onComplete();
        } catch (e) {
          console.error("Failed to complete DEARR game", e);
          setPhase("complete");
          onComplete();
        }
      }
    }
  }, [isCorrect, currentQ, currentLevel, sessionId, viewerId, clipId, isReplay, completeGame, onComplete]);

  const handleRetryLevel = useCallback(() => {
    setSelectedAnswer(null);
    setAnteLevel(null);
    setShowResult(false);
    startLevel(currentLevel, seenIds);
  }, [currentLevel, seenIds, startLevel]);

  const handleNextLevel = useCallback(() => {
    setSelectedAnswer(null);
    setAnteLevel(null);
    setShowResult(false);
    startLevel(currentLevel + 1, seenIds);
  }, [currentLevel, seenIds, startLevel]);

  const handleReplay = useCallback(() => {
    handleStartGame(true);
  }, [handleStartGame]);

  // ── Running XP pill ──
  const xpPill = (
    <div className="flex justify-center mb-4">
      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${
        runningXp > 0
          ? "bg-green-50 text-green-700 border-green-200"
          : runningXp < 0
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-gray-50 text-gray-700 border-gray-200"
      }`}>
        🫎 Crossing Score: {runningXp > 0 ? "+" : ""}{runningXp}
        {isReplay && <span className="text-xs font-normal text-gray-400 ml-1">(practice)</span>}
      </div>
    </div>
  );

  // ── IDLE: Start screen ──
  if (phase === "idle") {
    return (
      <div className="bg-gradient-to-b from-green-900 via-green-800 to-amber-900 rounded-2xl p-8 text-white text-center">
        <div className="text-6xl mb-4">🦌</div>
        <h2 className="text-3xl font-bold mb-2">DEARR Crossing</h2>
        <p className="text-green-200 mb-6 text-lg">Help the deer cross 3 dangerous roads to reach the summit!</p>

        <div className="bg-black/30 rounded-xl p-6 mb-6 text-left max-w-lg mx-auto">
          <h3 className="font-bold text-amber-300 mb-3">🎮 How to Play</h3>
          <ul className="space-y-2 text-sm text-green-100">
            <li>🌲 <strong>3 Roads</strong> — each with 5 DEARR scenarios to navigate</li>
            <li>❓ <strong>Answer first</strong> — pick the best response to the scenario</li>
            <li>🫎 <strong>Set your Antler Ante</strong> — wager your real cAMP XP on your answer</li>
            <li>🦌✅ <strong>Correct</strong> = deer hops forward, earn XP</li>
            <li>💀 <strong>Wrong</strong> = ROADKILL! Lose XP and restart the road</li>
            <li>🏆 <strong>Cross all 3 roads</strong> to complete DEARR Crossing!</li>
          </ul>
        </div>

        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-xs mb-4">
          <div className="bg-green-50/10 border border-green-400/30 rounded-lg p-2 text-center">
            <p className="font-bold text-green-300">+1 to +3</p>
            <p className="text-green-200">per right</p>
          </div>
          <div className="bg-red-50/10 border border-red-400/30 rounded-lg p-2 text-center">
            <p className="font-bold text-red-300">−1 to −2</p>
            <p className="text-red-200">per wrong</p>
          </div>
          <div className="bg-indigo-50/10 border border-indigo-400/30 rounded-lg p-2 text-center">
            <p className="font-bold text-indigo-300">15 questions</p>
            <p className="text-indigo-200">across 3 roads</p>
          </div>
        </div>

        <div className="flex gap-3 justify-center mb-6">
          {LEVEL_CONFIGS.map((lc, i) => (
            <div key={i} className="bg-black/20 rounded-lg px-4 py-2 text-sm">
              <span className="text-lg">{lc.emoji}</span>
              <div className="text-xs text-green-200 mt-1">Road {i + 1}</div>
              <div className="text-xs font-medium">{lc.name}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => handleStartGame(false)}
          disabled={starting}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-full text-lg transition-all transform hover:scale-105 disabled:opacity-50"
        >
          {starting ? "Loading..." : "🦌 Start Crossing!"}
        </button>
      </div>
    );
  }

  // ── ROADKILL SCREEN ──
  if (phase === "roadkill") {
    return (
      <div className="bg-gradient-to-b from-red-900 via-red-800 to-gray-900 rounded-2xl p-8 text-white text-center">
        {xpPill}
        <div className="text-7xl mb-4 animate-bounce">💀</div>
        <h2 className="text-3xl font-bold mb-2 text-red-300">ROADKILL!</h2>
        <p className="text-red-200 mb-2 text-lg">The deer didn't make it across {levelConfig.emoji} {levelConfig.name}!</p>
        <p className="text-gray-300 mb-6">You got {streak}/5 correct before hitting traffic.</p>

        <div className="bg-black/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
          <p className="text-sm text-gray-300">Don't worry — new scenarios will be shuffled in. Learn from the feedback and try again!</p>
        </div>

        <button
          onClick={handleRetryLevel}
          className="bg-red-500 hover:bg-red-400 text-white font-bold px-8 py-3 rounded-full text-lg transition-all"
        >
          🔄 Try Again — Road {currentLevel + 1}
        </button>
      </div>
    );
  }

  // ── LEVEL CLEAR SCREEN ──
  if (phase === "level_clear") {
    const nextConfig = LEVEL_CONFIGS[currentLevel + 1];
    return (
      <div className="bg-gradient-to-b from-green-800 via-emerald-700 to-teal-800 rounded-2xl p-8 text-white text-center">
        {xpPill}
        <div className="text-7xl mb-4">🌲🦌🌲</div>
        <h2 className="text-3xl font-bold mb-2 text-emerald-300">Safe Crossing!</h2>
        <p className="text-emerald-200 mb-2 text-lg">{levelConfig.emoji} {levelConfig.name} — CLEARED!</p>
        <p className="text-gray-300 mb-6">5/5 correct — the deer made it across!</p>

        <div className="flex justify-center gap-4 mb-6">
          {LEVEL_CONFIGS.map((lc, i) => (
            <div key={i} className={`rounded-lg px-4 py-2 text-sm ${i <= currentLevel ? "bg-emerald-600" : "bg-black/20"}`}>
              <span className="text-lg">{i <= currentLevel ? "✅" : lc.emoji}</span>
              <div className="text-xs mt-1">{lc.name}</div>
            </div>
          ))}
        </div>

        <div className="bg-black/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
          <p className="text-sm text-amber-200">Next up: {nextConfig.emoji} <strong>{nextConfig.name}</strong></p>
          <p className="text-xs text-gray-300 mt-1">The roads get trickier. Stay sharp!</p>
        </div>

        <button
          onClick={handleNextLevel}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-full text-lg transition-all transform hover:scale-105"
        >
          🦌 Cross Next Road!
        </button>
      </div>
    );
  }

  // ── COMPLETING ──
  if (phase === "completing") {
    return (
      <div className="bg-gradient-to-b from-green-900 to-gray-900 rounded-2xl p-8 text-white text-center">
        <div className="text-4xl mb-3 animate-pulse">🦌</div>
        <p className="text-sm text-gray-300">Tallying your Crossing Score...</p>
      </div>
    );
  }

  // ── COMPLETE: End screen ──
  if (phase === "complete" && endData) {
    return (
      <div className="bg-gradient-to-b from-amber-600 via-yellow-500 to-green-600 rounded-2xl p-8 text-white text-center">
        <div className="text-7xl mb-4">🏆🦌🏆</div>
        <h2 className="text-3xl font-bold mb-2">DEARR Crossing Complete!</h2>
        <p className="text-yellow-100 mb-2 text-lg">The deer crossed all 3 roads safely!</p>

        {/* Badge */}
        <div className="bg-black/30 rounded-xl p-4 mb-4 max-w-sm mx-auto">
          <div className="text-4xl mb-1">{endData.badge.emoji}</div>
          <p className="font-bold text-lg">{endData.badge.name}</p>
          <p className={`text-xl font-bold mt-1 ${endData.netXp >= 0 ? "text-green-300" : "text-red-300"}`}>
            {endData.netXp > 0 ? "+" : ""}{endData.netXp} XP
          </p>
          {!isReplay && (
            <p className="text-xs text-gray-300 mt-1">Total cAMP XP: {endData.totalXp}</p>
          )}
          {isReplay && (
            <p className="text-xs text-amber-200 mt-1">Practice mode — no XP awarded</p>
          )}
        </div>

        {/* Level breakdown */}
        <div className="bg-black/30 rounded-xl p-4 mb-4 max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-3 text-sm">
            {LEVEL_CONFIGS.map((lc, i) => {
              const lb = endData.levelBreakdown?.find((l: any) => l.level === i);
              return (
                <div key={i} className="bg-white/10 rounded-lg p-3">
                  <div className="text-lg">✅ {lc.emoji}</div>
                  <div className="text-xs text-green-200 mt-1">{lc.name}</div>
                  <div className="text-xs text-gray-300">{attempts[i]} attempt{attempts[i] > 1 ? "s" : ""}</div>
                  {lb && <div className="text-xs text-gray-400">{lb.correct}/{lb.total} correct</div>}
                </div>
              );
            })}
          </div>
          {endData.anteAccuracy >= 0 && (
            <div className="mt-3 text-xs text-amber-200">
              🫎🫎🫎 Full Charge accuracy: {endData.anteAccuracy}%
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-black/30 rounded-xl p-3 mb-6 max-w-sm mx-auto">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-300">Correct answers: <span className="font-bold text-white">{endData.correctCount}</span></div>
            <div className="text-gray-300">Total answers: <span className="font-bold text-white">{endData.totalCount}</span></div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleReplay}
            className="bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-3 rounded-full text-sm transition-all"
          >
            🔄 Play Again (practice)
          </button>
          <button
            onClick={onBackToClips}
            className="bg-white text-green-800 font-bold px-8 py-3 rounded-full text-lg transition-all hover:bg-green-50 transform hover:scale-105"
          >
            🎒 Back to Clips
          </button>
        </div>
      </div>
    );
  }

  // ── VICTORY (fallback if endData not loaded yet) ──
  if (phase === "victory") {
    return (
      <div className="bg-gradient-to-b from-green-900 to-gray-900 rounded-2xl p-8 text-white text-center">
        <div className="text-4xl mb-3 animate-pulse">🦌</div>
        <p className="text-sm text-gray-300">Tallying your Crossing Score...</p>
      </div>
    );
  }

  // ── PLAYING / ANTE / RESULT — FROGGER ROAD VIEW ──
  const question = questions[currentQ];
  if (!question) return null;

  const { options, correctIndex } = shuffledOptions[currentQ];
  const deerPosition = streak;
  const laneColors = ["bg-gray-700", "bg-gray-600", "bg-gray-700", "bg-gray-600", "bg-gray-700"];

  return (
    <div className="bg-gradient-to-b from-green-900 to-gray-900 rounded-2xl overflow-hidden">
      {/* Running XP */}
      <div className="pt-4">{xpPill}</div>

      {/* Level Header */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: levelConfig.color }}>
        <div className="flex items-center gap-2 text-white">
          <span className="text-xl">{levelConfig.emoji}</span>
          <span className="font-bold">Road {currentLevel + 1}: {levelConfig.name}</span>
        </div>
        <div className="text-white/80 text-sm">
          Question {currentQ + 1}/5 • Streak: {streak}🔥
        </div>
      </div>

      {/* Frogger Road Visual */}
      <div className="relative px-6 py-4">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs text-green-400 w-12">Start</span>
          <div className="flex-1 flex gap-1">
            {[0, 1, 2, 3, 4, 5].map(lane => (
              <div
                key={lane}
                className={`flex-1 h-10 rounded flex items-center justify-center relative ${
                  lane === 0 ? "bg-green-700" : lane === 5 ? "bg-green-700" : laneColors[lane - 1]
                }`}
              >
                {lane > 0 && lane < 5 && lane > deerPosition && (
                  <span className="text-lg opacity-60">🚗</span>
                )}
                {lane === deerPosition && (
                  <span className="text-2xl z-10 animate-pulse">🦌</span>
                )}
                {lane === 0 && deerPosition !== 0 && <span className="text-lg">🌲</span>}
                {lane === 5 && <span className="text-lg">🌲</span>}
                {lane > 0 && lane <= deerPosition && lane < 5 && (
                  <span className="text-sm">✅</span>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-green-400 w-12 text-right">Safety</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-12" />
          <div className="flex-1 flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-400">
                {i === 0 || i === 5 ? "🌲" : `Q${i}`}
              </div>
            ))}
          </div>
          <span className="w-12" />
        </div>
      </div>

      {/* DEARR Pillar Badge */}
      <div className="px-6 pb-2">
        <span className="inline-block bg-amber-800/50 text-amber-300 text-xs px-3 py-1 rounded-full font-medium">
          🦌 DEARR Pillar: {question.pillar === "multi" ? "Multi-Signal" : question.pillar === "R-roi" ? "ROI" : question.pillar === "R-renewal" ? "Renewal" : question.pillar}
        </span>
      </div>

      {/* Scenario + Question */}
      <div className="px-6 pb-4">
        <div className="bg-black/30 rounded-xl p-4 mb-4">
          <p className="text-amber-200 text-sm font-medium mb-2">📋 Scenario:</p>
          <p className="text-white text-sm">{question.scenario}</p>
        </div>

        <p className="text-white font-bold mb-4">{question.question}</p>

        {/* Answer Options */}
        <div className="grid gap-2">
          {options.map((opt, i) => {
            let btnClass = "bg-white/10 hover:bg-white/20 text-white border border-white/20";

            if (phase === "result" && showResult) {
              // Show correct/wrong after ante submitted
              if (i === correctIndex) {
                btnClass = "bg-emerald-600 text-white border border-emerald-400 ring-2 ring-emerald-400";
              } else if (i === selectedAnswer && i !== correctIndex) {
                btnClass = "bg-red-600 text-white border border-red-400 ring-2 ring-red-400";
              } else {
                btnClass = "bg-white/5 text-gray-500 border border-white/10";
              }
            } else if (selectedAnswer === i) {
              // Selected but waiting for ante
              btnClass = "bg-amber-600 text-white border border-amber-400 ring-2 ring-amber-400";
            } else if (selectedAnswer !== null) {
              // Other options dimmed after selection
              btnClass = "bg-white/5 text-gray-400 border border-white/10";
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selectedAnswer !== null}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${btnClass}`}
              >
                <span className="mr-2 font-bold opacity-60">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* 🫎 Antler Ante Picker — shown after answer selection */}
        {phase === "ante" && (
          <div className="mt-4 bg-black/30 rounded-xl p-4 space-y-3">
            <div className="text-center">
              <h3 className="text-base font-bold text-white mb-1">🫎 Antler Ante</h3>
              <p className="text-xs text-gray-400">
                {isReplay
                  ? "Practice mode — no XP at stake"
                  : "How confident are you? Your real cAMP XP is on the line."}
              </p>
            </div>

            <div className="space-y-2">
              {ANTE_LEVELS.map((al) => (
                <button
                  key={al.level}
                  onClick={() => setAnteLevel(al.level)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                    anteLevel === al.level
                      ? "border-amber-400 bg-amber-900/50"
                      : "border-white/20 bg-white/5 hover:border-white/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{al.label}</span>
                    <span className={`text-sm font-semibold ${anteLevel === al.level ? "text-amber-300" : "text-white"}`}>
                      {al.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-400 font-medium">{al.right}</span>
                    <span className="text-red-400 font-medium">{al.wrong}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitAnte}
              disabled={anteLevel === null}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                anteLevel !== null
                  ? "bg-amber-500 text-black hover:bg-amber-400 shadow-sm"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              Lock It In 🔒
            </button>
          </div>
        )}

        {/* Result Feedback */}
        {phase === "result" && showResult && (
          <div className={`mt-4 rounded-xl p-4 ${isCorrect ? "bg-emerald-900/50 border border-emerald-600" : "bg-red-900/50 border border-red-600"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{isCorrect ? "🦌✅" : "💀"}</span>
              <span className={`font-bold ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                {isCorrect ? "Safe hop! The deer advances!" : "ROADKILL! The deer got hit!"}
              </span>
              {!isReplay && (
                <span className={`text-sm font-bold ml-auto ${lastXpChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {lastXpChange > 0 ? "+" : ""}{lastXpChange} XP
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300">{question.explanation}</p>
          </div>
        )}

        {/* Next Button */}
        {phase === "result" && showResult && (
          <button
            onClick={handleNext}
            className={`mt-4 w-full font-bold py-3 rounded-full text-lg transition-all ${
              isCorrect
                ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                : "bg-red-500 hover:bg-red-400 text-white"
            }`}
          >
            {isCorrect
              ? currentQ < QUESTIONS_PER_LEVEL - 1
                ? "🦌 Next Lane →"
                : currentLevel < 2
                  ? "🌲 Road Cleared! →"
                  : "🏆 Victory! →"
              : "💀 See Results"
            }
          </button>
        )}
      </div>
    </div>
  );
}
