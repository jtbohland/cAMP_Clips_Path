import { useMemo } from "react";

type ReactionRow = { lesson_key: string; emoji: string; count: number };
type FeedbackRow = { day_key: string; rating: string | null; usefulness: string | null; count: number };

type Props = {
  reactions: ReactionRow[];
  ratings: FeedbackRow[];
};

const RATING_ORDER = ["Poor", "Boring", "Meh", "Good", "Amazing"];
const RATING_EMOJI: Record<string, string> = { Poor: "🤮", Boring: "😢", Meh: "😒", Good: "😊", Amazing: "🤩" };
const RATING_COLOR: Record<string, string> = {
  Poor: "bg-red-100 text-red-700",
  Boring: "bg-orange-100 text-orange-700",
  Meh: "bg-yellow-100 text-yellow-700",
  Good: "bg-green-100 text-green-700",
  Amazing: "bg-emerald-100 text-emerald-700",
};

const USEFUL_ORDER = ["Not useful", "Slightly", "Moderate", "Useful", "Very useful"];
const USEFUL_COLOR: Record<string, string> = {
  "Not useful": "bg-red-100 text-red-700",
  Slightly: "bg-orange-100 text-orange-700",
  Moderate: "bg-yellow-100 text-yellow-700",
  Useful: "bg-green-100 text-green-700",
  "Very useful": "bg-emerald-100 text-emerald-700",
};

export default function FeedbackOverview({ reactions, ratings }: Props) {
  const topEmojis = useMemo(() => {
    const emojiTotals = new Map<string, number>();
    for (const r of reactions) {
      emojiTotals.set(r.emoji, (emojiTotals.get(r.emoji) ?? 0) + r.count);
    }
    return [...emojiTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [reactions]);

  const ratingDist = useMemo(() => {
    const dist = new Map<string, number>();
    for (const r of ratings) {
      if (r.rating) dist.set(r.rating, (dist.get(r.rating) ?? 0) + r.count);
    }
    return RATING_ORDER.map((label) => ({ label, count: dist.get(label) ?? 0 }));
  }, [ratings]);

  const usefulDist = useMemo(() => {
    const dist = new Map<string, number>();
    for (const r of ratings) {
      if (r.usefulness) dist.set(r.usefulness, (dist.get(r.usefulness) ?? 0) + r.count);
    }
    return USEFUL_ORDER.map((label) => ({ label, count: dist.get(label) ?? 0 }));
  }, [ratings]);

  const totalRatings = ratingDist.reduce((s, r) => s + r.count, 0);
  const totalUseful = usefulDist.reduce((s, r) => s + r.count, 0);
  const totalReactions = topEmojis.reduce((s, [, c]) => s + c, 0);

  const hasData = totalReactions > 0 || totalRatings > 0;

  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="text-center py-8 text-gray-400 text-sm italic">
          No feedback data yet — reactions and ratings will appear here once learners start using them.
        </div>
      )}

      {totalReactions > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            🎯 cAMP Kudos ({totalReactions} total)
          </h4>
          <div className="flex flex-wrap gap-2">
            {topEmojis.map(([emoji, count]) => (
              <div
                key={emoji}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200"
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-sm font-bold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalRatings > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              ⭐ Session Ratings ({totalRatings} responses)
            </h4>
            <div className="space-y-1.5">
              {ratingDist.map((r) => {
                const pct = totalRatings ? Math.round((r.count / totalRatings) * 100) : 0;
                return (
                  <div key={r.label} className="flex items-center gap-2">
                    <span className="text-sm w-6 text-center">{RATING_EMOJI[r.label]}</span>
                    <span className="text-xs w-16">{r.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${RATING_COLOR[r.label]?.split(" ")[0] ?? "bg-gray-300"} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{r.count}</span>
                    <span className="text-[10px] text-gray-400 w-8">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              📈 Usefulness ({totalUseful} responses)
            </h4>
            <div className="space-y-1.5">
              {usefulDist.map((r) => {
                const pct = totalUseful ? Math.round((r.count / totalUseful) * 100) : 0;
                return (
                  <div key={r.label} className="flex items-center gap-2">
                    <span className="text-xs w-20">{r.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${USEFUL_COLOR[r.label]?.split(" ")[0] ?? "bg-gray-300"} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{r.count}</span>
                    <span className="text-[10px] text-gray-400 w-8">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
