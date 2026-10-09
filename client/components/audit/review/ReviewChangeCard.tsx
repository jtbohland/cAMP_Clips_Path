import { useState } from "react";
import type { ReviewChange } from "./changeFormat";
import { changeTitle, statusLabel } from "./changeFormat";
import ValueDiff from "./ValueDiff";

export type ReviewAction = "approve" | "revert" | "applied" | "dismiss" | "reopen";

/** One SME change with its before/after and the admin's action buttons. */
export default function ReviewChangeCard({ c, busy, onAction, onViewDay }: {
  c: ReviewChange;
  busy: boolean;
  onAction: (c: ReviewChange, action: ReviewAction) => void;
  onViewDay: (topicKey: string) => void;
}) {
  const [confirmRevert, setConfirmRevert] = useState(false);
  const status = statusLabel(c.status);
  const pending = c.status === "pending";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      {/* Header: what changed, where, who */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{changeTitle(c)}</p>
          <p className="text-xs text-gray-500">
            {c.dayLabel ? `${c.dayLabel}: ` : ""}{c.topicTitle}
            {c.clipTitle && c.clipTitle !== c.topicTitle ? ` · ${c.clipTitle}` : ""}
          </p>
          {c.questionText && (
            <p className="text-xs text-gray-600 italic mt-0.5 line-clamp-2">“{c.questionText}”</p>
          )}
        </div>
        <div className="text-right text-xs flex-shrink-0">
          <p className="font-medium text-gray-700">{c.viewerName}</p>
          <p className="text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${status.cls}`}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Live vs held explainer */}
      {pending && c.kind === "live" && (
        <p className="text-[11px] text-orange-700">⚡ Already live for learners.</p>
      )}
      {pending && c.kind === "held" && (
        <p className="text-[11px] text-red-700 font-medium">
          ✋ Not live. This needs you to apply it by hand{c.entityType.startsWith("video") ? " (video changes need your approval)" : ""}.
        </p>
      )}

      <ValueDiff c={c} />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {pending && c.kind === "live" && !confirmRevert && (
          <>
            <button disabled={busy} onClick={() => onAction(c, "approve")}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              ✓ Looks good
            </button>
            <button disabled={busy} onClick={() => setConfirmRevert(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
              ↩ Revert
            </button>
          </>
        )}
        {confirmRevert && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 border border-red-200 px-2 py-1.5">
            <span className="text-xs text-red-800">Put the “Before” version back for learners?</span>
            <button disabled={busy} onClick={() => { setConfirmRevert(false); onAction(c, "revert"); }}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              Yes, revert
            </button>
            <button onClick={() => setConfirmRevert(false)} className="text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-white">
              Cancel
            </button>
          </div>
        )}
        {pending && c.kind !== "live" && (
          <>
            <button disabled={busy} onClick={() => onAction(c, "applied")}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {c.kind === "note" ? "✓ Mark done" : "✓ I applied it"}
            </button>
            <button disabled={busy} onClick={() => onAction(c, "dismiss")}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Dismiss
            </button>
          </>
        )}
        {!pending && c.status !== "reverted" && (
          <button disabled={busy} onClick={() => onAction(c, "reopen")}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Undo review
          </button>
        )}
        {!pending && c.reviewedBy && (
          <span className="text-[11px] text-gray-400">by {c.reviewedBy}{c.reviewedAt ? ` · ${new Date(c.reviewedAt).toLocaleDateString()}` : ""}</span>
        )}
        <button onClick={() => onViewDay(c.topicKey)} className="ml-auto text-xs text-indigo-600 hover:underline">
          View in audit →
        </button>
      </div>
    </div>
  );
}
