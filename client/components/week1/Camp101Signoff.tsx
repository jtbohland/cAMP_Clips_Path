import { useState, useCallback } from "react";
import { toast } from "sonner";

type Camp101SignoffProps = {
  isSignedOff: boolean;
  signoffData?: { reflectionResponse: string; signature: string; completedAt: string };
  isLegacy: boolean;
  allScreenshotsUploaded: boolean;
  reflectionPrompt: string;
  onSignOff: (data: {
    screenshotData: string;
    screenshotFilename: string;
    screenshotHash: string;
    reflectionResponse: string;
    signature: string;
  }) => Promise<void>;
};

export default function Camp101Signoff({
  isSignedOff,
  signoffData,
  isLegacy,
  allScreenshotsUploaded,
  reflectionPrompt,
  onSignOff,
}: Camp101SignoffProps) {
  const [reflection, setReflection] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!reflection.trim()) { toast.error("Write your reflection"); return; }
    if (!signature.trim()) { toast.error("Sign your name"); return; }

    setSubmitting(true);
    try {
      // For cAMP 101, the "screenshot" is implicit — the 4 academy screenshots serve as proof
      await onSignOff({
        screenshotData: "academy_screenshots_complete",
        screenshotFilename: "academy_4_of_4.png",
        screenshotHash: "camp101_all_screenshots_uploaded",
        reflectionResponse: reflection.trim(),
        signature: signature.trim(),
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }, [reflection, signature, onSignOff]);

  if (isSignedOff && signoffData) {
    return (
      <div className="divide-y divide-gray-100">
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">💭 Reflection</p>
          <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 italic mb-1">{reflectionPrompt}</p>
            <p>{signoffData.reflectionResponse}</p>
          </div>
        </div>
        <div className="px-5 py-2 bg-green-50 text-xs text-green-700">
          Signed by <strong>{signoffData.signature}</strong> on {new Date(signoffData.completedAt).toLocaleDateString()}
        </div>
      </div>
    );
  }

  if (isLegacy) {
    return null; // Legacy learners don't need sign-off
  }

  return (
    <div className="divide-y divide-gray-100">
      {/* Reflection */}
      <div className="px-5 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">💭 Reflection</p>
        {!allScreenshotsUploaded ? (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <span>🔒</span>
            Upload all 4 Academy course screenshots to unlock the reflection
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-600 italic mb-2">{reflectionPrompt}</p>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Write your reflection..."
              rows={3}
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>
        )}
      </div>

      {/* Signature + Submit — only when reflection is available */}
      {allScreenshotsUploaded && (
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">✍️ Signature</p>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Type your full name to sign off"
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-3"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !reflection.trim() || !signature.trim()}
            className="w-full py-2.5 rounded-lg bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#2D6A4F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "✅ Sign Off — cAMP 101"}
          </button>
        </div>
      )}
    </div>
  );
}
