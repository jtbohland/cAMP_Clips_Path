/** Editable section components for the day audit view */
import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";
import { useViewer } from "@/components/ViewerContext";

// ─── Shared edit hook ──────────────────────────────────────────────────
function useSaveAudit(topicKey: string, onSaved?: () => void) {
  const { viewer } = useViewer();
  const { run: save, loading } = useApi("SaveAuditContent");

  const doSave = useCallback(async (params: Record<string, any>) => {
    try {
      await save({
        viewerId: viewer?.id ?? "", viewerName: viewer?.name ?? "",
        topicKey,
        editType: params.editType, fieldName: params.fieldName ?? null,
        oldValue: params.oldValue ?? null, newValue: params.newValue ?? null,
        questionId: params.questionId ?? null, clipId: params.clipId ?? null,
        gearIndex: params.gearIndex ?? null,
        gearLabel: params.gearLabel ?? null, gearUrl: params.gearUrl ?? null, gearType: params.gearType ?? null,
      });
      toast.success("Saved");
      onSaved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Save failed: " + msg);
    }
  }, [save, viewer, topicKey, onSaved]);

  return { doSave, saving: loading };
}

// ─── Summary & Objectives ─────────────────────────────────────────────
export function SummarySection({ summary, objectives, smes, topicKey, onSaved }: {
  summary: string | null;
  objectives: string[];
  smes: Array<{ name: string; title: string; note?: string | null }>;
  topicKey: string;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState(summary ?? "");
  const [editObjectives, setEditObjectives] = useState<string[]>(objectives);
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);

  const handleSaveSummary = useCallback(async () => {
    await doSave({ editType: "summary", fieldName: "summary", oldValue: summary, newValue: editSummary });
  }, [doSave, summary, editSummary]);

  const handleSaveObjectives = useCallback(async () => {
    await doSave({ editType: "objectives", fieldName: "objectives", oldValue: JSON.stringify(objectives), newValue: JSON.stringify(editObjectives) });
  }, [doSave, objectives, editObjectives]);

  const handleSaveAll = useCallback(async () => {
    if (editSummary !== (summary ?? "")) await handleSaveSummary();
    if (JSON.stringify(editObjectives) !== JSON.stringify(objectives)) await handleSaveObjectives();
    setEditing(false);
  }, [editSummary, summary, editObjectives, objectives, handleSaveSummary, handleSaveObjectives]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>📝</span> Summary & Learning Objectives
        </h3>
        {!editing ? (
          <button onClick={() => { setEditSummary(summary ?? ""); setEditObjectives([...objectives]); setEditing(true); }} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100">
            ✏️ Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:underline" disabled={saving}>Cancel</button>
            <button onClick={handleSaveAll} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving…" : "💾 Save"}
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          {summary ? <p className="text-sm text-gray-700 leading-relaxed mb-4">{summary}</p> : <p className="text-sm text-gray-400 italic mb-4">No summary yet.</p>}
          {objectives.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Learning Objectives:</p>
              <ol className="list-decimal list-inside space-y-1">
                {objectives.map((obj, i) => <li key={i} className="text-sm text-gray-700">{obj}</li>)}
              </ol>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Summary</label>
          <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={4} className="w-full text-sm border border-gray-300 rounded-lg p-2 mb-4 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none" />
          <label className="block text-xs font-semibold text-gray-600 mb-1">Learning Objectives</label>
          {editObjectives.map((obj, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <span className="text-xs text-gray-400 mt-2 w-4">{i + 1}.</span>
              <input value={obj} onChange={(e) => { const n = [...editObjectives]; n[i] = e.target.value; setEditObjectives(n); }} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
              <button onClick={() => setEditObjectives(editObjectives.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
          <button onClick={() => setEditObjectives([...editObjectives, ""])} className="text-xs text-indigo-600 hover:underline">+ Add objective</button>
        </>
      )}

      {smes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-2">Subject Matter Experts:</p>
          {smes.map((sme, i) => (
            <p key={i} className="text-sm text-gray-700">
              <span className="font-medium">{sme.name}</span>
              <span className="text-gray-400"> · {sme.title}</span>
              {sme.note && <span className="text-amber-500 italic"> ({sme.note})</span>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trail Markers / S&R (shared editable question component) ──────
function EditableQuestion({ q, idx, label, topicKey, onSaved, accent }: {
  q: { id: string; questionText: string; options: any; correctOption: number; correctFeedback: string | null; triggerAtSeconds?: number | null; sortOrder: number };
  idx: number;
  label: string;
  topicKey: string;
  onSaved?: () => void;
  accent: { bg: string; border: string; badge: string; badgeText: string };
}) {
  const [editing, setEditing] = useState(false);
  const opts: string[] = Array.isArray(q.options) ? q.options : [];
  const [editText, setEditText] = useState(q.questionText);
  const [editOpts, setEditOpts] = useState<string[]>(opts);
  const [editCorrect, setEditCorrect] = useState(q.correctOption);
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);

  let feedback: { explanation?: string } = {};
  try { feedback = q.correctFeedback ? JSON.parse(q.correctFeedback) : {}; } catch { /* */ }
  const [editFeedback, setEditFeedback] = useState(feedback.explanation ?? "");

  const handleSave = useCallback(async () => {
    if (editText !== q.questionText) {
      await doSave({ editType: "question", questionId: q.id, fieldName: "question_text", oldValue: q.questionText, newValue: editText });
    }
    for (let i = 0; i < editOpts.length; i++) {
      if (editOpts[i] !== opts[i]) {
        const col = ["option_a", "option_b", "option_c", "option_d"][i];
        await doSave({ editType: "question", questionId: q.id, fieldName: col, oldValue: opts[i], newValue: editOpts[i] });
      }
    }
    if (editCorrect !== q.correctOption) {
      await doSave({ editType: "question", questionId: q.id, fieldName: "correct_option", oldValue: String(q.correctOption), newValue: String(editCorrect) });
    }
    if (editFeedback !== (feedback.explanation ?? "")) {
      const newFb = JSON.stringify({ ...feedback, explanation: editFeedback });
      await doSave({ editType: "question", questionId: q.id, fieldName: "correct_feedback", oldValue: q.correctFeedback, newValue: newFb });
    }
    setEditing(false);
  }, [doSave, q, editText, editOpts, editCorrect, editFeedback, opts, feedback]);

  return (
    <div className={`border ${accent.border} rounded-lg p-3 ${accent.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${accent.badgeText} ${accent.badge} px-1.5 py-0.5 rounded`}>{label}{idx + 1}</span>
          {q.triggerAtSeconds != null && (
            <span className="text-[10px] text-gray-400">@ {Math.floor(q.triggerAtSeconds / 60)}:{String(q.triggerAtSeconds % 60).padStart(2, "0")}</span>
          )}
        </div>
        {!editing ? (
          <button onClick={() => { setEditText(q.questionText); setEditOpts([...opts]); setEditCorrect(q.correctOption); setEditFeedback(feedback.explanation ?? ""); setEditing(true); }} className="text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-50">✏️ Edit</button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(false)} className="text-[10px] text-gray-400 hover:underline" disabled={saving}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="text-[10px] font-semibold text-white bg-emerald-600 px-2 py-0.5 rounded hover:bg-emerald-700 disabled:opacity-50">{saving ? "…" : "💾"}</button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          <p className="text-sm font-medium text-gray-900 mb-2">{q.questionText}</p>
          <div className="space-y-1 mb-2">
            {opts.map((opt, oi) => (
              <div key={oi} className={`flex items-start gap-2 text-sm rounded px-2 py-1 ${oi === q.correctOption ? "bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium" : "text-gray-600"}`}>
                <span className="text-xs mt-0.5">{oi === q.correctOption ? "✅" : "○"}</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
          {feedback.explanation && <p className="text-xs text-gray-500 italic border-l-2 border-emerald-300 pl-2">{feedback.explanation}</p>}
        </>
      ) : (
        <>
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Question</label>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className="w-full text-sm border border-gray-300 rounded px-2 py-1 mb-2 focus:ring-2 focus:ring-indigo-300 outline-none" />
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Options (click radio to set correct)</label>
          {editOpts.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2 mb-1">
              <input type="radio" name={`correct-${q.id}`} checked={editCorrect === oi} onChange={() => setEditCorrect(oi)} className="accent-emerald-600" />
              <input value={opt} onChange={(e) => { const n = [...editOpts]; n[oi] = e.target.value; setEditOpts(n); }} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          ))}
          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 mt-2">Feedback explanation</label>
          <textarea value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)} rows={2} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
        </>
      )}
    </div>
  );
}

export function TrailMarkersSection({ markers, clipTitle, topicKey, onSaved }: {
  markers: Array<any>;
  clipTitle: string;
  topicKey: string;
  onSaved?: () => void;
}) {
  if (markers.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>🌲</span> Trail Markers — {clipTitle}
      </h3>
      <div className="space-y-4">
        {markers.map((m, idx) => (
          <EditableQuestion key={m.id} q={m} idx={idx} label="Q" topicKey={topicKey} onSaved={onSaved}
            accent={{ bg: "bg-gray-50/50", border: "border-gray-100", badge: "bg-indigo-50", badgeText: "text-indigo-600" }} />
        ))}
      </div>
    </div>
  );
}

export function SearchRescueSection({ questions, clipTitle, topicKey, onSaved }: {
  questions: Array<any>;
  clipTitle: string;
  topicKey: string;
  onSaved?: () => void;
}) {
  if (questions.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>🚁</span> Search & Rescue — {clipTitle}
      </h3>
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <EditableQuestion key={q.id} q={q} idx={idx} label="S&R Q" topicKey={topicKey} onSaved={onSaved}
            accent={{ bg: "bg-white", border: "border-amber-100", badge: "bg-amber-50", badgeText: "text-amber-700" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Weather the Storm ─────────────────────────────────────────────
export function WeatherStormSection({ wts, clipTitle, clipId, topicKey, onSaved }: {
  wts: { overview: string; takeaways: any; timerMinutes: number } | null;
  clipTitle: string;
  clipId: string;
  topicKey: string;
  onSaved?: () => void;
}) {
  if (!wts) return null;
  const takeaways: string[] = Array.isArray(wts.takeaways) ? wts.takeaways : [];
  const [editing, setEditing] = useState(false);
  const [editOverview, setEditOverview] = useState(wts.overview);
  const [editTakeaways, setEditTakeaways] = useState<string[]>(takeaways);
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);

  const handleSave = useCallback(async () => {
    if (editOverview !== wts.overview) {
      await doSave({ editType: "weather_storm", clipId, fieldName: "overview", oldValue: wts.overview, newValue: editOverview });
    }
    if (JSON.stringify(editTakeaways) !== JSON.stringify(takeaways)) {
      await doSave({ editType: "weather_storm", clipId, fieldName: "takeaways", oldValue: JSON.stringify(takeaways), newValue: JSON.stringify(editTakeaways) });
    }
    setEditing(false);
  }, [doSave, wts, clipId, editOverview, editTakeaways, takeaways]);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>⛈️</span> Weather the Storm — {clipTitle}
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{wts.timerMinutes} min</span>
        </h3>
        {!editing ? (
          <button onClick={() => { setEditOverview(wts.overview); setEditTakeaways([...takeaways]); setEditing(true); }} className="text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50">✏️ Edit</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:underline" disabled={saving}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving…" : "💾 Save"}</button>
          </div>
        )}
      </div>
      {!editing ? (
        <>
          <p className="text-sm text-gray-700 mb-3">{wts.overview}</p>
          {takeaways.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Key Takeaways:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {takeaways.map((t, i) => <li key={i} className="text-sm text-gray-700">{t}</li>)}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Overview</label>
          <textarea value={editOverview} onChange={(e) => setEditOverview(e.target.value)} rows={3} className="w-full text-sm border border-gray-300 rounded-lg p-2 mb-3 focus:ring-2 focus:ring-indigo-300 outline-none" />
          <label className="block text-xs font-semibold text-gray-600 mb-1">Key Takeaways</label>
          {editTakeaways.map((t, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <input value={t} onChange={(e) => { const n = [...editTakeaways]; n[i] = e.target.value; setEditTakeaways(n); }} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
              <button onClick={() => setEditTakeaways(editTakeaways.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
          <button onClick={() => setEditTakeaways([...editTakeaways, ""])} className="text-xs text-indigo-600 hover:underline">+ Add takeaway</button>
        </>
      )}
    </div>
  );
}

// ─── cAMP Gear ─────────────────────────────────────────────────────
export function GearSection({ resources, clipTitle, clipId, topicKey, onSaved }: {
  resources: any;
  clipTitle: string;
  clipId: string;
  topicKey: string;
  onSaved?: () => void;
}) {
  const items: Array<{ label: string; type?: string; url: string; note?: string }> = Array.isArray(resources) ? resources : [];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);

  const typeEmoji: Record<string, string> = { slides: "💻", spekit: "🐙", sfdc: "☁️", gdrive: "📑", link: "🔗", sheets: "📊", mindtickle: "🧠", slack: "💬" };

  const handleCheck = (i: number) => {
    const next = new Set(checkedItems);
    next.has(i) ? next.delete(i) : next.add(i);
    setCheckedItems(next);
  };

  const handleUpdate = useCallback(async (i: number) => {
    const old = items[i];
    await doSave({ editType: "gear_update", clipId, gearIndex: i, oldValue: JSON.stringify(old), newValue: JSON.stringify({ label: editLabel, url: editUrl }) });
    setEditingIdx(null);
  }, [doSave, clipId, items, editLabel, editUrl]);

  const handleRemove = useCallback(async (i: number) => {
    await doSave({ editType: "gear_remove", clipId, gearIndex: i, oldValue: JSON.stringify(items[i]), newValue: null });
  }, [doSave, clipId, items]);

  const handleAdd = useCallback(async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    await doSave({ editType: "gear_add", clipId, gearLabel: newLabel.trim(), gearUrl: newUrl.trim(), gearType: "link" });
    setNewLabel(""); setNewUrl(""); setAdding(false);
  }, [doSave, clipId, newLabel, newUrl]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>🎒</span> cAMP Gear — {clipTitle}
        </h3>
        <button onClick={() => setAdding(true)} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100">
          + Add Gear
        </button>
      </div>
      {items.length === 0 && !adding && <p className="text-sm text-gray-400 italic">No gear attached.</p>}
      <div className="space-y-2">
        {items.map((r, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors">
            <input type="checkbox" checked={checkedItems.has(i)} onChange={() => handleCheck(i)} className="accent-emerald-600 h-4 w-4 flex-shrink-0" />
            {editingIdx === i ? (
              <div className="flex-1 flex gap-2 items-center">
                <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
                <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
                <button onClick={() => handleUpdate(i)} disabled={saving} className="text-[10px] font-semibold text-white bg-emerald-600 px-2 py-0.5 rounded">{saving ? "…" : "💾"}</button>
                <button onClick={() => setEditingIdx(null)} className="text-[10px] text-gray-400">Cancel</button>
              </div>
            ) : (
              <>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center gap-2 text-sm font-medium ${checkedItems.has(i) ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  <span>{typeEmoji[r.type ?? "link"] ?? "📎"}</span>
                  <span>{r.label}</span>
                </a>
                <button onClick={() => { setEditLabel(r.label); setEditUrl(r.url); setEditingIdx(i); }} className="text-[10px] text-indigo-500 hover:underline">✏️</button>
                <button onClick={() => handleRemove(i)} disabled={saving} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
              </>
            )}
          </div>
        ))}
      </div>
      {adding && (
        <div className="mt-3 border border-indigo-200 rounded-lg p-3 bg-indigo-50/30">
          <p className="text-xs font-semibold text-gray-600 mb-2">Add new cAMP Gear resource</p>
          <div className="flex gap-2">
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (e.g. Pricing Deck)" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Paste URL" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => { setAdding(false); setNewLabel(""); setNewUrl(""); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !newLabel.trim() || !newUrl.trim()} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving…" : "💾 Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clip Section (watch-only + notes) ─────────────────────────────
export function ClipSection({ clip, topicKey, onSaved }: {
  clip: { clipId: string; title: string; videoUrl: string | null; sortOrder: number };
  topicKey: string;
  onSaved?: () => void;
}) {
  const [notes, setNotes] = useState("");
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);
  const [saved, setSaved] = useState(false);

  const handleSaveNotes = useCallback(async () => {
    if (!notes.trim()) return;
    await doSave({ editType: "clip_notes", clipId: clip.clipId, fieldName: "clip_notes", oldValue: null, newValue: notes });
    setSaved(true);
  }, [doSave, clip.clipId, notes]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-medium">🎬 Clip (sort {clip.sortOrder})</p>
          <h3 className="text-sm font-bold text-gray-900">{clip.title}</h3>
        </div>
        {clip.videoUrl && (
          <a href={clip.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
            ▶ Watch Clip
          </a>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 mb-3">
        <p className="font-semibold">📹 About this clip</p>
        <p className="text-xs text-blue-700 mt-1">
          Clips cannot be edited or removed directly — too many systems depend on them (trail markers, engagement scoring, XP, etc.).
          If this clip is outdated, you have two options: <strong>(1)</strong> re-record the content, or <strong>(2)</strong> record a supplemental video.
          Upload your MP4 below and your admin will add it to the learning path.
        </p>
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 mb-1 block">📝 Notes on this clip</label>
        <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={3} placeholder="Any feedback, corrections, or re-recording notes…" className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none" />
        <div className="flex justify-end mt-1">
          <button onClick={handleSaveNotes} disabled={saving || !notes.trim()} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Saving…" : saved ? "✅ Saved" : "💾 Save Notes"}
          </button>
        </div>
      </div>

      {/* MP4 upload placeholder — full file upload in Phase 3 */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-gray-400 text-xs">
        <p>📤 MP4 upload coming soon — for now, share recordings via Slack or email with your admin</p>
      </div>
    </div>
  );
}
