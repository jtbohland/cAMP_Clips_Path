import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import { openLinkedInShare } from "@/lib/linkedInShare";
import type { CertificateDef } from "@/config/certificateConfig";

const COLOR_MAP: Record<string, { bg: string; border: string; headerBg: string; headerText: string; accent: string }> = {
  amber:   { bg: "bg-amber-50",   border: "border-amber-300",   headerBg: "from-amber-700 to-amber-600",     headerText: "text-amber-50",   accent: "text-amber-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300", headerBg: "from-emerald-700 to-emerald-600",   headerText: "text-emerald-50", accent: "text-emerald-700" },
  sky:     { bg: "bg-sky-50",     border: "border-sky-300",     headerBg: "from-sky-700 to-sky-600",           headerText: "text-sky-50",     accent: "text-sky-700" },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-300",  headerBg: "from-indigo-700 to-indigo-600",     headerText: "text-indigo-50",  accent: "text-indigo-700" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-300",  headerBg: "from-purple-700 to-purple-600",     headerText: "text-purple-50",  accent: "text-purple-700" },
};

interface CertificateCardProps {
  cert: CertificateDef;
  earned: boolean;
  earnedAt: string | null;
  learnerName: string;
  tierName: string;
  tierEmoji: string;
  pathLabel: string;
}

export default function CertificateCard({
  cert,
  earned,
  earnedAt,
  learnerName,
  tierName,
  tierEmoji,
  pathLabel,
}: CertificateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const colors = COLOR_MAP[cert.color] ?? COLOR_MAP.amber;

  const handleDownloadPng = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `cAMP-Ascent-${cert.key}-${learnerName.replace(/\s/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate PNG:", err);
    }
  }, [cert.key, learnerName]);

  const handleShare = useCallback(() => {
    openLinkedInShare(cert.linkedInText);
  }, [cert.linkedInText]);

  const formattedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  // Locked state
  if (!earned) {
    return (
      <div className="w-full max-w-md rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 opacity-50 select-none">
        <div className="text-center">
          <div className="text-4xl mb-2 grayscale">🔒</div>
          <h3 className="text-lg font-bold text-gray-400">{cert.title}</h3>
          <p className="text-sm text-gray-400 mt-1">{cert.subtitle}</p>
          <p className="text-xs text-gray-300 mt-3 italic">Complete this milestone to unlock</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Exportable card (ref for html-to-image) */}
      <div
        ref={cardRef}
        className={`rounded-2xl border-2 ${colors.border} ${colors.bg} overflow-hidden`}
        style={{ width: "100%", maxWidth: "448px" }}
      >
        {/* Header */}
        <div className={`px-6 py-5 text-center bg-gradient-to-r ${colors.headerBg}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
            Amplitude Global Sales Enablement
          </p>
          <div className="text-4xl mb-1">{cert.emoji}</div>
          <h3 className={`text-xl font-bold ${colors.headerText}`}>{cert.title}</h3>
          <p className={`text-sm ${colors.headerText} opacity-80 mt-0.5`}>{cert.subtitle}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Learner info */}
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{learnerName}</p>
            <p className="text-sm text-gray-500">{pathLabel}</p>
          </div>

          {/* Tier badge (summit only shows tier prominently) */}
          {cert.key === "summit" && (
            <div className="text-center py-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-800 text-sm font-bold">
                {tierEmoji} {tierName}
              </span>
            </div>
          )}

          {/* Modules list (approach cert) */}
          {cert.modules.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Modules Completed</p>
              {cert.modules.map((mod) => (
                <p key={mod} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="text-green-600">✓</span> {mod}
                </p>
              ))}
            </div>
          )}

          {/* Date + tagline */}
          <div className="text-center pt-2 border-t border-gray-200">
            {formattedDate && (
              <p className="text-xs text-gray-500 mb-1">Earned {formattedDate}</p>
            )}
            <p className="text-xs text-gray-400 italic">
              Earned in cAMP Ascent — Amplitude's AI-powered enablement app
            </p>
          </div>

          {/* Logo placeholder — swap with actual logo when uploaded */}
          <div className="flex justify-center pt-1">
            <div className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium">
              🏔️ cAMP Ascent
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons (outside the exportable area) */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDownloadPng}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          📥 Download PNG
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          🔗 Share on LinkedIn
        </button>
      </div>
    </div>
  );
}
