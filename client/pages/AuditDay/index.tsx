import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useViewer } from "@/components/ViewerContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import {
  SummarySection,
  TrailMarkersSection,
  SearchRescueSection,
  WeatherStormSection,
  GearSection,
  ClipSection,
} from "@/components/audit/AuditContentSections";

export default function AuditDayPage() {
  const { topicKey } = useParams<{ topicKey: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();
  const [signOffNotes, setSignOffNotes] = useState("");

  const { data, loading, fetching, isError, error, refetch } = useApiData("GetAuditDayContent", {
    topicKey: topicKey ?? "",
  }, { enabled: !!topicKey });

  const { run: signOff, loading: signingOff } = useApi("SignOffAudit");

  const handleSignOff = useCallback(async () => {
    if (!viewer?.id || !topicKey) return;
    try {
      await signOff({
        viewerId: viewer.id,
        topicKey,
        notes: signOffNotes.trim() || null,
      });
      toast.success("Audit signed off successfully!");
      navigate("/audit");
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      toast.error("Sign-off failed: " + message);
    }
  }, [viewer?.id, topicKey, signOffNotes, signOff, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="🍁" title="Audit Review" subtitle="Loading…" />
        <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="🍁" title="Audit Review" subtitle="Error" />
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">Failed to load topic: {(error as any)?.message ?? "Unknown error"}</p>
          <button onClick={() => navigate("/audit")} className="text-sm text-indigo-600 hover:underline">
            ← Back to Audit
          </button>
        </div>
      </div>
    );
  }

  const { topic, clips } = data;

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
      <PageHeader
        emoji={topic.emoji ?? "🍁"}
        title={`${topic.dayLabel}: ${topic.title}`}
        subtitle="Audit Review"
      />

      {fetching && !loading && <div className="text-xs text-gray-600 px-6 pt-3">Updating…</div>}

      <div className={`p-6 max-w-4xl mx-auto w-full space-y-4 ${fetching && !loading ? "opacity-70" : ""}`}>

        {/* Back link */}
        <button onClick={() => navigate("/audit")} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
          ← Back to all topics
        </button>

        {/* ⚠️ Production warning banner */}
        <div className="rounded-lg bg-orange-50 border border-orange-300 px-4 py-3 text-sm text-orange-800 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="font-bold">Changes go live immediately</p>
            <p className="text-orange-700 text-xs mt-0.5">
              Any edits you make here will be pushed directly into the production training experience.
              If a mistake is made, your admin can revert individual changes.
            </p>
          </div>
        </div>

        {/* Path label */}
        {topic.pathLabel && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-medium text-purple-700">
            {topic.pathLabel}
          </span>
        )}

        {/* Resource-only note */}
        {!topic.hasVideo && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            📂 <strong>Resource-only training day</strong> — This topic does not include a video clip.
            {clips.length > 0 ? ` It has ${clips.length} resource item(s) for review.` : ""}
          </div>
        )}

        {/* Summary & Objectives */}
        <SummarySection
          summary={topic.summary}
          objectives={topic.learningObjectives}
          smes={topic.smes}
          topicKey={topicKey!}
          onSaved={refetch}
        />

        {/* Clip-level content */}
        {clips.map((clip: any) => (
          <div key={clip.clipId} className="space-y-4">
            {/* Clip (watch-only + notes) */}
            <ClipSection clip={clip} topicKey={topicKey!} onSaved={refetch} />

            {/* Trail Markers */}
            <TrailMarkersSection markers={clip.trailMarkers} clipTitle={clip.title} topicKey={topicKey!} onSaved={refetch} />

            {/* Search & Rescue */}
            <SearchRescueSection questions={clip.searchRescue} clipTitle={clip.title} topicKey={topicKey!} onSaved={refetch} />

            {/* Weather the Storm */}
            <WeatherStormSection wts={clip.weatherStorm} clipTitle={clip.title} clipId={clip.clipId} topicKey={topicKey!} onSaved={refetch} />

            {/* cAMP Gear */}
            <GearSection resources={clip.resources} clipTitle={clip.title} clipId={clip.clipId} topicKey={topicKey!} onSaved={refetch} />
          </div>
        ))}

        {/* ─── Sign Off Section ─── */}
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-6 mt-6">
          <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>✍️</span> Sign & Complete Audit
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            By signing off, you confirm that you have reviewed all content for <strong>{topic.title}</strong> and
            it is accurate as of today. Any notes you leave will be visible to the program administrator.
          </p>

          {/* Notes textarea */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={signOffNotes}
              onChange={(e) => setSignOffNotes(e.target.value)}
              placeholder="Any observations, corrections needed, or general notes…"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </div>

          <button
            onClick={handleSignOff}
            disabled={signingOff}
            className="w-full py-3 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white transition-colors shadow-md"
          >
            {signingOff ? "Signing off…" : "✅ Sign & Complete Audit"}
          </button>
        </div>
      </div>
    </div>
  );
}
