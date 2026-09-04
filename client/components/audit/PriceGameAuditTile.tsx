/**
 * Price Game Audit Tile — SME plays a 10-scenario sample of The Price is Right,
 * can edit each scenario after answering, then optionally review all 40 scenarios.
 */
import { useState, useCallback, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";

interface PriceScenario {
  id: string;
  scenario_id: string;
  section: string;
  game_type: string;
  narrative: string;
  game_data: any;
  coaching_note: string;
}

interface PriceGameAuditTileProps {
  topicKey: string;
  isApproved: boolean;
  onApproved?: () => void;
  onSaved?: () => void;
  sectionKey: string;
}

type TilePhase = "intro" | "playing" | "done";

const GAME_TYPE_LABELS: Record<string, string> = {
  higher_lower: "Higher / Lower",
  bullseye: "Bullseye",
  price_match: "Price Match",
  deal_builder: "Deal Builder",
  pricing_pitfall: "Pricing Pitfall",
  objection_closer: "Objection Closer",
};

const GAME_TYPE_EMOJI: Record<string, string> = {
  higher_lower: "📈",
  bullseye: "🎯",
  price_match: "🏷️",
  deal_builder: "🏗️",
  pricing_pitfall: "⚠️",
  objection_closer: "🛡️",
};

export default function PriceGameAuditTile({
  topicKey,
  isApproved,
  onApproved,
  onSaved,
  sectionKey,
}: PriceGameAuditTileProps) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading: approving } = useApi("SaveAuditApproval");
  const { run: saveContent, loading: saving } = useApi("SaveAuditContent");

  const { data, loading: loadingScenarios } = useApiData("GetGameScenariosForAudit", { gameType: "price" as const });
  const allScenarios = (data?.scenarios ?? []) as PriceScenario[];

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
      <div className="bg-violet-700 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <div>
            <h3 className="text-sm font-bold text-white">The Price is Right</h3>
            <p className="text-[10px] text-violet-200">{allScenarios.length} scenarios · 6 game types · 10 per game</p>
          </div>
        </div>
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

      <div className="p-4 space-y-4">
        {phase === "intro" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-3xl">🎰</p>
            <p className="text-sm text-gray-700">
              Play through <strong>10 randomized pricing scenarios</strong> across 6 game types. After each one, you can edit the scenario and coaching note.
            </p>
            <p className="text-xs text-gray-500">
              After the game, you'll have the option to review all {allScenarios.length} scenarios.
            </p>
            <button
              onClick={() => setPhase("playing")}
              className="px-6 py-2.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              💰 Start Playing
            </button>
          </div>
        )}

        {phase === "playing" && gameScenarios.length > 0 && currentIdx < gameScenarios.length && (
          <PlayablePriceScenario
            scenario={gameScenarios[currentIdx]}
            index={currentIdx}
            total={gameScenarios.length}
            onNext={() => {
              if (currentIdx < gameScenarios.length - 1) setCurrentIdx(currentIdx + 1);
              else setPhase("done");
            }}
            onSaveEdit={handleSaveEdit}
            saving={saving}
          />
        )}

        {phase === "done" && (
          <div className="text-center py-4 space-y-3">
            <p className="text-3xl">🎉</p>
            <p className="text-sm font-semibold text-gray-900">Game complete!</p>
            <p className="text-xs text-gray-500">You reviewed 10 scenarios. Want to audit the full set?</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setCurrentIdx(0); setPhase("playing"); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200"
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

        {showReviewAll && (
          <div className="space-y-2">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              <strong>📋 Optional full review</strong> — Not required for audit sign-off.
            </div>
            <ReviewAllPriceScenarios scenarios={allScenarios} onSaveEdit={handleSaveEdit} saving={saving} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Single playable Price scenario — shows game_data + edit */
function PlayablePriceScenario({
  scenario,
  index,
  total,
  onNext,
  onSaveEdit,
  saving,
}: {
  scenario: PriceScenario;
  index: number;
  total: number;
  onNext: () => void;
  onSaveEdit: (id: string, field: string, old: string, val: string) => Promise<void>;
  saving: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const gameData = scenario.game_data ?? {};
  const typeLabel = GAME_TYPE_LABELS[scenario.game_type] ?? scenario.game_type;
  const typeEmoji = GAME_TYPE_EMOJI[scenario.game_type] ?? "❓";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">Scenario {index + 1} of {total}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{scenario.section}</span>
          <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{typeEmoji} {typeLabel}</span>
        </div>
      </div>

      {/* Narrative / question */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-gray-800 leading-relaxed">{scenario.narrative}</p>
      </div>

      {/* Game data summary */}
      {!revealed && (
        <div className="space-y-2">
          {gameData.display_hint && (
            <p className="text-xs text-gray-500 italic">Hint: {gameData.display_hint}</p>
          )}
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            Reveal Answer
          </button>
        </div>
      )}

      {revealed && (
        <div className="space-y-3">
          {/* Answer */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-sm font-semibold text-emerald-800">
              {gameData.correct_value != null && `Answer: ${gameData.unit ?? ""}${gameData.correct_value.toLocaleString()}`}
              {gameData.correct_option && `Correct: ${gameData.correct_option}`}
              {gameData.correct_answer && `Answer: ${gameData.correct_answer}`}
            </p>
            {gameData.tolerance_pct && (
              <p className="text-[10px] text-emerald-600">Tolerance: ±{gameData.tolerance_pct}%</p>
            )}
          </div>

          {/* Coaching note */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <strong>🧭 Coaching Note:</strong> {scenario.coaching_note}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowEdit(!showEdit)}
              className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
            >
              {showEdit ? "Close Editor" : "✏️ Edit This Scenario"}
            </button>
            <button
              onClick={() => { setRevealed(false); setShowEdit(false); onNext(); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              {index < total - 1 ? "Next Scenario →" : "Finish Game 🎉"}
            </button>
          </div>

          {showEdit && (
            <PriceScenarioEditor scenario={scenario} onSave={onSaveEdit} saving={saving} />
          )}
        </div>
      )}
    </div>
  );
}

/** Editor for a Price scenario */
function PriceScenarioEditor({
  scenario,
  onSave,
  saving,
}: {
  scenario: PriceScenario;
  onSave: (id: string, field: string, old: string, val: string) => Promise<void>;
  saving: boolean;
}) {
  const [narrative, setNarrative] = useState(scenario.narrative);
  const [coachingNote, setCoachingNote] = useState(scenario.coaching_note);
  const [gameDataStr, setGameDataStr] = useState(JSON.stringify(scenario.game_data, null, 2));
  const [notes, setNotes] = useState("");

  const handleSaveAll = useCallback(async () => {
    if (narrative !== scenario.narrative) await onSave(scenario.id, "narrative", scenario.narrative, narrative);
    if (coachingNote !== scenario.coaching_note) await onSave(scenario.id, "coaching_note", scenario.coaching_note, coachingNote);
    const origData = JSON.stringify(scenario.game_data, null, 2);
    if (gameDataStr !== origData) await onSave(scenario.id, "game_data", origData, gameDataStr);
    if (notes.trim()) await onSave(scenario.id, "sme_notes", "", notes.trim());
  }, [scenario, narrative, coachingNote, gameDataStr, notes, onSave]);

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700">{scenario.scenario_id} — Edit Scenario</p>
      <label className="block text-[10px] font-semibold text-gray-500">Narrative / Question</label>
      <textarea value={narrative} onChange={e => setNarrative(e.target.value)} rows={3} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
      <label className="block text-[10px] font-semibold text-gray-500">Game Data (JSON)</label>
      <textarea value={gameDataStr} onChange={e => setGameDataStr(e.target.value)} rows={4} className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
      <label className="block text-[10px] font-semibold text-gray-500">Coaching Note</label>
      <textarea value={coachingNote} onChange={e => setCoachingNote(e.target.value)} rows={2} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
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

/** Grouped review-all list for Price scenarios */
function ReviewAllPriceScenarios({
  scenarios,
  onSaveEdit,
  saving,
}: {
  scenarios: PriceScenario[];
  onSaveEdit: (id: string, field: string, old: string, val: string) => Promise<void>;
  saving: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, PriceScenario[]>();
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
                  <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                    {GAME_TYPE_EMOJI[s.game_type] ?? "❓"} {GAME_TYPE_LABELS[s.game_type] ?? s.game_type}
                  </span>
                </button>
                {expandedId === s.id && (
                  <div className="px-3 pb-3">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-2 text-xs text-gray-700">
                      <p className="mb-1"><strong>Narrative:</strong> {s.narrative}</p>
                      <p className="mb-1"><strong>Type:</strong> {GAME_TYPE_LABELS[s.game_type]} · <strong>Data:</strong> {JSON.stringify(s.game_data)}</p>
                      <p><strong>Coaching:</strong> {s.coaching_note}</p>
                    </div>
                    <PriceScenarioEditor scenario={s} onSave={onSaveEdit} saving={saving} />
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
