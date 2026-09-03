import { useState, useCallback, useMemo } from "react";
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

// ─── Audit Badge System ───────────────────────────────────────────
const AUDIT_BADGES = [
  { key: "trailwright",  emoji: "🛠️", name: "Trailwright",   vibe: "You rebuilt this stretch of the Ascent.", minEdits: 5 },
  { key: "cartographer", emoji: "🗺️", name: "Cartographer",  vibe: "You redrew the map for future hikers.", minEdits: 3 },
  { key: "peak_spotter", emoji: "🔭", name: "Peak Spotter",  vibe: "Sharp eye — you caught what needed fixing.", minEdits: 1 },
  { key: "brush_cutter", emoji: "🪓", name: "Brush Cutter",  vibe: "You cleared the small stuff off the path.", minEdits: 0, needsTextEdits: true },
  { key: "wise_owl",     emoji: "🦉", name: "Wise Owl",      vibe: "You confirmed the route and shared your wisdom.", minEdits: 0, needsNotes: true },
  { key: "smoke_signal", emoji: "🏕️", name: "Smoke Signal",  vibe: "Sent up the all-clear — this trail is solid.", minEdits: 0 },
] as const;

function computeAuditBadge(editCount: number, hasNotes: boolean) {
  if (editCount >= 5) return AUDIT_BADGES[0]; // Trailwright
  if (editCount >= 3) return AUDIT_BADGES[1]; // Cartographer
  if (editCount >= 1) return AUDIT_BADGES[2]; // Peak Spotter
  // 0 edits
  if (hasNotes) return AUDIT_BADGES[4]; // Wise Owl
  return AUDIT_BADGES[5]; // Smoke Signal
}

/** Make human-readable section label from section key + clip map */
function sectionLabel(key: string, clipMap: Map<string, string>): string {
  if (key === "summary") return "Summary & Objectives";
  const parts = key.split("_");
  const prefix = parts[0];
  const clipId = parts.slice(1).join("_");
  const clipTitle = clipMap.get(clipId) ?? "Unknown Clip";
  const labels: Record<string, string> = {
    markers: "Trail Markers",
    sr: "S&R",
    wts: "Weather the Storm",
    gear: "cAMP Gear",
  };
  return `${labels[prefix] ?? prefix} · ${clipTitle}`;
}

