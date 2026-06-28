import { useState, useCallback } from "react";

type TrailManifestoProps = {
  viewerId: string;
};

const STORAGE_KEY_PREFIX = "trail_manifesto_dismissed_";

export default function TrailManifesto({ viewerId }: TrailManifestoProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${viewerId}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(false);

  const handleSwatAway = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // non-critical
    }
  }, [storageKey]);

  const handleReRead = useCallback(() => {
    setExpanded(true);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
  }, []);

  // After swat-away: show re-read button
  if (dismissed && !expanded) {
    return (
      <button
        onClick={handleReRead}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-md hover:brightness-125"
        style={{ backgroundColor: "#1B4332" }}
      >
        🔦 Welcome to the Trail — Weeks 2 through 4
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden mb-2">
      {/* Header */}
      <div
        className="px-5 py-4 text-center"
        style={{ backgroundColor: "#1B4332" }}
      >
        <h2 className="text-lg font-bold text-white">
          🔦 Welcome to the Trail — Weeks 2 through 4
        </h2>
        <p className="text-sm text-emerald-200 mt-1">
          You made it through Week 1. The gear is packed, the map is in hand, and now it's time to hit the trail. 🥾
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          Starting this week, your daily learning experience gets more interactive. Alongside your Google Slides and reading materials, you'll be using three tools that work together to build real fluency — not just familiarity:
        </p>

        {/* cAMP Clips */}
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">🌲🍿</span>
          <div>
            <p className="font-semibold text-gray-900">cAMP Clips</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Daily video clips from Amplitude experts, built for your onboarding. At key moments, 🪧 Trail Markers pop up to check your understanding. Your engagement score factors in markers, focus time, and watch time — drop below 80% and 🚁 Search & Rescue gives you a second shot. Still short? ⛈️ Weather the Storm adds a study break before the next clip unlocks. After each clip, your 📋 Ranger Report shows engagement, Trail Marker results, and XP earned.
            </p>
          </div>
        </div>

        {/* cAMP Quizzes */}
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">🧠</span>
          <div>
            <p className="font-semibold text-gray-900">cAMP Quizzes</p>
            <p className="text-xs text-gray-600 mt-0.5">
              After completing each day's clips and materials, take the daily quiz. 10 questions, 18 minutes, 80% to pass. This is your knowledge check — not a gotcha, but a signal. If something's not landing, now's the time to find out.
            </p>
          </div>
        </div>

        {/* Wheel & Deal */}
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">🎡</span>
          <div>
            <p className="font-semibold text-gray-900">Wheel & Deal</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Your product fluency warm-up. Spin the wheel, get a challenge, practice out loud. You'll see it woven throughout the weeks as prep for cAMP 201. Don't sleep on the reps.
            </p>
          </div>
        </div>

        {/* How I'll track */}
        <div className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200/60 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">📊</span>
          <div>
            <p className="font-semibold text-gray-900">How I'll track your progress</p>
            <p className="text-xs text-gray-600 mt-0.5">
              I can see everything — engagement scores, Trail Marker results, quiz performance, XP, and pacing across all 17 clips. My goal isn't to catch you slipping — it's to make sure no one falls behind without a hand to grab onto. If I notice you're off pace or struggling with a topic, I'll reach out. If you're flying through — I'll notice that too. 👀
            </p>
          </div>
        </div>

        {/* One rule */}
        <div className="flex items-start gap-3 rounded-lg bg-red-50/60 border border-red-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">🔥</span>
          <div>
            <p className="font-semibold text-gray-900">One rule</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Don't white-knuckle it alone. If a clip isn't loading, a quiz feels off, or something in the content just isn't clicking — Slack me directly. That's what I'm here for.
            </p>
          </div>
        </div>

        <p className="text-center font-semibold text-gray-900">
          Now lace up. The trail starts here. 🏕️
        </p>
      </div>

      {/* Swat Away button */}
      <div className="px-6 pb-5">
        <button
          onClick={dismissed ? handleClose : handleSwatAway}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#1B4332" }}
        >
          🦟 Swat Away
        </button>
      </div>
    </div>
  );
}
