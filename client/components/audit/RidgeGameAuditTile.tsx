/**
 * Ridge Game Audit Tile — SME plays a 10-scenario sample of Rules of the Ridge,
 * can edit each scenario after answering, then optionally review all 50 scenarios.
 */
import { useState, useCallback, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";

interface RidgeScenario {
  id: string;
  scenario_id: string;
  section: string;
  narrative: string;
  question: string;
  correct_answer: string;
  correct_rule: string;
  distractor_1: string;
  distractor_2: string;
  distractor_3: string;
  belay_note: string;
}

interface RidgeGameAuditTileProps {
  topicKey: string;
  isApproved: boolean;
  onApproved?: () => void;
  onSaved?: () => void;
  sectionKey: string;
}

type TilePhase = "intro" | "playing" | "done";

export default function RidgeGameAuditTile({
  topicKey,
  isApproved,
  onApproved,
  onSaved,
  sectionKey,
}: RidgeGameAuditTileProps) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading: approving } = useApi("SaveAuditApproval");
  const { run: saveContent, loading: saving } = useApi("SaveAuditContent");

  // Fetch ALL scenarios
  const { data, loading: loadingScenarios } = useApiData("GetGameScenariosForAudit", { gameType: "ridge" as const });

  const allScenarios = (data?.scenarios ?? []) as RidgeScenario[];

  // Pick a random 10 for the playable game (stable per render via useMemo)
  const gameScenarios = useMemo(() => {
    if (allScenarios.length === 0) return [];
    const shuffled = [...allScenarios].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [allScenarios]);

  const [phase, setPhase] = useState<TilePhase>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showReviewAll, setShowReviewAll] = useState(false);

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

  const handleSaveEdit = useCallback(async (scenarioId: string, field: string, oldVal: string, newVal: string) => {
    try {
      await saveContent({
        viewerId: viewer?.id ?? "", viewerName: viewer?.name ?? "", topicKey,
        editType: "game_scenario_edit" as any, fieldName: field,
        oldValue: oldVal, newValue: newVal,
        questionId: scenarioId, clipId: null, gearIndex: null,
        gearLabel: null, gearUrl: null, gearType: null,
      });
      toast.success("Saved");
      onSaved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Save failed: " + msg);
    }
  }, [saveContent, viewer, topicKey, onSaved]);

  if (loadingScenarios) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-400">Loading game scenarios…</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} overflow-hidden`}>
      {/* Header */}
      <div className="bg-orange-700 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⛰️</span>
          <div>
            <h3 className="text-sm font-bold text-white">Rules of the Ridge</h3>
            <p className="text-[10px] text-orange-200">{allScenarios.length} scenarios · 10 per game</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={approving}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isApproved
                ? "text-white/70 bg-white/10 border-white/20 hover:bg-white/20"
                : "text-white bg-white/20 border-white/30 hover:bg-white/30"
            }`}
          >
            {approving ? "…" : isApproved ? "Undo Approve" : "✅ Approve"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Intro */}
        {phase === "intro" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-3xl">🏔️</p>
            <p className="text-sm text-gray-700">
              Play through <strong>10 randomized scenarios</strong> just like learners do. After each one, you can edit the narrative, answer, and coaching note.
            </p>
            <p className="text-xs text-gray-500">
              After the game, you'll have the option to review all {allScenarios.length} scenarios.
            </p>
            <button
              onClick={() => setPhase("playing")}
              className="px-6 py-2.5 rounded-lg text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
            >
              ⛰️ Start Playing
            </button>
          </div>
        )}

        {/* Playing */}
        {phase === "playing" && gameScenarios.length > 0 && currentIdx < gameScenarios.length && (
          <PlayableRidgeScenario
            scenario={gameScenarios[currentIdx]}
            index={currentIdx}
            total={gameScenarios.length}
            onNext={() => {
              if (currentIdx < gameScenarios.length - 1) {
                setCurrentIdx(currentIdx + 1);
              } else {
                setPhase("done");
              }
            }}
            onSaveEdit={handleSaveEdit}
            saving={saving}
          />
        )}

        {/* Done — game complete */}
        {phase === "done" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-3xl">🎉</p>
            <p className="text-sm font-semibold text-gray-900">Game complete!</p>
            <p className="text-xs text-gray-500">
              You reviewed 10 scenarios. Want to audit the full set?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setCurrentIdx(0); setPhase("playing"); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200"
              >
                🔄 Play Again
              </button>
              <button
                onClick={() => setShowReviewAll(!showReviewAll)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200"
              >
                📋 {showReviewAll ? "Hide" : "Review All"} Scenarios ({allScenarios.length})
              </button>
            </div>
          </div>
        )}

        {/* Review All — optional expandable list */}
        {showReviewAll && (
          <div className="space-y-2">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              <strong>📋 Optional full review</strong> — This is not required for your audit sign-off.
              Browse all {allScenarios.length} scenarios below and edit any that need corrections.
            </div>
            <ReviewAllScenarios
              scenarios={allScenarios}
              onSaveEdit={handleSaveEdit}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Single playable scenario with answer + edit overlay */
function PlayableRidgeScenario({
  scenario,
  index,
  total,
  onNext,
  onSaveEdit,
  saving,
}: {
  scenario: RidgeScenario;
  index: number;
  total: number;
  onNext: () => void;
  onSaveEdit: (id: string, field: string, old: string, val: string) => Promise<void>;
  saving: boolean;
}) {
  const [answered, setAnswered] = useState(false);
  const [yesNo, setYesNo] = useState<string | null>(null);
  const [rule, setRule] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  // Shuffle rule options
  const ruleOptions = useMemo(() => {
    return [scenario.correct_rule, scenario.distractor_1, scenario.distractor_2, scenario.distractor_3]
      .sort((a, b) => a.localeCompare(b));
  }, [scenario]);

  const handleAnswer = useCallback(() => {
    setAnswered(true);
  }, []);

  const yesNoCorrect = yesNo === scenario.correct_answer;
  const ruleCorrect = rule === scenario.correct_rule;

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">Scenario {index + 1} of {total}</span>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{scenario.section}</span>
      </div>

      {/* Narrative */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-gray-800 leading-relaxed">{scenario.narrative}</p>
      </div>

      {/* Question */}
      <p className="text-sm font-semibold text-gray-900">{scenario.question}</p>

      {/* Yes/No */}
      {!answered && (
        <>
          <div className="flex gap-2">
            {["Yes", "No"].map(opt => (
              <button
                key={opt}
                onClick={() => setYesNo(opt)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  yesNo === opt
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Rule selection */}
          <p className="text-xs font-semibold text-gray-600">Which rule applies?</p>
          <div className="grid grid-cols-2 gap-2">
            {ruleOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setRule(opt)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  rule === opt
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={handleAnswer}
            disabled={!yesNo || !rule}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 transition-colors"
          >
            Submit Answer
          </button>
        </>
      )}

      {/* Result */}
      {answered && (
        <div className="space-y-3">
          <div className={`rounded-lg p-3 border ${yesNoCorrect && ruleCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-sm font-semibold">
              {yesNoCorrect && ruleCorrect ? "✅ Correct!" : yesNoCorrect ? "🟡 Partially correct" : "❌ Incorrect"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Answer: <strong>{scenario.correct_answer}</strong> · Rule: <strong>{scenario.correct_rule}</strong>
            </p>
          </div>

          {/* Coaching note */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <strong>🧭 Belay Note:</strong> {scenario.belay_note}
          </div>

          {/* Edit toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowEdit(!showEdit)}
              className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
            >
              {showEdit ? "Close Editor" : "✏️ Edit This Scenario"}
            </button>
            <button
              onClick={() => { setAnswered(false); setYesNo(null); setRule(null); setShowEdit(false); onNext(); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
            >
              {index < total - 1 ? "Next Scenario →" : "Finish Game 🎉"}
            </button>
          </div>

          {/* Inline editor */}
          {showEdit && (
            <ScenarioEditor scenario={scenario} onSave={onSaveEdit} saving={saving} />
          )}
        </div>
      )}
    </div>
  );
}

