import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { WistiaPlayer } from "@wistia/wistia-player-react";
import { useApi } from "@/hooks/useApi";

/**
 * Elevator pitch data — Wistia media IDs + metadata.
 */
const PITCHES = [
  { name: "Paul Fox", mediaId: "y3xcucd6tu", duration: "3m 5s" },
  { name: "Brian Wagner", mediaId: "gdzawrq0dp", duration: "2m 28s" },
  { name: "Dan Almond", mediaId: "xns9nxgy3i", duration: "3m 10s" },
  { name: "Rob Bow", mediaId: "e7r1w561qy", duration: "4m 34s" },
] as const;

type WelcomeModalProps = {
  viewerId: string;
  onDismiss: () => void;
};

export default function WelcomeModal({ viewerId, onDismiss }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [expandedPitches, setExpandedPitches] = useState<Set<string>>(new Set());
  const { run: logClick } = useApi("LogPitchClick");

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const togglePitch = useCallback(
    (pitchName: string) => {
      setExpandedPitches((prev) => {
        const next = new Set(prev);
        if (next.has(pitchName)) {
          next.delete(pitchName);
        } else {
          next.add(pitchName);
          // Log click when expanding (opening the player)
          logClick({ viewerId, pitchName }).catch(() => {
            // non-critical — don't block UX
          });
        }
        return next;
      });
    },
    [viewerId, logClick]
  );

  const handleBeginAscent = useCallback(() => {
    onDismiss();
    navigate("/library", { replace: true });
  }, [onDismiss, navigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header — colored banner */}
        <div className="rounded-t-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 pt-7 pb-5 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <span className="text-4xl">🧗🏼</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Climber!</h2>
          <p className="text-sm text-indigo-100 mt-1">Let's unpack your cAMP Gear</p>
        </div>

        <div className="px-8 pt-6 pb-4">

          {/* Orientation bullets */}
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🗺️</span>
              <div>
                <a href="https://docs.google.com/document/d/13f7KQNiPEcTdtVl4vBM2izuwewNA1zA1NWY0Bj91hDo/edit?tab=t.xoeibmsufcdj#heading=h.3p0e4mlo19ak" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline decoration-indigo-300 hover:text-indigo-800">Ascent Guide</a> is your daily base camp — follow it closely and read it first.
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🎞️</span>
              <div>
                <a href="https://app.superblocks.com/code-mode/applications/fbc1d457-949d-4756-9cd4-ca723f3cb5ac" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline decoration-indigo-300 hover:text-indigo-800">cAMP Clips</a> (this app!) is where you watch the videos and complete the in-video Trail Markers as you go.
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🧠</span>
              <div>
                <a href="https://app.superblocks.com/code-mode/applications/303818de-7c76-409c-a430-4404529ab864" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline decoration-indigo-300 hover:text-indigo-800">cAMP Quizzes</a> are your content-retention checks after each session.
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🎡</span>
              <div>
                <a href="https://app.superblocks.com/code-mode/applications/fef97ebe-4fb9-401f-b97c-c52c1693b31b" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 underline decoration-indigo-300 hover:text-indigo-800">Wheel & Deal</a> is for product-fluency practice — solo or multiplayer — as prep for cAMP 201.
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200/60 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">⭐️</span>
              <div className="text-sm text-amber-900">
                Clips, Quizzes, and Wheel & Deal all include <span className="font-semibold">XP, bonus opportunities, and leaderboards</span> — keep ascending alongside your fellow cAMPers.
              </div>
            </div>
          </div>
        </div>

        {/* Elevator Pitches */}
        <div className="px-8 pb-4">
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-sm font-bold text-gray-900 tracking-wide mb-1">
              🪢 Before You Begin — Amplitude Elevator Pitches
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Begin your elevation with these quick pitches
            </p>

            <div className="space-y-2">
              {PITCHES.map((pitch) => {
                const isExpanded = expandedPitches.has(pitch.name);
                return (
                  <div key={pitch.name} className="rounded-lg border border-gray-200 overflow-hidden">
                    {/* Clickable pitch row */}
                    <button
                      onClick={() => togglePitch(pitch.name)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🍿</span>
                        <span className="text-sm font-semibold text-indigo-600">
                          Elevator Pitch — {pitch.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{pitch.duration}</span>
                        <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Inline Wistia player */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-3 py-3">
                        <div className="rounded-lg overflow-hidden shadow-sm">
                          <WistiaPlayer
                            mediaId={pitch.mediaId}
                            playerColor="#4F46E5"
                            aspect={16 / 9}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback note + CTA Button */}
        <div className="px-8 pb-8 pt-2">
          <p className="text-xs text-gray-500 text-center mb-4">
            Questions, feedback, or something not working? Reach out — and keep flagging issues as you go.
          </p>
          <button
            onClick={handleBeginAscent}
            className="w-full py-3.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md"
          >
            🌄 Begin Your Ascent
          </button>
        </div>
      </div>
    </div>
  );
}