export default function AuditDayPage() {
  const { topicKey } = useParams<{ topicKey: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();
  const [signOffNotes, setSignOffNotes] = useState("");
  const [signedOff, setSignedOff] = useState(false);

  const { data, loading, fetching, isError, error, refetch } = useApiData("GetAuditDayContent", {
    topicKey: topicKey ?? "",
    viewerId: viewer?.id ?? null,
  }, { enabled: !!topicKey });

  // Sync approvals from API
  const approvedSections = useMemo(() => new Set(data?.approvedSections ?? []), [data?.approvedSections]);

  const { run: signOff, loading: signingOff } = useApi("SignOffAudit");

  // Build clip ID→title map for readable section names
  const clipMap = useMemo(() => {
    const m = new Map<string, string>();
    if (data?.clips) {
      for (const clip of data.clips) {
        m.set(clip.clipId, clip.title);
      }
    }
    return m;
  }, [data?.clips]);

  // Compute required sections and sign-off readiness
  const requiredSections = data ? (() => {
    const sections: string[] = ["summary"];
    for (const clip of data.clips) {
      if (clip.trailMarkers?.length > 0) sections.push(`markers_${clip.clipId}`);
      if (clip.searchRescue?.length > 0) sections.push(`sr_${clip.clipId}`);
      if (clip.weatherStorm) sections.push(`wts_${clip.clipId}`);
      if (Array.isArray(clip.resources) && clip.resources.length > 0) sections.push(`gear_${clip.clipId}`);
    }
    return sections;
  })() : [];
  const allApproved = requiredSections.length > 0 && requiredSections.every(s => approvedSections.has(s));
  const pendingSections = requiredSections.filter(s => !approvedSections.has(s));

  // Compute audit badge — count approved sections as a proxy for engagement
  const editCount = useMemo(() => {
    if (!data) return 0;
    return data.approvedSections?.length ?? 0;
  }, [data]);
  const badge = computeAuditBadge(editCount, signOffNotes.trim().length > 0);

  const handleSignOff = useCallback(async () => {
    if (!viewer?.id || !topicKey) return;
    try {
      await signOff({
        viewerId: viewer.id,
        topicKey,
        notes: signOffNotes.trim() || null,
      });
      setSignedOff(true);
      toast.success("Audit signed off successfully!");
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      toast.error("Sign-off failed: " + message);
    }
  }, [viewer?.id, topicKey, signOffNotes, signOff]);

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

  // ─── Post Sign-Off Thank You ─────────────────────────────────
  if (signedOff) {
    const smeNames = topic.smes?.map((s: any) => s.name).join(" & ") ?? "SME";
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
        <PageHeader emoji="🍁" title="Audit Complete" subtitle={topic.title} />
        <div className="p-6 max-w-2xl mx-auto w-full text-center space-y-6">
          <div className="text-7xl">{badge.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{badge.name}</h2>
          <p className="text-gray-600 italic text-lg">{badge.vibe}</p>
          <div className="rounded-xl bg-white border border-emerald-200 p-6 shadow-sm">
            <p className="text-gray-700 text-lg leading-relaxed">
              Thank you, <strong>{smeNames}</strong> — your time and expertise make cAMP Ascent better for every new Ampliteer. 🙏
            </p>
          </div>
          <button onClick={() => navigate("/audit")} className="text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100">
            ← Back to all topics
          </button>
        </div>
      </div>
    );
  }

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

        {/* Summary & Objectives (with editable SMEs) */}
        <SummarySection
          summary={topic.summary}
          objectives={topic.learningObjectives}
          smes={topic.smes}
          topicKey={topicKey!}
          onSaved={refetch}
          isApproved={approvedSections.has("summary")}
          onApproved={refetch}
        />

        {/* Clip-level content */}
        {clips.map((clip: any) => (
          <div key={clip.clipId} className="space-y-4">
            {/* Clip (watch-only + notes) */}
            <ClipSection clip={clip} topicKey={topicKey!} onSaved={refetch} />

            {/* Trail Markers */}
            <TrailMarkersSection markers={clip.trailMarkers} clipTitle={clip.title} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`markers_${clip.clipId}`)} onApproved={refetch} sectionKey={`markers_${clip.clipId}`} />

            {/* Search & Rescue */}
            <SearchRescueSection questions={clip.searchRescue} clipTitle={clip.title} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`sr_${clip.clipId}`)} onApproved={refetch} sectionKey={`sr_${clip.clipId}`} />

            {/* Weather the Storm */}
            <WeatherStormSection wts={clip.weatherStorm} clipTitle={clip.title} clipId={clip.clipId} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`wts_${clip.clipId}`)} onApproved={refetch} sectionKey={`wts_${clip.clipId}`} />

            {/* cAMP Gear */}
            <GearSection resources={clip.resources} clipTitle={clip.title} clipId={clip.clipId} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`gear_${clip.clipId}`)} onApproved={refetch} sectionKey={`gear_${clip.clipId}`} />
          </div>
        ))}

        {/* ─── Audit Badge Preview ─── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{badge.emoji}</span>
            <div>
              <p className="text-xs text-gray-400 font-medium">Your audit badge</p>
              <p className="text-base font-bold text-gray-900">{badge.name}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 italic">{badge.vibe}</p>
          {editCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">{editCount} section edit{editCount !== 1 ? "s" : ""} made during this audit</p>
          )}
        </div>

        {/* ─── Sign Off Section ─── */}
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-6 mt-6">
          <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>✍️</span> Sign & Complete Audit
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            By signing off, you confirm that you have reviewed all content for <strong>{topic.title}</strong> and
            it is accurate as of today. Any notes you leave will be visible to the program administrator.
          </p>

          {/* Approval checklist — human-readable names */}
          {!allApproved && pendingSections.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 mb-4">
              <p className="text-xs font-semibold text-red-800 mb-1">⏳ Sections still need approval:</p>
              <ul className="space-y-0.5">
                {pendingSections.map(s => (
                  <li key={s} className="text-xs text-red-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {sectionLabel(s, clipMap)}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
            disabled={signingOff || !allApproved}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-colors shadow-md ${
              allApproved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {signingOff ? "Signing off…" : !allApproved ? "🔒 Approve all sections first" : "✅ Sign & Complete Audit"}
          </button>
        </div>
      </div>
    </div>
  );
}
