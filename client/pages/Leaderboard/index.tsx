import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";

// ─── Pill configs (match LearnerTile + Analytics exactly) ────────────────────

const PACING: Record<string, { label: string; bg: string; text: string }> = {
  summit_bound:      { label: "Summit Bound",   bg: "bg-green-50",   text: "text-green-700" },
  off_the_trail:     { label: "Off the Trail",  bg: "bg-amber-50",   text: "text-amber-700" },
  lost_in_the_woods: { label: "Lost in Woods",  bg: "bg-orange-50",  text: "text-orange-700" },
  rockslide:         { label: "Rockslide",       bg: "bg-red-50",     text: "text-red-700" },
  avalanche_warning: { label: "Avalanche",       bg: "bg-blue-50",    text: "text-blue-900" },
  anchor_failure:    { label: "Anchor Failure",  bg: "bg-red-100",    text: "text-red-800" },
  completed:         { label: "Completed",       bg: "bg-indigo-50",  text: "text-indigo-700" },
  not_started:       { label: "Not Started",     bg: "bg-gray-50",    text: "text-gray-500" },
};

const ROLE_PILL: Record<string, { bg: string; text: string; border: string }> = {
  "Velocity AE": { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  "Emerging AE": { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200" },
  "Majors AE":   { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
  "Strat AE":    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "SDR":         { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
  "PSM":         { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
  "Renewals":    { bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-300" },
};

const TZ_PILL: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  NAMER: { emoji: "🌎", label: "NAMER", bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  EMEA:  { emoji: "🌍", label: "EMEA",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },
  AAPJ:  { emoji: "🌏", label: "AAPJ",  bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
};

function RolePill({ role }: { role: string }) {
  const r = ROLE_PILL[role];
  if (!r) return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-600 whitespace-nowrap">{role}</span>;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${r.bg} border ${r.border} ${r.text} text-[10px] font-medium whitespace-nowrap`}>
      {role}
    </span>
  );
}

function TimezonePill({ timezone }: { timezone: string | null }) {
  if (!timezone) return null;
  const tz = TZ_PILL[timezone];
  if (!tz) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${tz.bg} border ${tz.border} ${tz.text} text-[10px] font-medium whitespace-nowrap`}>
      {tz.emoji} {tz.label}
    </span>
  );
}

function PacingPill({ status }: { status: string }) {
  const p = PACING[status] ?? PACING.not_started;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${p.bg} ${p.text}`}>
      {p.label}
    </span>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2 pt-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 bg-green-50 rounded-md animate-pulse" />
      ))}
    </div>
  );
}

// ─── Leaderboard Row ─────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  viewerId: string;
  name: string;
  role: string;
  timezone: string | null;
  totalXp: number;
  clipsCompleted: number;
  badgesEarned: number;
  pacingStatus: string;
  tierName: string;
  tierEmoji: string;
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isTop3 = entry.rank <= 3;
  const medalEmoji = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "";

  return (
    <div
      className={`grid grid-cols-[40px_1fr_80px_70px_60px_60px_60px_110px] gap-2 items-center px-3 py-2 rounded-md border ${
        isTop3 ? "border-green-300/50" : "border-green-100"
      }`}
      style={{ backgroundColor: isTop3 ? "#ECFDF5" : "#ffffff" }}
    >
      <div className="text-center text-sm font-bold text-gray-700">
        {medalEmoji || `#${entry.rank}`}
      </div>
      <div className="text-sm font-medium text-gray-900 truncate">{entry.name}</div>
      <div className="text-center"><RolePill role={entry.role} /></div>
      <div className="text-center"><TimezonePill timezone={entry.timezone} /></div>
      <div className="text-center text-sm font-bold text-[#1B4332]">{entry.totalXp}</div>
      <div className="text-center text-sm text-gray-700">{entry.clipsCompleted}</div>
      <div className="text-center text-sm text-gray-700">{entry.badgesEarned}</div>
      <div className="text-center"><PacingPill status={entry.pacingStatus} /></div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { data, loading, fetching, isError, error } = useApiData("GetPublicLeaderboard", {});

  const leaderboard = data?.leaderboard ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#ECFDF5" }}>
      {/* Header */}
      <div className="border-b border-green-900/20 px-6 py-4" style={{ backgroundColor: "#1B4332" }}>
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Leaderboard</h1>
              <p className="text-sm text-green-200 mt-0.5">See how you stack up against your fellow campers</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/library")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-200/30 bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors shadow-sm"
          >
            <span>🎞️</span>
            Back to cAMP Clips
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto w-full px-6 py-6">
          {loading ? (
            <LeaderboardSkeleton />
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-medium">Failed to load leaderboard</p>
              <p className="text-sm text-gray-500 mt-1">{String(error)}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-[40px_1fr_80px_70px_60px_60px_60px_110px] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-1">
                <span className="text-center">#</span>
                <span>Name</span>
                <span className="text-center">Role</span>
                <span className="text-center">Timezone</span>
                <span className="text-center">XP</span>
                <span className="text-center">Clips</span>
                <span className="text-center">Badges</span>
                <span className="text-center">Pacing</span>
              </div>

              {fetching && !loading && (
                <div className="text-xs text-green-700/60 text-center pb-1">Updating…</div>
              )}

              <div className={fetching && !loading ? "opacity-70" : ""}>
                {leaderboard.map((entry) => (
                  <LeaderboardRow key={entry.viewerId} entry={entry} />
                ))}
              </div>

              {leaderboard.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">No leaderboard data yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
