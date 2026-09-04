/**
 * ReRecordModal — Triggered when an SME edits 2+ trail marker or S&R questions
 * on a single clip, suggesting the video itself may need a re-record.
 */
import { useCallback } from "react";

interface ReRecordModalProps {
  clipTitle: string;
  editCount: number;
  sectionType: "markers" | "sr";
  onDismiss: () => void;
  onAcknowledge: () => void;
}

export default function ReRecordModal({ clipTitle, editCount, sectionType, onDismiss, onAcknowledge }: ReRecordModalProps) {
  const sectionLabel = sectionType === "markers" ? "Trail Marker" : "Search & Rescue";
  const sectionEmoji = sectionType === "markers" ? "🪧" : "🚁";

  const handleAcknowledge = useCallback(() => {
    onAcknowledge();
  }, [onAcknowledge]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onDismiss}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            🎬 Time for a Re-Record?
          </h2>
          <p className="text-red-100 text-sm mt-0.5">{clipTitle}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                You've edited {editCount} {sectionEmoji} {sectionLabel} question{editCount > 1 ? "s" : ""} on this clip.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {sectionLabel} questions are tied directly to the video content — they reference specific moments and explanations from the recording.
                When multiple questions need updating, it often means the underlying video content has shifted enough to warrant a fresh recording.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-2">
            <p className="font-semibold">📋 Recommended next steps:</p>
            <ol className="list-decimal ml-5 space-y-1 text-xs">
              <li>Finish reviewing all remaining questions for this clip</li>
              <li>Use the <strong>"📹 About this clip"</strong> notes section to flag what's changed</li>
              <li>Consider scheduling a re-record session — paste the new recording link in the supplemental video field</li>
              <li>Your admin will be notified of the changes when you sign off</li>
            </ol>
          </div>

          <p className="text-xs text-gray-500 italic">
            You can continue editing — this is a heads-up, not a blocker. Your changes are already saved.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
          <button
            onClick={onDismiss}
            className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2"
          >
            Dismiss
          </button>
          <button
            onClick={handleAcknowledge}
            className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg transition-colors"
          >
            🎬 Got it — I'll flag for re-record
          </button>
        </div>
      </div>
    </div>
  );
}