/** Inline editor for a single Ridge scenario */
function ScenarioEditor({
  scenario,
  onSave,
  saving,
}: {
  scenario: RidgeScenario;
  onSave: (id: string, field: string, old: string, val: string) => Promise<void>;
  saving: boolean;
}) {
  const [narrative, setNarrative] = useState(scenario.narrative);
  const [question, setQuestion] = useState(scenario.question);
  const [correctAnswer, setCorrectAnswer] = useState(scenario.correct_answer);
  const [correctRule, setCorrectRule] = useState(scenario.correct_rule);
  const [belayNote, setBelayNote] = useState(scenario.belay_note);
  const [notes, setNotes] = useState("");

  const handleSaveAll = useCallback(async () => {
    if (narrative !== scenario.narrative) await onSave(scenario.id, "narrative", scenario.narrative, narrative);
    if (question !== scenario.question) await onSave(scenario.id, "question", scenario.question, question);
    if (correctAnswer !== scenario.correct_answer) await onSave(scenario.id, "correct_answer", scenario.correct_answer, correctAnswer);
    if (correctRule !== scenario.correct_rule) await onSave(scenario.id, "correct_rule", scenario.correct_rule, correctRule);
    if (belayNote !== scenario.belay_note) await onSave(scenario.id, "belay_note", scenario.belay_note, belayNote);
    if (notes.trim()) await onSave(scenario.id, "sme_notes", "", notes.trim());
  }, [scenario, narrative, question, correctAnswer, correctRule, belayNote, notes, onSave]);

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700">{scenario.scenario_id} — Edit Scenario</p>
      <label className="block text-[10px] font-semibold text-gray-500">Narrative</label>
      <textarea value={narrative} onChange={e => setNarrative(e.target.value)} rows={3} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
      <label className="block text-[10px] font-semibold text-gray-500">Question</label>
      <input value={question} onChange={e => setQuestion(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500">Correct Answer</label>
          <select value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 outline-none">
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500">Correct Rule</label>
          <input value={correctRule} onChange={e => setCorrectRule(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none" />
        </div>
      </div>
      <label className="block text-[10px] font-semibold text-gray-500">Belay Note (coaching)</label>
      <textarea value={belayNote} onChange={e => setBelayNote(e.target.value)} rows={2} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
      <label className="block text-[10px] font-semibold text-gray-500">SME Notes (optional)</label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any notes for your admin…" className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
      <div className="flex justify-end">
        <button onClick={handleSaveAll} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {saving ? "Saving…" : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}

/** Grouped list of all scenarios for optional full review */
function ReviewAllScenarios({
  scenarios,
  onSaveEdit,
  saving,
}: {
  scenarios: RidgeScenario[];
  onSaveEdit: (id: string, field: string, old: string, val: string) => Promise<void>;
  saving: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, RidgeScenario[]>();
    for (const s of scenarios) {
      const arr = map.get(s.section) ?? [];
      arr.push(s);
      map.set(s.section, arr);
    }
    return Array.from(map.entries());
  }, [scenarios]);

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      {grouped.map(([section, items]) => (
        <div key={section}>
          <p className="text-xs font-bold text-gray-600 mb-1 sticky top-0 bg-white py-1">{section} ({items.length})</p>
          <div className="space-y-1">
            {items.map(s => (
              <div key={s.id} className="rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-gray-400 font-mono">{s.scenario_id}</span>
                    <p className="text-xs text-gray-700 truncate">{s.narrative.slice(0, 100)}…</p>
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.correct_answer === "Yes" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {s.correct_answer}
                  </span>
                </button>
                {expandedId === s.id && (
                  <div className="px-3 pb-3">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-2 text-xs text-gray-700">
                      <p className="mb-1"><strong>Narrative:</strong> {s.narrative}</p>
                      <p className="mb-1"><strong>Question:</strong> {s.question}</p>
                      <p className="mb-1"><strong>Answer:</strong> {s.correct_answer} · <strong>Rule:</strong> {s.correct_rule}</p>
                      <p><strong>Belay Note:</strong> {s.belay_note}</p>
                    </div>
                    <ScenarioEditor scenario={s} onSave={onSaveEdit} saving={saving} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
