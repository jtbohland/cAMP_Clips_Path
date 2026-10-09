import { useViewer } from "@/components/ViewerContext";
import CampLogo from "@/components/CampLogo";
import XpProgressBar from "@/components/XpProgressBar";

type CampHeroBannerProps = {
  /** Ascent: show the XP progress section below the welcome. Approach: welcome only. */
  showXp?: boolean;
};

const NAVY = "linear-gradient(135deg, #0B1736 0%, #13265C 55%, #1E3A8A 100%)";
const GOLD = "#F2C46D";

/**
 * Daily welcome hero: logo + personalized greeting, with the existing
 * XP progress bar embedded beneath it on the Ascent tab.
 */
export default function CampHeroBanner({ showXp = false }: CampHeroBannerProps) {
  const { viewer } = useViewer();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div
      className="w-full rounded-2xl overflow-hidden shadow-[0_4px_14px_rgba(11,23,54,0.25)]"
      style={{ border: `1.5px solid ${GOLD}55` }}
    >
      {/* ── Welcome header ── */}
      <div className="relative overflow-hidden px-6 py-5" style={{ background: NAVY }}>
        {/* Faded watermark */}
        <CampLogo
          size={260}
          className="pointer-events-none select-none absolute -right-10 top-1/2 -translate-y-1/2"
          style={{ opacity: 0.08 }}
        />

        <div className="relative flex items-center gap-5">
          <CampLogo size={104} className="shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]" />

          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: GOLD }}
            >
              Welcome back, Camper
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white leading-tight truncate">
              {viewer?.name ?? "Camper"}
            </h2>
            <p className="mt-1 text-sm text-blue-100/80">{today}</p>
            <div className="mt-2 h-px w-16" style={{ backgroundColor: `${GOLD}99` }} />
            <p className="mt-2 text-xs text-blue-100/70">🎞️ Watch. Engage. Ascend.</p>
          </div>
        </div>
      </div>

      {/* ── XP progress (Ascent only) — existing component, unchanged behavior ── */}
      {showXp && <XpProgressBar embedded />}
    </div>
  );
}
