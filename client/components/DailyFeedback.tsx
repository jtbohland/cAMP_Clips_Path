import { useState, useCallback } from "react";

const RATING_OPTIONS = [
  { emoji: "😰", label: "Poor", value: "poor" },
  { emoji: "🥱", label: "Boring", value: "boring" },
  { emoji: "😒", label: "Meh", value: "meh" },
  { emoji: "😀", label: "Good", value: "good" },
  { emoji: "🤩", label: "Amazing", value: "amazing" },
];

const USEFULNESS_OPTIONS = [
  { label: "Not useful", value: "not_useful", color: "bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300 text-red-700", activeColor: "bg-red-100 border-2 border-red-400 text-red-800" },
  { label: "Slightly", value: "slightly", color: "bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300 text-orange-700", activeColor: "bg-orange-100 border-2 border-orange-400 text-orange-800" },
  { label: "Moderate", value: "moderate", color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300 text-yellow-700", activeColor: "bg-yellow-100 border-2 border-yellow-400 text-yellow-800" },
  { label: "Useful", value: "useful", color: "bg-lime-50 border-lime-200 hover:bg-lime-100 hover:border-lime-300 text-lime-700", activeColor: "bg-lime-100 border-2 border-lime-400 text-lime-800" },
  { label: "Very useful", value: "very_useful", color: "bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 text-green-700", activeColor: "bg-green-100 border-2 border-green-400 text-green-800" },
];

type DailyFeedbackProps = {
  dayKey: string;
  /** Existing feedback (null = not yet submitted) */
  existingRating: string | null;
  existingUsefulness: string | null;
  /** Called on submit — locks after first click */
  onSubmit: (dayKey: string, field: "rating" | "usefulness", value: string) => void;
};

export default function DailyFeedback({ dayKey, existingRating, existingUsefulness, onSubmit }: DailyFeedbackProps) {
  const [submittingField, setSubmittingField] = useState<string | null>(null);

  const handleRating = useCallback(
    async (value: string) => {
      if (existingRating || submittingField) return; // Already locked
      setSubmittingField("rating");
      try {
        await onSubmit(dayKey, "rating", value);
      } finally {
        setSubmittingField(null);
      }
    },
    [dayKey, existingRating, onSubmit, submittingField]
  );

  const handleUsefulness = useCallback(
    async (value: string) => {
      if (existingUsefulness || submittingField) return; // Already locked
      setSubmittingField("usefulness");
      try {
        await onSubmit(dayKey, "usefulness", value);
      } finally {
        setSubmittingField(null);
      }
    },
    [dayKey, existingUsefulness, onSubmit, submittingField]
  );

  return (
    <div className="border-t border-gray-100 mt-3 pt-3 space-y-3">
      {/* Rating row */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-1.5">How would you rate this session?</p>
        <div className="flex gap-2">
          {RATING_OPTIONS.map((opt) => {
            const isSelected = existingRating === opt.value;
            const isLocked = existingRating !== null;
            return (
              <button
                key={opt.value}
                onClick={() => handleRating(opt.value)}
                disabled={isLocked || submittingField === "rating"}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all text-center min-w-[52px]
                  ${
                    isSelected
                      ? "bg-green-100 border-2 border-green-400 shadow-sm"
                      : isLocked
                        ? "bg-gray-50 border border-gray-100 opacity-40"
                        : "bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer"
                  }
                  ${submittingField === "rating" ? "opacity-60" : ""}
                `}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-[10px] text-gray-500 font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Usefulness row */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-1.5">How useful is this for your role?</p>
        <div className="flex gap-1.5">
          {USEFULNESS_OPTIONS.map((opt) => {
            const isSelected = existingUsefulness === opt.value;
            const isLocked = existingUsefulness !== null;
            return (
              <button
                key={opt.value}
                onClick={() => handleUsefulness(opt.value)}
                disabled={isLocked || submittingField === "usefulness"}
                className={`flex-1 py-1.5 px-1 rounded-md text-[11px] font-semibold transition-all border
                  ${
                    isSelected
                      ? `${opt.activeColor} shadow-sm`
                      : isLocked
                        ? "bg-gray-50 border-gray-100 text-gray-400"
                        : `${opt.color} cursor-pointer`
                  }
                  ${submittingField === "usefulness" ? "opacity-60" : ""}
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
