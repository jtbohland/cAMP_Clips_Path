import { useEffect, useCallback, useRef } from "react";

type QuizReminderModalProps = {
  /** The day whose quiz was missed, e.g. "Day 3" */
  missingQuizDay: string;
  /** Opens the quiz app + logs the click */
  onTakeQuiz: () => void;
  /** Called when the learner returns from the quiz tab — closes modal + runs pending navigation */
  onQuizClicked: () => void;
};

/**
 * Hard-gate modal: shown when a learner tries to start a new day's clip
 * but hasn't clicked the cAMP Quiz for the previous day yet.
 *
 * No dismiss/escape — the only way through is clicking "Take cAMP Quiz".
 * That opens the quiz in a new tab. When the learner returns (window focus),
 * the modal auto-closes and the pending navigation executes.
 */
export default function QuizReminderModal({
  missingQuizDay,
  onTakeQuiz,
  onQuizClicked,
}: QuizReminderModalProps) {
  const quizOpenedRef = useRef(false);

  const handleTakeQuiz = useCallback(() => {
    quizOpenedRef.current = true;
    onTakeQuiz();
  }, [onTakeQuiz]);

  // Auto-close when user returns from the quiz tab
  useEffect(() => {
    const handleFocus = () => {
      if (quizOpenedRef.current) {
        onQuizClicked();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [onQuizClicked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            🦉 Quiz Check
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            Before moving on — complete the{" "}
            <span className="font-bold text-gray-900">{missingQuizDay}</span> cAMP Quiz.
          </p>
          <p className="text-gray-500 text-xs leading-relaxed">
            Each day's quiz reinforces what you just learned. Quick click — then you're clear to continue.
          </p>

          {/* CTA — only way to proceed */}
          <button
            onClick={handleTakeQuiz}
            className="w-full py-3 rounded-lg text-sm font-bold bg-[#EA580C] hover:bg-[#C2410C] text-white transition-colors"
          >
            🦉 Take {missingQuizDay} cAMP Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
