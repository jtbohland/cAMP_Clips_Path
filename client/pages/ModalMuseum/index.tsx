import { useCallback } from "react";
import { useNavigate } from "react-router";
import PasswordGate from "@/components/PasswordGate";
import PageHeader from "@/components/PageHeader";
import MuseumSection from "./MuseumSection";
import { MUSEUM_SECTIONS } from "./museumData";

/**
 * Modal Museum — Admin-only showcase of every modal variant in the app,
 * organized by journey stage. Perfect for demoing the full UX to stakeholders.
 *
 * All modals use mock/sample data. Zero DB writes. Zero API calls.
 */
export default function ModalMuseumPage() {
  return (
    <PasswordGate>
      <MuseumContent />
    </PasswordGate>
  );
}

function MuseumContent() {
  const navigate = useNavigate();
  const handleBack = useCallback(() => navigate("/library"), [navigate]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3EF" }}>
      {/* Header */}
      <div className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-3"
          >
            <span>←</span> Back to Clips
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🖼️</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                The Modal Museum
              </h1>
              <p className="text-sm text-gray-500">
                Every moment in the learner journey — gallery edition
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {MUSEUM_SECTIONS.map((section) => (
          <MuseumSection key={section.id} section={section} />
        ))}

        {/* Footer plaque */}
        <div className="text-center py-8 border-t border-gray-300/50">
          <p className="text-sm text-gray-400 italic">
            "Every modal tells a story. Every learner writes their own." — The Curator
          </p>
          <p className="text-xs text-gray-300 mt-2">
            {MUSEUM_SECTIONS.reduce((sum, s) => sum + s.exhibits.length, 0)} exhibits across {MUSEUM_SECTIONS.length} galleries
          </p>
        </div>
      </div>
    </div>
  );
}
