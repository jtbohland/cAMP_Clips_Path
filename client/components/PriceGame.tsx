import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import PriceScenarioCard from "@/components/PriceScenarioCard";
import PriceEndScreen from "@/components/PriceEndScreen";

export type PriceScenario = {
  id: string;
  scenario_id: string;
  section: string;
  game_type: string;
  narrative: string;
  game_data?: any;
  coaching_note: string;
};

type GamePhase = "idle" | "playing" | "completing" | "complete";

type PriceGameProps = {
  viewerId: string;
  clipId: string;
  onBackToClips: () => void;
  onComplete?: () => void;
};

export default function PriceGame({ viewerId, clipId, onBackToClips, onComplete }: PriceGameProps) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [isReplay, setIsReplay] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<PriceScenario[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [runningXp, setRunningXp] = useState(0);
  const [endData, setEndData] = useState<any>(null);

  const { run: startGame, loading: starting } = useApi("StartPriceGame");
  const { run: submitResponse } = useApi("SubmitPriceResponse");
  const { run: completeGame } = useApi("CompletePriceGame");

  const handleStart = useCallback(async (replay: boolean) => {
    try {
      setIsReplay(replay);
      setCurrentIndex(0);
      setRunningXp(0);
      setEndData(null);
      const result = await startGame({ viewerId, isReplay: replay });
      if (!result) throw new Error("No result from StartPriceGame");
      setSessionId(result.sessionId);
      setScenarios(result.scenarios);
      setPhase("playing");
    } catch (e) {
      console.error("Failed to start Price game", e);
    }
  }, [viewerId, startGame]);

  const handleSubmitScenario = useCallback(async (input: {
    scenarioId: string;
    playerAnswer: any;
    cruxLevel: number;
    isCorrect: boolean;
  }) => {
    if (!sessionId) throw new Error("No session");
    const result = await submitResponse({
      sessionId,
      scenarioId: input.scenarioId,
      playerAnswer: input.playerAnswer,
      cruxLevel: input.cruxLevel,
      isCorrect: input.isCorrect,
      isReplay,
    });
    if (!result) throw new Error("No result from SubmitPriceResponse");
    setRunningXp((prev) => prev + result.xpChange);
    return result;
  }, [sessionId, isReplay, submitResponse]);

  const handleNext = useCallback(async () => {
    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (!sessionId) return;
      setPhase("completing");
      try {
        const result = await completeGame({ sessionId, viewerId, clipId, isReplay });
        setEndData(result);
        setPhase("complete");
        onComplete?.();
      } catch (e) {
        console.error("Failed to complete Price game", e);
        setPhase("complete");
      }
    }
  }, [currentIndex, scenarios.length, sessionId, viewerId, clipId, isReplay, completeGame, onComplete]);

  const handleReplay = useCallback(() => {
    handleStart(true);
  }, [handleStart]);

  // ─── Idle: Start screen ────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center space-y-4">
          <div className="text-4xl">🎰</div>
          <h2 className="text-xl font-bold text-gray-800">The Price is Right: cAMP Edition</h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            Test your pricing & packaging knowledge across 10 rounds of mini-games.
            Every answer wagers your <strong>real cAMP XP</strong> — choose your Crux Call wisely.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-left text-xs text-gray-600 space-y-2 max-w-sm mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span><strong>Higher/Lower</strong> — Is the price above or below?</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span><strong>Bullseye</strong> — Type the exact price (±15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <span><strong>Price Match</strong> — Match items to prices</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏗️</span>
              <span><strong>Deal Builder</strong> — Build the right quote</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span><strong>Pricing Pitfall</strong> — Spot the error</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🗣️</span>
              <span><strong>Objection Closer</strong> — Pick the best response</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-xs">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <p className="font-bold text-green-700">+1 to +3</p>
              <p className="text-green-600">per right</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
              <p className="font-bold text-red-700">−1 to −2</p>
              <p className="text-red-600">per wrong</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-center">
              <p className="font-bold text-indigo-700">−20 to +30</p>
              <p className="text-indigo-600">range</p>
            </div>
          </div>

          <button
            onClick={() => handleStart(false)}
            disabled={starting}
            className="w-full max-w-sm mx-auto py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
          >
            {starting ? "Loading rounds..." : "Come On Down! 🎰"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────
  if (phase === "playing" && scenarios.length > 0) {
    return (
      <div className="w-full">
        {/* Running score */}
        <div className="flex justify-center mb-4">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${
            runningXp > 0
              ? "bg-green-50 text-green-700 border-green-200"
              : runningXp < 0
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-gray-50 text-gray-700 border-gray-200"
          }`}>
            🎰 Deal Score: {runningXp > 0 ? "+" : ""}{runningXp}
            {isReplay && <span className="text-xs font-normal text-gray-400 ml-1">(practice)</span>}
          </div>
        </div>

        <PriceScenarioCard
          key={scenarios[currentIndex].id}
          scenario={scenarios[currentIndex]}
          scenarioIndex={currentIndex}
          totalScenarios={scenarios.length}
          isReplay={isReplay}
          onSubmit={handleSubmitScenario}
          onNext={handleNext}
        />
      </div>
    );
  }

  // ─── Completing ────────────────────────────────────────────────────────────
  if (phase === "completing") {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-12">
        <div className="text-4xl mb-3 animate-pulse">🎰</div>
        <p className="text-sm text-gray-500">Tallying your Deal Score...</p>
      </div>
    );
  }

  // ─── Complete: End screen ──────────────────────────────────────────────────
  if (phase === "complete" && endData) {
    return (
      <PriceEndScreen
        netXp={endData.netXp}
        badge={endData.badge}
        totalXp={endData.totalXp}
        correctCount={endData.correctCount}
        totalCount={endData.totalCount}
        sectionBreakdown={endData.sectionBreakdown}
        gameTypeBreakdown={endData.gameTypeBreakdown}
        cruxAccuracy={endData.cruxAccuracy}
        isReplay={isReplay}
        onBackToClips={onBackToClips}
        onReplay={handleReplay}
      />
    );
  }

  return null;
}
