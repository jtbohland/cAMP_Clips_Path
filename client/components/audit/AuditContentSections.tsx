/** Editable + approvable section components for the day audit view */
import { useState, useCallback, useMemo } from "react";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";
import { useViewer } from "@/components/ViewerContext";
import { getGuideEntryForClip } from "@/config/ascentGuide";

// ─── Invite helper ─────────────────────────────────────────────────
function copyInvite(smeName: string, topicLabel: string) {
  const appUrl = window.location.origin;
  const msg = `Hey ${smeName}! You've been added as a Subject Matter Expert on "${topicLabel}" in cAMP Ascent. Register here to get started:\n\n${appUrl}\n\nSelect "Subject Matter Expert (SME)" as your role when registering. The audit deadline is October 9, 2026 — the clock is ticking! ⏱`;
  navigator.clipboard.writeText(msg).then(() => {
    toast.success(`Invite copied! Send it to ${smeName} via Slack or email.`);
  }).catch(() => toast.error("Failed to copy — try manually."));
}

// ─── Shared hooks ──────────────────────────────────────────────────
function useSaveAudit(topicKey: string, onSaved?: () => void) {
  const { viewer } = useViewer();
  const { run: save, loading } = useApi("SaveAuditContent");
  const doSave = useCallback(async (params: Record<string, any>) => {
    try {
      await save({
        viewerId: viewer?.id ?? "", viewerName: viewer?.name ?? "", topicKey,
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

function useApproval(topicKey: string, sectionKey: string, isApproved: boolean, onApproved?: () => void) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading } = useApi("SaveAuditApproval");
  const handleApprove = useCallback(async () => {
    try {
      await saveApproval({ viewerId: viewer?.id ?? "", topicKey, sectionKey, approved: !isApproved });
      toast.success(isApproved ? "Approval removed" : "Section approved ✅");
      onApproved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Approval failed: " + msg);
    }
  }, [saveApproval, viewer, topicKey, sectionKey, isApproved, onApproved]);
  return { handleApprove, approving: loading };
}

// ─── Section Header with Edit + Approve ────────────────────────────
function SectionHeader({ title, emoji, isApproved, onApprove, approving, editing, onStartEdit, onCancel, onSave, saving }: {
  title: string; emoji: string;
  isApproved: boolean; onApprove: () => void; approving: boolean;
  editing: boolean; onStartEdit: () => void; onCancel: () => void; onSave: () => void; saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
        <span>{emoji}</span> {title}
        {isApproved && <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">✅ Approved</span>}
      </h3>
      <div className="flex items-center gap-2">
        {!editing ? (
          <>
            <button onClick={onStartEdit} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100">✏️ Edit</button>
            <button onClick={onApprove} disabled={approving} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${isApproved ? "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100" : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
              {approving ? "…" : isApproved ? "Undo Approve" : "✅ Approve"}
            </button>
          </>
        ) : (
          <>
            <button onClick={onCancel} className="text-xs text-gray-500 hover:underline" disabled={saving}>Cancel</button>
            <button onClick={onSave} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving…" : "💾 Save"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Summary & Objectives (merged into topic header — NOT a separate card) ──
export function SummarySection({ summary, objectives, smes, topicKey, onSaved, isApproved, onApproved }: {
  summary: string | null; objectives: string[];
  smes: Array<{ name: string; title: string; note?: string | null }>;
  topicKey: string; onSaved?: () => void;
  isApproved: boolean; onApproved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState(summary ?? "");
  const [editObjectives, setEditObjectives] = useState<string[]>(objectives);
  const [editSmes, setEditSmes] = useState(smes.map(s => ({ ...s })));
  const [addingSme, setAddingSme] = useState(false);
  const [newSmeName, setNewSmeName] = useState("");
  const [newSmeTitle, setNewSmeTitle] = useState("");
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);
  const { handleApprove, approving } = useApproval(topicKey, "summary", isApproved, onApproved);

  const handleSaveAll = useCallback(async () => {
    if (editSummary !== (summary ?? "")) await doSave({ editType: "summary", fieldName: "summary", oldValue: summary, newValue: editSummary });
    if (JSON.stringify(editObjectives) !== JSON.stringify(objectives)) await doSave({ editType: "objectives", fieldName: "objectives", oldValue: JSON.stringify(objectives), newValue: JSON.stringify(editObjectives) });
    if (JSON.stringify(editSmes) !== JSON.stringify(smes)) await doSave({ editType: "smes", fieldName: "smes", oldValue: JSON.stringify(smes), newValue: JSON.stringify(editSmes) });
    setEditing(false);
  }, [doSave, editSummary, summary, editObjectives, objectives, editSmes, smes]);

  const handleAddSme = () => {
    if (newSmeName.trim() && newSmeTitle.trim()) {
      setEditSmes([...editSmes, { name: newSmeName.trim(), title: newSmeTitle.trim(), note: null }]);
      setNewSmeName(""); setNewSmeTitle(""); setAddingSme(false);
    }
  };

  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} p-5`}>
      <SectionHeader title="Summary & Learning Objectives" emoji="📝" isApproved={isApproved} onApprove={handleApprove} approving={approving}
        editing={editing} onStartEdit={() => { setEditSummary(summary ?? ""); setEditObjectives([...objectives]); setEditSmes(smes.map(s => ({ ...s }))); setEditing(true); }}
        onCancel={() => { setEditing(false); setAddingSme(false); }} onSave={handleSaveAll} saving={saving} />
      {!editing ? (
        <>
          {summary ? <p className="text-sm text-gray-700 leading-relaxed mb-4">{summary}</p> : <p className="text-sm text-gray-400 italic mb-4">No summary yet — click Edit to add one.</p>}
          {objectives.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Learning Objectives:</p>
              <ol className="list-decimal list-inside space-y-1">{objectives.map((obj, i) => <li key={i} className="text-sm text-gray-700">{obj}</li>)}</ol>
            </div>
          )}
          {smes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-2">Subject Matter Experts:</p>
              {smes.map((sme, i) => (
                <p key={i} className="text-sm text-gray-700"><span className="font-medium">{sme.name}</span><span className="text-gray-400"> · {sme.title}</span>{sme.note && <span className="text-amber-500 italic"> ({sme.note})</span>}</p>
              ))}
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
              <button onClick={() => setEditObjectives(editObjectives.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600 px-2">✕</button>
            </div>
          ))}
          <button onClick={() => setEditObjectives([...editObjectives, ""])} className="text-xs text-indigo-600 hover:underline mb-4">+ Add objective</button>

          {/* Editable SMEs */}
          <label className="block text-xs font-semibold text-gray-600 mb-1 mt-2">Subject Matter Experts</label>
          {editSmes.map((sme, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input value={sme.name} onChange={(e) => { const n = [...editSmes]; n[i] = { ...n[i], name: e.target.value }; setEditSmes(n); }} placeholder="Name" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
              <input value={sme.title} onChange={(e) => { const n = [...editSmes]; n[i] = { ...n[i], title: e.target.value }; setEditSmes(n); }} placeholder="Title" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
              <button onClick={() => setEditSmes(editSmes.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600 px-2">✕</button>
            </div>
          ))}
          {addingSme ? (
            <div className="flex gap-2 mb-2 items-center">
              <input value={newSmeName} onChange={(e) => setNewSmeName(e.target.value)} placeholder="Name" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
              <input value={newSmeTitle} onChange={(e) => setNewSmeTitle(e.target.value)} placeholder="Title" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
              <button onClick={handleAddSme} className="text-xs font-semibold text-emerald-600 hover:underline">Add</button>
              <button onClick={() => { setAddingSme(false); setNewSmeName(""); setNewSmeTitle(""); }} className="text-xs text-gray-400 hover:underline">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddingSme(true)} className="text-xs text-indigo-600 hover:underline">+ Add SME</button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Editable Question (shared for markers + S&R) ──────────────────
function EditableQuestion({ q, idx, label, topicKey, onSaved, accent }: {
  q: { id: string; questionText: string; options: any; correctOption: number; correctFeedback: string | null; triggerAtSeconds?: number | null; sortOrder: number };
  idx: number; label: string; topicKey: string; onSaved?: () => void;
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
    if (editText !== q.questionText) await doSave({ editType: "question", questionId: q.id, fieldName: "question_text", oldValue: q.questionText, newValue: editText });
    for (let i = 0; i < editOpts.length; i++) {
      if (editOpts[i] !== opts[i]) { const col = ["option_a","option_b","option_c","option_d"][i]; await doSave({ editType: "question", questionId: q.id, fieldName: col, oldValue: opts[i], newValue: editOpts[i] }); }
    }
    if (editCorrect !== q.correctOption) await doSave({ editType: "question", questionId: q.id, fieldName: "correct_option", oldValue: String(q.correctOption), newValue: String(editCorrect) });
    if (editFeedback !== (feedback.explanation ?? "")) { const newFb = JSON.stringify({ ...feedback, explanation: editFeedback }); await doSave({ editType: "question", questionId: q.id, fieldName: "correct_feedback", oldValue: q.correctFeedback, newValue: newFb }); }
    setEditing(false);
  }, [doSave, q, editText, editOpts, editCorrect, editFeedback, opts, feedback]);

  return (
    <div className={`border ${accent.border} rounded-lg p-3 ${accent.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${accent.badgeText} ${accent.badge} px-1.5 py-0.5 rounded`}>{label}{idx + 1}</span>
          {q.triggerAtSeconds != null && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">appears at {Math.floor(q.triggerAtSeconds / 60)}:{String(q.triggerAtSeconds % 60).padStart(2, "0")} in clip</span>
          )}
        </div>
        {!editing ? (
          <button onClick={() => { setEditText(q.questionText); setEditOpts([...opts]); setEditCorrect(q.correctOption); setEditFeedback(feedback.explanation ?? ""); setEditing(true); }} className="text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-50">✏️ Edit</button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(false)} className="text-[10px] text-gray-400 hover:underline" disabled={saving}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="text-[10px] font-semibold text-white bg-emerald-600 px-2 py-0.5 rounded hover:bg-emerald-700 disabled:opacity-50">{saving ? "…" : "💾 Save"}</button>
          </div>
        )}
      </div>
      {!editing ? (
        <>
          <p className="text-sm font-medium text-gray-900 mb-2">{q.questionText}</p>
          <div className="space-y-1 mb-2">
            {opts.map((opt, oi) => (
              <div key={oi} className={`flex items-start gap-2 text-sm rounded px-2 py-1 ${oi === q.correctOption ? "bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium" : "text-gray-600"}`}>
                <span className="text-xs mt-0.5">{oi === q.correctOption ? "✅" : "○"}</span><span>{opt}</span>
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

// ─── Trail Markers ─────────────────────────────────────────────────
export function TrailMarkersSection({ markers, clipTitle, topicKey, onSaved, sectionKey, isApproved, onApproved }: {
  markers: Array<any>; clipTitle: string; topicKey: string; onSaved?: () => void;
  sectionKey: string; isApproved: boolean; onApproved?: () => void;
}) {
  if (markers.length === 0) return null;
  const { handleApprove, approving } = useApproval(topicKey, sectionKey, isApproved, onApproved);
  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>🌲</span> Trail Markers — {clipTitle}
          {isApproved && <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">✅ Approved</span>}
        </h3>
        <button onClick={handleApprove} disabled={approving} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${isApproved ? "text-gray-500 bg-gray-50 border-gray-200" : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
          {approving ? "…" : isApproved ? "Undo Approve" : "✅ Approve"}
        </button>
      </div>
      {/* Context note — RED tile with bold warning */}
      <div className="rounded-lg bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-800 mb-3">
        <strong>📌 These are in-video questions</strong> that appear at specific timestamps during the clip. The time shown next to each question is when it pops up for learners.
        <p className="mt-1 font-bold text-red-700">⚠️ If you change a question, the video itself may need to be re-recorded to match.</p>
      </div>
      <div className="space-y-4">
        {markers.map((m, idx) => (
          <EditableQuestion key={m.id} q={m} idx={idx} label="Q" topicKey={topicKey} onSaved={onSaved}
            accent={{ bg: "bg-gray-50/50", border: "border-gray-100", badge: "bg-indigo-50", badgeText: "text-indigo-600" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Search & Rescue ────────────────────────────────────────────────
export function SearchRescueSection({ questions, clipTitle, topicKey, onSaved, sectionKey, isApproved, onApproved }: {
  questions: Array<any>; clipTitle: string; topicKey: string; onSaved?: () => void;
  sectionKey: string; isApproved: boolean; onApproved?: () => void;
}) {
  if (questions.length === 0) return null;
  const { handleApprove, approving } = useApproval(topicKey, sectionKey, isApproved, onApproved);
  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-amber-200 bg-amber-50/30"} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>🚁</span> Search & Rescue — {clipTitle}
          {isApproved && <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">✅ Approved</span>}
        </h3>
        <button onClick={handleApprove} disabled={approving} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${isApproved ? "text-gray-500 bg-gray-50 border-gray-200" : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
          {approving ? "…" : isApproved ? "Undo Approve" : "✅ Approve"}
        </button>
      </div>
      {/* Context note — RED tile with bold warning */}
      <div className="rounded-lg bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-800 mb-3">
        <strong>📌 S&R questions are recovery questions</strong> — they appear when a learner's engagement score drops below the threshold. These are also in-video questions with timestamps.
        <p className="mt-1 font-bold text-red-700">⚠️ Changing these may require a re-recorded video to stay in sync.</p>
      </div>
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
export function WeatherStormSection({ wts, clipTitle, clipId, topicKey, onSaved, sectionKey, isApproved, onApproved }: {
  wts: { overview: string; takeaways: any; timerMinutes: number } | null;
  clipTitle: string; clipId: string; topicKey: string; onSaved?: () => void;
  sectionKey: string; isApproved: boolean; onApproved?: () => void;
}) {
  if (!wts) return null;
  const takeaways: string[] = Array.isArray(wts.takeaways) ? wts.takeaways : [];
  const [editing, setEditing] = useState(false);
  const [editOverview, setEditOverview] = useState(wts.overview);
  const [editTakeaways, setEditTakeaways] = useState<string[]>(takeaways);
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);
  const { handleApprove, approving } = useApproval(topicKey, sectionKey, isApproved, onApproved);

  const handleSave = useCallback(async () => {
    if (editOverview !== wts.overview) await doSave({ editType: "weather_storm", clipId, fieldName: "overview", oldValue: wts.overview, newValue: editOverview });
    if (JSON.stringify(editTakeaways) !== JSON.stringify(takeaways)) await doSave({ editType: "weather_storm", clipId, fieldName: "takeaways", oldValue: JSON.stringify(takeaways), newValue: JSON.stringify(editTakeaways) });
    setEditing(false);
  }, [doSave, wts, clipId, editOverview, editTakeaways, takeaways]);

  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-blue-200 bg-blue-50/30"} p-5`}>
      <SectionHeader title={`Weather the Storm — ${clipTitle}`} emoji="⛈️" isApproved={isApproved} onApprove={handleApprove} approving={approving}
        editing={editing} onStartEdit={() => { setEditOverview(wts.overview); setEditTakeaways([...takeaways]); setEditing(true); }}
        onCancel={() => setEditing(false)} onSave={handleSave} saving={saving} />
      {!editing ? (
        <>
          <p className="text-sm text-gray-700 mb-3">{wts.overview}</p>
          {takeaways.length > 0 && (
            <div><p className="text-xs font-semibold text-gray-600 mb-1">Key Takeaways:</p>
              <ul className="list-disc list-inside space-y-0.5">{takeaways.map((t, i) => <li key={i} className="text-sm text-gray-700">{t}</li>)}</ul>
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
              <button onClick={() => setEditTakeaways(editTakeaways.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600 px-2">✕</button>
            </div>
          ))}
          <button onClick={() => setEditTakeaways([...editTakeaways, ""])} className="text-xs text-indigo-600 hover:underline">+ Add takeaway</button>
        </>
      )}
    </div>
  );
}

// ─── cAMP Gear (with SME responsibility note) ─────────────────────
export function GearSection({ resources, clipTitle, clipId, topicKey, onSaved, sectionKey, isApproved, onApproved }: {
  resources: any; clipTitle: string; clipId: string; topicKey: string; onSaved?: () => void;
  sectionKey: string; isApproved: boolean; onApproved?: () => void;
}) {
  const items: Array<{ label: string; type?: string; url: string; note?: string }> = Array.isArray(resources) ? resources : [];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);
  const { handleApprove, approving } = useApproval(topicKey, sectionKey, isApproved, onApproved);

  // Colored type badges matching Ranger Report's CampGearSection
  const GEAR_BADGE_STYLES: Record<string, string> = {
    slides: "bg-yellow-100 text-yellow-800",
    spekit: "bg-pink-100 text-pink-800",
    gdrive: "bg-green-100 text-green-800",
    zoom: "bg-blue-100 text-blue-800",
    slack: "bg-orange-200 text-orange-900",
    glean: "bg-indigo-100 text-indigo-800",
    mindtickle: "bg-orange-100 text-orange-800",
    sfdc: "bg-sky-100 text-sky-800",
    link: "bg-gray-100 text-gray-700",
    sheets: "bg-teal-100 text-teal-800",
  };
  const GEAR_TYPE_LABELS: Record<string, string> = {
    slides: "Slides",
    spekit: "Spekit",
    gdrive: "Google Drive",
    zoom: "Zoom",
    slack: "Slack",
    glean: "Glean",
    mindtickle: "MindTickle",
    sfdc: "Salesforce",
    link: "Link",
    sheets: "Sheets",
  };

  const handleCheck = (i: number) => { const next = new Set(checkedItems); next.has(i) ? next.delete(i) : next.add(i); setCheckedItems(next); };
  const handleUpdate = useCallback(async (i: number) => {
    await doSave({ editType: "gear_update", clipId, gearIndex: i, oldValue: JSON.stringify(items[i]), newValue: JSON.stringify({ label: editLabel, url: editUrl }) });
    setEditingIdx(null);
  }, [doSave, clipId, items, editLabel, editUrl]);
  const handleRemove = useCallback(async (i: number) => {
    await doSave({ editType: "gear_remove", clipId, gearIndex: i, oldValue: JSON.stringify(items[i]), newValue: null });
    setConfirmRemoveIdx(null);
  }, [doSave, clipId, items]);
  const handleAdd = useCallback(async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    await doSave({ editType: "gear_add", clipId, gearLabel: newLabel.trim(), gearUrl: newUrl.trim(), gearType: "link" });
    setNewLabel(""); setNewUrl(""); setAdding(false);
  }, [doSave, clipId, newLabel, newUrl]);

  const allChecked = items.length > 0 && checkedItems.size >= items.length;

  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>🎒</span> cAMP Gear — {clipTitle}
          {isApproved && <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">✅ Approved</span>}
          {!allChecked && items.length > 0 && <span className="text-[10px] text-gray-400">({checkedItems.size}/{items.length} reviewed)</span>}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding(true)} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100">+ Add Gear</button>
          <button onClick={handleApprove} disabled={approving || (!allChecked && !isApproved)} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${isApproved ? "text-gray-500 bg-gray-50 border-gray-200" : !allChecked ? "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed" : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
            {approving ? "…" : isApproved ? "Undo Approve" : !allChecked ? "✅ Review all first" : "✅ Approve"}
          </button>
        </div>
      </div>
      {/* SME responsibility note — RED tile */}
      <div className="rounded-lg bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-800 mb-3">
        <strong>📋 SME Responsibility:</strong> Any changes needed to slides, decks, or docs linked below are <strong>your responsibility</strong> — not the enablement team's. If you identify necessary corrections, please fix them directly before approving this section.
      </div>
      {items.length === 0 && !adding && <p className="text-sm text-gray-400 italic">No gear attached.</p>}
      <div className="space-y-2">
        {items.map((r, i) => (
          <div key={i}>
            {confirmRemoveIdx === i ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50">
                <span className="text-sm text-red-700">Remove <strong>{r.label}</strong>? This takes effect immediately.</span>
                <button onClick={() => handleRemove(i)} disabled={saving} className="text-xs font-semibold text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700">Yes, remove</button>
                <button onClick={() => setConfirmRemoveIdx(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors">
                <input type="checkbox" checked={checkedItems.has(i)} onChange={() => handleCheck(i)} className="accent-emerald-600 h-4 w-4 flex-shrink-0" />
                {editingIdx === i ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
                    <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
                    <button onClick={() => handleUpdate(i)} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-2.5 py-1 rounded">💾</button>
                    <button onClick={() => setEditingIdx(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                  </div>
                ) : (
                  <>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center gap-2 text-sm font-medium ${checkedItems.has(i) ? "text-gray-400 line-through" : "text-gray-800"}`}>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${GEAR_BADGE_STYLES[r.type ?? "link"] ?? "bg-gray-100 text-gray-700"}`}>{GEAR_TYPE_LABELS[r.type ?? "link"] ?? r.type ?? "Link"}</span>
                      <span>{r.label}</span>
                    </a>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditLabel(r.label); setEditUrl(r.url); setEditingIdx(i); }} className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 font-medium">Edit</button>
                      <span className="text-gray-300 text-xs">or</span>
                      <button onClick={() => setConfirmRemoveIdx(i)} className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 font-medium">Remove</button>
                    </div>
                  </>
                )}
              </div>
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

// ─── Clip Section (editable summary + objectives + SMEs + notes) ──
export function ClipSection({ clip, topicKey, topicTitle, onSaved, smes, isApproved, onApproved, sectionKey }: {
  clip: { clipId: string; title: string; videoUrl: string | null; sortOrder: number };
  topicKey: string; topicTitle?: string; onSaved?: () => void;
  smes?: Array<{ name: string; title: string; note?: string | null }>;
  isApproved?: boolean; onApproved?: () => void; sectionKey?: string;
}) {
  const [notes, setNotes] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [savedLinks, setSavedLinks] = useState<string[]>([]);
  const [linkSaved, setLinkSaved] = useState(false);
  const { doSave, saving } = useSaveAudit(topicKey, onSaved);
  const [saved, setSaved] = useState(false);
  const guideEntry = useMemo(() => getGuideEntryForClip(clip.sortOrder), [clip.sortOrder]);

  // Editable state for summary + objectives + SMEs
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState(guideEntry?.summary ?? "");
  const [editObjectives, setEditObjectives] = useState<string[]>(guideEntry?.learningObjectives ?? []);
  const [editSmes, setEditSmes] = useState<Array<{ name: string; title: string; note?: string | null }>>(smes ?? []);
  const [addingSme, setAddingSme] = useState(false);
  const [newSmeName, setNewSmeName] = useState("");
  const [newSmeTitle, setNewSmeTitle] = useState("");

  const { handleApprove, approving } = useApproval(topicKey, sectionKey ?? `summary_${clip.clipId}`, isApproved ?? false, onApproved);

  const handleSaveAll = useCallback(async () => {
    if (guideEntry && editSummary !== guideEntry.summary) {
      await doSave({ editType: "clip_summary", clipId: clip.clipId, fieldName: "summary", oldValue: guideEntry.summary, newValue: editSummary });
    }
    if (guideEntry && JSON.stringify(editObjectives) !== JSON.stringify(guideEntry.learningObjectives)) {
      await doSave({ editType: "clip_objectives", clipId: clip.clipId, fieldName: "objectives", oldValue: JSON.stringify(guideEntry.learningObjectives), newValue: JSON.stringify(editObjectives) });
    }
    if (smes && JSON.stringify(editSmes) !== JSON.stringify(smes)) {
      await doSave({ editType: "smes", fieldName: "smes", oldValue: JSON.stringify(smes), newValue: JSON.stringify(editSmes) });
    }
    setEditing(false);
  }, [doSave, clip.clipId, guideEntry, editSummary, editObjectives, editSmes, smes]);

  const handleAddSme = () => {
    if (newSmeName.trim() && newSmeTitle.trim()) {
      setEditSmes([...editSmes, { name: newSmeName.trim(), title: newSmeTitle.trim(), note: null }]);
      setNewSmeName(""); setNewSmeTitle(""); setAddingSme(false);
    }
  };

  const handleSaveNotes = useCallback(async () => {
    if (!notes.trim()) return;
    await doSave({ editType: "clip_notes", clipId: clip.clipId, fieldName: "clip_notes", oldValue: null, newValue: notes });
  }, [doSave, clip.clipId, notes]);

  const handleSaveVideoLink = useCallback(async () => {
    if (!videoLink.trim()) return;
    await doSave({ editType: "video_link", clipId: clip.clipId, fieldName: "video_link", oldValue: null, newValue: videoLink.trim() });
    setSavedLinks((prev) => [...prev, videoLink.trim()]);
    setVideoLink("");
    setLinkSaved(true);
    setTimeout(() => setLinkSaved(false), 2000);
  }, [doSave, clip.clipId, videoLink]);

  const approved = isApproved ?? false;

  return (
    <div className={`rounded-xl border ${approved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-medium">🎬 Clip (sort {clip.sortOrder})</p>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            {clip.title}
            {approved && <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">✅ Approved</span>}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {clip.videoUrl && (
            <a href={clip.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100">▶ Watch Clip</a>
          )}
          {!editing ? (
            <>
              <button onClick={() => { setEditSummary(guideEntry?.summary ?? ""); setEditObjectives([...(guideEntry?.learningObjectives ?? [])]); setEditSmes((smes ?? []).map(s => ({ ...s }))); setEditing(true); }}
                className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100">✏️ Edit</button>
              <button onClick={handleApprove} disabled={approving} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${approved ? "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100" : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"}`}>
                {approving ? "…" : approved ? "Undo Approve" : "✅ Approve"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setAddingSme(false); }} className="text-xs text-gray-500 hover:underline" disabled={saving}>Cancel</button>
              <button onClick={handleSaveAll} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving…" : "💾 Save"}</button>
            </>
          )}
        </div>
      </div>

      {/* Clip-level summary from Ascent Guide — editable */}
      {!editing ? (
        <>
          {guideEntry && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mb-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">📋 Clip Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">{guideEntry.summary}</p>
              {guideEntry.learningObjectives.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Learning Objectives:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    {guideEntry.learningObjectives.map((obj, i) => <li key={i} className="text-xs text-gray-600">{obj}</li>)}
                  </ol>
                </>
              )}
              {/* SMEs inline below objectives */}
              {smes && smes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Subject Matter Experts:</p>
                  {smes.map((sme, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="font-medium">{sme.name}</span><span className="text-gray-400"> · {sme.title}</span>{sme.note && <span className="text-amber-500 italic"> ({sme.note})</span>}
                      <button onClick={(e) => { e.stopPropagation(); copyInvite(sme.name, topicTitle ?? topicKey); }} className="text-xs text-indigo-500 hover:text-indigo-700 ml-1" title="Copy invite message">📨</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!guideEntry && smes && smes.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mb-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Subject Matter Experts:</p>
              {smes.map((sme, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{sme.name}</span><span className="text-gray-400"> · {sme.title}</span>{sme.note && <span className="text-amber-500 italic"> ({sme.note})</span>}
                  <button onClick={(e) => { e.stopPropagation(); copyInvite(sme.name, topicTitle ?? topicKey); }} className="text-xs text-indigo-500 hover:text-indigo-700 ml-1" title="Copy invite message">📨</button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mb-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">📋 Clip Summary</label>
            <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={4} className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Learning Objectives</label>
            {editObjectives.map((obj, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className="text-xs text-gray-400 mt-2 w-4">{i + 1}.</span>
                <input value={obj} onChange={(e) => { const n = [...editObjectives]; n[i] = e.target.value; setEditObjectives(n); }} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
                <button onClick={() => setEditObjectives(editObjectives.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600 px-2">✕</button>
              </div>
            ))}
            <button onClick={() => setEditObjectives([...editObjectives, ""])} className="text-xs text-indigo-600 hover:underline">+ Add objective</button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Matter Experts</label>
            {editSmes.map((sme, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input value={sme.name} onChange={(e) => { const n = [...editSmes]; n[i] = { ...n[i], name: e.target.value }; setEditSmes(n); }} placeholder="Name" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
                <input value={sme.title} onChange={(e) => { const n = [...editSmes]; n[i] = { ...n[i], title: e.target.value }; setEditSmes(n); }} placeholder="Title" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
                <button onClick={() => setEditSmes(editSmes.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600 px-2">✕</button>
              </div>
            ))}
            {addingSme ? (
              <div className="flex gap-2 mb-2 items-center">
                <input value={newSmeName} onChange={(e) => setNewSmeName(e.target.value)} placeholder="Name" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
                <input value={newSmeTitle} onChange={(e) => setNewSmeTitle(e.target.value)} placeholder="Title" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
                <button onClick={handleAddSme} className="text-xs font-semibold text-emerald-600 hover:underline">Add</button>
                <button onClick={() => { setAddingSme(false); setNewSmeName(""); setNewSmeTitle(""); }} className="text-xs text-gray-400 hover:underline">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingSme(true)} className="text-xs text-indigo-600 hover:underline">+ Add SME</button>
            )}
          </div>
        </div>
      )}

      {/* About this clip — RED tile */}
      <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-800 mb-3">
        <p className="font-semibold">📹 About this clip</p>
        <p className="text-xs text-red-700 mt-1">
          Clips cannot be edited or removed directly — too many systems depend on them (trail markers, engagement scoring, XP, etc.).
          If this clip is outdated, you have two options: <strong>(1)</strong> re-record the content, or <strong>(2)</strong> record a supplemental video.
          Upload your MP4 below and your admin will add it to the learning path.
        </p>
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 mb-1 block">📝 Notes on this clip</label>
        <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={3} placeholder="Any feedback, corrections, or re-recording notes…" className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none" />
        <div className="flex justify-end mt-1">
          <button onClick={handleSaveNotes} disabled={saving || !notes.trim()} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Saving…" : saved ? "✅ Saved" : "💾 Save Notes"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="text-xs font-semibold text-gray-600 mb-1 block">🎬 Supplemental / Re-recorded Video Links</label>
        <p className="text-[10px] text-gray-500 mb-2">Paste a link below and click <strong>Save Link</strong>. The link will appear in the list and the field will clear so you can add more.</p>
        <div className="flex gap-2 items-center">
          <input
            type="url"
            value={videoLink}
            onChange={(e) => { setVideoLink(e.target.value); setLinkSaved(false); }}
            placeholder="Paste Zoom, Wistia, or Google Drive link…"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none"
          />
          <button
            onClick={handleSaveVideoLink}
            disabled={saving || !videoLink.trim()}
            className="text-xs font-semibold text-white bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? "Saving…" : linkSaved ? "✅ Saved" : "Save Link"}
          </button>
        </div>

        {/* Saved links list */}
        {savedLinks.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Saved Links ({savedLinks.length})</p>
            {savedLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-1.5">
                <span className="text-xs text-gray-400">#{i + 1}</span>
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate flex-1">{link}</a>
                <span className="text-[10px] text-emerald-600 font-medium">✅</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-amber-700 mt-3 leading-relaxed">
          ⚠️ <strong>Important:</strong> The link you share must allow your admin to <strong>download the video as an MP4</strong>.
          For Zoom → use the cloud recording share link with download enabled.
          For Google Drive → set sharing to "Anyone with the link can view" + enable download.
          For Wistia → use the direct download link from the media settings.
        </p>
      </div>
    </div>
  );
}
