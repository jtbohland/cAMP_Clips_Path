/**
 * CampQuizAuditPlaceholder — tile linking SMEs to the cAMP Quiz audit app.
 * Required section for sign-off. Includes an approve button.
 */
import { useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";

interface CampQuizAuditPlaceholderProps {
  topicTitle: string;
  topicKey: string;
  isApproved: boolean;
  onApproved: () => void;
}

const QUIZ_AUDIT_URL = "https://9u0iis6j99jqe2cnzdgmkdpu1.superblocks.com/audit";

export default function CampQuizAuditPlaceholder({ topicTitle, topicKey, isApproved, onApproved }: CampQuizAuditPlaceholderProps) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading: approving } = useApi("SaveAuditApproval");

  const handleApprove = useCallback(async () => {
    try {
      await saveApproval({ viewerId: viewer?.id ?? "", topicKey, sectionKey: "camp_quiz_audit", approved: !isApproved });
      onApproved();
      toast.success(isApproved ? "Quiz approval removed" : "Quiz section approved ✅");
    } catch (err) {
      toast.error("Failed to save approval");
    }
  }, [saveApproval, viewer, topicKey, isApproved, onApproved]);

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${isApproved ? "border-emerald-300 bg-emerald-50/20" : "border-orange-300 bg-white"}`}>
      {/* Header */}
      <div className="text-white px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#C2590A" }}>
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            🦉 cAMP Quiz Audit
          </h3>
          <p className="text-[11px] text-orange-200">{topicTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isApproved && (
            <span className="text-xs font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-lg">✅ Approved</span>
          )}
          <button
            onClick={handleApprove}
            disabled={approving}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
              isApproved
                ? "text-white/70 bg-white/10 border-white/30 hover:bg-white/20"
                : "text-white bg-emerald-500 border-emerald-400 hover:bg-emerald-600"
            }`}
          >
            {approving ? "…" : isApproved ? "Undo" : "✅ Approve"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700">
          Each cAMP topic has an end-of-day quiz that learners take to reinforce key concepts.
          As an SME, you need to review the quiz questions for accuracy and relevance.
        </p>

        {/* Differentiation callout */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-xs text-gray-700 space-y-1.5">
          <p className="font-semibold text-gray-800">🔑 How is this different from Trail Markers & S&R?</p>
          <ul className="space-y-1 ml-1">
            <li className="flex items-start gap-1.5">
              <span className="flex-shrink-0">🪧</span>
              <span><strong>Trail Markers</strong> — pop-up questions <em>during</em> the video that check engagement in real time.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="flex-shrink-0">🚁</span>
              <span><strong>Search & Rescue</strong> — recovery questions that appear <em>after</em> the video when a learner's engagement score drops.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="flex-shrink-0">🦉</span>
              <span><strong>cAMP Quiz</strong> — an end-of-day knowledge check covering <em>cAMP Gear resources</em> (not the video clip). This is a separate assessment.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5">
          <p className="text-xs text-orange-800">
            <strong>🔗 Quiz audit happens in a separate app.</strong> Click below to open the cAMP Quiz Audit tool,
            register with the same email you used here, then review the questions for <strong>{topicTitle}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={QUIZ_AUDIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg hover:brightness-110 transition-all"
            style={{ backgroundColor: "#C2590A" }}
          >
            🦉 Open cAMP Quiz Audit
          </a>
          {!isApproved && (
            <span className="text-xs text-gray-500 italic">Review quiz questions, then approve this section</span>
          )}
        </div>
      </div>
    </div>
  );
}
