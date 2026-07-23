import { memo, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import LearnerTile, { type LearnerTileData } from "./LearnerTile";

const PACING_URGENCY: Record<string, number> = {
  anchor_failure: 0,
  avalanche_warning: 1,
  rockslide: 2,
  lost_in_the_woods: 3,
  off_the_trail: 4,
  not_started: 5,
  summit_bound: 6,
  completed: 7,
};

type SortKey = "urgency" | "name" | "xp" | "clips" | "lastLogin";

interface LearnerTileGridProps {
  learners: LearnerTileData[];
  totalClips: number;
  onLearnerClick: (viewerId: string) => void;
}

const PAGE_SIZE = 24;

const LearnerTileGrid = memo(function LearnerTileGrid({
  learners,
  totalClips,
  onLearnerClick,
}: LearnerTileGridProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("urgency");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = learners;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        l =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.role.toLowerCase().includes(q) ||
          (l.managerName ?? "").toLowerCase().includes(q) ||
          (l.timezone ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      switch (sort) {
        case "urgency": {
          const ua = PACING_URGENCY[a.pacingStatus] ?? 5;
          const ub = PACING_URGENCY[b.pacingStatus] ?? 5;
          if (ua !== ub) return ua - ub;
          // Within same urgency: furthest from summit first
          const aDay = a.summitDay ? new Date(a.summitDay + "T00:00:00").getTime() : Infinity;
          const bDay = b.summitDay ? new Date(b.summitDay + "T00:00:00").getTime() : Infinity;
          return aDay - bDay;
        }
        case "name":
          return a.name.localeCompare(b.name);
        case "xp":
          return b.totalXp - a.totalXp;
        case "clips":
          return b.clipsCompleted - a.clipsCompleted;
        case "lastLogin": {
          const aL = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bL = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          return bL - aL;
        }
        default:
          return 0;
      }
    });
  }, [learners, search, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  }, []);

  const handleSort = useCallback((s: SortKey) => {
    setSort(s);
    setPage(0);
  }, []);

  // Pacing counts for summary pills
  const pacingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of learners) {
      counts[l.pacingStatus] = (counts[l.pacingStatus] ?? 0) + 1;
    }
    return counts;
  }, [learners]);

  const urgentCount =
    (pacingCounts.anchor_failure ?? 0) +
    (pacingCounts.avalanche_warning ?? 0) +
    (pacingCounts.rockslide ?? 0);

  const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: "urgency", label: "🚨 Urgency" },
    { key: "name", label: "A–Z Name" },
    { key: "xp", label: "⭐ Most XP" },
    { key: "clips", label: "🎬 Most Clips" },
    { key: "lastLogin", label: "🔑 Last Login" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="flex h-9 w-64 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Search by name, role, manager…"
          value={search}
          onChange={handleSearch}
        />

        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => handleSort(o.key)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                sort === o.key
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto text-[11px] text-gray-500">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-semibold">
              🔴 {urgentCount} need attention
            </span>
          )}
          <span>{filtered.length} cAMPers</span>
        </div>
      </div>

      {/* Tile grid */}
      {pageData.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {pageData.map(l => (
            <LearnerTile
              key={l.viewerId}
              learner={l}
              totalClips={totalClips}
              onClick={onLearnerClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="text-sm">No cAMPers match "{search}"</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
});

export default LearnerTileGrid;
