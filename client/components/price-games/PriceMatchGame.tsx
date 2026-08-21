import { useState, useMemo, useCallback } from "react";

type Pair = { item: string; price: string };

type Props = {
  narrative: string;
  gameData: { pairs: Pair[] };
  onComplete: (answer: any, isCorrect: boolean) => void;
};

export default function PriceMatchGame({ narrative, gameData, onComplete }: Props) {
  const items = useMemo(() => gameData.pairs.map((p) => p.item), [gameData]);

  // Shuffle the prices (deterministic from pair content)
  const shuffledPrices = useMemo(() => {
    const prices = gameData.pairs.map((p) => p.price);
    return [...prices].sort((a, b) => {
      const hashA = a.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 7), 0);
      const hashB = b.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 7), 0);
      return hashA - hashB;
    });
  }, [gameData]);

  // matches: item → price
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const usedPrices = useMemo(() => new Set(Object.values(matches)), [matches]);

  const handleItemClick = useCallback((item: string) => {
    if (matches[item]) {
      // Unassign
      setMatches((prev) => {
        const next = { ...prev };
        delete next[item];
        return next;
      });
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  }, [matches]);

  const handlePriceClick = useCallback((price: string) => {
    if (!selectedItem) return;
    if (usedPrices.has(price)) return;
    setMatches((prev) => ({ ...prev, [selectedItem]: price }));
    setSelectedItem(null);
  }, [selectedItem, usedPrices]);

  const allMatched = Object.keys(matches).length === items.length;

  const handleSubmit = () => {
    if (!allMatched) return;
    // Check correctness
    const correctMap = new Map(gameData.pairs.map((p) => [p.item, p.price]));
    const allCorrect = items.every((item) => matches[item] === correctMap.get(item));
    onComplete({ matched: matches }, allCorrect);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-800 leading-relaxed">{narrative}</p>

      <p className="text-xs text-gray-500 text-center">
        Click an item, then click its matching price. Click a matched item to undo.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Left: items */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Items</p>
          {items.map((item) => {
            const isMatched = !!matches[item];
            const isSelected = selectedItem === item;
            return (
              <button
                key={item}
                onClick={() => handleItemClick(item)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border-2 transition-all ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                    : isMatched
                    ? "border-green-300 bg-green-50 text-green-700 font-medium"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {isMatched && <span className="mr-1">✓</span>}
                {item}
                {isMatched && (
                  <span className="block text-xs text-green-500 mt-0.5">→ {matches[item]}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: prices */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Prices</p>
          {shuffledPrices.map((price) => {
            const isUsed = usedPrices.has(price);
            return (
              <button
                key={price}
                onClick={() => handlePriceClick(price)}
                disabled={isUsed || !selectedItem}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border-2 transition-all ${
                  isUsed
                    ? "border-green-300 bg-green-50 text-green-400 cursor-not-allowed"
                    : selectedItem
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 cursor-pointer"
                    : "border-gray-200 bg-white text-gray-700 cursor-not-allowed opacity-60"
                }`}
              >
                {price}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allMatched}
        className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
          allMatched
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        Set Your Crux Call ⛏️
      </button>
    </div>
  );
}
