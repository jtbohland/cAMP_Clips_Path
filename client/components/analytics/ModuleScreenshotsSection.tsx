import { memo, useState, useMemo, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";

const ITEM_LABELS: Record<string, { emoji: string; name: string }> = {
  analytics: { emoji: "📊", name: "Academy: Analytics" },
  experiment: { emoji: "🧪", name: "Academy: Experiment" },
  session_replay: { emoji: "🔁", name: "Academy: Session Replay" },
  guides_surveys: { emoji: "📋", name: "Academy: Guides & Surveys" },
  meddpicc: { emoji: "📘", name: "MEDDPICC" },
  camp101: { emoji: "🏕️", name: "cAMP 101" },
  challenger: { emoji: "⚔️", name: "Challenger" },
};

type ScreenshotMeta = {
  id: string;
  viewerId: string;
  viewerName: string;
  source: string;
  itemKey: string;
  filename: string | null;
  uploadedAt: string;
};

function LightboxOverlay({
  screenshot,
  onClose,
}: {
  screenshot: ScreenshotMeta;
  onClose: () => void;
}) {
  const label = ITEM_LABELS[screenshot.itemKey] ?? { emoji: "📸", name: screenshot.itemKey };

  // Fetch the actual base64 data on demand
  const { data, loading, isError } = useApiData("GetScreenshotData", {
    id: screenshot.id,
    source: screenshot.source as "academy" | "module",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm">{label.emoji}</span>
            <span className="text-sm font-semibold text-gray-900">{screenshot.viewerName}</span>
            <span className="text-xs text-gray-500">— {label.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400">
              {new Date(screenshot.uploadedAt).toLocaleDateString()}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
        {/* Image */}
        <div className="overflow-auto max-h-[calc(90vh-56px)] min-w-[300px] min-h-[200px] flex items-center justify-center">
          {loading && (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mb-2" />
              <p className="text-xs">Loading screenshot…</p>
            </div>
          )}
          {isError && (
            <p className="p-8 text-sm text-red-500 text-center">Failed to load screenshot.</p>
          )}
          {data?.screenshotData && (
            <img
              src={data.screenshotData}
              alt={`${screenshot.viewerName} - ${label.name}`}
              className="block max-w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleScreenshotsSection() {
  const { data, loading, isError, error } = useApiData("GetModuleScreenshots", {});
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const screenshots = useMemo(() => data?.screenshots ?? [], [data]);

  // Group by viewer
  const grouped = useMemo(() => {
    const groups: Record<string, { name: string; items: ScreenshotMeta[] }> = {};
    for (const s of screenshots) {
      if (!groups[s.viewerId]) {
        groups[s.viewerId] = { name: s.viewerName, items: [] };
      }
      groups[s.viewerId].items.push(s);
    }
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [screenshots]);

  const lightboxScreenshot = useMemo(
    () => screenshots.find((s) => s.id === lightboxId) ?? null,
    [screenshots, lightboxId],
  );

  const handleClose = useCallback(() => setLightboxId(null), []);

  if (loading) {
    return (
      <div className="py-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 py-3">
        Failed to load: {(error as any)?.message ?? "Unknown error"}
      </p>
    );
  }

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-3xl block mb-2">📸</span>
        <p className="text-sm">No screenshots submitted yet.</p>
        <p className="text-xs mt-1 text-gray-400">
          Screenshots appear when learners upload academy and module completion proof.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.name}>
          <h4 className="text-xs font-semibold text-gray-600 mb-2">{group.name}</h4>
          <div className="flex flex-wrap gap-3">
            {group.items.map((s) => {
              const label = ITEM_LABELS[s.itemKey] ?? { emoji: "📸", name: s.itemKey };
              return (
                <button
                  key={s.id}
                  onClick={() => setLightboxId(s.id)}
                  className="group relative w-32 rounded-lg border border-gray-200 overflow-hidden hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Placeholder thumbnail (no image data in listing) */}
                  <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">{label.emoji}</span>
                  </div>
                  <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-gray-700 truncate">
                        {label.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400">
                      {new Date(s.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 rounded-full px-2 py-0.5 text-[10px] font-medium text-blue-600 shadow-sm">
                      View
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Lightbox — fetches base64 data on demand */}
      {lightboxScreenshot && (
        <LightboxOverlay screenshot={lightboxScreenshot} onClose={handleClose} />
      )}
    </div>
  );
}

export default memo(ModuleScreenshotsSection);
