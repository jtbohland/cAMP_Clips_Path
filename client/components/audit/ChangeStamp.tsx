/**
 * ChangeStamp — reusable inline indicator showing who changed what, when.
 * Shows: ✏️ [Name] · [date] · [field]: [old] → [new]
 * Used across all audit tiles to give visibility into SME edits.
 */
import { useState } from "react";

export interface ChangeEntry {
  fieldName: string;
  value: string;
  viewerName: string;
  changeType: string;
  createdAt: string;
  oldValue?: string | null;
}

/** Strip JSON wrapping quotes */
function clean(val: string | null | undefined): string {
  if (!val) return "";
  let v = val;
  if (v.startsWith('"') && v.endsWith('"')) {
    try { v = JSON.parse(v); } catch { /* use as-is */ }
  }
  // If it's a JSON object, try to extract meaningful label
  if (v.startsWith("{")) {
    try {
      const obj = JSON.parse(v);
      if (obj.label) return obj.label;
      if (obj.question) return obj.question;
      if (obj.name) return obj.name;
    } catch { /* use as-is */ }
  }
  return v;
}

/** Friendly field name */
function friendlyField(field: string): string {
  const map: Record<string, string> = {
    question: "Question text",
    correct_answer: "Correct answer",
    option_a: "Option A",
    option_b: "Option B",
    option_c: "Option C",
    option_d: "Option D",
    feedback: "Feedback",
    narrative: "Narrative",
    correct_rule: "Correct rule",
    belay_note: "Coaching note",
    gear_add: "Added gear",
    gear_update: "Updated gear",
    gear_remove: "Removed gear",
    clip_notes: "Clip notes",
    clip_summary: "Summary",
    clip_objectives: "Learning objectives",
    video_link: "Video link",
    smes: "SME list",
  };
  return map[field] ?? field.replace(/_/g, " ");
}

/** Single compact change stamp */
function Stamp({ entry }: { entry: ChangeEntry }) {
  const newVal = clean(entry.value);
  const oldVal = entry.oldValue ? clean(entry.oldValue) : null;
  const field = friendlyField(entry.fieldName);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5 text-[11px]">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-bold text-blue-700">✏️ {entry.viewerName}</span>
        <span className="text-blue-400">·</span>
        <span className="text-blue-500">{new Date(entry.createdAt).toLocaleDateString()}</span>
        <span className="text-blue-400">·</span>
        <span className="font-medium text-blue-600">{field}</span>
      </div>
      {oldVal && newVal && (
        <div className="mt-0.5 flex items-start gap-1.5">
          <span className="text-red-400 line-through flex-shrink-0 max-w-[45%] truncate">{oldVal}</span>
          <span className="text-blue-400">→</span>
          <span className="text-gray-800 flex-shrink-0 max-w-[45%] truncate">{newVal}</span>
        </div>
      )}
      {!oldVal && newVal && (
        <p className="mt-0.5 text-gray-800 whitespace-pre-wrap">{newVal.length > 200 ? newVal.slice(0, 200) + "…" : newVal}</p>
      )}
    </div>
  );
}

/** Group of change stamps for a specific entity — latest visible, older behind toggle */
export default function ChangeStamp({ changes }: { changes: ChangeEntry[] }) {
  const [showAll, setShowAll] = useState(false);

  if (changes.length === 0) return null;

  const latest = changes[0];
  const older = changes.slice(1);

  return (
    <div className="space-y-1">
      <Stamp entry={latest} />
      {older.length > 0 && !showAll && (
        <button onClick={() => setShowAll(true)} className="text-[10px] text-blue-500 hover:underline pl-1">
          📜 {older.length} earlier change{older.length !== 1 ? "s" : ""}…
        </button>
      )}
      {showAll && older.map((e, i) => (
        <div key={i} className="opacity-60">
          <Stamp entry={e} />
        </div>
      ))}
      {showAll && (
        <button onClick={() => setShowAll(false)} className="text-[10px] text-blue-400 hover:underline pl-1">
          ▲ Hide
        </button>
      )}
    </div>
  );
}

/** Helper: filter changes for a specific entity (question ID, clip ID, field prefix, etc.) */
export function filterChanges(
  allNotes: ChangeEntry[],
  opts: { entityId?: string; fieldPrefix?: string; fieldName?: string }
): ChangeEntry[] {
  return allNotes.filter(n => {
    if (opts.entityId && n.fieldName !== opts.entityId && !n.value?.includes(opts.entityId)) return false;
    if (opts.fieldPrefix && !n.fieldName.startsWith(opts.fieldPrefix)) return false;
    if (opts.fieldName && n.fieldName !== opts.fieldName) return false;
    return true;
  });
}
