import { useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";
import { TOPIC_DAYS } from "@/config/topicDays";
import type { TopicDayConfig } from "@/config/topicDays";
import TopicResourceList from "@/components/TopicResourceList";
import TopicReflectionSection from "@/components/TopicReflectionSection";

/**
 * Topic Gear page — shows summary, learning objectives, SMEs, and resources
 * for resource-only topic days (Day 5: Renewal Operations, Day 9: Pricing & Packaging).
 *
 * Route: /topic-gear/:topicKey/:clipId
 *   topicKey = "day5" | "day9"
 *   clipId = UUID of the topic day clip row (for tracking)
 */

const BADGE_STYLES: Record<string, string> = {
  slides: "bg-yellow-100 text-yellow-800",
  spekit: "bg-pink-100 text-pink-800",
  gdrive: "bg-green-100 text-green-800",
  zoom: "bg-blue-100 text-blue-800",
  slack: "bg-orange-200 text-orange-900",
  glean: "bg-indigo-100 text-indigo-800",
  mindtickle: "bg-orange-100 text-orange-800",
};

const SFDC_STYLE: React.CSSProperties = {
  backgroundColor: "#e0f7ff",
  color: "#0077b6",
};

const TYPE_LABELS: Record<string, string> = {
  slides: "Slides",
  spekit: "Spekit",
  gdrive: "Google Drive",
  zoom: "Zoom",
  slack: "Slack",
  glean: "Glean",
  mindtickle: "MindTickle",
  sfdc: "Salesforce",
};

export default function TopicGearPage() {
  const { topicKey, clipId } = useParams<{ topicKey: string; clipId: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();

  const config = topicKey ? TOPIC_DAYS[topicKey] : undefined;
  const { run: trackClick, loading: tracking } = useApi("TrackResourceClick");

  // Get resource progress for this clip
  const { data: progressData, refetch: refetchProgress } = useApiData(
    "GetResourceProgress",
    { viewerId: viewer?.id ?? "", clipIds: clipId ? [clipId] : [] },
    { enabled: !!viewer?.id && !!clipId }
  );

  const clickedIndices = useMemo(() => {
    if (!progressData?.progress?.length) return new Set<number>();
    const entry = progressData.progress.find((p: any) => p.clipId === clipId);
    return new Set<number>(entry?.clickedIndices ?? []);
  }, [progressData, clipId]);

  const allClicked = config ? clickedIndices.size >= config.resources.length : false;

  const handleResourceClick = useCallback(async (index: number, url: string) => {
    // Open resource in new tab
    window.open(url, "_blank");

    // Track the click
    if (viewer?.id && clipId && config) {
      try {
        const result = await trackClick({
          viewerId: viewer.id,
          clipId,
          resourceIndex: index,
          totalResources: config.resources.length,
        });
        await refetchProgress();

        if (result?.justCompleted) {
          toast.success("🪓 Swiss Army Knife badge earned! Complete the reflection below for +10 XP.", {
            style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
            duration: 5000,
          });
        }
      } catch (error) {
        const message = error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
        console.error("Error tracking resource click:", message);
      }
    }
  }, [viewer?.id, clipId, config, trackClick, refetchProgress]);

  if (!viewer) {
    navigate("/?tab=ascent", { replace: true });
    return null;
  }

  if (!config || !clipId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <div className="text-center">
          <span className="text-4xl block mb-3">🏕️</span>
          <p className="text-sm text-gray-500">Topic day not found.</p>
          <button
            onClick={() => navigate("/?tab=ascent")}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            🎞️ Back to Clips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#ECFDF5" }}>
      {/* Forest green header */}
      <div className="border-b border-green-900/20 px-6 py-4" style={{ backgroundColor: "#1B4332" }}>
        <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{config.emoji}</span>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                {config.dayLabel}: {config.title}
              </h1>
              <p className="text-sm text-green-200 mt-0.5">🎒 cAMP Gear — Resource Review</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/?tab=ascent")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            🎞️ Back to Clips
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto w-full p-6 space-y-5">
          {/* Completion banner */}
          {allClicked && (
            <div className="rounded-xl border border-green-300 bg-green-50 p-4 flex items-center gap-3">
              <span className="text-2xl">🪓</span>
              <div>
                <p className="text-sm font-bold text-green-800">All resources reviewed — Swiss Army Knife earned!</p>
                <p className="text-xs text-green-600 mt-0.5">All tools. All terrain. You're ready for anything. Submit the reflection below for +10 XP!</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">Resource Progress</span>
              <span className="text-sm font-bold text-indigo-600">
                {clickedIndices.size}/{config.resources.length} reviewed
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(clickedIndices.size / config.resources.length) * 100}%`,
                  backgroundColor: allClicked ? "#16a34a" : "#6366F1",
                }}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
              📋 Summary
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{config.summary}</p>
          </div>

          {/* Learning Objectives */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
              🏹 Learning Objectives
            </h2>
            <ol className="space-y-2">
              {config.learningObjectives.map((obj, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{obj}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* SMEs */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
              🧢 Subject Matter Experts
            </h2>
            <div className="space-y-2">
              {config.smes.map((sme) => (
                <div key={sme.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                  <span className="text-lg">👤</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {sme.name}
                      {sme.note && (
                        <span className="ml-2 text-xs font-normal text-amber-600">({sme.note})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{sme.title}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Slack channels */}
            {config.slackChannels.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Slack Channels</p>
                <div className="flex flex-wrap gap-2">
                  {config.slackChannels.map((ch) => (
                    <a
                      key={ch.name}
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-sm font-medium text-orange-800 hover:bg-orange-100 transition-colors"
                    >
                      💬 {ch.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {/* Deal Desk note */}
            {config.dealDeskNote && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 italic">💡 {config.dealDeskNote}</p>
              </div>
            )}
          </div>

          {/* Resources with click tracking */}
          <TopicResourceList
            resources={config.resources}
            clickedIndices={clickedIndices}
            onResourceClick={handleResourceClick}
            badgeStyles={BADGE_STYLES}
            sfdcStyle={SFDC_STYLE}
            typeLabels={TYPE_LABELS}
          />

          {/* Topic Reflection (Day 5 & Day 9 only) — locked until all resources clicked */}
          {config.reflectionQuestions && config.reflectionQuestions.length >= 2 && viewer?.id && topicKey && (
            allClicked ? (
              <TopicReflectionSection
                viewerId={viewer.id}
                topicDay={topicKey}
                questions={config.reflectionQuestions}
              />
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 opacity-60">
                <h2 className="text-base font-bold text-gray-400 flex items-center gap-2 mb-1">
                  🔒 Trail Reflection
                </h2>
                <p className="text-xs text-gray-400">
                  Review all resources above to unlock the reflection and earn +10 XP.
                </p>
              </div>
            )
          )}

          {/* Bottom back button */}
          <div className="flex justify-center pb-6">
            <button
              onClick={() => navigate("/?tab=ascent")}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              🎞️ Back to Clips
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
