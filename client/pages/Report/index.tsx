import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { getClipEmoji } from "@/lib/clip-emojis";
import PageHeader from "@/components/PageHeader";
import ScoreTiles from "@/components/report/ScoreTiles";
import BackTrackSection from "@/components/report/BackTrackSection";
import XpCollectedSection from "@/components/report/XpCollectedSection";
import WeatherStormCard from "@/components/report/WeatherStormCard";
import RewatchPlayer from "@/components/report/RewatchPlayer";

/** Badge ID → display info */
const BADGE_MAP: Record<string, { name: string; emoji: string }> = {
  perfect_hiker: { name: "Perfect Hiker", emoji: "🌲" },
  speed_hiker: { name: "Speed Hiker", emoji: "🥾" },
  search_and_rescue_hero: { name: "Search & Rescue Hero", emoji: "🚁" },
  storm_chaser: { name: "Storm Chaser", emoji: "⛈️" },
  no_detours: { name: "No Detours", emoji: "🧭" },
  leave_no_trace: { name: "Leave No Trace", emoji: "🌱" },
  first_step: { name: "First Step", emoji: "🎬" },
  halfway: { name: "Halfway Up", emoji: "🏔️" },
  week_4_entry: { name: "Into the Summit Push", emoji: "🪢" },
  summit: { name: "Summit Reached", emoji: "🏔️✨" },
  mystery: { name: "The Ranger's Secret", emoji: "🌲" },
  double_summit: { name: "Double Summit", emoji: "⛰️" },
  on_the_trail: { name: "On the Trail", emoji: "🗓️" },
  the_ascent: { name: "The Ascent", emoji: "🧗" },
};

/** XP event type → display label */
function formatEventType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getWistiaVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? null;
  } catch {
    return null;
  }
}

export default function ReportPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();
  const [showRewatch, setShowRewatch] = useState(false);

  const { data: reportData, loading: reportLoading } = useApiData(
    "GetClipReport",
    { clipId: clipId ?? "", viewerId: viewer?.id ?? "" },
    { enabled: !!clipId && !!viewer?.id }
  );

  const { data: weatherData, loading: weatherLoading } = useApiData(
    "GetWeatherStorm",
    { clipId: clipId ?? "" },
    { enabled: !!clipId }
  );

  const loading = reportLoading || weatherLoading;

  const wistiaVideoId = useMemo(
    () => (reportData?.videoUrl ? getWistiaVideoId(reportData.videoUrl) : null),
    [reportData?.videoUrl]
  );

  const handleRewatch = useCallback(() => setShowRewatch(true), []);
  const handleCloseRewatch = useCallback(() => setShowRewatch(false), []);

  if (!viewer) {
    navigate("/library", { replace: true });
    return null;
  }

  if (loading || !reportData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-500">Loading Ranger Report…</p>
        </div>
      </div>
    );
  }

  const {
    engagementScore,
    engagementThreshold,
    trailMarkerCorrect,
    trailMarkerTotal,
    searchRescueCorrect,
    searchRescueTotal,
    searchRescueTriggered,
    weatherStormTriggered,
    incorrectQuestions,
    xpEvents,
    totalXpEarned,
    badges,
    clipTitle,
    clipSortOrder,
  } = reportData;

  const emoji = getClipEmoji(clipSortOrder);
  const passed = engagementScore !== null && engagementScore >= engagementThreshold;
  const weatherCard = weatherData?.card;
  const hasIncorrect = incorrectQuestions.length > 0;

  // Rewatch fullscreen overlay
  if (showRewatch && wistiaVideoId) {
    return <RewatchPlayer videoId={wistiaVideoId} clipTitle={clipTitle} onClose={handleCloseRewatch} />;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      <PageHeader
        emoji="📋"
        title="Ranger Report Review"
        subtitle={`${emoji} Clip ${clipSortOrder}: ${clipTitle}`}
        showBackButton={false}
        subtitleClassName="text-base font-semibold text-indigo-600 mt-0.5"
      />

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-5 pb-8">

        {/* Score Tiles */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <ScoreTiles
            engagementScore={engagementScore}
            engagementThreshold={engagementThreshold}
            trailMarkerCorrect={trailMarkerCorrect}
            trailMarkerTotal={trailMarkerTotal}
            searchRescueCorrect={searchRescueCorrect}
            searchRescueTotal={searchRescueTotal}
            searchRescueTriggered={searchRescueTriggered}
          />
        </div>

        {/* Weather the Storm */}
        {weatherCard && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <WeatherStormCard overview={weatherCard.overview} takeaways={weatherCard.takeaways} />
          </div>
        )}

        {/* 🐾 Back Track */}
        {hasIncorrect && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <BackTrackSection incorrectQuestions={incorrectQuestions} />
          </div>
        )}

        {/* Perfect score celebration */}
        {!hasIncorrect && passed && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="text-center py-2">
              <span className="text-3xl">🌲</span>
              <p className="font-bold text-sm text-green-700 mt-2">
                Perfect run! No missed questions — forest fully preserved.
              </p>
            </div>
          </div>
        )}

        {/* 🪵 XP Collected */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <XpCollectedSection
            xpEvents={xpEvents}
            totalXpEarned={totalXpEarned}
            formatEventType={formatEventType}
          />
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🏅</span>
              <h2 className="text-base font-bold text-gray-900">Badges Earned</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const info = BADGE_MAP[badge.badgeId] ?? { name: badge.badgeId, emoji: "🎖️" };
                return (
                  <span
                    key={badge.badgeId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-sm font-medium text-indigo-700"
                  >
                    <span>{info.emoji}</span>
                    <span>{info.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 🌱 Rewatch Clip button — inside the card area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRewatch}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
            >
              🌱 Rewatch Clip
            </button>
            <button
              onClick={() => navigate("/library")}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              🎞️ Back to cAMP Clips
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
