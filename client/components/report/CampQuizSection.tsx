type CampQuizSectionProps = {
  quizName: string | null;
  quizBestScore: number | null;
  quizBestCorrect: number | null;
  quizTotalQuestions: number | null;
  quizAttempts: number | null;
  quizLiveAverage: number | null;
};

export default function CampQuizSection({
  quizName,
  quizBestScore,
  quizBestCorrect,
  quizTotalQuestions,
  quizAttempts,
  quizLiveAverage,
}: CampQuizSectionProps) {
  const quizTaken = quizBestScore !== null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🧠</span>
        <h2 className="text-base font-bold text-gray-900">
          cAMP Quiz{quizName ? ` — ${quizName}` : ""}
        </h2>
      </div>

      {quizTaken ? (
        <div>
          {/* Score stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Best Score */}
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-700">{quizBestScore}%</p>
              <p className="text-xs text-indigo-500 mt-0.5">Best Score</p>
            </div>

            {/* Correct out of Total */}
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {quizBestCorrect}/{quizTotalQuestions}
              </p>
              <p className="text-xs text-green-600 mt-0.5">Correct</p>
            </div>

            {/* Attempts */}
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{quizAttempts}</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {quizAttempts === 1 ? "Attempt" : "Attempts"}
              </p>
            </div>

            {/* Live Average */}
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">
                {quizLiveAverage !== null ? `${quizLiveAverage}%` : "—"}
              </p>
              <p className="text-xs text-purple-600 mt-0.5">Live Average</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Live Average reflects your best score across all cAMP Quizzes completed so far.
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">
            Quiz not completed yet. Return to the clips home screen and click{" "}
            <span className="font-semibold">🧠 Take cAMP Quiz</span> to complete.
            Once finished, return here to see your results.
          </p>
        </div>
      )}
    </div>
  );
}
