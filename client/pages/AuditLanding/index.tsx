import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData";
import { useViewer } from "@/components/ViewerContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import AuditTopicTile from "@/components/audit/AuditTopicTile";
import AuditCountdown from "@/components/audit/AuditCountdown";
import AuditLeaderboard from "@/components/audit/AuditLeaderboard";
import PageHeader from "@/components/PageHeader";

export default function AuditLandingPage() {
  const { viewer } = useViewer();
  const navigate = useNavigate();
  const isAdmin = viewer?.isAdmin === true || viewer?.role === "Admin";

  const { data, loading, fetching, isError, error } = useApiData("GetAuditLanding", {
    viewerId: viewer?.id ?? "",
  }, { enabled: !!viewer?.id });

  const handleTileClick = useCallback((topicKey: string) => {
    navigate(`/audit/${topicKey}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="🍁" title="Ascent Audit" subtitle="SME Content Review" />
        <div className="p-6 max-w-6xl mx-auto w-full space-y-4">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="🍁" title="Ascent Audit" subtitle="SME Content Review" />
        <div className="p-6 text-center">
          <p className="text-red-600">Failed to load audit data: {(error as any)?.message ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const { topics, activeCycle, totalTopics, completedTopics } = data ?? { topics: [], activeCycle: null, totalTopics: 0, completedTopics: 0 };
  const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
      <PageHeader emoji="🍁" title="Ascent Audit" subtitle="SME Content Review" />

      {fetching && !loading && <div className="text-xs text-gray-600 px-6 pt-3">Updating…</div>}

      <div className={`p-6 max-w-6xl mx-auto w-full space-y-6 ${fetching && !loading ? "opacity-70" : ""}`}>

        {/* Admin back link */}
        {isAdmin && (
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/analytics")} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              ← Back to Analytics
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => navigate("/analytics?tab=audit")} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              📊 Audit Progress Dashboard
            </button>
          </div>
        )}

        {/* ─── Intro Section ─── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">🍁</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome to the Ascent Audit</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                As a Subject Matter Expert, you play a critical role in keeping our training content accurate and current.
                Review each topic assigned to you — verify summaries, trail markers, questions, and resources.
                When you're satisfied, sign off at the bottom of each topic page.
              </p>
              {activeCycle && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700">
                    📋 {activeCycle.label}
                  </span>
                  {activeCycle.deadline && (
                    <span className="text-xs text-gray-500">
                      Deadline: <strong className="text-gray-700">{new Date(activeCycle.deadline).toLocaleDateString()}</strong>
                    </span>
                  )}
                </div>
              )}
              {!activeCycle && (
                <p className="mt-2 text-xs text-amber-600 italic">
                  No active audit cycle — you can still review and sign off on topics as ad-hoc edits.
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">Audit Progress</span>
              <span className="text-xs font-bold text-gray-700">{completedTopics} / {totalTopics} topics complete</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        </div>

        {/* ─── Countdown Timer ─── */}
        <AuditCountdown
          cycleLabel={activeCycle?.label ?? null}
          deadline={activeCycle?.deadline ?? null}
        />

        {/* ─── MV-SME Leaderboard ─── */}
        <AuditLeaderboard entries={data?.leaderboard ?? []} />

        {/* ─── Topic Tile Grid ─── */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            All Training Topics ({totalTopics})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
            {topics.map((topic: any) => (
              <AuditTopicTile
                key={topic.topicKey}
                topic={topic}
                onClick={handleTileClick}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
