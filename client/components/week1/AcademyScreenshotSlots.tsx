import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

type SubCourse = {
  key: string;
  label: string;
  url: string;
  uploaded: boolean;
};

type CourseSlot = {
  key: string;
  label: string;
  url: string;
  uploaded: boolean;
  /** Optional additional courses within the same tile (e.g. Statsig alongside Experiment) */
  subCourses?: SubCourse[];
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

  /** Count completed tiles (a tile with subCourses requires ALL to be uploaded) */
  const completedCount = slots.filter((s) => {
    const primaryDone = s.uploaded || !!previews[s.key];
    if (!s.subCourses || s.subCourses.length === 0) return primaryDone;
    const allSubsDone = s.subCourses.every((sc) => sc.uploaded || !!previews[sc.key]);
    return primaryDone && allSubsDone;
  }).length;

  return (
    <div className="px-5 py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        📸 Academy Course Screenshots ({completedCount}/{slots.length})
      </p>
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) => {
          // For multi-course tiles, collect all course items to render
          const allCourses: SubCourse[] = [
            { key: slot.key, label: slot.label, url: slot.url, uploaded: slot.uploaded },
            ...(slot.subCourses ?? []),
          ];
          const isMultiCourse = allCourses.length > 1;
          const allDone = allCourses.every((c) => c.uploaded || !!previews[c.key]);

          return (
            <div
              key={slot.key}
              className={`rounded-lg border p-3 ${
                allDone
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Tile header */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-900">{slot.label}</span>
                {allDone && <span className="text-green-600 text-xs">✅</span>}
              </div>

              {/* Render each course's button + upload */}
              {allCourses.map((course, idx) => {
                const isDone = course.uploaded || !!previews[course.key];
                const isUploading = uploading === course.key;

                return (
                  <div key={course.key} className={idx > 0 ? "mt-2.5 pt-2.5 border-t border-gray-100" : ""}>
                    {/* Course label (only shown for multi-course tiles) */}
                    {isMultiCourse && (
                      <p className="text-[10px] font-medium text-gray-500 mb-1">{course.label}</p>
                    )}

                    {/* Course link button */}
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mb-2 px-2 py-1 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      🎓 Go to Academy Course ↗
                    </a>

                    {/* Upload / status */}
                    {isDone ? (
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
          );
        })}
      </div>
    </div>
  );
}
