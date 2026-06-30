import { useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";

const RESPONSE_OPTIONS = [
  {
    value: "summit_bound" as const,
    emoji: "🧗",
    label: "Summit Bound",
    description: "Great progress — they're on track and crushing it.",
  },
  {
    value: "acknowledged" as const,
    emoji: "👍",
    label: "Acknowledged",
    description: "I've seen the update, no action needed from my end.",
  },
  {
    value: "want_to_discuss" as const,
    emoji: "💬",
    label: "Want to Discuss",
    description: "I'd like to chat with JT about this learner's progress.",
  },
  {
    value: "have_concerns" as const,
    emoji: "⚠️",
    label: "Have Concerns",
    description: "Something needs attention — please follow up.",
  },
];

type ResponseValue = "summit_bound" | "acknowledged" | "want_to_discuss" | "have_concerns";

/**
 * Manager Feedback page — accessible via tokenized link from check-in emails.
 * Route: /feedback?token=<uuid>
 */
export default function ManagerFeedbackPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [selectedResponse, setSelectedResponse] = useState<ResponseValue | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { run: submitFeedback, loading: submitting } = useApi("SubmitManagerFeedback");

  const handleSubmit = useCallback(async () => {
    if (!token || !selectedResponse) return;

    try {
      const result = await submitFeedback({
        token,
        response: selectedResponse,
        comment: comment.trim() || null,
      });

      if (result?.error) {
        setErrorMsg(result.error);
        return;
      }

      setLearnerName(result?.learnerName ?? null);
      setSubmitted(true);
      toast.success("Feedback submitted! Thank you.", {
        style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
      });
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      setErrorMsg(message);
    }
  }, [token, selectedResponse, comment, submitFeedback]);

  // No token
  if (!token) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <div className="text-center max-w-sm mx-auto px-4">
          <span className="text-4xl block mb-3">🔗</span>
          <h1 className="text-lg font-bold text-gray-900">Missing Feedback Link</h1>
          <p className="text-sm text-gray-500 mt-2">
            This page requires a valid feedback token. Check your email for the correct link.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMsg) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <div className="text-center max-w-sm mx-auto px-4">
          <span className="text-4xl block mb-3">⚠️</span>
          <h1 className="text-lg font-bold text-gray-900">Feedback Error</h1>
          <p className="text-sm text-red-600 mt-2">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <div className="text-center max-w-sm mx-auto px-4">
          <span className="text-4xl block mb-3">✅</span>
          <h1 className="text-lg font-bold text-gray-900">Feedback Received</h1>
          <p className="text-sm text-gray-500 mt-2">
            Thank you for your feedback{learnerName ? ` on ${learnerName}'s progress` : ""}. You can close this tab.
          </p>
        </div>
      </div>
    );
  }

  // Feedback form
  return (
    <div className="flex items-center justify-center h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
      <div className="w-full max-w-lg mx-4 my-8">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">🏕️</span>
          <h1 className="text-xl font-bold text-gray-900">Manager Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">
            How is your new hire doing? Your feedback helps JT and the enablement team support their growth.
          </p>
        </div>

        {/* Response options */}
        <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2">How would you describe their progress?</h2>
          
          <div className="space-y-2">
            {RESPONSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedResponse(opt.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                  selectedResponse === opt.value
                    ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <span className="text-xl mt-0.5">{opt.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Optional comment */}
          <div className="pt-2">
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Anything else you'd like to share? (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any additional context, observations, or suggestions…"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selectedResponse || submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Feedback"
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          cAMP Clips by Amplitude Enablement · Powered by Superblocks
        </p>
      </div>
    </div>
  );
}
