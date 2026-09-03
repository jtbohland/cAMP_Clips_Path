/** MV-SME Leaderboard for the Ascent Audit */
import { Progress } from "@/components/ui/progress";

interface LeaderboardEntry {
  name: string;
  topicsAssigned: number;
  topicsCompleted: number;
  sectionsApproved: number;
  editsMade: number;
  progressPct: number;
  badge: string | null;
}

function getRankEmoji(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function AuditLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏆</span>
        <h3 className="text-base font-bold text-gray-900">MV-SME Leaderboard</h3>
        <span className="text-xs text-gray-400 ml-1">Most Valuable Subject Matter Experts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-10">Rank</th>
              <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Topics</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Sections</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Edits</th>
              <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">Progress</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Badge</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const rank = i + 1;
              const isTop3 = rank <= 3;
              return (
                <tr
                  key={entry.name}
                  className={`border-b border-gray-50 transition-colors ${
                    isTop3 ? "bg-amber-50/30" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="py-2.5 px-2 text-center">
                    <span className={`text-sm ${isTop3 ? "font-bold" : "text-gray-400 text-xs"}`}>
                      {getRankEmoji(rank)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`font-semibold ${isTop3 ? "text-gray-900" : "text-gray-700"}`}>
                      {entry.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-xs">
                      <span className="font-bold text-emerald-600">{entry.topicsCompleted}</span>
                      <span className="text-gray-400">/{entry.topicsAssigned}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-xs font-semibold text-indigo-600">{entry.sectionsApproved}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-xs font-semibold text-amber-600">{entry.editsMade}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <Progress value={entry.progressPct} className="h-2 flex-1" />
                      <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{entry.progressPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {entry.badge ? (
                      <span className="text-xs font-semibold">{entry.badge}</span>
                    ) : (
                      <span className="text-xs text-gray-300">🏕️ TBD</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
        <span><strong>Topics</strong> = signed off / assigned</span>
        <span><strong>Sections</strong> = individually approved</span>
        <span><strong>Edits</strong> = content changes made</span>
        <span><strong>Badge</strong> = earned at sign-off</span>
      </div>
    </div>
  );
}
