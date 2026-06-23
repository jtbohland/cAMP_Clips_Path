import { useState, useCallback, useEffect, useMemo } from "react";

type RecoveryQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  sortOrder: number;
  correctFeedback: { emoji: string; label: string; explanation: string } | null;
  incorrectFeedback: { emoji: string; label: string; explanation: string } | null;
};

type SearchRescueProps = {
  questions: RecoveryQuestion[];
  sessionId: string;
  submitAnswer: (args: {
    sessionId: string;
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
    timeToAnswer: null;
  }) => Promise<any>;
  onComplete: (passed: boolean, score: number) => void;
};

export default function SearchRescue({ questions, sessionId, submitAnswer, onComplete }: SearchRescueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // B3-6: Blocking modal state
  const [showBlockModal, setShowBlockModal] = useState(false);

  const question = questions[currentIndex];
  const total = questions.length;

  // Shuffle answer options per question — different for every learner/attempt.
  // shuffleMap[displayIdx] = originalIdx, so visual position is randomised
  // but correctOption / submitAnswer still use original indices.
  const shuffleMap = useMemo(() => {
    if (!question) return [0, 1, 2, 3];
    const indices = question.options.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [question?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // B3-6: Block browser back / tab close during S&R
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const handlePopState = (e: PopStateEvent) => {
      // Push state back to prevent leaving
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
      setShowBlockModal(true);
    };

    // Push a state entry so popstate fires on back
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleSelect = useCallback(
    (displayIdx: number) => {
      if (showFeedback) return;
      const originalIdx = shuffleMap[displayIdx];
      setSelectedOption(displayIdx); // track the DISPLAY index for highlighting
      const correct = originalIdx === question.correctOption;
      setIsCorrect(correct);
      if (correct) setCorrectCount((c) => c + 1);
      setShowFeedback(true);

      // Persist S&R answer — submit the ORIGINAL index so DB stays consistent
      submitAnswer({
        sessionId,
        questionId: question.id,
        selectedOption: originalIdx,
        isCorrect: correct,
        timeToAnswer: null,
      }).catch(console.error);
    },
    [showFeedback, question, sessionId, submitAnswer, shuffleMap]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= total) {
      const pct = Math.round((correctCount / total) * 100);
      onComplete(pct >= 80, pct);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  }, [currentIndex, total, correctCount, onComplete]);

  const feedback = isCorrect ? question?.correctFeedback : question?.incorrectFeedback;

  if (!question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6">
        {/* Header — no back button (B3-6) */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚁</span>
            <h2 className="text-lg font-bold text-gray-900">Search & Rescue</h2>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>

        {/* Question */}
        <p className="text-gray-900 font-medium mb-5 leading-relaxed">
          {question.questionText}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-2 mb-4">
          {shuffleMap.map((originalIdx, displayIdx) => {
            const option = question.options[originalIdx];
            let optionStyle =
              "border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50";

            if (showFeedback) {
              if (originalIdx === question.correctOption) {
                optionStyle = "border-2 border-green-600 bg-green-50 text-green-900";
              } else if (displayIdx === selectedOption && !isCorrect) {
                optionStyle = "border-2 border-red-500 bg-red-50 text-red-900";
              } else {
                optionStyle = "border border-gray-200 bg-gray-50 opacity-50";
              }
            } else if (displayIdx === selectedOption) {
              optionStyle = "border-2 border-indigo-600 bg-indigo-50";
            }

            return (
              <button
                key={originalIdx}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium cursor-pointer ${optionStyle}`}
                onClick={() => handleSelect(displayIdx)}
                disabled={showFeedback}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full border border-current/20 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + displayIdx)}
                  </span>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && feedback && (
          <div
            className={`rounded-xl p-4 mb-4 border ${
              isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">{feedback.emoji}</span>
              <div>
                <p className={`font-bold text-sm ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                  {feedback.label}
                </p>
                <p className={`text-sm mt-1 leading-relaxed ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {feedback.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next button */}
        {showFeedback && (
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              {currentIndex + 1 >= total ? "⛑️ Finish" : "Next Question →"}
            </button>
          </div>
        )}
      </div>

      {/* B3-6: Blocking modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <span className="text-4xl block mb-3">🚁</span>
            <p className="text-gray-900 font-bold text-base mb-2">
              Complete Search & Rescue to unlock your next clip
            </p>
            <p className="text-gray-500 text-sm mb-5">
              You can do it! 🚁
            </p>
            <button
              onClick={() => setShowBlockModal(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              OK, let's go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
