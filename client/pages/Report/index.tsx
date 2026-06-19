import { useParams, useNavigate } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClipEmoji } from "@/lib/clip-emojis";
import PageHeader from "@/components/PageHeader";

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

export default function ReportPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();

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

  if (!viewer) {
    navigate("/library", { replace: true });
    return null;
  }

  if (loading || !reportData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]" />
          <p className="text-sm text-gray-500">Loading Ranger Report…</p>
        </div>
      </div>
    );
  }

  const {
    engagementScore,
    engagementThreshold,
    correctAnswers,
    totalQuestions,
    xpEvents,
    totalXpEarned,
    badges,
    clipTitle,
    clipSortOrder,
  } = reportData;

  const emoji = getClipEmoji(clipSortOrder);
  const passed = engagementScore !== null && engagementScore >= engagementThreshold;
  const weatherCard = weatherData?.card;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader emoji="📋" title="Ranger Report" subtitle={`${emoji} Clip ${clipSortOrder}: ${clipTitle}`} />

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-5">

        {/* Engagement Score + Trail Markers */}
        <Card className="p-5">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className={`text-4xl font-bold ${engagementScore === null ? "text-gray-500" : passed ? "text-green-600" : "text-red-500"}`}>
                {engagementScore !== null ? `${engagementScore}%` : "—"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Engagement Score
              </p>
              <p className="text-[10px] text-gray-500">
                {engagementThreshold}% threshold
              </p>
            </div>
            <div className="h-14 w-px bg-border" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {correctAnswers}/{totalQuestions}
              </div>
              <p className="text-xs text-gray-500 mt-1">Trail Markers</p>
            </div>
          </div>
        </Card>

        {/* Weather the Storm */}
        {weatherCard && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⛈️</span>
              <h2 className="text-base font-bold text-gray-900">Weather the Storm</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              {weatherCard.overview}
            </p>
            {weatherCard.takeaways.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Key Takeaways
                </h3>
                <ul className="space-y-1.5">
                  {weatherCard.takeaways.map((takeaway: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-900">
                      <span className="text-[#4F46E5] font-bold mt-0.5">•</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* XP Breakdown */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <h2 className="text-base font-bold text-gray-900">XP Earned</h2>
            <span className="ml-auto text-lg font-bold text-[#4F46E5]">+{totalXpEarned} XP</span>
          </div>
          {xpEvents.length > 0 ? (
            <div className="space-y-1.5">
              {xpEvents.map((event, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{formatEventType(event.eventType)}</span>
                  <span className="font-medium text-gray-900">+{event.xpAmount} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No XP events recorded yet.</p>
          )}
        </Card>

        {/* Badges */}
        {badges.length > 0 && (
          <Card className="p-5">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4F46E5]/10 text-sm font-medium text-[#4F46E5]"
                  >
                    <span>{info.emoji}</span>
                    <span>{info.name}</span>
                  </span>
                );
              })}
            </div>
          </Card>
        )}

        {/* Rewatch button */}
        <div className="flex justify-center pb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/watch/${clipId}`)}
            className="text-sm"
          >
            ↩ Rewatch Video
          </Button>
        </div>
      </div>
    </div>
  );
}
