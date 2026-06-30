import { useState, useCallback, memo } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useApiData } from "@/hooks/useApiData.js";
import { toast } from "sonner";
import type { ReflectionQuestion } from "@/config/topicDays";

interface TopicReflectionSectionProps {
  viewerId: string;
  topicDay: string;
  questions: ReflectionQuestion[];
}

/**
 * Topic day reflection section — 2 open-ended questions shown at the bottom
 * of TopicGear pages. Once submitted, shows read-only answers with a green check.
 */
function TopicReflectionSectionInner({ viewerId, topicDay, questions }: TopicReflectionSectionProps) {
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");

  const { data: reflectionData, loading: loadingReflections, refetch } = useApiData(
    "GetTopicReflections",
    { viewerId },
    { enabled: !!viewerId }
  );

  const { run: submitReflection, loading: submitting } = useApi("SubmitTopicReflection");

  // Find if this topic day already has a submission
  const existingReflection = reflectionData?.reflections?.find(
    (r: any) => r.topicDay === topicDay
  );

  const handleSubmit = useCallback(async () => {
    if (!answer1.trim() || !answer2.trim()) {
      toast.error("Please answer both questions before submitting.");
      return;
    }

    try {
      await submitReflection({
        viewerId,
        topicDay,
        question1: questions[0].prompt,
        answer1: answer1.trim(),
        question2: questions[1].prompt,
        answer2: answer2.trim(),
      });
      toast.success("Reflection submitted! Nice work thinking it through.", {
        style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
        duration: 3000,
      });
      await refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Error submitting reflection: " + message);
    }
  }, [answer1, answer2, viewerId, topicDay, questions, submitReflection, refetch]);

  if (loadingReflections) {
    return (
      <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-100 rounded" />
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  // Already submitted — show read-only
  if (existingReflection) {
    return (
      <div className="rounded-xl bg-white border border-green-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm">
            &#10003;
          </span>
          Trail Reflection — Submitted
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">{existingReflection.question1}</p>
            <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">{existingReflection.answer1}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">{existingReflection.question2}</p>
            <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">{existingReflection.answer2}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Submitted {new Date(existingReflection.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    );
  }

  // Not yet submitted — show form
  return (
    <div className="rounded-xl bg-white border border-amber-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
        📝 Trail Reflection
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Take a moment to reflect on what you just reviewed. Your answers help your manager and enablement team understand your learning.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1.5">
            {questions[0].prompt}
          </label>
          <textarea
            value={answer1}
            onChange={(e) => setAnswer1(e.target.value)}
            placeholder="Type your answer…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1.5">
            {questions[1].prompt}
          </label>
          <textarea
            value={answer2}
            onChange={(e) => setAnswer2(e.target.value)}
            placeholder="Type your answer…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !answer1.trim() || !answer2.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Reflection"
          )}
        </button>
      </div>
    </div>
  );
}

const TopicReflectionSection = memo(TopicReflectionSectionInner);
export default TopicReflectionSection;
