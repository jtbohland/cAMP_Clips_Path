import { useState, useCallback, useMemo } from "react";

type Question = {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  sortOrder: number;
  correctFeedback: { emoji: string; label: string; explanation: string } | null;
  incorrectFeedback: { emoji: string; label: string; explanation: string } | null;
};

type QuizOverlayV2Props = {
  question: Question;
  onAnswer: (selectedOption: number) => void;
  onContinue: () => void;
};

export default function QuizOverlayV2({
  question,
  onAnswer,
  onContinue,
}: QuizOverlayV2Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Shuffle answer options per question — different for every learner/attempt.
  // shuffleMap[displayIdx] = originalIdx
  const shuffleMap = useMemo(() => {
    const indices = question.options.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback(
    (displayIdx: number) => {
      if (showFeedback) return; // Already answered
      const originalIdx = shuffleMap[displayIdx];
      setSelectedOption(displayIdx); // track DISPLAY index for highlighting
      const correct = originalIdx === question.correctOption;
      setIsCorrect(correct);
      setShowFeedback(true);
      onAnswer(originalIdx); // pass ORIGINAL index to parent
    },
    [showFeedback, question.correctOption, onAnswer, shuffleMap]
  );

  const feedback = isCorrect
    ? (question.correctFeedback ?? {
        emoji: "🌲",
        label: "Forest Preserver! Correct:",
        explanation: `The correct answer was: ${question.options[question.correctOption]}`,
      })
    : (question.incorrectFeedback ?? {
        emoji: "🔥",
        label: "Fire Starter! Incorrect:",
        explanation: `The correct answer was: ${question.options[question.correctOption]}`,
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl p-6 bg-white text-gray-900 shadow-xl border-2 border-indigo-200 rounded-xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🪧</span>
          <h2 className="text-lg font-bold text-indigo-700">Trail Marker</h2>
          <span className="text-xs text-gray-500 ml-auto">
            Question {question.sortOrder}
          </span>
        </div>

        {/* Question text */}
        <p className="text-gray-900 font-medium mb-5 leading-relaxed">
          {question.questionText}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-2 mb-4">
          {shuffleMap.map((originalIdx, displayIdx) => {
            const option = question.options[originalIdx];
            let optionStyle =
              "border border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50";

            if (showFeedback) {
              if (originalIdx === question.correctOption) {
                optionStyle =
                  "border-2 border-green-600 bg-green-50 text-green-900";
              } else if (displayIdx === selectedOption && !isCorrect) {
                optionStyle =
                  "border-2 border-red-500 bg-red-50 text-red-900";
              } else {
                optionStyle = "border border-gray-200 bg-gray-100 opacity-50";
              }
            } else if (displayIdx === selectedOption) {
              optionStyle = "border-2 border-indigo-600 bg-indigo-50";
            }

            return (
              <button
                key={originalIdx}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all text-sm font-medium cursor-pointer ${optionStyle}`}
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

        {/* Feedback panel */}
        {showFeedback && (
          <div
            className={`rounded-lg p-4 mb-4 border ${
              isCorrect
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">{feedback.emoji}</span>
              <div>
                <p
                  className={`font-bold text-sm ${
                    isCorrect ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {feedback.label}
                </p>
                <p
                  className={`text-sm mt-1 leading-relaxed ${
                    isCorrect ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {feedback.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Continue button (only after answer) */}
        {showFeedback && (
          <div className="flex justify-end">
            <button
              onClick={onContinue}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
            >
              🎞️ Continue Clip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
