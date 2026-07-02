import { useState, useCallback } from "react";

type ApproachManifestoProps = {
  viewerId: string;
};

const STORAGE_KEY_PREFIX = "approach_manifesto_dismissed_";

export default function ApproachManifesto({ viewerId }: ApproachManifestoProps) {
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
        🚡 Welcome to The Approach — Week 1
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
          🚡 Welcome to The Approach — Week 1
        </h2>
        <p className="text-sm text-emerald-200 mt-1">
          Your first week is all about building the foundation — before you ever press play on a clip. 🏗️
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          This week you'll complete four modules that give you the frameworks, product knowledge, and practice reps you need to hit the ground running. Here's what you'll be doing:
        </p>

        {/* MEDDPICC */}
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">🧱</span>
          <div>
            <p className="font-semibold text-gray-900">MEDDPICC</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Amplitude's qualification framework — the backbone of every deal. Complete the MindTickle course, upload your completion screenshot, then answer a reflection prompt and sign off.
            </p>
          </div>
        </div>

        {/* cAMP 101 */}
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">📦</span>
          <div>
            <p className="font-semibold text-gray-900">cAMP 101 — Amplitude Academy</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Four Academy courses covering Analytics, Experiment, Session Replay, and Guides & Surveys. Complete each course on academy.amplitude.com, then come back here and upload a screenshot of each completion. Once all four are uploaded, your cAMP 101 reflection and sign-off unlock.
            </p>
          </div>
        </div>

        {/* Challenger */}
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">⚔️</span>
          <div>
            <p className="font-semibold text-gray-900">Challenger Sale</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Read the assigned chapter, upload your completion screenshot, then write a commercial insight for a real account and sign off. Tip: have a target account and contact in mind before you start.
            </p>
          </div>
        </div>

        {/* Wheel & Deal */}
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">🎡</span>
          <div>
            <p className="font-semibold text-gray-900">Wheel & Deal</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Your first product fluency warm-up with your manager. Spin the wheel, get a challenge type, practice your pitch out loud. After the session, log your product, challenge, and score here. You'll see Wheel & Deal woven throughout the weeks as prep for cAMP 201.
            </p>
          </div>
        </div>

        {/* How to unlock clips */}
        <div className="flex items-start gap-3 rounded-lg bg-amber-50/60 border border-amber-200 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">🔓</span>
          <div>
            <p className="font-semibold text-gray-900">How to unlock cAMP Clips</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Complete all four modules above, then hit the "Begin The Ascent" button at the bottom. That unlocks The Ascent tab and your full clip library with Trail Markers, quizzes, and XP tracking.
            </p>
          </div>
        </div>

        {/* Screenshots reminder */}
        <div className="flex items-start gap-3 rounded-lg bg-blue-50/60 border border-blue-200 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">📸</span>
          <div>
            <p className="font-semibold text-gray-900">Screenshot reminder</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Before closing out of MindTickle, Academy, or your Challenger reading — take a screenshot of the completion screen. You'll need to upload it here as proof of completion before the reflection and sign-off fields unlock.
            </p>
          </div>
        </div>

        {/* Suggested pacing */}
        <div className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200/60 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">📅</span>
          <div>
            <p className="font-semibold text-gray-900">Suggested pace (5 weekdays)</p>
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              <p><strong>Day 1:</strong> MEDDPICC + Analytics Academy (~2 hrs)</p>
              <p><strong>Day 2:</strong> Experiment + Session Replay Academy + start Challenger reading (~2 hrs)</p>
              <p><strong>Day 3:</strong> Guides & Surveys Academy + continue Challenger (~1.5 hrs)</p>
              <p><strong>Day 4:</strong> Finish Challenger + Challenger sign-off (~1 hr)</p>
              <p><strong>Day 5:</strong> Wheel & Deal with your manager (~15 min) → 🧗 Begin The Ascent!</p>
            </div>
          </div>
        </div>

        {/* Tracking */}
        <div className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200/60 px-4 py-3">
          <span className="text-lg mt-0.5 shrink-0">📊</span>
          <div>
            <p className="font-semibold text-gray-900">How I'll track your progress</p>
            <p className="text-xs text-gray-600 mt-0.5">
              I can see your module sign-offs, Academy screenshots, Wheel & Deal scores, and whether you've unlocked The Ascent. If you're stuck or falling behind, I'll reach out. If you're cruising — I'll notice that too. 👀
            </p>
          </div>
        </div>

        <p className="text-center font-semibold text-gray-900">
          Gear up. The Approach starts now. 🚡
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
