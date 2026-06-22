import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useViewer } from "@/components/ViewerContext";
import ClipLibraryCard from "@/components/ClipLibraryCard";
import RegistrationForm from "@/components/RegistrationForm";
import XpProgressBar from "@/components/XpProgressBar";

export default function LibraryPage() {
  const navigate = useNavigate();
  const { viewer, isLoading: viewerLoading } = useViewer();
  const [showBeforeYouBegin, setShowBeforeYouBegin] = useState(true);

  const { data, loading } = useApiData(
    "GetClipLibrary",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  const clips = useMemo(() => data?.clips ?? [], [data]);

  const WEEK_EMOJI: Record<number, string> = { 2: "🥾", 3: "🏞️", 4: "🧗🏻‍♂️" };

  const weekGroups = useMemo(() => {
    const grouped = new Map<number, typeof clips>();
    for (const clip of clips) {
      const wk = (clip as any).weekNumber ?? 0;
      if (!grouped.has(wk)) grouped.set(wk, []);
      grouped.get(wk)!.push(clip);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNum, weekClips]) => ({
        label: weekNum > 0 ? `Week ${weekNum}` : "Other",
        emoji: WEEK_EMOJI[weekNum] ?? "📦",
        clips: weekClips,
      }));
  }, [clips]);

  // Show registration if no viewer
  if (!viewerLoading && !viewer) {
    return <RegistrationForm />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
        {/* Skeleton */}
        <div className="h-10 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header — white bar with border, matching sub-page headers */}
      <div className="border-b border-gray-200 px-6 py-4" style={{ backgroundColor: "#ffffff" }}>
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏕️</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">cAMP Ascent: Sales</h1>
              <p className="text-sm text-gray-500 mt-0.5">🎞️ Watch. Engage. Ascend.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { path: "/xp", label: "XP-lanation", emoji: "🔭" },
              { path: "/analytics", label: "Analytics", emoji: "📊" },
              { path: "/admin", label: "Admin", emoji: "⚙️" },
            ].map((nav) => (
              <button
                key={nav.path}
                onClick={() => navigate(nav.path)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
              >
                <span>{nav.emoji}</span>
                {nav.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full flex-1 overflow-auto">
      {/* XP Progress Bar */}
      <XpProgressBar />

      {/* Before You Begin — collapsible */}
      {showBeforeYouBegin && (
        <div className="bg-[#EEF2FF] rounded-xl border border-indigo-200/60 shadow-sm overflow-hidden mb-2">
          {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-200/40">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                🎬 Before You Begin
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                How cAMP Ascent works — read before watching your first clip
              </p>
            </div>
            <button
              onClick={() => setShowBeforeYouBegin(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>

          {/* Bullet rows */}
          <div className="divide-y divide-indigo-100/50 bg-white/70 rounded-b-xl">
            <div className="flex items-start gap-3 px-5 py-3">
              <span className="text-lg mt-0.5">👁️</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Stay on the tab while watching</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Focus time counts toward your engagement score. Switching tabs pauses the video and stops your timer.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-5 py-3">
              <span className="text-lg mt-0.5">🪧</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Answer Trail Markers as they appear</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Questions pop up during the video and pause playback. You need 80%+ engagement to unlock the next clip.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-5 py-3">
              <span className="text-lg mt-0.5">🚁</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Didn't pass? Search & Rescue kicks in</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Score below 80%? You'll get a second shot with a fresh set of questions. Pass S&R and you're through.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-5 py-3 bg-[#FFF7ED]">
              <span className="text-lg mt-0.5">⛈️</span>
              <div>
                <p className="text-sm font-semibold text-[#92400E]">Fail S&R? Weather the Storm adds 3 minutes</p>
                <p className="text-xs text-[#92400E]/80 mt-0.5">
                  You'll get a 3-minute study break with the session highlights before the next clip unlocks. Stay engaged and you'll rarely see this.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clip list grouped by week */}
      <div className="flex flex-col gap-6">
        {weekGroups.map((week) =>
          week.clips.length > 0 ? (
            <section key={week.label}>
              {/* Week header — explicit bg/text for dark mode visibility */}
              <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-4">
                <span className="text-2xl">{week.emoji}</span>
                <h2 className="text-lg font-bold text-gray-900">{week.label}</h2>
              </div>

              {/* Clips in this week */}
              <div className="flex flex-col gap-3">
                {week.clips.map((clip: any) => {
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
        <div className="text-center py-12 text-gray-500">
          <span className="text-4xl block mb-3">🌲</span>
          <p className="text-sm">No clips available yet. Check back soon!</p>
        </div>
      )}
      </div>
    </div>
  );
}
