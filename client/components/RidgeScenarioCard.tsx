import { useState, useCallback, useMemo } from "react";

type Scenario = {
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
};

type RidgeScenarioCardProps = {
  scenario: Scenario;
  scenarioIndex: number;
  totalScenarios: number;
  isReplay: boolean;
  onSubmit: (result: {
    scenarioId: string;
    yesNoAnswer: string;
    ruleAnswer: string;
    cruxLevel: number;
    correctAnswer: string;
    correctRule: string;
  }) => Promise<{
    isCorrect: boolean;
    xpChange: number;
    yesNoCorrect: boolean;
    ruleCorrect: boolean;
  }>;
  onNext: () => void;
};

type Phase = "answer" | "crux" | "result";

const CRUX_LEVELS = [
  { level: 1, label: "⛏️", name: "Cautious", right: "+1 XP", wrong: "−1 XP" },
  { level: 2, label: "⛏️⛏️", name: "Confident", right: "+2 XP", wrong: "−1 XP" },
  { level: 3, label: "⛏️⛏️⛏️", name: "Sending It", right: "+3 XP", wrong: "−2 XP" },
];

export default function RidgeScenarioCard({
  scenario,
  scenarioIndex,
  totalScenarios,
  isReplay,
  onSubmit,
  onNext,
}: RidgeScenarioCardProps) {
  const [phase, setPhase] = useState<Phase>("answer");
  const [yesNo, setYesNo] = useState<string | null>(null);
  const [rule, setRule] = useState<string | null>(null);
  const [cruxLevel, setCruxLevel] = useState<number | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    xpChange: number;
    yesNoCorrect: boolean;
    ruleCorrect: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Shuffle rule options: correct + 3 distractors
  const ruleOptions = useMemo(() => {
    const options = [scenario.correct_rule, scenario.distractor_1, scenario.distractor_2, scenario.distractor_3];
    // Deterministic shuffle based on scenario id
    return options.sort((a, b) => {
      const hashA = a.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) + scenario.id.charCodeAt(i % scenario.id.length), 0);
      const hashB = b.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) + scenario.id.charCodeAt(i % scenario.id.length), 0);
      return hashA - hashB;
    });
  }, [scenario]);

  const canProceedTocrux = yesNo !== null && rule !== null;

  const handleProceedToCrux = useCallback(() => {
    if (canProceedTocrux) setPhase("crux");
  }, [canProceedTocrux]);

  const handleSubmitCrux = useCallback(async () => {
    if (cruxLevel === null || yesNo === null || rule === null) return;
    setSubmitting(true);
    try {
      const res = await onSubmit({
        scenarioId: scenario.id,
        yesNoAnswer: yesNo,
        ruleAnswer: rule,
        cruxLevel,
        correctAnswer: scenario.correct_answer,
        correctRule: scenario.correct_rule,
      });
      setResult(res);
      setPhase("result");
    } catch (e) {
      console.error("Failed to submit Ridge response", e);
    } finally {
      setSubmitting(false);
    }
  }, [cruxLevel, yesNo, rule, scenario, onSubmit]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
          {scenarioIndex + 1} / {totalScenarios}
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${((scenarioIndex + 1) / totalScenarios) * 100}%` }}
          />
        </div>
      </div>

      {/* Scenario card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ROE badge */}
        <div className="px-5 pt-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {scenario.section}
          </span>
          {isReplay && (
            <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              🔄 Replay — No XP
            </span>
          )}
        </div>

        {/* Narrative */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-800 leading-relaxed">{scenario.narrative}</p>
        </div>

        {phase === "answer" && (
          <div className="px-5 pb-5 space-y-4">
            {/* Part 1: Yes / No */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Part 1: Does the SDR get credit?
              </h3>
              <div className="flex gap-2">
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setYesNo(opt)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                      yesNo === opt
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {opt === "Yes" ? "✅ Yes" : "❌ No"}
                  </button>
                ))}
              </div>
            </div>

            {/* Part 2: Which rule? */}
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Part 2: Which rule applies?
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {ruleOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setRule(opt)}
                    className={`text-left px-4 py-2.5 rounded-lg text-sm border-2 transition-all ${
                      rule === opt
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Proceed button */}
            <button
              onClick={handleProceedToCrux}
              disabled={!canProceedTocrux}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                canProceedTocrux
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Set Your Crux Call ⛏️
            </button>
          </div>
        )}

        {phase === "crux" && (
          <div className="px-5 pb-5 space-y-4">
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-800 mb-1">⛏️ Crux Call</h3>
              <p className="text-xs text-gray-500">
                {isReplay
                  ? "Practice mode — no XP at stake"
                  : "How confident are you? Your real cAMP XP is on the line."}
              </p>
            </div>

            <div className="space-y-2">
              {CRUX_LEVELS.map((cl) => (
                <button
                  key={cl.level}
                  onClick={() => setCruxLevel(cl.level)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                    cruxLevel === cl.level
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cl.label}</span>
                    <span className={`text-sm font-semibold ${cruxLevel === cl.level ? "text-indigo-700" : "text-gray-700"}`}>
                      {cl.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600 font-medium">{cl.right}</span>
                    <span className="text-red-500 font-medium">{cl.wrong}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitCrux}
              disabled={cruxLevel === null || submitting}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                cruxLevel !== null && !submitting
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Submitting..." : "Lock It In 🔒"}
            </button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="px-5 pb-5 space-y-4">
            {/* Result banner */}
            <div className={`rounded-lg p-4 text-center ${result.isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <p className={`text-xl font-bold ${result.isCorrect ? "text-green-700" : "text-red-700"}`}>
                {result.isCorrect ? "✅ Correct!" : "❌ Not quite..."}
              </p>
              {!isReplay && (
                <p className={`text-sm font-semibold mt-1 ${result.xpChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {result.xpChange > 0 ? "+" : ""}{result.xpChange} XP
                </p>
              )}
            </div>

            {/* Answer breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span>{result.yesNoCorrect ? "✅" : "❌"}</span>
                <span className="text-gray-600">
                  SDR gets credit: <strong>{scenario.correct_answer}</strong>
                  {!result.yesNoCorrect && (
                    <span className="text-red-500 ml-1">(you said {yesNo})</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>{result.ruleCorrect ? "✅" : "❌"}</span>
                <span className="text-gray-600">
                  Rule: <strong>{scenario.correct_rule}</strong>
                  {!result.ruleCorrect && (
                    <span className="text-red-500 ml-1">(you said {rule})</span>
                  )}
                </span>
              </div>
            </div>

            {/* Derrick's Belay (only on wrong answers) */}
            {!result.isCorrect && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <h4 className="text-sm font-bold text-amber-800 mb-1">Derrick&apos;s Belay 🪢</h4>
                <p className="text-sm text-amber-700 leading-relaxed">{scenario.belay_note}</p>
              </div>
            )}

            {/* Next button */}
            <button
              onClick={onNext}
              className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              {scenarioIndex < totalScenarios - 1 ? "Next Scenario →" : "See Results 🏔️"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
