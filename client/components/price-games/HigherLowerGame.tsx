import { useState } from "react";

type Props = {
  narrative: string;
  gameData: {
    reference_value: number;
    reference_label: string;
    correct_direction: "higher" | "lower";
    actual_value: number;
    actual_label: string;
  };
  onComplete: (answer: any, isCorrect: boolean) => void;
};

export default function HigherLowerGame({ narrative, gameData, onComplete }: Props) {
  const [selected, setSelected] = useState<"higher" | "lower" | null>(null);

  const handleSubmit = () => {
    if (!selected) return;
    const correct = selected === gameData.correct_direction;
    onComplete({ direction: selected }, correct);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-800 leading-relaxed">{narrative}</p>

      <div className="text-center py-3">
        <span className="text-2xl font-bold text-indigo-700">{gameData.reference_label}</span>
      </div>

      <div className="flex gap-3">
        {(["higher", "lower"] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => setSelected(dir)}
            className={`flex-1 py-4 rounded-lg text-sm font-bold border-2 transition-all ${
              selected === dir
                ? dir === "higher"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-red-500 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {dir === "higher" ? "📈 Higher" : "📉 Lower"}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected}
        className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
          selected
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        Set Your Crux Call ⛏️
      </button>
    </div>
  );
}
