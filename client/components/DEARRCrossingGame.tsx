import { useState, useCallback, useMemo } from "react";
import { type DEARRQuestion, LEVEL_CONFIGS, drawQuestions } from "@/config/dearrQuestions";

type GamePhase = "intro" | "playing" | "roadkill" | "level_clear" | "victory";

type DEARRCrossingGameProps = {
  onComplete: () => void;
  onBackToClips: () => void;
};

const QUESTIONS_PER_LEVEL = 5;

// Shuffle answer options and return shuffled array + new correct index
function shuffleOptions(q: DEARRQuestion): { options: string[]; correctIndex: number } {
  const indices = q.options.map((_, i) => i);
  const shuffled = indices.sort(() => Math.random() - 0.5);
  return {
    options: shuffled.map(i => q.options[i]),
    correctIndex: shuffled.indexOf(q.correctIndex),
  };
}

export default function DEARRCrossingGame({ onComplete, onBackToClips }: DEARRCrossingGameProps) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [questions, setQuestions] = useState<DEARRQuestion[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<{ options: string[]; correctIndex: number }[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0); // correct streak within level
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([0, 0, 0]); // attempts per level
  const [gameComplete, setGameComplete] = useState(false);

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

  const handleAnswer = useCallback((optionIndex: number) => {
    if (showResult || selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    const correct = optionIndex === shuffledOptions[currentQ].correctIndex;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setStreak(s => s + 1);
      setTotalCorrect(t => t + 1);
      // Mark question as seen so replays get different ones
      setSeenIds(prev => new Set([...prev, questions[currentQ].id]));
    }
  }, [showResult, selectedAnswer, shuffledOptions, currentQ, questions]);

  const handleNext = useCallback(() => {
    if (!isCorrect) {
      // ROADKILL! Level failed.
      setPhase("roadkill");
      return;
    }

    if (currentQ < QUESTIONS_PER_LEVEL - 1) {
      // Next question
      setCurrentQ(q => q + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Level complete!
      if (currentLevel < 2) {
        setPhase("level_clear");
      } else {
        // All 3 levels done!
        setPhase("victory");
        setGameComplete(true);
        onComplete();
      }
    }
  }, [isCorrect, currentQ, currentLevel, onComplete]);

  const handleRetryLevel = useCallback(() => {
    startLevel(currentLevel, seenIds);
  }, [currentLevel, seenIds, startLevel]);

  const handleNextLevel = useCallback(() => {
    startLevel(currentLevel + 1, seenIds);
  }, [currentLevel, seenIds, startLevel]);

  // ── INTRO SCREEN ──
  if (phase === "intro") {
    return (
      <div className="bg-gradient-to-b from-green-900 via-green-800 to-amber-900 rounded-2xl p-8 text-white text-center">
        <div className="text-6xl mb-4">🦌</div>
        <h2 className="text-3xl font-bold mb-2">DEARR Crossing</h2>
        <p className="text-green-200 mb-6 text-lg">Help the deer cross 3 dangerous roads to reach the summit!</p>

        <div className="bg-black/30 rounded-xl p-6 mb-6 text-left max-w-lg mx-auto">
          <h3 className="font-bold text-amber-300 mb-3">🎮 How to Play</h3>
          <ul className="space-y-2 text-sm text-green-100">
            <li>🌲 <strong>3 Levels</strong> — each with a different road to cross</li>
            <li>❓ <strong>5 Scenarios per level</strong> — answer all correctly to cross safely</li>
            <li>🦌✅ <strong>Correct</strong> = deer hops forward one lane</li>
            <li>💀 <strong>Wrong</strong> = ROADKILL! Restart the level with new questions</li>
            <li>🏆 <strong>Cross all 3 roads</strong> to complete DEARR Crossing!</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-center mb-6">
          {LEVEL_CONFIGS.map((lc, i) => (
            <div key={i} className="bg-black/20 rounded-lg px-4 py-2 text-sm">
              <span className="text-lg">{lc.emoji}</span>
              <div className="text-xs text-green-200 mt-1">Level {i + 1}</div>
              <div className="text-xs font-medium">{lc.name}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => startLevel(0, seenIds)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-full text-lg transition-all transform hover:scale-105"
        >
          🦌 Start Crossing!
        </button>
      </div>
    );
  }

  // ── ROADKILL SCREEN ──
  if (phase === "roadkill") {
    return (
      <div className="bg-gradient-to-b from-red-900 via-red-800 to-gray-900 rounded-2xl p-8 text-white text-center">
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
          🔄 Try Again — Level {currentLevel + 1}
        </button>
      </div>
    );
  }

  // ── LEVEL CLEAR SCREEN ──
  if (phase === "level_clear") {
    const nextConfig = LEVEL_CONFIGS[currentLevel + 1];
    return (
      <div className="bg-gradient-to-b from-green-800 via-emerald-700 to-teal-800 rounded-2xl p-8 text-white text-center">
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

  // ── VICTORY SCREEN ──
  if (phase === "victory") {
    return (
      <div className="bg-gradient-to-b from-amber-600 via-yellow-500 to-green-600 rounded-2xl p-8 text-white text-center">
        <div className="text-7xl mb-4">🏆🦌🏆</div>
        <h2 className="text-3xl font-bold mb-2">DEARR Crossing Complete!</h2>
        <p className="text-yellow-100 mb-4 text-lg">The deer crossed all 3 roads safely!</p>

        <div className="bg-black/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-3 text-sm">
            {LEVEL_CONFIGS.map((lc, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-3">
                <div className="text-lg">✅ {lc.emoji}</div>
                <div className="text-xs text-green-200 mt-1">{lc.name}</div>
                <div className="text-xs text-gray-300">{attempts[i]} attempt{attempts[i] > 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-amber-200 font-bold">
            {totalCorrect} scenarios mastered across all levels
          </div>
        </div>

        <button
          onClick={onBackToClips}
          className="bg-white text-green-800 font-bold px-8 py-3 rounded-full text-lg transition-all hover:bg-green-50 transform hover:scale-105"
        >
          🎒 Back to Clips
        </button>
      </div>
    );
  }

  // ── PLAYING — FROGGER ROAD VIEW ──
  const question = questions[currentQ];
  const { options, correctIndex } = shuffledOptions[currentQ];
  const deerPosition = streak; // 0-4, moves right as correct answers accumulate
  const laneColors = ["bg-gray-700", "bg-gray-600", "bg-gray-700", "bg-gray-600", "bg-gray-700"];

  return (
    <div className="bg-gradient-to-b from-green-900 to-gray-900 rounded-2xl overflow-hidden">
      {/* Level Header */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: levelConfig.color }}>
        <div className="flex items-center gap-2 text-white">
          <span className="text-xl">{levelConfig.emoji}</span>
          <span className="font-bold">Level {currentLevel + 1}: {levelConfig.name}</span>
        </div>
        <div className="text-white/80 text-sm">
          Question {currentQ + 1}/5 • Streak: {streak}🔥
        </div>
      </div>

      {/* Frogger Road Visual */}
      <div className="relative px-6 py-4">
        {/* Forest (start) */}
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
                {/* Cars in road lanes */}
                {lane > 0 && lane < 5 && lane > deerPosition && (
                  <span className="text-lg opacity-60">🚗</span>
                )}
                {/* Deer position */}
                {lane === deerPosition && (
                  <span className="text-2xl z-10 animate-pulse">🦌</span>
                )}
                {/* Forest trees */}
                {lane === 0 && deerPosition !== 0 && <span className="text-lg">🌲</span>}
                {lane === 5 && <span className="text-lg">🌲</span>}
                {/* Cleared lanes */}
                {lane > 0 && lane <= deerPosition && lane < 5 && (
                  <span className="text-sm">✅</span>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-green-400 w-12 text-right">Safety</span>
        </div>

        {/* Lane labels */}
        <div className="flex items-center gap-1">
          <span className="w-12" />
          <div className="flex-1 flex gap-1">
            {["🌲", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "🌲"].slice(0, 6).map((label, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-400">{i === 0 || i === 5 ? "🌲" : `Q${i}`}</div>
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
            if (showResult) {
              if (i === correctIndex) {
                btnClass = "bg-emerald-600 text-white border border-emerald-400 ring-2 ring-emerald-400";
              } else if (i === selectedAnswer && i !== correctIndex) {
                btnClass = "bg-red-600 text-white border border-red-400 ring-2 ring-red-400";
              } else {
                btnClass = "bg-white/5 text-gray-500 border border-white/10";
              }
            } else if (selectedAnswer === i) {
              btnClass = "bg-amber-600 text-white border border-amber-400";
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showResult}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${btnClass}`}
              >
                <span className="mr-2 font-bold opacity-60">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Result Feedback */}
        {showResult && (
          <div className={`mt-4 rounded-xl p-4 ${isCorrect ? "bg-emerald-900/50 border border-emerald-600" : "bg-red-900/50 border border-red-600"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{isCorrect ? "🦌✅" : "💀"}</span>
              <span className={`font-bold ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                {isCorrect ? "Safe hop! The deer advances!" : "ROADKILL! The deer got hit!"}
              </span>
            </div>
            <p className="text-sm text-gray-300">{question.explanation}</p>
          </div>
        )}

        {/* Next Button */}
        {showResult && (
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
