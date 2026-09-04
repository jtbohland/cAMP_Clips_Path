/**
 * CampQuizAuditPlaceholder — placeholder tile for cAMP Quiz audit.
 * Links SMEs to the separate cAMP Quiz audit app.
 * Required section for sign-off but temporarily unavailable.
 */

interface CampQuizAuditPlaceholderProps {
  topicTitle: string;
  isApproved: boolean;
}

// TODO: Replace with actual cAMP Quiz Audit app URL once available
const QUIZ_AUDIT_URL = "#";

export default function CampQuizAuditPlaceholder({ topicTitle, isApproved }: CampQuizAuditPlaceholderProps) {
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${isApproved ? "border-emerald-300 bg-emerald-50/20" : "border-violet-300 bg-white"}`}>
      {/* Header */}
      <div className="bg-violet-700 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            📝 cAMP Quiz Audit
          </h3>
          <p className="text-[11px] text-violet-200">{topicTitle}</p>
        </div>
        {isApproved && (
          <span className="text-xs font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-lg">✅ Approved</span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700">
          Each cAMP topic has an end-of-day quiz that learners take to reinforce key concepts. 
          As an SME, you need to review the quiz questions for accuracy and relevance.
        </p>

        <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5">
          <p className="text-xs text-violet-800">
            <strong>🔗 Quiz audit happens in a separate app.</strong> Click below to open the cAMP Quiz Audit tool, 
            register with the same email you used here, then review the questions for <strong>{topicTitle}</strong>.
          </p>
        </div>

        {/* Coming soon notice */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
          <p className="text-xs text-amber-800">
            <strong>⏳ Available shortly</strong> — the quiz audit tool is being finalized and will be ready by end of day. 
            You can complete the rest of your audit now and come back to this section.
          </p>
        </div>

        <a
          href={QUIZ_AUDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-violet-600 px-5 py-2.5 rounded-lg hover:bg-violet-700 transition-colors opacity-50 cursor-not-allowed pointer-events-none"
          aria-disabled="true"
        >
          📝 Open Quiz Audit Tool
          <span className="text-[10px] font-normal bg-violet-800 px-1.5 py-0.5 rounded">Coming Soon</span>
        </a>
      </div>
    </div>
  );
}