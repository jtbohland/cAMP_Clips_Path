import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useViewer } from "@/components/ViewerContext";

// ─── Pacing row highlight colors (light tinted backgrounds for "you" row) ────

const PACING_ROW_BG: Record<string, string> = {
  summit_bound:      "#D1FAE520", // green tint
  off_the_trail:     "#FEF3C740", // amber tint
  lost_in_the_woods: "#FFEDD540", // orange tint
  rockslide:         "#FEE2E240", // red tint
  avalanche_warning: "#DBEAFE40", // blue tint
  anchor_failure:    "#FEE2E250", // red tint
  completed:         "#E0E7FF30", // indigo tint
  not_started:       "#F3F4F630", // gray tint
};

// ─── Top-3 green spectrum (darkest #1 → lightest #3, fades into white) ───────

const TOP3_BG: Record<number, string> = {
  1: "#BBF7D0", // richest green (stands out most)
  2: "#DCFCE7", // medium green
  3: "#F0FDF4", // lightest mint (fades toward white/grey)
};

const TOP3_BORDER: Record<number, string> = {
  1: "#4ADE80", // richest green border
  2: "#6EE7B7", // medium green border
  3: "#86EFAC", // softest green border
};

// ─── Pill configs (match LearnerTile + Analytics exactly) ────────────────────

const PACING: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  summit_bound:      { label: "Summit Bound",   emoji: "🧗🏻‍♂️", bg: "bg-green-50",   text: "text-green-700" },
  off_the_trail:     { label: "Off the Trail",  emoji: "🧭",   bg: "bg-amber-50",   text: "text-amber-700" },
  lost_in_the_woods: { label: "Lost in Woods",  emoji: "🌲",   bg: "bg-orange-50",  text: "text-orange-700" },
  rockslide:         { label: "Rockslide",       emoji: "🪨",   bg: "bg-red-50",     text: "text-red-700" },
  avalanche_warning: { label: "Avalanche",       emoji: "❄️",   bg: "bg-blue-50",    text: "text-blue-900" },
  anchor_failure:    { label: "Anchor Failure",  emoji: "⛓️‍💥", bg: "bg-red-100",    text: "text-red-800" },
  completed:         { label: "Completed",       emoji: "🏔️✨", bg: "bg-indigo-50",  text: "text-indigo-700" },
  not_started:       { label: "Not Started",     emoji: "🏕️",   bg: "bg-gray-50",    text: "text-gray-500" },
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

// ─── Role group display config ───────────────────────────────────────────────

const ROLE_GROUP_CONFIG: Record<string, { label: string; emoji: string; headerBg: string; headerText: string }> = {
  AE:       { label: "Account Executives", emoji: "💼", headerBg: "#1E40AF",  headerText: "#DBEAFE" },
  SDR:      { label: "SDRs",               emoji: "📞", headerBg: "#3730A3",  headerText: "#E0E7FF" },
  PSM:      { label: "PSMs",               emoji: "🤝", headerBg: "#9A3412",  headerText: "#FFEDD5" },
  Renewals: { label: "Renewals",           emoji: "🔄", headerBg: "#854D0E",  headerText: "#FEF9C3" },
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${p.bg} ${p.text}`}>
      {p.emoji} {p.label}
    </span>
  );
}

// ─── Status Key (collapsible legend) ─────────────────────────────────────────

const STATUS_KEY: Array<{
  key: string;
  emoji: string;
  label: string;
  bg: string;
  text: string;
  description: string;
}> = [
  {
    key: "summit_bound",
    emoji: "🧗🏻‍♂️",
    label: "Summit Bound",
    bg: "bg-green-50",
    text: "text-green-700",
    description: "On pace or ahead — pacing ≥ 90%. Keep climbing!",
  },
  {
    key: "off_the_trail",
    emoji: "🧭",
    label: "Off the Trail",
    bg: "bg-amber-50",
    text: "text-amber-700",
    description: "Slightly behind — pacing 80–89%. A clip or two will get you back.",
  },
  {
    key: "lost_in_the_woods",
    emoji: "🌲",
    label: "Lost in Woods",
    bg: "bg-orange-50",
    text: "text-orange-700",
    description: "A few days behind — pacing 70–79%. Time to find the trail again.",
  },
  {
    key: "rockslide",
    emoji: "🪨",
    label: "Rockslide",
    bg: "bg-red-50",
    text: "text-red-700",
    description: "Significantly behind — pacing 60–69%. Catch-up mode activated.",
  },
  {
    key: "avalanche_warning",
    emoji: "❄️",
    label: "Avalanche",
    bg: "bg-blue-50",
    text: "text-blue-900",
    description: "At risk — pacing 50–59%. Urgent action needed to stay in the program.",
  },
  {
    key: "anchor_failure",
    emoji: "⛓️‍💥",
    label: "Anchor Failure",
    bg: "bg-red-100",
    text: "text-red-800",
    description: "Past Summit Day deadline or pacing below 50%. Working to get back on track.",
  },
  {
    key: "completed",
    emoji: "🏔️✨",
    label: "Completed",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    description: "Finished all Ascent clips. Summit reached!",
  },
];

function StatusKeySection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-800/70 hover:text-green-900 transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>ℹ️ What do these statuses mean?</span>
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-green-200/60 bg-white/80 backdrop-blur-sm p-4 space-y-2">
          {STATUS_KEY.map((s) => (
            <div key={s.key} className="flex items-start gap-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 ${s.bg} ${s.text}`}
              >
                {s.emoji} {s.label}
              </span>
              <span className="text-xs text-gray-600 leading-relaxed pt-0.5">
                {s.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
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
  roleGroup: string;
  timezone: string | null;
  totalXp: number;
  xpPct: number;
  maxXp: number;
  clipsCompleted: number;
  badgesEarned: number;
  pacingStatus: string;
  tierName: string;
  tierEmoji: string;
}

function MainLeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const isTop3 = entry.rank <= 3;
  const medalEmoji = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "";

  // Determine row background + border
  let rowBg: string;
  let rowBorder: string;

  if (isCurrentUser) {
    rowBg = PACING_ROW_BG[entry.pacingStatus] ?? "#F3F4F630";
    rowBorder = isTop3
      ? `2px solid ${TOP3_BORDER[entry.rank] ?? "#86EFAC"}`
      : "2px solid #D1D5DB";
  } else if (isTop3) {
    rowBg = TOP3_BG[entry.rank] ?? "#F0FDF4";
    rowBorder = `1px solid ${TOP3_BORDER[entry.rank] ?? "#86EFAC"}`;
  } else {
    rowBg = "#ffffff";
    rowBorder = "1px solid #E5E7EB";
  }

  return (
    <div
      className={`grid grid-cols-[40px_1fr_80px_70px_70px_60px_60px_110px] gap-2 items-center px-3 py-3 rounded-md transition-colors ${
        isCurrentUser ? "font-semibold" : ""
      }`}
      style={{ backgroundColor: rowBg, border: rowBorder }}
    >
      <div className="text-center text-sm font-bold text-gray-700">
        {medalEmoji || `#${entry.rank}`}
      </div>
      <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
        {entry.name}
        {isCurrentUser && (
          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">(you)</span>
        )}
      </div>
      <div className="text-center"><RolePill role={entry.role} /></div>
      <div className="text-center"><TimezonePill timezone={entry.timezone} /></div>
      {/* XP column: earned XP + "of ~max" subtext */}
      <div className="text-center">
        <div className="text-sm font-bold text-[#1B4332]">{entry.totalXp}</div>
        <div className="text-[9px] text-gray-400 leading-none">of ~{entry.maxXp}</div>
      </div>
      <div className="text-center text-sm text-gray-700">{entry.clipsCompleted}</div>
      <div className="text-center text-sm text-gray-700">{entry.badgesEarned}</div>
      <div className="text-center"><PacingPill status={entry.pacingStatus} /></div>
    </div>
  );
}

// ─── Role Board Row (compact — no geo/pacing, shows role sub-type) ───────────

function RoleBoardRow({ entry, rank, isCurrentUser }: { entry: LeaderboardEntry; rank: number; isCurrentUser: boolean }) {
  const isTop3 = rank <= 3;
  const medalEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";

  let rowBg: string;
  let rowBorder: string;

  if (isCurrentUser) {
    rowBg = PACING_ROW_BG[entry.pacingStatus] ?? "#F3F4F630";
    rowBorder = isTop3 ? `2px solid ${TOP3_BORDER[rank] ?? "#86EFAC"}` : "2px solid #D1D5DB";
  } else if (isTop3) {
    rowBg = TOP3_BG[rank] ?? "#F0FDF4";
    rowBorder = `1px solid ${TOP3_BORDER[rank] ?? "#86EFAC"}`;
  } else {
    rowBg = "#ffffff";
    rowBorder = "1px solid #E5E7EB";
  }

  return (
    <div
      className={`grid grid-cols-[36px_1fr_80px_60px_50px_50px_100px] gap-2 items-center px-3 py-2.5 rounded-md text-sm ${
        isCurrentUser ? "font-semibold" : ""
      }`}
      style={{ backgroundColor: rowBg, border: rowBorder }}
    >
      <div className="text-center font-bold text-gray-700 text-xs">
        {medalEmoji || `#${rank}`}
      </div>
      <div className="font-medium text-gray-900 truncate flex items-center gap-1.5">
        {entry.name}
        {isCurrentUser && (
          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">(you)</span>
        )}
      </div>
      <div className="text-center"><RolePill role={entry.role} /></div>
      <div className="text-center font-bold text-[#1B4332]">{entry.totalXp}</div>
      <div className="text-center text-gray-600 text-xs">{entry.clipsCompleted}</div>
      <div className="text-center text-gray-600 text-xs">{entry.badgesEarned}</div>
      <div className="text-center"><PacingPill status={entry.pacingStatus} /></div>
    </div>
  );
}

