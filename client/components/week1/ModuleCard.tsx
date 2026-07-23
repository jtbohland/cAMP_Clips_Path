import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

type Resource = {
  emoji: string;
  label: string;
  url: string;
  isCampGear?: boolean;
};

type ModuleCardProps = {
  moduleKey: string;
  emoji: string;
  title: string;
  description: string;
  resources: Resource[];
  screenshotLabel: string;
  reflectionPrompt: string;
  isSignedOff: boolean;
  signoffData?: { reflectionResponse: string; signature: string; completedAt: string };
  isLegacy: boolean;
  onSignOff: (data: {
    screenshotData: string;
    screenshotFilename: string;
    screenshotHash: string;
    reflectionResponse: string;
    signature: string;
  }) => Promise<void>;
};

export default function ModuleCard({
  moduleKey,
  emoji,
  title,
  description,
  resources,
  screenshotLabel,
  reflectionPrompt,
  isSignedOff,
  signoffData,
  isLegacy,
  onSignOff,
}: ModuleCardProps) {
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotHash, setScreenshotHash] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot must be under 5MB");
      return;
    }

    setScreenshotFile(file);

    // Generate preview
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Generate SHA-256 hash
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    setScreenshotHash(hashHex);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!screenshotFile || !screenshotPreview || !screenshotHash) {
      toast.error("Please upload a screenshot first");
      return;
    }
    if (!reflection.trim()) {
      toast.error("Please write your reflection");
      return;
    }
    if (!signature.trim()) {
      toast.error("Please sign your name");
      return;
    }

    setSubmitting(true);
    try {
      await onSignOff({
        screenshotData: screenshotPreview,
        screenshotFilename: screenshotFile.name,
        screenshotHash,
        reflectionResponse: reflection.trim(),
        signature: signature.trim(),
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit sign-off");
    } finally {
      setSubmitting(false);
    }
  }, [screenshotFile, screenshotPreview, screenshotHash, reflection, signature, onSignOff]);

  const screenshotUploaded = !!screenshotFile || isSignedOff;
  const disabled = isLegacy || isSignedOff;

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-[#1B4332]">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <h3 className="text-base font-bold text-white">{title}</h3>
          {isSignedOff && <span className="ml-auto text-sm text-green-300">✅ Signed Off</span>}
        </div>
        <p className="text-xs text-white/70 mt-1">{description}</p>
      </div>

      <div className="bg-white divide-y divide-gray-100">
        {/* Resources */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resources</p>
          <div className="flex flex-wrap gap-2">
            {resources.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  r.isCampGear
                    ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span>{r.emoji}</span>
                {r.label} ↗
                {r.isCampGear && <span className="ml-1 text-[10px] opacity-70">⛺ cAMP Gear</span>}
              </a>
            ))}
          </div>
        </div>

        {/* Screenshot Upload */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            📸 {screenshotLabel}
          </p>
          {isSignedOff ? (
            <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              ✅ Screenshot uploaded
            </div>
          ) : isLegacy ? (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 italic">
              Sign-off not required — you started before Week 1 was introduced
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {screenshotPreview ? (
                <div className="relative">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => {
                      setScreenshotFile(null);
                      setScreenshotPreview(null);
                      setScreenshotHash(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1 text-xs hover:bg-white shadow"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  📷 Click to upload screenshot
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reflection — locked until screenshot uploaded */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            💭 Reflection
          </p>
          {isSignedOff ? (
            <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-gray-800 mb-2">💬 {reflectionPrompt}</p>
              <p>{signoffData?.reflectionResponse}</p>
            </div>
          ) : isLegacy ? (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 italic">
              Sign-off not required
            </div>
          ) : !screenshotUploaded ? (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <span>🔒</span>
              Upload your screenshot to unlock the reflection
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">💬 {reflectionPrompt}</p>
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

        {/* Signature + Submit */}
        {!isSignedOff && !isLegacy && screenshotUploaded && (
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              ✍️ Signature
            </p>
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
              {submitting ? "Submitting..." : `✅ Sign Off — ${title}`}
            </button>
          </div>
        )}

        {isSignedOff && signoffData && (
          <div className="px-5 py-2 bg-green-50 text-xs text-green-700">
            Signed by <strong>{signoffData.signature}</strong> on{" "}
            {new Date(signoffData.completedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
