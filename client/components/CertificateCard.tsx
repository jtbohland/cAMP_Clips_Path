import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import { openLinkedInShare } from "@/lib/linkedInShare";
import type { CertificateDef } from "@/config/certificateConfig";

// ── Color themes ───────────────────────────────────────────────────
const THEMES: Record<string, {
  gradient: string;
  accent: string;
  border: string;
  pillBg: string;
  pillText: string;
}> = {
  amber:   { gradient: "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)", accent: "#92400e", border: "#b45309", pillBg: "#fef3c7", pillText: "#78350f" },
  emerald: { gradient: "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)", accent: "#065f46", border: "#047857", pillBg: "#d1fae5", pillText: "#064e3b" },
  sky:     { gradient: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)", accent: "#0c4a6e", border: "#0369a1", pillBg: "#e0f2fe", pillText: "#0c4a6e" },
  indigo:  { gradient: "linear-gradient(135deg, #312e81 0%, #4338ca 50%, #4f46e5 100%)", accent: "#312e81", border: "#4338ca", pillBg: "#e0e7ff", pillText: "#312e81" },
  purple:  { gradient: "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #8b5cf6 100%)", accent: "#581c87", border: "#7c3aed", pillBg: "#f3e8ff", pillText: "#581c87" },
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
  const theme = THEMES[cert.color] ?? THEMES.amber;

  const handleDownloadPng = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `cAMP-Ascent-${cert.key}-${learnerName.replace(/\s/g, "_")}.png`;
      link.href = blobUrl;
      link.click();
      URL.revokeObjectURL(blobUrl);
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


  // ── Locked state ──────────────────────────────────────────────────
  if (!earned) {
    return (
      <div className="w-full" style={{ maxWidth: "640px" }}>
        <div
          style={{
            aspectRatio: "1.6 / 1",
            border: "2px solid #e5e7eb",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            opacity: 0.45,
          }}
        >
          <div style={{ fontSize: "40px", filter: "grayscale(100%)" }}>🔒</div>
          <p style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#9ca3af", fontWeight: 600 }}>
            Certificate Locked
          </p>
          <p style={{ fontSize: "16px", fontWeight: 700, color: "#9ca3af" }}>{cert.title}</p>
          <p style={{ fontSize: "12px", color: "#b0b8c4", fontStyle: "italic" }}>{cert.subtitle}</p>
        </div>
      </div>
    );
  }

  // ── Earned certificate ────────────────────────────────────────────
  return (
    <div className="w-full" style={{ maxWidth: "640px" }}>
      <div
        ref={cardRef}
        style={{
          width: "100%",
          aspectRatio: "1.6 / 1",
          border: `3px solid ${theme.border}`,
          borderRadius: "12px",
          overflow: "hidden",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* ── Colored header band ── */}
        <div
          style={{
            background: theme.gradient,
            padding: "18px 28px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", fontWeight: 600, marginBottom: "2px" }}>
              Amplitude Global Sales Enablement
            </p>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>
              Certificate of Completion
            </p>
          </div>
          <div style={{ fontSize: "32px", lineHeight: 1 }}>{cert.emoji}</div>
        </div>

        {/* ── Certificate body ── */}
        <div
          style={{
            flex: 1,
            padding: "16px 28px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, #fffdf7 0%, #ffffff 100%)",
            position: "relative",
          }}
        >
          {/* Top: achievement + name */}
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2, marginBottom: "2px" }}>
              {cert.title}
            </h2>
            <p style={{ fontSize: "12px", color: theme.accent, fontWeight: 600, fontStyle: "italic", marginBottom: "12px" }}>
              {cert.subtitle}
            </p>

            <div style={{ width: "40px", height: "2px", background: theme.border, marginBottom: "10px" }} />

            <p style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#a8a29e", marginBottom: "3px", fontWeight: 500 }}>
              Presented to
            </p>
            <h3 style={{ fontSize: "26px", fontWeight: 800, color: theme.accent, lineHeight: 1.15, marginBottom: "2px" }}>
              {learnerName}
            </h3>
            <p style={{ fontSize: "11px", color: "#78716c" }}>{pathLabel}</p>
          </div>

          {/* Journey trail — Summit cert only */}
          {cert.journeyTrail && cert.journeyTrail.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0", marginTop: "10px", marginBottom: "4px", position: "relative", zIndex: 1 }}>
              {cert.journeyTrail.map((milestone, i) => (
                <div key={milestone.label} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <span style={{ fontSize: i === cert.journeyTrail!.length - 1 ? "20px" : "14px", lineHeight: 1 }}>
                      {milestone.emoji}
                    </span>
                    <span style={{ fontSize: "7px", fontWeight: 600, color: theme.accent, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                      {milestone.label}
                    </span>
                  </div>
                  {i < cert.journeyTrail!.length - 1 && (
                    <div style={{
                      width: "28px",
                      height: "2px",
                      background: `linear-gradient(90deg, ${theme.border}60, ${theme.border})`,
                      margin: "0 4px",
                      marginBottom: "10px",
                      borderRadius: "1px",
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Middle: topic pills */}
          {cert.topics.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px", marginBottom: "6px", position: "relative", zIndex: 1 }}>
              {cert.topics.map((topic) => (
                <span
                  key={topic}
                  style={{
                    display: "inline-block",
                    padding: "2px 9px",
                    borderRadius: "10px",
                    background: theme.pillBg,
                    color: theme.pillText,
                    fontSize: "9px",
                    fontWeight: 600,
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Tier badge — with label, celebrated */}
          <div style={{ margin: "4px 0 8px", position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#a8a29e", marginBottom: "3px", fontWeight: 500 }}>
              Tier
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 14px",
                borderRadius: "14px",
                background: `linear-gradient(135deg, ${theme.pillBg} 0%, #ffffff 100%)`,
                border: `1.5px solid ${theme.border}50`,
                color: theme.accent,
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              {tierEmoji} {tierName}
            </span>
          </div>

          {/* Bottom bar: date + branding */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              borderTop: "1px solid #e7e5e4",
              paddingTop: "8px",
              marginTop: "auto",
            }}
          >
            <div>
              {formattedDate && (
                <p style={{ fontSize: "11px", color: "#78716c", fontWeight: 500 }}>{formattedDate}</p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#44403c" }}>🏔️ cAMP Ascent</p>
              <p style={{ fontSize: "8px", color: "#a8a29e", letterSpacing: "0.05em" }}>Amplitude's AI-powered enablement app</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDownloadPng}
          className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-200"
        >
          📥 Download Certificate
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-colors"
          style={{ background: theme.gradient }}
        >
          📝 Share on LinkedIn
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-1.5">
        💡 Download your certificate first, then attach it to your LinkedIn post
      </p>
    </div>
  );
}
