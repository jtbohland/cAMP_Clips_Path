/** Shared Approve/Edit section header for audit sections */
import { useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";

export function SectionHeader({ title, emoji, sectionKey, topicKey, isApproved, onApprovalChange, editing, onEdit, onCancel, onSave, saving }: {
  title: string;
  emoji: string;
  sectionKey: string;
  topicKey: string;
  isApproved: boolean;
  onApprovalChange: (sectionKey: string, approved: boolean) => void;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading: approving } = useApi("SaveAuditApproval");

  const handleApprove = useCallback(async () => {
    try {
      await saveApproval({ viewerId: viewer?.id ?? "", topicKey, sectionKey, approved: !isApproved });
      onApprovalChange(sectionKey, !isApproved);
      toast.success(isApproved ? "Approval removed" : "Section approved ✅");
    } catch (err) {
      toast.error("Failed to save approval");
    }
  }, [saveApproval, viewer, topicKey, sectionKey, isApproved, onApprovalChange]);

  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
        <span>{emoji}</span> {title}
        {isApproved && <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold ml-1">✅ Approved</span>}
      </h3>
      <div className="flex items-center gap-2">
        {!editing ? (
          <>
            <button onClick={onEdit} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100">
              ✏️ Edit
            </button>
            <button onClick={handleApprove} disabled={approving} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
              isApproved
                ? "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100"
                : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            }`}>
              {approving ? "…" : isApproved ? "Undo Approve" : "✅ Approve"}
            </button>
          </>
        ) : (
          <>
            <button onClick={onCancel} className="text-xs text-gray-500 hover:underline" disabled={saving}>Cancel</button>
            <button onClick={onSave} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving…" : "💾 Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Info callout for in-video questions */
export function VideoQuestionNote() {
  return (
    <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5 text-xs text-indigo-800 mb-3 flex items-start gap-2">
      <span className="text-base flex-shrink-0">ℹ️</span>
      <div>
        <p className="font-semibold">These are in-video questions</p>
        <p className="text-indigo-600 mt-0.5">
          Each question appears at a specific timestamp during the clip. Editing a question updates it for all learners immediately.
          If the question no longer matches the video content, the video may need to be re-recorded.
        </p>
      </div>
    </div>
  );
}
