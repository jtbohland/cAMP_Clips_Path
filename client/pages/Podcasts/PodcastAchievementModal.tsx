import { useEffect } from "react";
import { useNavigate } from "react-router";
import confetti from "canvas-confetti";

type PodcastAchievementModalProps = {
  onDismiss: () => void;
};

export default function PodcastAchievementModal({ onDismiss }: PodcastAchievementModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const fishEmoji = (confetti as any).shapeFromText({ text: "🎣", scalar: 2 });
    const headphoneEmoji = (confetti as any).shapeFromText({ text: "🎧", scalar: 2 });

    const duration = 3500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        shapes: [fishEmoji, headphoneEmoji],
        scalar: 2,
        flat: true,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        shapes: [fishEmoji, headphoneEmoji],
        scalar: 2,
        flat: true,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header band — dark green like TierUnlockModal but themed */}
        <div className="px-8 py-5 text-center" style={{ background: "linear-gradient(to right, #1B4332, #2D6A4F)" }}>
          <p className="text-2xl font-bold uppercase tracking-widest text-white">
            New Achievement!
          </p>
          <p className="mt-1 text-sm text-white/80">
            You completed all 4 PODcasts
          </p>
        </div>

        {/* Big badge display */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="text-7xl mb-3">🎣</div>
          <h2 className="text-2xl font-bold text-gray-900">The Full Cast</h2>
          <p className="mt-2 text-sm text-gray-500 italic">
            Every line in the water. Every story landed.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-4 py-2">
            <span className="text-lg font-bold text-amber-700">+50 XP</span>
          </div>
        </div>

        {/* Back to Clips button */}
        <div className="px-8 pb-8">
          <button
            onClick={() => {
              onDismiss();
              navigate("/library");
            }}
            className="w-full py-3 rounded-lg text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: "#1B4332" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2D6A4F")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1B4332")}
          >
            🌲 Back to Clips
          </button>
        </div>
      </div>
    </div>
  );
}
