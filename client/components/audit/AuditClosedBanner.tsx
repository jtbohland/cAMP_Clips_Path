/**
 * Shown on the Ascent Audit pages when the audit is closed (deadline passed or no
 * active cycle). SMEs see everything read-only; admins see a note that they can
 * still edit and that opening the next cycle re-opens SME editing.
 */
export default function AuditClosedBanner({ reason, isAdmin }: { reason: string | null; isAdmin: boolean }) {
  return (
    <div className="rounded-lg bg-slate-100 border-2 border-slate-400 px-4 py-3 text-sm text-slate-900 flex items-start gap-3">
      <span className="text-lg flex-shrink-0">🔒</span>
      <div>
        <p className="font-bold">The Ascent Audit is closed</p>
        <p className="text-slate-700 text-xs mt-0.5">
          {reason ?? "Edits will reopen when the next audit cycle starts."}
        </p>
        {isAdmin && (
          <p className="text-slate-600 text-xs mt-1 italic">
            Admin view: you can still edit. SMEs are read-only until you open the next audit cycle.
          </p>
        )}
      </div>
    </div>
  );
}
