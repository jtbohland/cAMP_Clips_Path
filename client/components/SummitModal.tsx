import { useState, useEffect, useCallback, useMemo } from "react";
import confetti from "canvas-confetti";

/**
 * 10 randomised JT closing quotes — [NAME] is replaced with the learner's first name.
 */
const JT_QUOTES = [
  "[NAME], you didn't just climb Ascent — you crushed the whole mountain. 🏔️🔥 Now take that trail-tested confidence into the field, and get ready to reach even higher at cAMP 201.",
  "Summit reached, [NAME]! 🎉⛺ You packed the reps, powered through the climb, and now you're ready to put those skills to work where it counts most — with customers.",
  "[NAME], from Base Camp to the summit, you showed real climbing grit. 🥾💪 Can't wait to see you bring that energy to the field and hit new heights at cAMP 201.",
  "You made it, [NAME]! 🌄🚀 The trail was real, the climb was steep, and you earned every step. Now let's put those new skills to work and keep ascending in SF.",
  "[NAME], you've officially planted your flag at the summit. 🚩🏔️ That means it's time to take everything you learned on the trail and put it into action in the field.",
  "Base Camp is behind you. The summit is yours. ⛰️👏 [NAME], I'm so proud of the climb you made — and I can't wait to see you keep climbing at cAMP 201.",
  "[NAME], this wasn't just a hike — it was a full-on ascent. 🌲🥾 You've built the muscle, the mindset, and the product fluency. Now go use it in the field and show what you've got.",
  "Trail complete. Summit secured. Legend status unlocked. 🏕️✨ [NAME], you're ready to take these skills out of training mode and into real conversations with customers.",
  "[NAME], you climbed with purpose, stayed on pace, and made it all the way to the top. 🧗‍♂️🎯 Now let's see you carry that momentum into cAMP 201 and reach even bigger peaks.",
  "The view from the top looks good on you, [NAME]. 😎🏔️ You've done the work, earned the altitude, and built skills that will show up in the field — and at new heights in SF.",
] as const;

type SummitModalProps = {
  learnerName: string;
  totalXp: number;
  tierName: string;
  tierEmoji: string;
  managerName: string | null;
  onDismiss: () => void;
};

export default function SummitModal({
  learnerName,
  totalXp,
  tierName,
  tierEmoji,
  managerName,
  onDismiss,
}: SummitModalProps) {
  const [copied, setCopied] = useState(false);

  // Pick a random JT quote (stable for the lifetime of this render)
  const firstName = learnerName.split(" ")[0];
  const jtQuote = useMemo(() => {
    const idx = Math.floor(Math.random() * JT_QUOTES.length);
    return JT_QUOTES[idx].replace(/\[NAME\]/g, firstName);
  }, [firstName]);

  // Build dynamic Slack message
  const slackMessage = `🏔️✨ Summit Reached! I just completed cAMP Ascent: Sales with ${totalXp.toLocaleString()} XP and achieved ${tierName} tier. Clips done, trail markers answered, and ready for cAMP 201. See you in SF! 🌲`;

  // Build the manager label for the inline toast
  const managerLabel = managerName ? managerName : "your manager";

  // Fire confetti on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"],
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

  const handleCopySlack = useCallback(() => {
    navigator.clipboard.writeText(slackMessage).then(() => {
      setCopied(true);
    });
  }, [slackMessage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="text-5xl mb-3">🏔️ ✨</div>
          <h2 className="text-2xl font-bold text-gray-900">
            Summit Reached — Ascent Complete!
          </h2>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-lg mx-auto">
            You've completed all 17 cAMP Clips and conquered your Ascent. The
            trail behind you is proof — you showed up, engaged, and earned it.
          </p>
        </div>

        {/* Divider */}
        <div className="mx-8 border-t border-gray-200" />

        {/* XP + Tier card */}
        <div className="px-8 pt-5 pb-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-amber-700">
                {tierEmoji} {tierName}
              </p>
              <p className="text-xs text-amber-500 mt-0.5">Your final tier</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-700">
                {totalXp.toLocaleString()} XP
              </p>
              <p className="text-xs text-amber-500 mt-0.5">total earned</p>
            </div>
          </div>
        </div>

        {/* What's next */}
        <div className="px-8 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            What's next on your journey
          </h3>
          <div className="space-y-2">
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">🧠</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Complete your final cAMP Quiz
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Your last content check is waiting — head to cAMP Quizzes to
                    finish strong before cAMP 201.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">🎡</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Keep spinning — Wheel & Deal
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    cAMP 201 will ask you to pitch live. The reps you put in on
                    Wheel & Deal are what make the difference.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">🛫</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    See you at cAMP 201 in San Francisco!
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Your in-person capstone — pods, live pitches, real deals,
                    execs, and cross-functional partners. Everything from Ascent
                    comes alive here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share your summit */}
        <div className="px-8 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            📣 Share your summit
          </h3>

          {/* Pre-written Slack message */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 mb-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              {slackMessage}
            </p>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopySlack}
            className="w-full py-3 rounded-lg text-sm font-bold bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            📋 Copy Slack Message
          </button>

          {/* Inline toast — light green, shown after copy */}
          {copied && (
            <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-center">
              <p className="text-sm text-green-700">
                ✅ Copied! DM this to {managerLabel} + JT Bohland in Slack
              </p>
            </div>
          )}
        </div>

        {/* JT closing quote */}
        <div className="px-8 pb-4">
          <div className="rounded-xl border-l-4 border-indigo-400 bg-indigo-50/50 px-5 py-4">
            <p className="text-sm text-gray-600 italic leading-relaxed">
              {jtQuote}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              — JT Bohland, Sr. Global Enablement Program Manager
            </p>
          </div>
        </div>

        {/* Back to cAMP Clips button — locked until they copy the Slack message */}
        <div className="px-8 pb-8 pt-2">
          <button
            onClick={onDismiss}
            disabled={!copied}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${
              copied
                ? "bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                : "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {copied ? "🎞️ Back to cAMP Clips" : "🔒 Copy Slack message to unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
