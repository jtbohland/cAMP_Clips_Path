/** Collapsible glossary for SMEs unfamiliar with cAMP terminology */
import { useState } from "react";

const GLOSSARY = [
  { term: "Clips", emoji: "🎬", desc: "Short training videos (9–60 min) that new hires watch as part of their learning path." },
  { term: "Trail Markers", emoji: "🥾", desc: "Pop-up knowledge-check questions that appear during a clip to keep learners engaged and verify comprehension in real time." },
  { term: "S&R (Search & Rescue)", emoji: "🔦", desc: "A follow-up quiz triggered when a learner's overall engagement score falls below the required threshold. They must pass to continue." },
  { term: "WtS (Weather the Storm)", emoji: "⛈️", desc: "A required reading activity assigned when a learner shows concerning engagement or lack of focus. It reinforces key concepts before they can move on." },
  { term: "cAMP Gear", emoji: "🎒", desc: "Linked resources attached to each topic — slides, docs, tools, videos, and other materials new hires reference during and after training." },
  { term: "Engagement Score", emoji: "📊", desc: "A composite score measuring how actively a learner watched a clip: questions answered (25%), focus/attention (30%), and time on task (45%)." },
  { term: "Ranger Report", emoji: "📋", desc: "A post-clip summary showing the learner's scores, missed trail markers, XP earned, and linked resources — their personal performance review for that session." },
];

export default function GlossarySection() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {/* About section */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-800 mb-1.5">🏔️ What is cAMP Ascent?</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          cAMP Ascent is Amplitude's interactive onboarding program for new GTM hires and internal promotions.
          It's organized into <strong>3 role-based learning paths</strong> (AE/PSM/Renewals, SDR, and Promotions),
          each with video-based training days, built-in engagement checks, and linked resources.
          Every new AE, SDR, PSM, Renewals rep, and internal promotion goes through Ascent in their first 4 weeks.
        </p>
      </div>

      {/* Collapsible glossary */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
        📖 Know the Lingo — cAMP Terminology
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-base flex-shrink-0 mt-0.5">{g.emoji}</span>
              <div>
                <span className="text-xs font-bold text-gray-800">{g.term}</span>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
