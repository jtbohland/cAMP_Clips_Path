type SectionResult = { section: string; correct: number; total: number };
type GameTypeResult = { game_type: string; correct: number; total: number };

const GAME_TYPE_LABELS: Record<string, string> = {
  higher_lower: "📊 Higher/Lower",
  bullseye: "🎯 Bullseye",
  price_match: "🔗 Price Match",
  deal_builder: "🏗️ Deal Builder",
  pricing_pitfall: "⚠️ Pricing Pitfall",
  objection_closer: "🗣️ Objection Closer",
};

type PriceEndScreenProps = {
  netXp: number;
  badge: { badgeId: string; name: string; emoji: string };
  totalXp: number;
  correctCount: number;
  totalCount: number;
  sectionBreakdown: SectionResult[];
  gameTypeBreakdown: GameTypeResult[];
  cruxAccuracy: number;
  isReplay: boolean;
  onBackToClips: () => void;
  onReplay: () => void;
};

export default function PriceEndScreen({
  netXp,
  badge,
  totalXp,
  correctCount,
  totalCount,
  sectionBreakdown,
  gameTypeBreakdown,
  cruxAccuracy,
  isReplay,
  onBackToClips,
  onReplay,
}: PriceEndScreenProps) {
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Badge reveal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
        <div className="text-5xl mb-3 animate-bounce">{badge.emoji}</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">{badge.name}</h2>
        <p className="text-xs text-gray-500 mb-4">Price is Right Badge</p>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${
          netXp > 0
            ? "bg-green-50 text-green-700 border border-green-200"
            : netXp < 0
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-gray-50 text-gray-700 border border-gray-200"
        }`}>
          {isReplay ? (
            <span>Practice Run — No XP</span>
          ) : (
            <span>{netXp > 0 ? "+" : ""}{netXp} XP</span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{correctCount}/{totalCount}</p>
          <p className="text-xs text-gray-500 mt-1">Correct</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{accuracy}%</p>
          <p className="text-xs text-gray-500 mt-1">Accuracy</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">
            {cruxAccuracy >= 0 ? `${cruxAccuracy}%` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Crux Accuracy</p>
          <p className="text-[10px] text-gray-400">(⛏️⛏️⛏️ correct %)</p>
        </div>
      </div>

      {/* Total XP */}
      {!isReplay && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Your cAMP XP Total</p>
          <p className="text-2xl font-bold text-gray-800">{totalXp} XP</p>
        </div>
      )}

      {/* Game type breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Mini-Game Breakdown</h3>
        <div className="space-y-2">
          {gameTypeBreakdown.map((g) => (
            <div key={g.game_type} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 truncate flex-1 mr-3">
                {GAME_TYPE_LABELS[g.game_type] ?? g.game_type}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      g.correct === g.total ? "bg-green-500" : g.correct === 0 ? "bg-red-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${g.total > 0 ? (g.correct / g.total) * 100 : 0}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-8 text-right ${
                  g.correct === g.total ? "text-green-600" : g.correct === 0 ? "text-red-500" : "text-amber-600"
                }`}>
                  {g.correct}/{g.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Topic Breakdown</h3>
        <div className="space-y-2">
          {sectionBreakdown.map((s) => (
            <div key={s.section} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 truncate flex-1 mr-3">{s.section}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      s.correct === s.total ? "bg-green-500" : s.correct === 0 ? "bg-red-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${s.total > 0 ? (s.correct / s.total) * 100 : 0}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-8 text-right ${
                  s.correct === s.total ? "text-green-600" : s.correct === 0 ? "text-red-500" : "text-amber-600"
                }`}>
                  {s.correct}/{s.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBackToClips}
          className="flex-1 py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
        >
          🎞️ Back to Clips
        </button>
        <button
          onClick={onReplay}
          className="flex-1 py-3 rounded-lg bg-white text-indigo-600 text-sm font-bold border-2 border-indigo-200 hover:border-indigo-400 transition-all"
        >
          🔄 Come On Down (Again)
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 italic">
        No stakes. No wagers. Just 10 fresh rounds from 40+ in the vault.
      </p>
    </div>
  );
}
