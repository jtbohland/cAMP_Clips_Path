import { useState, useCallback, memo } from "react";
import type { MuseumSectionData, MuseumExhibit } from "./museumData";

interface MuseumSectionProps {
  section: MuseumSectionData;
}

function MuseumSectionInner({ section }: MuseumSectionProps) {
  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{section.emoji}</span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
          <p className="text-sm text-gray-500">{section.subtitle}</p>
        </div>
        <div className="flex-1 border-t border-gray-300/50 ml-4" />
        <span className="text-xs text-gray-400 font-medium">
          {section.exhibits.length} exhibit{section.exhibits.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Exhibit grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {section.exhibits.map((exhibit) => (
          <ExhibitFrame key={exhibit.id} exhibit={exhibit} />
        ))}
      </div>
    </section>
  );
}

const MuseumSection = memo(MuseumSectionInner);
export default MuseumSection;

// ─── Individual exhibit frame ───────────────────────────────────────

interface ExhibitFrameProps {
  exhibit: MuseumExhibit;
}

function ExhibitFrameInner({ exhibit }: ExhibitFrameProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
  }, []);

  return (
    <>
      {/* Framed card */}
      <div
        onClick={handleToggle}
        className="group cursor-pointer rounded-xl overflow-hidden bg-white border-2 border-amber-200/80 shadow-md hover:shadow-xl hover:border-amber-300 transition-all duration-200"
      >
        {/* Scaled-down modal preview */}
        <div className="relative bg-gray-100 overflow-hidden" style={{ height: "280px" }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: "scale(0.42)",
              transformOrigin: "top center",
              width: "238%",
              marginLeft: "-69%",
            }}
          >
            {/* Strip position:fixed from modals by wrapping in a relative container */}
            <div className="relative w-full" style={{ height: "2000px" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.4)",
                }}
              >
                {exhibit.render()}
              </div>
            </div>
          </div>

          {/* Click-to-expand overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
            <span className="text-xs font-semibold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
              Click to view full size
            </span>
          </div>
        </div>

        {/* Plaque */}
        <div className="px-4 py-3 border-t-2 border-amber-100" style={{ backgroundColor: "#FFFBF0" }}>
          <p className="text-sm font-bold text-gray-900">{exhibit.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{exhibit.trigger}</p>
        </div>
      </div>

      {/* Full-size overlay */}
      {expanded && (
        <FullSizeOverlay exhibit={exhibit} onClose={handleClose} />
      )}
    </>
  );
}

const ExhibitFrame = memo(ExhibitFrameInner);

// ─── Full-size overlay ──────────────────────────────────────────────

interface FullSizeOverlayProps {
  exhibit: MuseumExhibit;
  onClose: () => void;
}

function FullSizeOverlay({ exhibit, onClose }: FullSizeOverlayProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] text-white/80 hover:text-white text-3xl leading-none px-2 py-1 bg-white/10 rounded-full backdrop-blur-sm"
      >
        &#10005;
      </button>

      {/* Title bar */}
      <div className="mb-4 text-center">
        <p className="text-lg font-bold text-white">{exhibit.title}</p>
        <p className="text-sm text-white/60">{exhibit.trigger}</p>
      </div>

      {/* Modal at full size — pointer-events enabled for interaction preview */}
      <div className="relative max-h-[85vh] overflow-y-auto w-full flex items-start justify-center pointer-events-none">
        <div className="pointer-events-auto">
          {exhibit.render()}
        </div>
      </div>
    </div>
  );
}
