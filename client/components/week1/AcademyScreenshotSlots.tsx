import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

type CourseSlot = {
  key: string;
  label: string;
  url: string;
  uploaded: boolean;
  filename?: string;
};

type AcademyScreenshotSlotsProps = {
  slots: CourseSlot[];
  isLegacy: boolean;
  onUpload: (courseKey: string, data: {
    screenshotData: string;
    screenshotFilename: string;
    screenshotHash: string;
  }) => Promise<void>;
};

export default function AcademyScreenshotSlots({ slots, isLegacy, onUpload }: AcademyScreenshotSlotsProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
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
      // Generate preview
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Generate hash
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setPreviews((prev) => ({ ...prev, [courseKey]: dataUrl }));

      await onUpload(courseKey, {
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
  }, [onUpload]);

  const completedCount = slots.filter((s) => s.uploaded || previews[s.key]).length;

  return (
    <div className="px-5 py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        📸 Academy Course Screenshots ({completedCount}/{slots.length})
      </p>
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) => {
          const isUploaded = slot.uploaded || !!previews[slot.key];
          const isUploading = uploading === slot.key;

          return (
            <div
              key={slot.key}
              className={`rounded-lg border p-3 ${
                isUploaded
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <a
                  href={slot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:underline truncate"
                >
                  {slot.label}
                </a>
                {isUploaded && <span className="text-green-600 text-xs">✅</span>}
              </div>

              {isUploaded ? (
                <p className="text-[10px] text-green-700">Screenshot uploaded</p>
              ) : isLegacy ? (
                <p className="text-[10px] text-gray-400 italic">Not required</p>
              ) : (
                <>
                  <input
                    ref={(el) => { fileInputRefs.current[slot.key] = el; }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(slot.key, e)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRefs.current[slot.key]?.click()}
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
  );
}
