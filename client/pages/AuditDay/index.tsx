import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useViewer } from "@/components/ViewerContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Confetti from "@/components/audit/Confetti";
import {
  TrailMarkersSection,
  SearchRescueSection,
  WeatherStormSection,
  GearSection,
  ClipSection,
} from "@/components/audit/AuditContentSections";
import AcademyAuditTile from "@/components/audit/AcademyAuditTile";
import WheelAndDealAuditTile from "@/components/audit/WheelAndDealAuditTile";
import CampGearAuditTile from "@/components/audit/CampGearAuditTile";
import RidgeGameAuditTile from "@/components/audit/RidgeGameAuditTile";
import CampQuizAuditPlaceholder from "@/components/audit/CampQuizAuditPlaceholder";
import ReRecordModal from "@/components/audit/ReRecordModal";
import PriceGameAuditTile from "@/components/audit/PriceGameAuditTile";

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
  if (key === "academy_topic") return "Academy Course Screenshots";
  if (key === "wheel_topic") return "Wheel & Deal";
  if (key === "gear_topic") return "cAMP Gear";
  if (key === "ridge_game") return "Rules of the Ridge";
  if (key === "price_game") return "The Price is Right";
  if (key === "camp_quiz_audit") return "cAMP Quiz Audit";
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
  const [justSignedOff, setJustSignedOff] = useState(false);

  const { data, loading, fetching, isError, error, refetch } = useApiData("GetAuditDayContent", {
    topicKey: topicKey ?? "",
    viewerId: viewer?.id ?? null,
  }, { enabled: !!topicKey });

  // Sync approvals from API
  const approvedSections = useMemo(() => new Set(data?.approvedSections ?? []), [data?.approvedSections]);

  // Sync sign-off status from API (persisted)
  useEffect(() => {
    if (data?.viewerSignedOff && !signedOff) setSignedOff(true);
  }, [data?.viewerSignedOff]); // eslint-disable-line react-hooks/exhaustive-deps

  const { run: signOff, loading: signingOff } = useApi("SignOffAudit");

  // ─── Re-record modal state ────────────────────────────────────
  const [reRecordModal, setReRecordModal] = useState<{ clipTitle: string; editCount: number; sectionType: "markers" | "sr" } | null>(null);
  const reRecordDismissed = useRef<Set<string>>(new Set());

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
    const sections: string[] = [];
    // Clip-based sections (standard topics)
    for (const clip of data.clips) {
      sections.push(`summary_${clip.clipId}`);
      if (clip.trailMarkers?.length > 0) sections.push(`markers_${clip.clipId}`);
      if (clip.searchRescue?.length > 0) sections.push(`sr_${clip.clipId}`);
      if (clip.weatherStorm) sections.push(`wts_${clip.clipId}`);
      if (Array.isArray(clip.resources) && clip.resources.length > 0) sections.push(`gear_${clip.clipId}`);
    }
    // cAMP Quiz Audit — required for all clip-based topics
    if (data.clips.length > 0) {
      sections.push("camp_quiz_audit");
    }
    // Product 101 tiled sections
    if (data.clips.length === 0) {
      if (data.academyCourses?.length > 0) sections.push("academy_topic");
      if (data.wheelProducts?.length > 0) sections.push("wheel_topic");
      if (data.campGearResources?.length > 0) sections.push("gear_topic");
    }
    // Game sections
    if (data.hasRidgeGame) sections.push("ridge_game");
    if (data.hasPriceGame) sections.push("price_game");
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

  // ─── Detect clips with replacement videos flagged ─────────────
  const replacedClipIds = useMemo(() => {
    const set = new Set<string>();
    if (!data?.smeNotes) return set;
    for (const note of data.smeNotes as Array<{ changeType: string; clipId?: string }>) {
      if (note.changeType === "video_replace" && note.clipId) set.add(note.clipId);
    }
    return set;
  }, [data]);

  // ─── Detect 2+ question edits per clip section → re-record modal ─
  useEffect(() => {
    if (!data?.clips || !data?.smeNotes) return;
    const notes = data.smeNotes as Array<{ changeType: string; fieldName: string; clipId?: string }>;
    for (const clip of data.clips) {
      // Count unique marker question edits for this clip
      const markerIds = new Set((clip.trailMarkers ?? []).map((m: any) => m.id));
      const markerEdits = new Set(notes.filter(n => n.changeType === "question" && markerIds.has(n.fieldName)).map(n => n.fieldName)).size;
      const markerKey = `markers_${clip.clipId}`;
      if (markerEdits >= 2 && !reRecordDismissed.current.has(markerKey)) {
        reRecordDismissed.current.add(markerKey);
        setReRecordModal({ clipTitle: clip.title, editCount: markerEdits, sectionType: "markers" });
        return;
      }
      // Count unique S&R question edits for this clip
      const srIds = new Set((clip.searchRescue ?? []).map((q: any) => q.id));
      const srEdits = new Set(notes.filter(n => n.changeType === "question" && srIds.has(n.fieldName)).map(n => n.fieldName)).size;
      const srKey = `sr_${clip.clipId}`;
      if (srEdits >= 2 && !reRecordDismissed.current.has(srKey)) {
        reRecordDismissed.current.add(srKey);
        setReRecordModal({ clipTitle: clip.title, editCount: srEdits, sectionType: "sr" });
        return;
      }
    }
  }, [data]);

  const handleSignOff = useCallback(async () => {
    if (!viewer?.id || !topicKey) return;
    try {
      await signOff({
        viewerId: viewer.id,
        topicKey,
        notes: signOffNotes.trim() || null,
      });
      setSignedOff(true);
      setJustSignedOff(true);
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

  // ─── Post Sign-Off Thank You (just completed) ────────────────
  if (justSignedOff) {
    const smeNames = topic.smes?.map((s: any) => s.name).join(" & ") ?? "SME";
    const badgeCardRef = (el: HTMLDivElement | null) => {
      if (el) (window as any).__auditBadgeCard = el;
    };
    const handleShareBadge = () => {
      const text = `${badge.emoji} ${badge.name}\n"${badge.vibe}"\n\nJust completed my SME audit of "${topic.title}" in cAMP Ascent! 🍁`;
      navigator.clipboard.writeText(text).then(
        () => toast.success("Badge copied! Paste it in Slack to share. 🎉"),
        () => toast.error("Failed to copy — try manually.")
      );
    };
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: "#ECFDF5" }}>
        <Confetti />
        <PageHeader emoji="🍁" title="Audit Complete" subtitle={topic.title} />
        <div className="p-6 max-w-2xl mx-auto w-full text-center space-y-6">
          {/* Shareable Badge Card */}
          <div ref={badgeCardRef} className="rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-8 shadow-xl text-white">
            <div className="text-6xl mb-3">{badge.emoji}</div>
            <h2 className="text-2xl font-extrabold">{badge.name}</h2>
            <p className="text-emerald-100 italic text-base mt-1">"{badge.vibe}"</p>
            <div className="mt-4 border-t border-emerald-500/40 pt-4">
              <p className="text-emerald-200 text-sm">Topic audited:</p>
              <p className="font-bold text-lg text-white">{topic.title}</p>
            </div>
            <p className="text-[10px] text-emerald-300 mt-4">cAMP Ascent · SME Audit Program</p>
          </div>

          {/* Share button */}
          <button
            onClick={handleShareBadge}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md"
          >
            📋 Copy Badge to Clipboard
          </button>

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

        {/* 🔒 Signed-off lock banner */}
        {signedOff && (
          <div className="rounded-lg bg-emerald-100 border-2 border-emerald-400 px-4 py-3 text-sm text-emerald-900 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">🔒</span>
            <div>
              <p className="font-bold">Audit signed off — content is locked</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                Your review for this topic has been submitted. All sections are now read-only.
                If you need to make further changes, contact your admin to reopen the audit.
              </p>
            </div>
          </div>
        )}

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

        {/* ─── Peer Progress ─── */}
        {data.peerProgress && data.peerProgress.length > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-xs font-semibold text-blue-800 mb-1.5">👥 Co-SME Progress</p>
            <div className="space-y-1">
              {data.peerProgress.map((peer, i) => {
                const pct = peer.totalSections > 0 ? Math.round((peer.approvedCount / peer.totalSections) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-blue-900">{peer.viewerName}</span>
                    <span className="text-blue-600">—</span>
                    {peer.signedOff ? (
                      <span className="text-emerald-600 font-semibold text-xs">✅ Signed off</span>
                    ) : (
                      <span className="text-blue-600 text-xs">{peer.approvedCount}/{peer.totalSections} sections approved ({pct}%)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resource-only note */}
        {!topic.hasVideo && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            📂 <strong>Resource-only training day</strong> — This topic does not include a video clip.
            {clips.length > 0 ? ` It has ${clips.length} resource item(s) for review.` : ""}
          </div>
        )}

        {/* Clip-level content */}
        <div className={signedOff ? "pointer-events-none opacity-80" : ""}>
        {clips.map((clip: any) => (
          <div key={clip.clipId} className="space-y-4">
            {/* Clip (summary + objectives + SMEs + notes) */}
            <ClipSection clip={clip} topicKey={topicKey!} topicTitle={topic.title} onSaved={refetch}
              smes={topic.smes}
              isApproved={approvedSections.has(`summary_${clip.clipId}`)}
              onApproved={refetch}
              sectionKey={`summary_${clip.clipId}`}
              smeNotes={(data.smeNotes ?? []).filter((n: any) => n.fieldName?.includes(clip.clipId) || n.value?.includes(clip.clipId))} />

            {/* Trail Markers */}
            <TrailMarkersSection markers={clip.trailMarkers} clipTitle={clip.title} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`markers_${clip.clipId}`)} onApproved={refetch} sectionKey={`markers_${clip.clipId}`}
              locked={replacedClipIds.has(clip.clipId)}
              smeNotes={(data.smeNotes ?? []).filter((n: any) => n.changeType === 'question' && clip.trailMarkers.some((m: any) => m.id === n.fieldName))} />

            {/* Search & Rescue */}
            <SearchRescueSection questions={clip.searchRescue} clipTitle={clip.title} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`sr_${clip.clipId}`)} onApproved={refetch} sectionKey={`sr_${clip.clipId}`}
              locked={replacedClipIds.has(clip.clipId)}
              smeNotes={(data.smeNotes ?? []).filter((n: any) => n.changeType === 'question' && clip.searchRescue.some((q: any) => q.id === n.fieldName))} />

            {/* Weather the Storm */}
            <WeatherStormSection wts={clip.weatherStorm} clipTitle={clip.title} clipId={clip.clipId} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`wts_${clip.clipId}`)} onApproved={refetch} sectionKey={`wts_${clip.clipId}`}
              locked={replacedClipIds.has(clip.clipId)}
              smeNotes={(data.smeNotes ?? []).filter((n: any) => n.changeType === 'weather_storm')} />

            {/* cAMP Gear */}
            <GearSection resources={clip.resources} clipTitle={clip.title} clipId={clip.clipId} topicKey={topicKey!} onSaved={refetch}
              isApproved={approvedSections.has(`gear_${clip.clipId}`)} onApproved={refetch} sectionKey={`gear_${clip.clipId}`}
              smeNotes={(data.smeNotes ?? []).filter((n: any) => ['gear_add','gear_update','gear_remove'].includes(n.changeType))} />
          </div>
        ))}

        {/* cAMP Quiz Audit — for clip-based topics only */}
        {clips.length > 0 && (
          <CampQuizAuditPlaceholder
            topicTitle={topic.title}
            isApproved={approvedSections.has("camp_quiz_audit")}
          />
        )}

        {/* Topic-level resources for topics without clips (e.g. Product 101) */}
        {clips.length === 0 && data.academyCourses && data.academyCourses.length > 0 ? (
          /* ─── Product 101 Tiled Layout ─── */
          <div className="space-y-4">
            {/* Academy Tile */}
            <AcademyAuditTile
              courses={data.academyCourses}
              topicKey={topicKey!}
              isApproved={approvedSections.has("academy_topic")}
              onApproved={refetch}
              onSaved={refetch}
              sectionKey="academy_topic"
              smeNotes={data.smeNotes}
            />

            {/* Wheel & Deal Tile */}
            {data.wheelProducts && data.wheelProducts.length > 0 && (
              <WheelAndDealAuditTile
                products={data.wheelProducts}
                wheelUrl="https://app.superblocks.com/code-mode/applications/fef97ebe-4fb9-401f-b97c-c52c1693b31b/"
                topicKey={topicKey!}
                isApproved={approvedSections.has("wheel_topic")}
                onApproved={refetch}
                onSaved={refetch}
                sectionKey="wheel_topic"
                smeNotes={data.smeNotes}
              />
            )}

            {/* cAMP Gear Tile */}
            {data.campGearResources && data.campGearResources.length > 0 && (
              <CampGearAuditTile
                resources={data.campGearResources}
                topicKey={topicKey!}
                isApproved={approvedSections.has("gear_topic")}
                onApproved={refetch}
                onSaved={refetch}
                sectionKey="gear_topic"
                smeNotes={data.smeNotes}
              />
            )}
          </div>
        ) : clips.length === 0 && data.topicResources && data.topicResources.length > 0 ? (
          /* Fallback: flat gear section for topics without structured data */
          <GearSection
            resources={data.topicResources}
            clipTitle={topic.title}
            clipId="topic"
            topicKey={topicKey!}
            onSaved={refetch}
            isApproved={approvedSections.has("gear_topic")}
            onApproved={refetch}
            sectionKey="gear_topic"
          />
        ) : null}

        {/* ─── Game Tiles (Ridge / Price) ─── */}
        {data.hasRidgeGame && (
          <RidgeGameAuditTile
            topicKey={topicKey!}
            isApproved={approvedSections.has("ridge_game")}
            onApproved={refetch}
            onSaved={refetch}
            sectionKey="ridge_game"
          />
        )}
        {data.hasPriceGame && (
          <PriceGameAuditTile
            topicKey={topicKey!}
            isApproved={approvedSections.has("price_game")}
            onApproved={refetch}
            onSaved={refetch}
            sectionKey="price_game"
          />
        )}

        {/* ─── Audit Badge Preview / Placeholder (only when not signed off) ─── */}
        </div>{/* end locked wrapper */}
        {!signedOff && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-center">
            <p className="text-3xl mb-2">🏕️</p>
            <p className="text-sm font-semibold text-amber-800">Complete your Ascent Audit to earn your trail crew badge + impact summary.</p>
            <p className="text-xs text-amber-600 mt-1">Approve all sections and sign off below to see your badge.</p>
          </div>
        )}

        {/* ─── Change Report (when signed off) ─── */}
        {signedOff && data.smeNotes && data.smeNotes.length > 0 && (
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50/30 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>📋</span> Audit Change Report
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Summary of all changes made during this audit. Your admin will review these and acknowledge below.
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.smeNotes.map((note: any, i: number) => (
                <div key={i} className="rounded-lg bg-white border border-blue-200 px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-blue-800">{note.viewerName}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{new Date(note.createdAt).toLocaleDateString()}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      note.changeType === "question" ? "bg-indigo-50 text-indigo-700" :
                      note.changeType === "sme_note" ? "bg-amber-50 text-amber-700" :
                      note.changeType === "video_replace" ? "bg-red-100 text-red-700" :
                      note.changeType === "video_link" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {note.changeType === "question" ? "🪧 Question Edit" :
                       note.changeType === "sme_note" ? "📝 Note" :
                       note.changeType === "video_replace" ? "🔄 Replacement Video" :
                       note.changeType === "video_link" ? "🎬 Additional Video" :
                       note.changeType}
                    </span>
                  </div>
                  <p className="text-gray-700">{note.value}</p>
                </div>
              ))}
            </div>

            {/* Admin acknowledgment section */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-500 mb-2">
                <strong>Admin action required:</strong> Review the changes above and acknowledge to complete the audit cycle.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 italic">Admin sign-off is managed from the Analytics → Ascent Audit panel.</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Sign Off Section (hidden when already signed off) ─── */}
        {!signedOff && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-6 mt-6">
          <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>✍️</span> Sign & Complete Audit
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            By signing off, you confirm that you have reviewed all content for <strong>{topic.title}</strong> and
            it is accurate as of today. Any notes you leave will be visible to the program administrator.
          </p>

          {/* Approved sections */}
          {requiredSections.filter(s => approvedSections.has(s)).length > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-300 px-4 py-3 mb-4">
              <p className="text-xs font-semibold text-emerald-800 mb-1">✅ Sections approved:</p>
              <ul className="space-y-0.5">
                {requiredSections.filter(s => approvedSections.has(s)).map(s => {
                  const detail = (data.sectionApprovalDetails ?? []).find((d: any) => d.sectionKey === s);
                  return (
                    <li key={s} className="text-xs text-emerald-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span>{sectionLabel(s, clipMap)}</span>
                      {detail && (
                        <span className="text-emerald-500 text-[10px]">
                          — {detail.viewerName} · {new Date(detail.approvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Pending sections */}
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

          {/* Spekit reminder */}
          <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 mb-3">
            <p className="text-sm text-purple-800">
              <span className="font-semibold">🐙 Before you sign off</span> — ask yourself: should any updates made today also be updated in <strong>Spekit</strong>?
              Changes to content, new resources, updated processes — if it lives in Spekit too, make sure both sources stay in sync.
            </p>
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
        )}
      </div>

      {/* Re-record modal */}
      {reRecordModal && (
        <ReRecordModal
          clipTitle={reRecordModal.clipTitle}
          editCount={reRecordModal.editCount}
          sectionType={reRecordModal.sectionType}
          onDismiss={() => setReRecordModal(null)}
          onAcknowledge={() => {
            setReRecordModal(null);
            // Scroll to the "About this clip" area so the SME can leave notes
            setTimeout(() => {
              const el = document.querySelector("[data-about-clip]");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
          }}
        />
      )}
    </div>
  );
}
