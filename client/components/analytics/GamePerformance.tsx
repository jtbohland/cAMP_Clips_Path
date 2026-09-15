type GameStat = {
  game_type: string;
  total_sessions: number;
  completed_sessions: number;
  avg_net_xp: number | null;
  replay_count: number;
};

type Props = { gameStats: GameStat[] };

const GAME_CONFIG: Record<string, { label: string; emoji: string; color: string; xpLabel: string }> = {
  ridge: {
    label: "ROE Ridge",
    emoji: "⛰️",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    xpLabel: "Crux Call XP",
  },
  price: {
    label: "The Price is Right",
    emoji: "💰",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    xpLabel: "Crux Call XP",
  },
  dearr: {
    label: "DEARR Crossing",
    emoji: "🦌",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    xpLabel: "Antler Ante XP",
  },
};

export default function GamePerformance({ gameStats }: Props) {
  if (!gameStats || gameStats.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm italic">
        No game data yet — metrics will appear once learners start playing.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {gameStats.map((gs) => {
        const config = GAME_CONFIG[gs.game_type];
        if (!config) return null;
        const completionRate = gs.total_sessions > 0
          ? Math.round((gs.completed_sessions / gs.total_sessions) * 100)
          : 0;

        return (
          <div key={gs.game_type} className={`rounded-xl border px-4 py-4 ${config.color}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.emoji}</span>
              <span className="font-bold text-sm">{config.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <div className="opacity-60">Sessions</div>
                <div className="text-lg font-bold">{gs.total_sessions}</div>
              </div>
              <div>
                <div className="opacity-60">Completed</div>
                <div className="text-lg font-bold">
                  {gs.completed_sessions}
                  <span className="text-[10px] opacity-60 ml-1">({completionRate}%)</span>
                </div>
              </div>
              <div>
                <div className="opacity-60">{config.xpLabel}</div>
                <div className="text-lg font-bold">
                  {gs.avg_net_xp != null ? (
                    <span className={gs.avg_net_xp >= 0 ? "text-green-700" : "text-red-600"}>
                      {gs.avg_net_xp >= 0 ? "+" : ""}{gs.avg_net_xp} avg
                    </span>
                  ) : "—"}
                </div>
              </div>
              <div>
                <div className="opacity-60">Replays</div>
                <div className="text-lg font-bold">{gs.replay_count}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
