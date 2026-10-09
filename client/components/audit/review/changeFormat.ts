/** Plain-language labels + value formatting for SME audit changes. */

export interface ReviewChange {
  id: string;
  topicKey: string;
  topicTitle: string;
  dayLabel: string | null;
  viewerName: string;
  entityType: string;
  entityId: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changeType: string;
  createdAt: string;
  kind: "live" | "held" | "note";
  status: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  questionKind: string | null;
  questionText: string | null;
  clipTitle: string | null;
}

const QUESTION_FIELDS: Record<string, string> = {
  question_text: "question wording",
  option_a: "answer A",
  option_b: "answer B",
  option_c: "answer C",
  option_d: "answer D",
  correct_option: "correct answer",
  correct_feedback: "feedback explanation",
};

const TYPE_LABELS: Record<string, string> = {
  summary: "Day summary",
  objectives: "Learning objectives",
  clip_summary: "Clip summary",
  clip_objectives: "Clip learning objectives",
  smes: "SME list",
  gear_update: "cAMP Gear — edited link",
  gear_add: "cAMP Gear — added link",
  gear_remove: "cAMP Gear — removed link",
  clip_notes: "Clip note",
  academy_notes: "Academy note",
  wheel_notes: "Wheel & Deal note",
  video_link: "New video submitted",
  video_replace: "Replacement video submitted",
  game_scenario_edit: "Game scenario edit",
};

/** e.g. "Trail Marker — answer B" or "Weather the Storm — takeaways" */
export function changeTitle(c: ReviewChange): string {
  if (c.entityType === "question") {
    const field = QUESTION_FIELDS[c.fieldName ?? ""] ?? c.fieldName ?? "question";
    return `${c.questionKind ?? "Question"} — ${field}`;
  }
  if (c.entityType === "weather_storm") {
    return `Weather the Storm — ${c.fieldName === "takeaways" ? "key takeaways" : "overview"}`;
  }
  return TYPE_LABELS[c.entityType] ?? c.entityType;
}

/** Turns a stored value into readable lines (JSON lists → bullets, gear → "label — url"). */
export function readableValue(raw: string | null, c: ReviewChange): string[] {
  if (raw === null || raw === "") return [];
  if (c.fieldName === "correct_option") {
    const n = Number(raw);
    return Number.isInteger(n) ? [`Answer ${"ABCD"[n] ?? n}`] : [raw];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => (typeof p === "string" ? `• ${p}` : `• ${p?.name ?? JSON.stringify(p)}${p?.title ? ` (${p.title})` : ""}`));
    }
    if (parsed && typeof parsed === "object") {
      if ("explanation" in parsed) return [String(parsed.explanation ?? "")];
      if ("label" in parsed || "url" in parsed) return [`${parsed.label ?? "(no label)"} — ${parsed.url ?? "(no link)"}`];
      return [JSON.stringify(parsed, null, 2)];
    }
    return [String(parsed)];
  } catch {
    return [raw];
  }
}

export function statusLabel(status: string): { text: string; cls: string } {
  switch (status) {
    case "approved": return { text: "✓ Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "reverted": return { text: "↩ Reverted", cls: "bg-slate-100 text-slate-700 border-slate-300" };
    case "applied": return { text: "✓ Applied by hand", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "dismissed": return { text: "Dismissed", cls: "bg-slate-100 text-slate-600 border-slate-300" };
    default: return { text: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  }
}
