/** SME Change Review queue for the Ascent Audit admin tab */
import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewChange } from "./review/changeFormat";
import ReviewChangeCard from "./review/ReviewChangeCard";
import type { ReviewAction } from "./review/ReviewChangeCard";

type Tab = "needsAction" | "liveToReview" | "reviewed";
const PAGE_SIZE = 20;

const TABS: Array<{ key: Tab; label: string; hint: string }> = [
  { key: "needsAction", label: "✋ Needs your action", hint: "Not live yet: Approach (Product 101) edits, new/replacement videos, and other changes you apply by hand, plus SME notes." },
  { key: "liveToReview", label: "⚡ Live — review", hint: "Already in the training. Click Looks good to keep it, or Revert to put the old version back." },
  { key: "reviewed", label: "✓ Reviewed", hint: "Everything you've approved, reverted, applied, or dismissed." },
];

const ACTION_DONE: Record<ReviewAction, string> = {
  approve: "Marked as looks good",
  revert: "Reverted — the old version is back for learners",
  applied: "Marked as done",
  dismiss: "Dismissed",
  reopen: "Moved back to pending",
};

function errorMessage(e: unknown): string {
  return e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
}

export default function PendingChangesPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("needsAction");
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, fetching, isError, error, refetch } = useApiData("GetAuditPendingChanges", {
    topicKey: null,
    limit: null,
  });
  const { run: review } = useApi("ReviewAuditChange");

  const changes = (data?.changes ?? []) as ReviewChange[];
  const counts = data?.counts ?? { needsAction: 0, liveToReview: 0, reviewed: 0 };

  const visible = useMemo(() => changes.filter((c) => {
    if (tab === "reviewed") return c.status !== "pending";
    if (c.status !== "pending") return false;
    return tab === "liveToReview" ? c.kind === "live" : c.kind !== "live";
  }), [changes, tab]);

  useEffect(() => { setPage(0); }, [tab]);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAction = useCallback(async (c: ReviewChange, action: ReviewAction) => {
    setBusyId(c.id);
    try {
      await review({ changeId: c.id, action });
      toast.success(ACTION_DONE[action]);
      await refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }, [review, refetch]);

  const handleViewDay = useCallback((topicKey: string) => navigate(`/audit/${topicKey}`), [navigate]);

  if (loading) return <Skeleton className="h-48 mt-6" />;

  return (
    <div className="rounded-xl border border-orange-200 bg-white mt-6">
      <div className="bg-orange-600 text-white rounded-t-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-bold text-sm">SME Change Review</h3>
          {counts.needsAction + counts.liveToReview > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {counts.needsAction + counts.liveToReview} to review
            </span>
          )}
        </div>
        {fetching && <span className="text-xs opacity-80">Updating…</span>}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 px-4 pt-3 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-xs font-semibold px-3 py-2 rounded-t-md border-b-2 -mb-px ${
              tab === t.key ? "border-orange-600 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}>
            {t.label} <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className={`p-4 space-y-3 ${fetching ? "opacity-70" : ""}`}>
        <p className="text-xs text-gray-500">{TABS.find((t) => t.key === tab)?.hint}</p>

        {isError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center justify-between">
            <span>Couldn't load changes: {errorMessage(error)}</span>
            <button onClick={() => refetch()} className="underline">Retry</button>
          </div>
        )}

        {!isError && visible.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">Nothing here. You're all caught up.</p>
        )}

        {pageItems.map((c) => (
          <ReviewChangeCard key={c.id} c={c} busy={busyId === c.id} onAction={handleAction} onViewDay={handleViewDay} />
        ))}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">← Previous</button>
            <span>Page {page + 1} of {totalPages} ({visible.length} changes)</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
