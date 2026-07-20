import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { getLibraryPath } from "@/lib/libraryNav";
import { WistiaPlayer } from "@wistia/wistia-player-react";

const BONUS_CLIPS: Record<string, { title: string; wistiaId: string; duration: string; storageKeySuffix: string }> = {
  "support-case": {
    title: "How to Create a Support Case",
    wistiaId: "dyw1ify2zw",
    duration: "2m",
    storageKeySuffix: "deal_desk_bonus1",
  },
  "stage-65": {
    title: "Sales Stage 6.5",
    wistiaId: "mslvirb8ww",
    duration: "5m",
    storageKeySuffix: "deal_desk_bonus2",
  },
};

export default function BonusWatchPage() {
  const { clipKey } = useParams<{ clipKey: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();

  const config = clipKey ? BONUS_CLIPS[clipKey] : undefined;

  // Mark as watched in localStorage on mount
  useEffect(() => {
    if (!config || !viewer?.id) return;
    const key = `${config.storageKeySuffix}_watched_${viewer.id}`;
    localStorage.setItem(key, "true");
  }, [config, viewer?.id]);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-gray-600 text-lg">Clip not found.</p>
        <button
          onClick={() => navigate(getLibraryPath())}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          ← Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header — forest green accent matching weekly headers */}
      <header className="border-b border-green-900/20 px-6 py-4" style={{ backgroundColor: "#1B4332" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{config.title}</h1>
            <p className="text-xs text-green-200/80 mt-0.5">
              ⏱️ {config.duration} · 🪧 0 Trail Markers · 👀 View tracked in Wistia
            </p>
          </div>
          <button
            onClick={() => navigate(getLibraryPath())}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
          >
            🎞️ Back to Clips
          </button>
        </div>
      </header>

      {/* Wistia Player — uses the same WistiaPlayer component as main Watch page */}
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-4xl">
          <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
            <WistiaPlayer
              mediaId={config.wistiaId}
              playerColor="ff5733"
              autoplay={false}
              silentAutoplay={false}
              style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
            />
          </div>

          {/* Info card below player */}
          <div className="mt-4 rounded-xl p-4 shadow-sm border border-yellow-200 bg-yellow-50">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">🌭 Bonus Clip</span> — This is a supplemental
              resource for the Deal Desk & CPQ session. No engagement scoring or trail markers — just watch and learn!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
