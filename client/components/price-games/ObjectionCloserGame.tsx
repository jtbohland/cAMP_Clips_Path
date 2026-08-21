import { useState } from "react";

type Response = { text: string; is_best: boolean };

type Props = {
  narrative: string;
  gameData: {
    responses: Response[];
  };
  onComplete: (answer: any, isCorrect: boolean) => void;
};

export default function ObjectionCloserGame({ narrative, gameData, onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selected === null) return;
    const pickedResponse = gameData.responses[selected];
    const correct = pickedResponse.is_best;
    onComplete({ selectedIndex: selected, selectedText: pickedResponse.text }, correct);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Objection</p>
        <p className="text-sm text-gray-800 leading-relaxed italic">{narrative}</p>
      </div>

      <p className="text-xs text-gray-500 text-center">
        🗣️ Pick the <strong>best</strong> response to close this objection.
      </p>

      <div className="space-y-2">
        {gameData.responses.map((resp, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm border-2 transition-all ${
              selected === i
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {resp.text}
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
