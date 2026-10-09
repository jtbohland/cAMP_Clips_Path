import type { ReviewChange } from "./changeFormat";
import { readableValue } from "./changeFormat";

/** Side-by-side Before / After for one SME change. */
export default function ValueDiff({ c }: { c: ReviewChange }) {
  const before = readableValue(c.oldValue, c);
  const after = readableValue(c.newValue, c);
  const isNote = c.kind === "note";

  if (isNote || before.length === 0) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">
          {isNote ? "SME note" : c.entityType === "gear_remove" ? "Removed" : "Submitted"}
        </p>
        {(after.length ? after : ["(empty)"]).map((line, i) => (
          <p key={i} className="text-xs text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{line}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div className="rounded-md border border-red-200 bg-red-50/40 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700 mb-1">Before</p>
        {before.map((line, i) => (
          <p key={i} className="text-xs text-gray-600 whitespace-pre-wrap break-words leading-relaxed">{line}</p>
        ))}
      </div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">
          {c.entityType === "gear_remove" ? "After (removed)" : "After"}
        </p>
        {(after.length ? after : ["(removed)"]).map((line, i) => (
          <p key={i} className="text-xs text-gray-900 whitespace-pre-wrap break-words leading-relaxed">{line}</p>
        ))}
      </div>
    </div>
  );
}
