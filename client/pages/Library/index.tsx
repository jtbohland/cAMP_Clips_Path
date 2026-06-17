import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useViewer } from "@/components/ViewerContext";
import ClipLibraryCard from "@/components/ClipLibraryCard";
import RegistrationForm from "@/components/RegistrationForm";
import XpProgressBar from "@/components/XpProgressBar";

export default function LibraryPage() {
  const navigate = useNavigate();
  const { viewer, isLoading: viewerLoading } = useViewer();

  const { data, loading } = useApiData(
    "GetClipLibrary",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  const clips = useMemo(() => data?.clips ?? [], [data]);

  const weekGroups = useMemo(() => {
    const weeks = [
      { label: "Week 2", emoji: "🥾", min: 1, max: 4 },
      { label: "Week 3", emoji: "🏞️", min: 5, max: 9 },
      { label: "Week 4", emoji: "🧗🏻‍♂️", min: 10, max: 17 },
    ];
    return weeks.map((week) => ({
      ...week,
      clips: clips.filter(
        (c: any) => c.sortOrder >= week.min && c.sortOrder <= week.max
      ),
    }));
  }, [clips]);

  // Show registration if no viewer
  if (!viewerLoading && !viewer) {
    return <RegistrationForm />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎬</span>
          <div>
            <h1 className="text-2xl font-bold text-primary">cAMP Clips</h1>
            <p className="text-sm text-muted-foreground">
              Your training journey awaits. Watch each clip, answer Trail Markers, and earn your Ranger Report.
            </p>
          </div>
        </div>
        {/* Skeleton */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full h-full overflow-auto">
      {/* XP Progress Bar */}
      <XpProgressBar />

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🎬</span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">cAMP Clips</h1>
          <p className="text-sm text-muted-foreground">
            Watch each clip, answer Trail Markers 🪧, and earn your Ranger Report ✨
          </p>
        </div>
      </div>

      {/* Clip list grouped by week */}
      <div className="flex flex-col gap-6">
        {weekGroups.map((week) =>
          week.clips.length > 0 ? (
            <section key={week.label}>
              {/* Week header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{week.emoji}</span>
                <h2 className="text-lg font-bold text-foreground">{week.label}</h2>
              </div>
              <div className="border-b border-border/50 mb-4" />

              {/* Clips in this week */}
              <div className="flex flex-col gap-3">
                {week.clips.map((clip: any, idx: number) => {
                  // Find previous clip in overall list for lock message
                  const overallIdx = clips.findIndex((c: any) => c.id === clip.id);
                  const prevClip = overallIdx > 0 ? clips[overallIdx - 1] : undefined;
                  return (
                    <ClipLibraryCard
                      key={clip.id}
                      clip={clip}
                      isLocked={!clip.unlocked}
                      isCompleted={clip.completed}
                      score={clip.bestScore}
                      attempts={clip.attempts ?? 0}
                      xpEarned={clip.xpEarned ?? 0}
                      previousClipTitle={prevClip ? prevClip.title : undefined}
                      onWatch={() => navigate(`/watch/${clip.id}`)}
                      onReview={() => navigate(`/report/${clip.id}`)}
                    />
                  );
                })}
              </div>
            </section>
          ) : null
        )}
      </div>

      {clips.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <span className="text-4xl block mb-3">🌲</span>
          <p className="text-sm">No clips available yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
