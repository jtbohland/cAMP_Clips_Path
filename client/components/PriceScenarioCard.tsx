import { useState, useCallback, useMemo } from "react";
import type { PriceScenario } from "@/components/PriceGame";
import HigherLowerGame from "@/components/price-games/HigherLowerGame";
import BullseyeGame from "@/components/price-games/BullseyeGame";
import PriceMatchGame from "@/components/price-games/PriceMatchGame";
import DealBuilderGame from "@/components/price-games/DealBuilderGame";
import PricingPitfallGame from "@/components/price-games/PricingPitfallGame";
import ObjectionCloserGame from "@/components/price-games/ObjectionCloserGame";

type Props = {
  scenario: PriceScenario;
  scenarioIndex: number;
  totalScenarios: number;
  isReplay: boolean;
  onSubmit: (input: {
    scenarioId: string;
    playerAnswer: any;
    cruxLevel: number;
    isCorrect: boolean;
  }) => Promise<{ xpChange: number }>;
  onNext: () => void;
};

type Phase = "answer" | "crux" | "result";

const CRUX_LEVELS = [
  { level: 1, label: "⛏️", name: "Cautious", right: "+1 XP", wrong: "−1 XP" },
  { level: 2, label: "⛏️⛏️", name: "Confident", right: "+2 XP", wrong: "−1 XP" },
  { level: 3, label: "⛏️⛏️⛏️", name: "Sending It", right: "+3 XP", wrong: "−2 XP" },
];

const GAME_TYPE_ICONS: Record<string, string> = {
  higher_lower: "📊",
  bullseye: "🎯",
  price_match: "🔗",
  deal_builder: "🏗️",
  pricing_pitfall: "⚠️",
  objection_closer: "🗣️",
};

const GAME_TYPE_LABELS: Record<string, string> = {
  higher_lower: "Higher / Lower",
  bullseye: "Bullseye",
  price_match: "Price Match",
  deal_builder: "Deal Builder",
  pricing_pitfall: "Pricing Pitfall",
  objection_closer: "Objection Closer",
};

export default function PriceScenarioCard({
  scenario,
  scenarioIndex,
  totalScenarios,
  isReplay,
  onSubmit,
  onNext,
}: Props) {
  const [phase, setPhase] = useState<Phase>("answer");
  const [playerAnswer, setPlayerAnswer] = useState<any>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [cruxLevel, setCruxLevel] = useState<number | null>(null);
  const [xpChange, setXpChange] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const gameIcon = GAME_TYPE_ICONS[scenario.game_type] ?? "🎮";
  const gameLabel = GAME_TYPE_LABELS[scenario.game_type] ?? scenario.game_type;

  const handleAnswerComplete = useCallback((answer: any, correct: boolean) => {
    setPlayerAnswer(answer);
    setIsCorrect(correct);
    setPhase("crux");
  }, []);

  const handleSubmitCrux = useCallback(async () => {
    if (cruxLevel === null || isCorrect === null) return;
    setSubmitting(true);
    try {
      const result = await onSubmit({
        scenarioId: scenario.id,
        playerAnswer,
        cruxLevel,
        isCorrect,
      });
      setXpChange(result.xpChange);
      setPhase("result");
    } catch (e) {
      console.error("Failed to submit Price response", e);
    } finally {
      setSubmitting(false);
    }
  }, [cruxLevel, isCorrect, playerAnswer, scenario.id, onSubmit]);

  // Render the correct mini-game component
  const gameComponent = useMemo(() => {
    const commonProps = {
      narrative: scenario.narrative,
      gameData: scenario.game_data,
      onComplete: handleAnswerComplete,
    };
    switch (scenario.game_type) {
      case "higher_lower":  return <HigherLowerGame {...commonProps} />;
      case "bullseye":      return <BullseyeGame {...commonProps} />;
      case "price_match":   return <PriceMatchGame {...commonProps} />;
      case "deal_builder":  return <DealBuilderGame {...commonProps} />;
      case "pricing_pitfall": return <PricingPitfallGame {...commonProps} />;
      case "objection_closer": return <ObjectionCloserGame {...commonProps} />;
      default:              return <p className="text-red-500 text-sm">Unknown game type: {scenario.game_type}</p>;
    }
  }, [scenario, handleAnswerComplete]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
          {scenarioIndex + 1} / {totalScenarios}
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${((scenarioIndex + 1) / totalScenarios) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Game type + section badges */}
        <div className="px-5 pt-4 pb-2 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
            {gameIcon} {gameLabel}
          </span>
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {scenario.section}
          </span>
          {isReplay && (
            <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              🔄 Practice — No XP
            </span>
          )}
        </div>

        {/* Game content by phase */}
        {phase === "answer" && (
          <div className="px-5 py-4">
            {gameComponent}
          </div>
        )}

        {phase === "crux" && (
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-800 mb-1">⛏️ Crux Call</h3>
              <p className="text-xs text-gray-500">
                {isReplay
                  ? "Practice mode — no XP at stake"
                  : "How confident are you? Your real cAMP XP is on the line."}
              </p>
            </div>

            <div className="space-y-2">
              {CRUX_LEVELS.map((cl) => (
                <button
                  key={cl.level}
                  onClick={() => setCruxLevel(cl.level)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                    cruxLevel === cl.level
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cl.label}</span>
                    <span className={`text-sm font-semibold ${cruxLevel === cl.level ? "text-indigo-700" : "text-gray-700"}`}>
                      {cl.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600 font-medium">{cl.right}</span>
                    <span className="text-red-500 font-medium">{cl.wrong}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitCrux}
              disabled={cruxLevel === null || submitting}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                cruxLevel !== null && !submitting
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Submitting..." : "Lock It In 🔒"}
            </button>
          </div>
        )}

        {phase === "result" && (
          <div className="px-5 pb-5 pt-4 space-y-4">
            {/* Result banner */}
            <div className={`rounded-lg p-4 text-center ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <p className={`text-xl font-bold ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                {isCorrect ? "✅ Correct!" : "❌ Not quite..."}
              </p>
              {!isReplay && (
                <p className={`text-sm font-semibold mt-1 ${xpChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {xpChange > 0 ? "+" : ""}{xpChange} XP
                </p>
              )}
            </div>

            {/* Coaching note */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <h4 className="text-sm font-bold text-amber-800 mb-1">💡 Pricing Coach</h4>
              <p className="text-sm text-amber-700 leading-relaxed">{scenario.coaching_note}</p>
            </div>

            {/* Next button */}
            <button
              onClick={onNext}
              className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              {scenarioIndex < totalScenarios - 1 ? "Next Round →" : "See Results 🎰"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
