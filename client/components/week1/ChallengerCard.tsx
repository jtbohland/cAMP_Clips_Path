import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

const CHALLENGER_COURSES = [
  {
    key: "challenger_why",
    label: "Why Challenger",
    url: "https://hub.challengerinc.com/learn/course/why-challenger/why-challenger/what-it-means-to-be-a-high-performer",
  },
  {
    key: "challenger_intro",
    label: "Intro to Challenger Skills",
    url: "https://hub.challengerinc.com/learn/learning-path/intro-to-challenger-skills",
  },
] as const;

type ChallengerCardProps = {
  isSignedOff: boolean;
  signoffData?: { reflectionResponse: string; signature: string; completedAt: string };
  isLegacy: boolean;
  challengerAccount: string;
  challengerContact: string;
  onAccountChange: (v: string) => void;
  onContactChange: (v: string) => void;
  reflectionPrompt: string;
  challengerScreenshots: Record<string, boolean>;
  onChallengerUpload: (courseKey: string, data: {
    screenshotData: string;
    screenshotFilename: string;
    screenshotHash: string;
  }) => Promise<void>;
  onSignOff: (data: {
    screenshotData: string;
    screenshotFilename: string;
    screenshotHash: string;
    reflectionResponse: string;
    signature: string;
  }) => Promise<void>;
};

