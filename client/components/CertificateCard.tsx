import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import { openLinkedInShare } from "@/lib/linkedInShare";
import type { CertificateDef } from "@/config/certificateConfig";

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
    ? new Date(earnedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // ── Locked state ──────────────────────────────────────────────────
  if (!earned) {
    return (
      <div className="w-full max-w-lg opacity-40 select-none">
        <div
          className="p-8 text-center"
          style={{
            border: "3px solid #d1d5db",
            borderRadius: "4px",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
          }}
        >
          <div className="text-5xl mb-3 grayscale">🔒</div>
          <p
            className="text-sm tracking-[0.2em] uppercase font-semibold mb-2"
            style={{ color: "#9ca3af" }}
          >
            Certificate Locked
          </p>
          <p className="text-lg font-bold" style={{ color: "#9ca3af" }}>
            {cert.title}
          </p>
          <p className="text-sm mt-1" style={{ color: "#b0b8c4" }}>
            {cert.subtitle}
          </p>
        </div>
      </div>
    );
  }

  // ── Accent color per cert ─────────────────────────────────────────
  const ACCENT: Record<string, string> = {
    amber: "#92400e",
    emerald: "#065f46",
    sky: "#0c4a6e",
    indigo: "#312e81",
    purple: "#581c87",
  };
  const accent = ACCENT[cert.color] ?? ACCENT.amber;
  const accentLight = cert.color === "purple" ? "#f3e8ff" : cert.color === "indigo" ? "#e0e7ff" : cert.color === "sky" ? "#e0f2fe" : cert.color === "emerald" ? "#d1fae5" : "#fef3c7";

  // ── Earned certificate ────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg">
      {/* Exportable certificate (ref for html-to-image) */}
      <div
        ref={cardRef}
        style={{
          width: "100%",
          maxWidth: "512px",
          padding: "32px",
          background: "#fffdf7",
          border: `2px solid ${accent}`,
          borderRadius: "4px",
          position: "relative",
        }}
      >
        {/* Inner border frame */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            right: "8px",
            bottom: "8px",
            border: `1px solid ${accent}40`,
            borderRadius: "2px",
            pointerEvents: "none",
          }}
        />

        {/* Corner accents */}
        {[
          { top: "4px", left: "4px" },
          { top: "4px", right: "4px" },
          { bottom: "4px", left: "4px" },
          { bottom: "4px", right: "4px" },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: "16px",
              height: "16px",
              borderColor: accent,
              borderStyle: "solid",
              borderWidth: "0",
              ...pos,
              ...(i < 2 ? { borderTopWidth: "2px" } : { borderBottomWidth: "2px" }),
              ...(i % 2 === 0 ? { borderLeftWidth: "2px" } : { borderRightWidth: "2px" }),
            }}
          />
        ))}

        <div style={{ position: "relative", textAlign: "center" }}>
          {/* Organization */}
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#78716c",
              marginBottom: "4px",
              fontWeight: 600,
            }}
          >
            Amplitude Global Sales Enablement
          </p>

          {/* Divider */}
          <div
            style={{
              width: "60px",
              height: "1px",
              background: accent,
              margin: "8px auto",
              opacity: 0.4,
            }}
          />

          {/* Certificate of Completion */}
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            Certificate of Completion
          </p>

          {/* Achievement title */}
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.3,
              margin: "12px 0 4px",
            }}
          >
            {cert.title}
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "#57534e",
              fontStyle: "italic",
              marginBottom: "16px",
            }}
          >
            {cert.subtitle}
          </p>

          {/* Divider */}
          <div
            style={{
              width: "200px",
              height: "1px",
              background: `linear-gradient(to right, transparent, ${accent}60, transparent)`,
              margin: "0 auto 16px",
            }}
          />

          {/* Presented to */}
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#a8a29e",
              marginBottom: "6px",
            }}
          >
            Presented to
          </p>

          {/* Learner name */}
          <h3
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: accent,
              marginBottom: "4px",
            }}
          >
            {learnerName}
          </h3>

          {/* Path */}
          <p
            style={{
              fontSize: "12px",
              color: "#78716c",
              marginBottom: "16px",
            }}
          >
            {pathLabel}
          </p>

          {/* Modules (for approach cert) */}
          {cert.modules.length > 0 && (
            <div
              style={{
                display: "inline-block",
                textAlign: "left",
                background: accentLight,
                borderRadius: "6px",
                padding: "10px 20px",
                marginBottom: "16px",
              }}
            >
              {cert.modules.map((mod) => (
                <p
                  key={mod}
                  style={{
                    fontSize: "12px",
                    color: "#44403c",
                    lineHeight: 1.8,
                  }}
                >
                  ✓ {mod}
                </p>
              ))}
            </div>
          )}

          {/* Tier badge (summit) */}
          {cert.key === "summit" && (
            <div style={{ marginBottom: "16px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 20px",
                  borderRadius: "20px",
                  background: accentLight,
                  border: `1px solid ${accent}30`,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: accent,
                }}
              >
                {tierEmoji} {tierName}
              </span>
            </div>
          )}

          {/* Date */}
          {formattedDate && (
            <p
              style={{
                fontSize: "12px",
                color: "#78716c",
                marginBottom: "12px",
              }}
            >
              {formattedDate}
            </p>
          )}

          {/* Bottom divider */}
          <div
            style={{
              width: "60px",
              height: "1px",
              background: accent,
              margin: "0 auto 12px",
              opacity: 0.4,
            }}
          />

          {/* Logo placeholder + tagline */}
          <p
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#44403c",
              marginBottom: "2px",
            }}
          >
            🏔️ cAMP Ascent
          </p>
          <p
            style={{
              fontSize: "9px",
              color: "#a8a29e",
              letterSpacing: "0.1em",
            }}
          >
            Amplitude's AI-powered enablement app
          </p>
        </div>
      </div>

      {/* Action buttons (outside exportable area) */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleDownloadPng}
          className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-200"
        >
          📥 Download Certificate
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
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