// ─── Role Board Section (collapsible) ────────────────────────────────────────

function RoleBoardSection({
  roleGroup,
  entries,
  currentViewerId,
}: {
  roleGroup: string;
  entries: LeaderboardEntry[];
  currentViewerId: string;
}) {
  const [open, setOpen] = useState(true);
  const config = ROLE_GROUP_CONFIG[roleGroup] ?? { label: roleGroup, emoji: "📋", headerBg: "#374151", headerText: "#F3F4F6" };

  // Sort by raw XP within this role group
  const sorted = useMemo(() =>
    [...entries].sort((a, b) => b.totalXp - a.totalXp),
    [entries],
  );

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ backgroundColor: config.headerBg, color: config.headerText }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.emoji}</span>
          <span className="font-bold text-sm">{config.label}</span>
          <span className="text-xs opacity-75">({sorted.length})</span>
        </div>
        <span className="text-sm">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="bg-white p-3 space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[36px_1fr_80px_60px_50px_50px_100px] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-1">
            <span className="text-center">#</span>
            <span>Name</span>
            <span className="text-center">Role</span>
            <span className="text-center">XP</span>
            <span className="text-center">Clips</span>
            <span className="text-center">Bdgs</span>
            <span className="text-center">Pacing</span>
          </div>
          {sorted.map((entry, i) => (
            <RoleBoardRow
              key={entry.viewerId}
              entry={entry}
              rank={i + 1}
              isCurrentUser={entry.viewerId === currentViewerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { viewer } = useViewer();
  const { data, loading, fetching, isError, error } = useApiData("GetPublicLeaderboard", {});

  const leaderboard = data?.leaderboard ?? [];
  const currentViewerId = viewer?.id ?? "";

  // Group entries by roleGroup for role boards
  const roleGroups = useMemo(() => {
    const groups: Record<string, LeaderboardEntry[]> = {};
    for (const entry of leaderboard) {
      const rg = entry.roleGroup;
      if (!groups[rg]) groups[rg] = [];
      groups[rg].push(entry);
    }
    return groups;
  }, [leaderboard]);

  // Ordered role groups
  const ROLE_GROUP_ORDER = ["AE", "SDR", "PSM", "Renewals"];

  return (
    <div className="flex flex-col w-full" style={{ backgroundColor: "#ECFDF5", minHeight: "100vh" }}>
      {/* Header */}
      <div className="border-b border-green-900/20 px-6 py-4" style={{ backgroundColor: "#1B4332" }}>
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Leaderboard</h1>
              <p className="text-sm text-green-200 mt-0.5">Ranked by % of max possible XP for your role</p>
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
      <div className="flex-1">
        <div className="max-w-4xl mx-auto w-full px-6 py-6">
          <StatusKeySection />

          {loading ? (
            <LeaderboardSkeleton />
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-medium">Failed to load leaderboard</p>
              <p className="text-sm text-gray-500 mt-1">{String(error)}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* ─── Main Board ─── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌍</span>
                  <h2 className="text-base font-bold text-gray-900">All Campers</h2>
                  <span className="text-xs text-gray-500">Ranked by % of max XP</span>
                </div>

                <div className="space-y-1">
                  {/* Header row */}
                  <div className="grid grid-cols-[40px_1fr_80px_70px_70px_60px_60px_110px] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 pb-1">
                    <span className="text-center">#</span>
                    <span>Name</span>
                    <span className="text-center">Role</span>
                    <span className="text-center">Geo</span>
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
                      <MainLeaderboardRow
                        key={entry.viewerId}
                        entry={entry}
                        isCurrentUser={entry.viewerId === currentViewerId}
                      />
                    ))}
                  </div>

                  {leaderboard.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-6">No leaderboard data yet</p>
                  )}
                </div>
              </div>

              {/* ─── Role Boards ─── */}
              {leaderboard.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">👥</span>
                    <h2 className="text-base font-bold text-gray-900">By Role</h2>
                    <span className="text-xs text-gray-500">Ranked by XP within role</span>
                  </div>
                  <div className="space-y-4">
                    {ROLE_GROUP_ORDER.map((rg) => (
                      <RoleBoardSection
                        key={rg}
                        roleGroup={rg}
                        entries={roleGroups[rg] ?? []}
                        currentViewerId={currentViewerId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
