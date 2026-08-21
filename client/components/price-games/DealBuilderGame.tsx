import { useState, useMemo } from "react";

type Component = {
  name: string;
  price: number;
  included: boolean;
};

type Props = {
  narrative: string;
  gameData: {
    components: Component[];
    correct_total: number;
    explanation: string;
  };
  onComplete: (answer: any, isCorrect: boolean) => void;
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function DealBuilderGame({ narrative, gameData, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const total = useMemo(() => {
    return gameData.components
      .filter((c) => selected.has(c.name))
      .reduce((sum, c) => sum + c.price, 0);
  }, [selected, gameData]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    // Correct if selected exactly the included items
    const correctSet = new Set(gameData.components.filter((c) => c.included).map((c) => c.name));
    const playerSet = selected;
    const correct = correctSet.size === playerSet.size && [...correctSet].every((n) => playerSet.has(n));
    onComplete({ selectedComponents: [...selected], total }, correct);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-800 leading-relaxed">{narrative}</p>

      <p className="text-xs text-gray-500 text-center">
        Select the right components for this deal.
      </p>

      <div className="space-y-2">
        {gameData.components.map((comp) => {
          const isSelected = selected.has(comp.name);
          return (
            <button
              key={comp.name}
              onClick={() => toggle(comp.name)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors ${
                  isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-300"
                }`}>
                  {isSelected && "✓"}
                </span>
                <span className={`text-sm ${isSelected ? "font-semibold text-indigo-700" : "text-gray-700"}`}>
                  {comp.name}
                </span>
              </div>
              <span className={`text-sm font-mono ${isSelected ? "text-indigo-600 font-semibold" : "text-gray-500"}`}>
                {formatCurrency(comp.price)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Running total */}
      <div className="flex justify-between items-center px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
        <span className="text-sm font-semibold text-gray-600">Your Quote Total</span>
        <span className={`text-lg font-bold ${total > 0 ? "text-indigo-700" : "text-gray-400"}`}>
          {formatCurrency(total)}
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={selected.size === 0}
        className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
          selected.size > 0
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        Set Your Crux Call ⛏️
      </button>
    </div>
  );
}
