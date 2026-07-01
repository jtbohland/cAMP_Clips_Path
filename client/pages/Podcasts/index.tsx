import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import PageHeader from "@/components/PageHeader";
import PodcastEpisode from "./PodcastEpisode";
import PodcastAchievementModal from "./PodcastAchievementModal";

const EPISODES = [
  { title: "PODcast: Chegg (NAMER)", duration: "6m", mediaId: "d4ykhvht66" },
  { title: "PODcast: Essent Win Story (EMEA)", duration: "15m", mediaId: "wtmth6596f" },
  { title: "PODcast: FOX Corp (NAMER)", duration: "19m", mediaId: "pe2bvt2sdq" },
  { title: "PODcast: Orange Win Story (EMEA)", duration: "23m", mediaId: "c9lxd0wsbg" },
];

export default function PodcastsPage() {
  const navigate = useNavigate();
  const { viewer } = useViewer();
  const viewerId = viewer?.id ?? "";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const achievementShownRef = useRef(false);

  // Fetch existing progress
  const { data: progressData, refetch } = useApiData(
    "GetPodcastProgress",
    { viewerId },
    { enabled: !!viewerId }
  );

  const { run: trackProgress } = useApi("TrackPodcastProgress");
  const { run: awardXp } = useApi("AwardPodcastXp");
  const { run: logClick } = useApi("LogPitchClick");

  // Build a map of mediaId → progress
  const progressMap = new Map<string, { completed: boolean; maxPercentWatched: number }>();
  if (progressData?.progress) {
    for (const p of progressData.progress) {
      progressMap.set(p.mediaId, { completed: p.completed, maxPercentWatched: p.maxPercentWatched });
    }
  }

  // Toggle accordion — only one can be open at a time; log click when expanding
  const handleToggle = useCallback((mediaId: string) => {
    setExpandedId((prev) => {
      if (prev === mediaId) return null; // collapsing — no click log
      // Expanding — log the click for analytics
      const episode = EPISODES.find(e => e.mediaId === mediaId);
      if (viewerId && episode) {
        logClick({ viewerId, pitchName: `🎧 ${episode.title}` }).catch(() => {});
      }
      return mediaId;
    });
  }, [viewerId, logClick]);

  // Track progress when percent changes, check for all-4 completion
  const handlePercentChange = useCallback(
    async (mediaId: string, percent: number) => {
      if (!viewerId) return;
      try {
        const result = await trackProgress({ viewerId, mediaId, percentWatched: percent });

        // If this video just completed, refetch progress and check for achievement
        if (result?.completed) {
          const refreshed = await refetch();
          if ((refreshed as any)?.data?.allCompleted && !achievementShownRef.current) {
            achievementShownRef.current = true;
            try {
              const xpResult = await awardXp({ viewerId });
              if (xpResult?.awarded || xpResult?.alreadyEarned) {
                setShowAchievement(true);
              }
            } catch {
              // XP award failed silently — don't block UX
            }
          }
        }
      } catch {
        // Tracking failed silently — don't disrupt listening
      }
    },
    [viewerId, trackProgress, refetch, awardXp]
  );

  // Show achievement if all were already completed on load (but modal not yet seen this session)
  useEffect(() => {
    if (progressData?.allCompleted && !achievementShownRef.current) {
      // Check if badge already earned — if so, don't re-show
      // The modal is only for the first time
    }
  }, [progressData?.allCompleted]);

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
      <PageHeader emoji="🎧" title="The PODcast" subtitle="Real wins. Real pods. Real playbooks." />

      <div className="max-w-3xl mx-auto w-full p-6 space-y-5">
        {/* Intro copy — 4 sections */}
        <div className="rounded-xl bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 space-y-4">
          <IntroSection
            emoji="🚌"
            title="What's a POD?"
            body="At Amplitude, a POD is your cross-functional deal team — SDRs, AEs, SEs, CSMs, and partners working together to win. Every deal is a team sport, and the POD is how we play it."
          />
          <IntroSection
            emoji="🎧"
            title="What's the PODcast?"
            body="The PODcast is an internal, story-driven series where real Amplitude PODs pull back the curtain on complex wins. Each episode breaks down how cross-functional teams navigated competitive pressure, architecture challenges, and executive alignment in the wild."
          />
          <IntroSection
            emoji="🐺"
            title="Why Listen?"
            body="These aren't hypotheticals — these are your peers putting the lessons from your Ascent into practice. Hear how sellers use Challenger, leverage roadmap moments like Agentic AI, orchestrate their pods, and turn leadership bets into multi-year platform plays. Every episode is a playbook in disguise."
          />
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-lg mt-0.5">☕️</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Pro Tip</p>
                <p className="text-sm text-amber-700">
                  These are designed to be listened to, not watched — throw them on while you work, commute, or grab coffee. You don't need to finish all four in one sitting either. Listen at your own pace throughout your Ascent journey.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* XP callout */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">🎣</span>
          <div>
            <p className="text-sm font-bold text-indigo-800">
              Listen to 80%+ of all 4 episodes to earn The Full Cast badge + 50 XP
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Listen at your own pace — no time limit. Progress is saved automatically.
            </p>
          </div>
        </div>

        {/* Episode list */}
        <div className="space-y-3">
          {EPISODES.map((ep) => {
            const progress = progressMap.get(ep.mediaId);
            return (
              <PodcastEpisode
                key={ep.mediaId}
                title={ep.title}
                duration={ep.duration}
                mediaId={ep.mediaId}
                isExpanded={expandedId === ep.mediaId}
                isCompleted={progress?.completed ?? false}
                percentWatched={progress?.maxPercentWatched ?? 0}
                onToggle={() => handleToggle(ep.mediaId)}
                onPercentChange={handlePercentChange}
              />
            );
          })}
        </div>

        {/* Completion status */}
        {progressData && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {progressData.progress.filter((p) => p.completed).length} of 4 episodes completed
            </p>
          </div>
        )}

        {/* Back to Clips */}
        <div className="pb-6">
          <button
            onClick={() => navigate("/library")}
            className="w-full py-3 rounded-lg text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: "#1B4332" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2D6A4F")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1B4332")}
          >
            🌲 Back to Clips
          </button>
        </div>
      </div>

      {/* Achievement modal */}
      {showAchievement && (
        <PodcastAchievementModal onDismiss={() => setShowAchievement(false)} />
      )}
    </div>
  );
}

function IntroSection({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg mt-0.5 flex-shrink-0">{emoji}</span>
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600 mt-0.5">{body}</p>
      </div>
    </div>
  );
}
