import { useState } from "react";

type Statement = { text: string; is_error: boolean };

type Props = {
  narrative: string;
  gameData: {
    statements: Statement[];
    error_explanation: string;
  };
  onComplete: (answer: any, isCorrect: boolean) => void;
};

export default function PricingPitfallGame({ narrative, gameData, onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selected === null) return;
    const pickedStatement = gameData.statements[selected];
    const correct = pickedStatement.is_error;
    onComplete({ selectedIndex: selected, selectedText: pickedStatement.text }, correct);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-800 leading-relaxed">{narrative}</p>

      <p className="text-xs text-gray-500 text-center">
        ⚠️ One of these statements is <strong>wrong</strong>. Find it.
      </p>

      <div className="space-y-2">
        {gameData.statements.map((stmt, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm border-2 transition-all ${
              selected === i
                ? "border-red-400 bg-red-50 text-red-700 font-semibold"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 ${
                selected === i ? "border-red-400 bg-red-400 text-white" : "border-gray-300"
              }`}>
                {selected === i && "⚠"}
              </span>
              <span>{stmt.text}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={selected === null}
        className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
          selected !== null
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        Set Your Crux Call ⛏️
      </button>
    </div>
  );
}
