import { useState } from "react";

type Props = {
  narrative: string;
  gameData: {
    correct_value: number;
    tolerance_pct: number;
    unit: string;
    display_hint: string;
  };
  onComplete: (answer: any, isCorrect: boolean) => void;
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function BullseyeGame({ narrative, gameData, onComplete }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const cleaned = input.replace(/[$,%\s]/g, "");
    const num = parseFloat(cleaned);
    if (isNaN(num) || num <= 0) {
      setError("Enter a valid number");
      return;
    }
    setError("");

    const tolerance = gameData.correct_value * (gameData.tolerance_pct / 100);
    const correct = Math.abs(num - gameData.correct_value) <= tolerance;
    onComplete({ guessedValue: num }, correct);
  };

  const isPercentage = gameData.unit === "%" || gameData.display_hint.toLowerCase().includes("percent");

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-800 leading-relaxed">{narrative}</p>

      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">{gameData.display_hint}</p>
        <p className="text-xs text-amber-600 font-medium">
          🎯 Within ±{gameData.tolerance_pct}% = correct
        </p>
      </div>

      <div className="flex items-center gap-2 max-w-xs mx-auto">
        {!isPercentage && <span className="text-lg font-bold text-gray-500">$</span>}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={isPercentage ? "e.g. 30" : "e.g. 78600"}
          className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 text-center text-lg font-bold focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {isPercentage && <span className="text-lg font-bold text-gray-500">%</span>}
      </div>

      {error && <p className="text-center text-xs text-red-500">{error}</p>}

      {/* Reference helper */}
      <div className="text-center text-xs text-gray-400">
        {!isPercentage && (
          <span>Range: {formatCurrency(gameData.correct_value * 0.5)} – {formatCurrency(gameData.correct_value * 1.5)}</span>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!input.trim()}
        className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
          input.trim()
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        Set Your Crux Call ⛏️
      </button>
    </div>
  );
}