export default function ChallengerCard({
  isSignedOff,
  signoffData,
  isLegacy,
  challengerAccount,
  challengerContact,
  onAccountChange,
  onContactChange,
  reflectionPrompt,
  challengerScreenshots,
  onChallengerUpload,
  onSignOff,
}: ChallengerCardProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [reflection, setReflection] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = useCallback(async (courseKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot must be under 5MB");
      return;
    }

    setUploading(courseKey);
    try {
      // Read file ONCE as ArrayBuffer, then derive both preview + hash from it
      // (reading twice can throw NotFoundError on some browsers)
      const buffer = await file.arrayBuffer();

      // Generate preview from buffer
      const blob = new Blob([buffer], { type: file.type });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Generate hash from same buffer
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setPreviews((prev) => ({ ...prev, [courseKey]: dataUrl }));

      await onChallengerUpload(courseKey, {
        screenshotData: dataUrl,
        screenshotFilename: file.name,
        screenshotHash: hashHex,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload screenshot");
      setPreviews((prev) => {
        const next = { ...prev };
        delete next[courseKey];
        return next;
      });
    } finally {
      setUploading(null);
    }
  }, [onChallengerUpload]);

  const bothScreenshotsUploaded = CHALLENGER_COURSES.every(
    (c) => challengerScreenshots[c.key] || previews[c.key]
  );
  const screenshotsReady = bothScreenshotsUploaded || isSignedOff;
  const completedCount = CHALLENGER_COURSES.filter(
    (c) => challengerScreenshots[c.key] || previews[c.key]
  ).length;

  const handleSubmit = useCallback(async () => {
    if (!reflection.trim()) { toast.error("Write your reflection"); return; }
    if (!signature.trim()) { toast.error("Sign your name"); return; }

    setSubmitting(true);
    try {
      await onSignOff({
        screenshotData: "challenger_screenshots_complete",
        screenshotFilename: "challenger_2_of_2.png",
        screenshotHash: "challenger_all_screenshots_uploaded",
        reflectionResponse: reflection.trim(),
        signature: signature.trim(),
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }, [reflection, signature, onSignOff]);

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-[#1B4332]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚀</span>
          <h3 className="text-base font-bold text-white">Challenger</h3>
          {isSignedOff && <span className="ml-auto text-sm text-green-300">✅ Signed Off</span>}
        </div>
        <p className="text-xs text-white/70 mt-1">The Challenger Sale methodology — teach, tailor, take control</p>
      </div>

      <div className="bg-white divide-y divide-gray-100">
        {/* Step 1 — Register */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Step 1 — Register</p>
          <a href="https://hub.challengerinc.com/redeem/1bff9c75-94e3-405f-a673-33f8eb820209amplitude-seller" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-50 text-red-800 border border-red-300 hover:bg-red-100 transition-colors shadow-sm">
            <span className="text-lg">🚀</span> Register for Challenger ↗
          </a>
        </div>

        {/* Step 2 — Courses (2 tiles with screenshot upload) */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Step 2 — Courses ({isSignedOff ? 2 : completedCount}/2)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CHALLENGER_COURSES.map((course) => {
              const isUploaded = challengerScreenshots[course.key] || !!previews[course.key];
              const isUploading = uploading === course.key;

              return (
                <div
                  key={course.key}
                  className={`rounded-lg border p-3 ${
                    isUploaded || isSignedOff
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-900">{course.label}</span>
                    {(isUploaded || isSignedOff) && <span className="text-green-600 text-xs">✅</span>}
                  </div>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mb-2 px-2 py-1 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    🚀 Go to Course ↗
                  </a>

                  {isUploaded || isSignedOff ? (
                    <p className="text-[10px] text-green-700">Screenshot uploaded</p>
                  ) : isLegacy ? (
                    <p className="text-[10px] text-gray-400 italic">Not required</p>
                  ) : (
                    <>
                      <input
                        ref={(el) => { fileInputRefs.current[course.key] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(course.key, e)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[course.key]?.click()}
                        disabled={isUploading}
                        className="w-full py-2 rounded border border-dashed border-gray-300 text-gray-400 text-[10px] hover:border-emerald-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? "Uploading..." : "📷 Upload"}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3 — 🎒 cAMP Gear */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Step 3 — 🎒 cAMP Gear</p>
          <div className="flex flex-wrap gap-2">
            <a href="https://hub.challengerinc.com/redeem/1bff9c75-94e3-405f-a673-33f8eb820209amplitude-seller" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors">
              <span>🚀</span> Challenger Hub ↗
            </a>
            <a href="https://drive.google.com/file/d/1yr1Z4GyywQl0GTVTZBzBP11dXhAWWH6X/view?usp=drive_link" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors">
              <span>📖</span> Challenger Yourself Guide ↗
            </a>
            <a href="https://app.glean.com/chat/agents/ccf97264426040a7841092997a113889?qe=https%3A%2F%2Famplitude-be.glean.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors">
              <span>🔍</span> Glean Agent 1 ↗
            </a>
            <a href="https://app.glean.com/chat/agents/77ad9ce8bbbf424fa3ec467f3f477b5c?qe=https%3A%2F%2Famplitude-be.glean.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors">
              <span>🔍</span> Glean Agent 2 ↗
            </a>
          </div>
        </div>

        {/* Account / Contact inputs */}
        {!isSignedOff && !isLegacy && (
          <div className="px-5 py-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              🎯 Your Target Account
            </p>
            <input
              value={challengerAccount}
              onChange={(e) => onAccountChange(e.target.value)}
              placeholder="Account name"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <input
              value={challengerContact}
              onChange={(e) => onContactChange(e.target.value)}
              placeholder="Contact name"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Reflection — locked until both screenshots uploaded */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">💭 Reflection</p>
          {isSignedOff ? (
            <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-gray-800 mb-2">💬 {reflectionPrompt}</p>
              <p>{signoffData?.reflectionResponse}</p>
            </div>
          ) : isLegacy ? (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 italic">Sign-off not required</div>
          ) : !screenshotsReady ? (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <span>🔒</span> Upload both course screenshots to unlock the reflection
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">💬 {reflectionPrompt}</p>
              <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Write your reflection..." rows={3}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
            </div>
          )}
        </div>

        {/* Signature + Submit */}
        {!isSignedOff && !isLegacy && screenshotsReady && (
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">✍️ Signature</p>
            <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type your full name to sign off"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-3" />
            <button onClick={handleSubmit} disabled={submitting || !reflection.trim() || !signature.trim()}
              className="w-full py-2.5 rounded-lg bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#2D6A4F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? "Submitting..." : "✅ Sign Off — Challenger"}
            </button>
          </div>
        )}

        {isSignedOff && signoffData && (
          <div className="px-5 py-2 bg-green-50 text-xs text-green-700">
            Signed by <strong>{signoffData.signature}</strong> on {new Date(signoffData.completedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
