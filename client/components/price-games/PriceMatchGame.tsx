import { useState, useMemo, useCallback } from "react";

type Pair = { item: string; price: string };

type Props = {
  narrative: string;
  gameData: { pairs: Pair[] };
  onComplete: (answer: any, isCorrect: boolean) => void;
};

export default function PriceMatchGame({ narrative, gameData, onComplete }: Props) {
  const items = useMemo(() => gameData.pairs.map((p) => p.item), [gameData]);

  // Shuffle the prices — keep index-based so duplicates stay separate
  const shuffledPriceSlots = useMemo(() => {
    const slots = gameData.pairs.map((p, i) => ({ idx: i, price: p.price }));
    return [...slots].sort((a, b) => {
      const hashA = a.price.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 7), 0) + a.idx;
      const hashB = b.price.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 7), 0) + b.idx;
      return hashA - hashB;
    });
  }, [gameData]);

  // matches: item → slot index (not price string)
  const [matches, setMatches] = useState<Record<string, number>>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const usedSlotIndices = useMemo(() => new Set(Object.values(matches)), [matches]);

  const getMatchedPrice = useCallback(
    (item: string) => {
      const slotIdx = matches[item];
      if (slotIdx == null) return null;
      return shuffledPriceSlots.find((s) => s.idx === slotIdx)?.price ?? null;
    },
    [matches, shuffledPriceSlots]
  );

  const handleItemClick = useCallback(
    (item: string) => {
      if (matches[item] != null) {
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
    },
    [matches]
  );

  const handlePriceClick = useCallback(
    (slotIdx: number) => {
      if (!selectedItem) return;
      if (usedSlotIndices.has(slotIdx)) return;
      setMatches((prev) => ({ ...prev, [selectedItem]: slotIdx }));
      setSelectedItem(null);
    },
    [selectedItem, usedSlotIndices]
  );

  const allMatched = Object.keys(matches).length === items.length;

  const handleSubmit = () => {
    if (!allMatched) return;
    const correctMap = new Map(gameData.pairs.map((p) => [p.item, p.price]));
    const matchedDisplay: Record<string, string> = {};
    for (const item of items) {
      matchedDisplay[item] = getMatchedPrice(item) ?? "";
    }
    const allCorrect = items.every(
      (item) => matchedDisplay[item] === correctMap.get(item)
    );
    onComplete({ matched: matchedDisplay }, allCorrect);
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
            const matchedPrice = getMatchedPrice(item);
            const isMatched = matchedPrice != null;
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
                  <span className="block text-xs text-green-500 mt-0.5">→ {matchedPrice}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: prices */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Prices</p>
          {shuffledPriceSlots.map((slot) => {
            const isUsed = usedSlotIndices.has(slot.idx);
            return (
              <button
                key={slot.idx}
                onClick={() => handlePriceClick(slot.idx)}
                disabled={isUsed || !selectedItem}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border-2 transition-all ${
                  isUsed
                    ? "border-green-300 bg-green-50 text-green-400 cursor-not-allowed"
                    : selectedItem
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 cursor-pointer"
                    : "border-gray-200 bg-white text-gray-700 cursor-not-allowed opacity-60"
                }`}
              >
                {slot.price}
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
