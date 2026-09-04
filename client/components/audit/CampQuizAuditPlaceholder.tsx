/**
 * CampQuizAuditPlaceholder — tile linking SMEs to the cAMP Quiz audit app.
 * Required section for sign-off.
 */

interface CampQuizAuditPlaceholderProps {
  topicTitle: string;
  isApproved: boolean;
}

const QUIZ_AUDIT_URL = "https://9u0iis6j99jqe2cnzdgmkdpu1.edit.superblocks.com/audit";

export default function CampQuizAuditPlaceholder({ topicTitle, isApproved }: CampQuizAuditPlaceholderProps) {
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

        <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5">
          <p className="text-xs text-orange-800">
            <strong>🔗 Quiz audit happens in a separate app.</strong> Click below to open the cAMP Quiz Audit tool, 
            register with the same email you used here, then review the questions for <strong>{topicTitle}</strong>.
          </p>
        </div>

        <a
          href={QUIZ_AUDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg hover:brightness-110 transition-all"
          style={{ backgroundColor: "#C2590A" }}
        >
          🦉 Open Quiz Audit Tool
        </a>
      </div>
    </div>
  );
}
