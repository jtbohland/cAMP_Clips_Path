import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import { openLinkedInShare } from "@/lib/linkedInShare";
import type { CertificateDef, WatermarkKey } from "@/config/certificateConfig";

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

// ── Watermark SVGs (solid filled silhouettes) ──────────────────────
const WATERMARKS: Record<WatermarkKey, string> = {
  tent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 20 L30 180 H170 Z" fill="currentColor"/><path d="M100 20 L100 180" stroke="white" stroke-width="3"/><path d="M82 180 L100 130 L118 180 Z" fill="white" opacity="0.4"/><rect x="20" y="178" width="160" height="4" rx="2" fill="currentColor"/></svg>`,
  trees: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="60" y="140" width="12" height="50" rx="3" fill="currentColor"/><path d="M66 30 L30 140 H102 Z" fill="currentColor"/><path d="M66 60 L42 120 H90 Z" fill="currentColor" opacity="0.85"/><rect x="130" y="150" width="10" height="40" rx="3" fill="currentColor"/><path d="M135 55 L108 150 H162 Z" fill="currentColor"/><path d="M135 80 L115 135 H155 Z" fill="currentColor" opacity="0.85"/><rect x="15" y="186" width="170" height="4" rx="2" fill="currentColor"/></svg>`,
  carabiner: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M70 30 C30 30, 20 60, 20 90 L20 140 C20 175, 50 190, 80 190 L110 190 C140 190, 160 175, 160 145 L160 85 C160 55, 145 35, 120 30 L70 30 Z" fill="currentColor"/><path d="M70 50 C45 50, 40 70, 40 90 L40 135 C40 160, 55 170, 80 170 L110 170 C130 170, 140 160, 140 140 L140 85 C140 65, 130 55, 115 50 L70 50 Z" fill="white"/><rect x="85" y="25" width="30" height="16" rx="4" fill="currentColor"/><rect x="88" y="29" width="24" height="8" rx="3" fill="white"/></svg>`,
  mountain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M0 185 L65 40 L95 95 L130 50 L200 185 Z" fill="currentColor"/><path d="M65 40 L80 68 L55 68 Z" fill="white" opacity="0.5"/><path d="M130 50 L142 72 L120 72 Z" fill="white" opacity="0.4"/><path d="M0 185 L40 120 L60 145 L90 100 H110 L140 140 L165 115 L200 185 Z" fill="currentColor" opacity="0.6"/><rect x="0" y="183" width="200" height="4" rx="2" fill="currentColor"/></svg>`,
  flag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M60 185 L75 45 L180 45 L155 80 L180 115 L75 115 Z" fill="currentColor"/><rect x="70" y="35" width="8" height="155" rx="3" fill="currentColor"/><circle cx="74" cy="32" r="6" fill="currentColor"/><rect x="40" y="183" width="80" height="6" rx="3" fill="currentColor"/></svg>`,
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

  const watermarkSvg = WATERMARKS[cert.watermark] ?? "";

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
          {/* Background watermark — inside body, color-matched, CSS data URI for PNG export */}
          {watermarkSvg && (
            <div
              style={{
                position: "absolute",
                right: "12px",
                bottom: "40px",
                width: "220px",
                height: "220px",
                opacity: 0.15,
                pointerEvents: "none",
                zIndex: 0,
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                watermarkSvg.replace(/currentColor/g, theme.border)
              )}")`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            />
          )}

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
