import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type CheckinType = "approach" | "week2" | "week3" | "summit";

interface LearnerCheckinModalProps {
  viewerId: string;
  checkinType: CheckinType;
  onClose: () => void;
  /** Called after "Mark as Sent" succeeds — parent can unlock next content */
  onSent?: () => void;
}

/* ── Emojis match Library WEEK_META headers ── */
const CHECKIN_LABELS: Record<CheckinType, { title: string; emoji: string; description: string; gradient: string }> = {
  approach: {
    title: "The Approach Check-In",
    emoji: "🚡",
    description: "Week 1 wrap-up — share your progress with your manager",
    gradient: "from-amber-600 to-orange-600",
  },
  week2: {
    title: "Week 2 Check-In",
    emoji: "🥾",
    description: "Mid-Ascent update — let your manager know how you're doing",
    gradient: "from-indigo-600 to-purple-600",
  },
  week3: {
    title: "Week 3 Check-In",
    emoji: "🏞️",
    description: "Summit push — you're almost there!",
    gradient: "from-emerald-600 to-teal-600",
  },
  summit: {
    title: "Summit Celebration",
    emoji: "🧗🏻‍♂️",
    description: "You made it! Share the big news with your manager",
    gradient: "from-amber-500 to-yellow-500",
  },
};

const REFLECTION_PROMPTS: Record<CheckinType, string> = {
  approach: "What's one thing you learned during The Approach that you're excited to apply?",
  week2: "What's been the most valuable concept so far, and how are you using it?",
  week3: "What are you most confident about going into the final stretch?",
  summit: "Looking back at your entire Ascent, what's the #1 thing that will change how you sell?",
};

/** 10 randomised JT closing quotes for summit — [NAME] is replaced with first name */
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

const JT_EMAIL = "jt.bohland@amplitude.com";

/** Helper: extract first name from a full name or email */
function firstName(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "";
  // If it looks like an email, take part before @, then capitalize first letter
  if (nameOrEmail.includes("@")) {
    const local = nameOrEmail.split("@")[0];
    // Try splitting on . to get first name
    const parts = local.split(".");
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return nameOrEmail.split(" ")[0];
}

/** Step indicator for the multi-step flow */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current ? "bg-white w-6" : i === current ? "bg-white/80 w-6" : "bg-white/30 w-4"
          }`}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MANAGER KEY — appended to every check-in email
   ════════════════════════════════════════════════════════════════════════ */
const MANAGER_KEY = `
---
📖 Quick Reference for Managers:

• 🥾 Trail Markers — pop-up knowledge checks during each video clip (correct answers out of total)
• 📝 cAMP Quiz — end-of-day assessment after completing all materials (10 questions, 80% to pass)
• 🎯 Engagement Score — overall session quality (25% Trail Markers + 30% focus + 45% watch time)
• 🏅 XP — experience points earned through clips, quizzes, badges, and bonus activities
• 🔦 Search & Rescue — a second chance when engagement drops below 80%
• ⛈️ Weather the Storm — a mandatory study break when engagement is critically low
• 🧗 Pacing — tracks whether they're on schedule to finish by Summit Day
`;

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
function LearnerCheckinModalInner({ viewerId, checkinType, onClose, onSent }: LearnerCheckinModalProps) {
  const label = CHECKIN_LABELS[checkinType];
  const isSummit = checkinType === "summit";

  // Summit uses 4 steps: celebrate → stats → reflect → email
  // Others use 3 steps: stats → reflect → email
  type SummitStep = "celebrate" | "stats" | "reflect" | "email";
  type RegularStep = "stats" | "reflect" | "email";
  const [step, setStep] = useState<SummitStep | RegularStep>(isSummit ? "celebrate" : "stats");
  const [reflection, setReflection] = useState("");
  const [gmailOpened, setGmailOpened] = useState(false);
  const [sent, setSent] = useState(false);

  const { data, loading, isError, error } = useApiData(
    "GetCheckinEmailData",
    { viewerId, checkinType },
    { enabled: true }
  );

  const { run: markSent, loading: marking } = useApi("MarkCheckinSent");

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Fire confetti for summit on mount
  useEffect(() => {
    if (!isSummit) return;
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [isSummit]);

  // JT quote (stable per render)
  const jtQuote = useMemo(() => {
    if (!isSummit || !data?.viewer) return "";
    const fn = firstName(data.viewer.name);
    const idx = Math.floor(Math.random() * JT_QUOTES.length);
    return JT_QUOTES[idx].replace(/\[NAME\]/g, fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSummit, data?.viewer?.name]);

  // Build the Gmail compose URL
  const gmailUrl = useMemo(() => {
    if (!data?.viewer) return "";
    const v = data.viewer;
    const qs = data.quizStats;
    const fn = firstName(v.name);
    const managerFirst = firstName(v.managerName ?? v.managerEmail);
    const buddyFirst = firstName(v.belayBuddyName ?? v.belayBuddyEmail);

    // Subject line — emojis match Library week headers
    const subject = checkinType === "summit"
      ? `🧗🏻‍♂️ ${v.name} — Summit Reached!`
      : checkinType === "approach"
        ? `🚡 ${v.name} — Approach Check-In`
        : checkinType === "week2"
          ? `🥾 ${v.name} — Week 2 Check-In`
          : `🏞️ ${v.name} — Week 3 Check-In`;

    // Greeting — "Hi Jordan & Alex" (first names only)
    const greeting = buddyFirst
      ? `Hi ${managerFirst} & ${buddyFirst},`
      : `Hi ${managerFirst},`;

    let body = `${greeting}\n\n`;

    // ── APPROACH ──
    if (checkinType === "approach") {
      body += `I just completed The Approach — the first phase of cAMP Ascent! Here's my summary:\n\n`;
      body += `📊 Stats:\n`;
      body += `  • XP: ${v.totalXp}\n`;
      body += `  • Tier: ${v.tier}\n`;
      if (qs.totalAttempts > 0) {
        body += `\n📝 cAMP Quiz:\n`;
        body += `  • Passed: ${qs.quizzesPassed}/${qs.totalQuizzes}\n`;
        body += `  • Avg Score: ${qs.avgScorePct}%\n`;
        body += `  • 1st Pass Rate: ${qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}%\n`;
        body += `  • Retakes: ${qs.retakes}\n`;
      }
      if (data.moduleReflections?.length > 0) {
        body += `\n📘 Module Reflections:\n`;
        data.moduleReflections.forEach((r: any) => {
          body += `  • ${r.moduleKey}: "${r.reflectionResponse}"\n`;
        });
      }
      if (data.wdVerification) {
        body += `\n🎯 Wheel & Deal:\n`;
        body += `  • Product: ${data.wdVerification.product}\n`;
        body += `  • Scenario: ${data.wdVerification.scenario}\n`;
        body += `  • Score: ${data.wdVerification.score}%\n`;
      }

    // ── SUMMIT ──
    } else if (checkinType === "summit") {
      body += `I completed all 17 cAMP Clips and reached the Summit! 🏔️✨\n\n`;

      body += `--- Overall Summit Summary ---\n\n`;
      body += `🎬 Clips:\n`;
      body += `  • Completed: ${data.clipStats.completedSessions}/${data.clipStats.totalSessions}\n`;
      body += `  • Avg Clip Score: ${data.clipStats.avgScore}%\n`;
      body += `\n📊 Final Stats:\n`;
      body += `  • XP: ${v.totalXp}\n`;
      body += `  • Tier: ${v.tier}\n`;
      body += `  • 🏆 Leaderboard: #${data.leaderboard.rank} of ${data.leaderboard.totalLearners} cAMPers (cumulative XP, all cohorts)\n`;
      body += `\n🔥 Engagement:\n`;
      body += `  • 🥾 Trail Markers: ${data.engagement.avgQuestionScore}%\n`;
      body += `  • 👀 Focus: ${data.engagement.avgFocusScore}%\n`;
      body += `  • ⏱️ Watch Time: ${data.engagement.avgTimeScore}%\n`;
      body += `  • 🎯 Overall: ${data.engagement.overallEngagement}%\n`;
      if (qs.totalAttempts > 0) {
        body += `\n📝 cAMP Quiz (All 15 Days):\n`;
        body += `  • Passed: ${qs.quizzesPassed}/${qs.totalQuizzes}\n`;
        body += `  • Avg Score: ${qs.avgScorePct}%\n`;
        body += `  • 1st Pass Rate: ${qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}%\n`;
        body += `  • Retakes: ${qs.retakes}\n`;
      }

      body += `\n--- Week 4 Performance ---\n\n`;
      body += `I pushed through the final stretch of Ascent, completing the remaining clips and reaching the Summit.\n`;
      body += `  • Final Tier: ${v.tier}\n`;
      body += `  • Total XP Earned: ${v.totalXp}\n`;

    // ── WEEK 2 / WEEK 3 ──
    } else {
      const weekLabel = checkinType === "week2" ? "Week 2" : "Week 3";
      body += `Here's my ${weekLabel} cAMP Ascent update:\n\n`;
      body += `🎬 Clips:\n`;
      body += `  • Completed: ${data.clipStats.completedSessions}/${data.clipStats.totalSessions}\n`;
      body += `  • Avg Clip Score: ${data.clipStats.avgScore}%\n`;
      body += `\n📊 Stats:\n`;
      body += `  • XP: ${v.totalXp}\n`;
      body += `  • Tier: ${v.tier}\n`;
      body += `  • 🏆 Leaderboard: #${data.leaderboard.rank} of ${data.leaderboard.totalLearners} cAMPers (cumulative XP, all cohorts)\n`;
      body += `\n🔥 Engagement:\n`;
      body += `  • 🥾 Trail Markers: ${data.engagement.avgQuestionScore}%\n`;
      body += `  • 👀 Focus: ${data.engagement.avgFocusScore}%\n`;
      body += `  • ⏱️ Watch Time: ${data.engagement.avgTimeScore}%\n`;
      body += `  • 🎯 Overall: ${data.engagement.overallEngagement}%\n`;
      if (qs.totalAttempts > 0) {
        body += `\n📝 cAMP Quiz:\n`;
        body += `  • Quizzes Completed: ${qs.quizzesPassed}/${qs.totalQuizzes}\n`;
        body += `  • Avg Score: ${qs.avgScorePct}%\n`;
        body += `  • 1st Pass Rate: ${qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}%\n`;
        body += `  • Retakes: ${qs.retakes}\n`;
      }
    }

    // ── REFLECTION ──
    if (reflection.trim()) {
      body += `\n💭 My reflection:\n"${reflection.trim()}"\n`;
    }

    // ── LAST ACTIVITY ──
    if (v.lastLoginAt || v.lastActivityAt) {
      const dateStr = new Date(v.lastLoginAt ?? v.lastActivityAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      body += `\n📅 Last Activity: ${dateStr}\n`;
    }

    // ── MANAGER KEY ──
    body += MANAGER_KEY;

    // ── FEEDBACK SURVEY LINK — uses token generated at send time ──
    body += `\n📋 Manager Feedback Survey (Required — only JT sees responses):\n`;
    body += `[Feedback link will be included when email is sent]\n`;

    body += `\nThanks!\n${fn}`;

    // Gmail compose params
    const to = [v.managerEmail, v.belayBuddyEmail].filter(Boolean).join(",");
    const cc = JT_EMAIL;
    const params = new URLSearchParams({
      to,
      cc,
      su: subject,
      body,
    });

    return `https://mail.google.com/mail/?view=cm&${params.toString()}`;
  }, [data, checkinType, reflection]);

  const handleOpenGmail = useCallback(() => {
    if (gmailUrl) {
      window.open(gmailUrl, "_blank");
      setGmailOpened(true);
    }
  }, [gmailUrl]);

  const handleMarkSent = useCallback(async () => {
    if (!data?.viewer) return;

    const feedbackToken = crypto.randomUUID();
    try {
      const result = await markSent({
        viewerId,
        checkinType,
        managerEmail: data.viewer.managerEmail,
        belayBuddyEmail: data.viewer.belayBuddyEmail,
        feedbackToken,
        learnerReflection: reflection.trim() || null,
      });

      if (result?.alreadySent) {
        toast.info("This check-in was already marked as sent.");
      } else {
        toast.success(`${label.title} sent! 🎉`, {
          style: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
        });
      }
      setSent(true);
      onSent?.();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      toast.error("Error: " + message);
    }
  }, [data, viewerId, checkinType, markSent, reflection, label.title, onSent]);

  // Step calculations — summit celebrate is its own full-screen view (not numbered)
  const checkinStepIndex = step === "stats" ? 0 : step === "reflect" ? 1 : 2;
  const checkinStepLabel = step === "stats"
    ? "Step 1 of 3 — Review your stats"
    : step === "reflect"
      ? "Step 2 of 3 — Share a reflection"
      : "Step 3 of 3 — Send to your manager";

  /* ── SUMMIT GRAND FINALE — its own standalone view, no check-in framing ── */
  if (isSummit && step === "celebrate") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-2xl mx-4 max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
          {/* Full-bleed celebration — no gradient check-in header */}
          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="p-8 space-y-3">
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-24 bg-gray-100 rounded animate-pulse" />
              </div>
            )}
            {data && !loading && (
              <SummitCelebrateView data={data} jtQuote={jtQuote} />
            )}
          </div>

          {/* Grand Finale footer — single CTA to continue into check-in */}
          {data && !loading && (
            <div className="px-8 pb-8 pt-2 shrink-0">
              <button
                onClick={() => setStep("stats")}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg"
              >
                📧 Continue to Summit Check-In →
              </button>
              <p className="text-xs text-center text-gray-400 mt-2">
                Review your stats, write a reflection, and send your Summit email
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── REGULAR CHECK-IN FLOW (all types including summit post-celebrate) ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${label.gradient} px-6 py-4 shrink-0`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-lg font-bold text-white flex items-center gap-2">
              <span>{label.emoji}</span> {label.title}
            </p>
            {sent && (
              <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none px-2">
                &#10005;
              </button>
            )}
          </div>
          <p className="text-sm text-white/80">{label.description}</p>
          <div className="mt-3">
            <StepIndicator current={checkinStepIndex} total={3} />
            <p className="text-[11px] text-white/60 mt-1">{checkinStepLabel}</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {loading && (
            <div className="space-y-3">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
            </div>
          )}

          {isError && (
            <div className="text-center py-6">
              <p className="text-sm text-red-600">Failed to load data: {error?.message ?? "Unknown error"}</p>
            </div>
          )}

          {data && !loading && step === "stats" && (
            <StatsView data={data} checkinType={checkinType} />
          )}

          {data && !loading && step === "reflect" && (
            <ReflectView
              prompt={REFLECTION_PROMPTS[checkinType]}
              value={reflection}
              onChange={setReflection}
            />
          )}

          {data && !loading && step === "email" && (
            <EmailView
              data={data}
              checkinType={checkinType}
              reflection={reflection}
              gmailOpened={gmailOpened}
              sent={sent}
              onOpenGmail={handleOpenGmail}
              onMarkSent={handleMarkSent}
              marking={marking}
            />
          )}
        </div>

        {/* Footer navigation */}
        {!sent && data && !loading && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
            <div>
              {step !== "stats" && (
                <button
                  onClick={() => {
                    if (step === "email") setStep("reflect");
                    else if (step === "reflect") setStep("stats");
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ← Back
                </button>
              )}
              {step === "stats" && isSummit && (
                <button
                  onClick={() => setStep("celebrate")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ← Back to Celebration
                </button>
              )}
            </div>
            <div>
              {step === "stats" && (
                <button
                  onClick={() => setStep("reflect")}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Next: Reflection →
                </button>
              )}
              {step === "reflect" && (
                <button
                  onClick={() => setStep("email")}
                  disabled={!reflection.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next: Email Preview →
                </button>
              )}
            </div>
          </div>
        )}

        {sent && (
          <div className="px-6 py-4 border-t border-gray-200 bg-emerald-50 shrink-0 text-center">
            <p className="text-sm font-semibold text-emerald-700">✅ Check-in sent! You're all set.</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SUMMIT CELEBRATE VIEW (replaces old SummitModal)
   ════════════════════════════════════════════════════════════════════════ */
function SummitCelebrateView({ data, jtQuote }: { data: any; jtQuote: string }) {
  const v = data.viewer;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="text-center">
        <div className="text-5xl mb-3">🏔️ ✨</div>
        <h2 className="text-2xl font-bold text-gray-900">Summit Reached — Ascent Complete!</h2>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-lg mx-auto">
          You've completed all 17 cAMP Clips and conquered your Ascent. The trail behind you is proof — you showed up, engaged, and earned it.
        </p>
      </div>

      {/* XP + Tier card */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-amber-700">{v.tier}</p>
          <p className="text-xs text-amber-500 mt-0.5">Your final tier</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-700">{Number(v.totalXp).toLocaleString()} XP</p>
          <p className="text-xs text-amber-500 mt-0.5">total earned</p>
        </div>
      </div>

      {/* What's next */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">What's next on your journey</h3>
        <div className="space-y-2">
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🧠</span>
              <div>
                <p className="text-sm font-bold text-gray-900">Complete your final cAMP Quiz</p>
                <p className="text-xs text-gray-500 mt-1">Your last content check is waiting — head to cAMP Quizzes to finish strong before cAMP 201.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🎡</span>
              <div>
                <p className="text-sm font-bold text-gray-900">Keep spinning — Wheel & Deal</p>
                <p className="text-xs text-gray-500 mt-1">cAMP 201 will ask you to pitch live. The reps you put in on Wheel & Deal are what make the difference.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🛫</span>
              <div>
                <p className="text-sm font-bold text-gray-900">See you at cAMP 201 in San Francisco!</p>
                <p className="text-xs text-gray-500 mt-1">Your in-person capstone — pods, live pitches, real deals, execs, and cross-functional partners.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JT closing quote */}
      {jtQuote && (
        <div className="rounded-xl border-l-4 border-indigo-400 bg-indigo-50/50 px-5 py-4">
          <p className="text-sm text-gray-600 italic leading-relaxed">{jtQuote}</p>
          <p className="text-xs text-gray-400 mt-2">— JT Bohland, Sr. Global Enablement Program Manager</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STATS VIEW (Step 1 for regular, Step 2 for summit)
   ════════════════════════════════════════════════════════════════════════ */
function StatsView({ data, checkinType }: { data: any; checkinType: CheckinType }) {
  return (
    <div className="space-y-4">
      {/* Viewer info */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Your XP:</span>{" "}
            <span className="font-bold text-indigo-600">{data.viewer.totalXp}</span>
          </div>
          <div>
            <span className="text-gray-500">Tier:</span>{" "}
            <span className="font-semibold text-gray-900">{data.viewer.tier}</span>
          </div>
          {checkinType !== "approach" && (
            <>
              <div>
                <span className="text-gray-500">Leaderboard:</span>{" "}
                <span className="font-bold text-amber-600">#{data.leaderboard.rank}/{data.leaderboard.totalLearners}</span>
              </div>
              <div>
                <span className="text-gray-500">Manager:</span>{" "}
                <span className="font-medium text-gray-700">{data.viewer.managerEmail ?? "—"}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clip Progress (non-approach) */}
      {checkinType !== "approach" && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">🎬 Clip Progress</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-600">
                {data.clipStats.completedSessions}/{data.clipStats.totalSessions}
              </p>
              <p className="text-xs text-gray-500">Clips Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.clipStats.avgScore}%</p>
              <p className="text-xs text-gray-500">Avg Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                #{data.leaderboard.rank}/{data.leaderboard.totalLearners}
              </p>
              <p className="text-xs text-gray-500">Leaderboard</p>
            </div>
          </div>
        </div>
      )}

      {/* cAMP Quiz Stats */}
      {data.quizStats.totalAttempts > 0 && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">📝 cAMP Quiz</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-indigo-600">
                {data.quizStats.quizzesPassed}/{data.quizStats.totalQuizzes}
              </p>
              <p className="text-xs text-gray-500">Passed</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.quizStats.avgScorePct}%</p>
              <p className="text-xs text-gray-500">Avg Score</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">
                {data.quizStats.quizzesPassed > 0
                  ? `${Math.round((data.quizStats.firstPassCount / data.quizStats.quizzesPassed) * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-gray-500">1st Pass %</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{data.quizStats.retakes}</p>
              <p className="text-xs text-gray-500">Retakes</p>
            </div>
          </div>
        </div>
      )}

      {/* Approach-specific: Module reflections */}
      {checkinType === "approach" && data.moduleReflections.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">📘 Module Reflections</h3>
          <div className="space-y-3">
            {data.moduleReflections.map((r: any, i: number) => (
              <div key={i} className="text-sm">
                <p className="font-medium text-gray-700">{r.reflectionPrompt}</p>
                <p className="text-gray-600 mt-1 bg-amber-50 rounded px-3 py-2 border border-amber-100">
                  {r.reflectionResponse}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approach-specific: W&D */}
      {checkinType === "approach" && data.wdVerification && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">🎯 Wheel & Deal</h3>
          <div className="text-sm text-gray-700">
            <span className="font-medium">{data.wdVerification.product}</span>
            {" — "}
            <span>{data.wdVerification.scenario}</span>
            {" — "}
            <span className="font-bold text-indigo-600">{data.wdVerification.score}%</span>
          </div>
        </div>
      )}

      {/* Engagement (non-approach) */}
      {checkinType !== "approach" && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">🔥 Engagement</h3>
          <div className="grid grid-cols-4 gap-3 text-center text-sm">
            <div>
              <p className="font-bold text-gray-900">{data.engagement.avgQuestionScore}%</p>
              <p className="text-xs text-gray-500">Trail Markers</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{data.engagement.avgFocusScore}%</p>
              <p className="text-xs text-gray-500">Focus</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{data.engagement.avgTimeScore}%</p>
              <p className="text-xs text-gray-500">Time</p>
            </div>
            <div>
              <p className="font-bold text-indigo-600">{data.engagement.overallEngagement}%</p>
              <p className="text-xs text-gray-500">Overall</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   REFLECT VIEW
   ════════════════════════════════════════════════════════════════════════ */
function ReflectView({ prompt, value, onChange }: { prompt: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm font-bold text-amber-800 mb-1">💭 Reflection</p>
        <p className="text-sm text-amber-700">{prompt}</p>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Share your thoughts... (this will be included in the email to your manager)"
        className="w-full h-32 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        maxLength={500}
      />
      <p className="text-xs text-gray-400 text-right">{value.length}/500</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   EMAIL VIEW — preview + send
   ════════════════════════════════════════════════════════════════════════ */
function EmailView({
  data,
  checkinType,
  reflection,
  gmailOpened,
  sent,
  onOpenGmail,
  onMarkSent,
  marking,
}: {
  data: any;
  checkinType: CheckinType;
  reflection: string;
  gmailOpened: boolean;
  sent: boolean;
  onOpenGmail: () => void;
  onMarkSent: () => void;
  marking: boolean;
}) {
  const v = data.viewer;
  const fn = firstName(v.name);
  const managerFirst = firstName(v.managerName ?? v.managerEmail);
  const buddyFirst = firstName(v.belayBuddyName ?? v.belayBuddyEmail);
  const qs = data.quizStats;

  const toDisplay = [v.managerEmail, v.belayBuddyEmail].filter(Boolean).join(", ");
  const subjectEmoji = checkinType === "summit" ? "🧗🏻‍♂️" : checkinType === "approach" ? "🚡" : checkinType === "week2" ? "🥾" : "🏞️";
  const subjectText = checkinType === "summit"
    ? `${v.name} — Summit Reached!`
    : checkinType === "approach"
      ? `${v.name} — Approach Check-In`
      : checkinType === "week2"
        ? `${v.name} — Week 2 Check-In`
        : `${v.name} — Week 3 Check-In`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Here's what your manager will receive. Click "Send via Gmail" to open a pre-filled draft.
      </p>

      {/* Email preview card */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div><span className="font-semibold text-gray-600">To:</span> {toDisplay || "—"}</div>
            <div><span className="font-semibold text-gray-600">CC:</span> {JT_EMAIL}</div>
            <div>
              <span className="font-semibold text-gray-600">Subject:</span>{" "}
              {subjectEmoji} {subjectText}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-700 space-y-2 max-h-64 overflow-y-auto">
          <p>Hi {buddyFirst ? `${managerFirst} & ${buddyFirst}` : managerFirst},</p>

          {checkinType === "approach" ? (
            <>
              <p>I just completed The Approach — the first phase of cAMP Ascent!</p>
              <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                <p className="font-semibold text-gray-800">📊 Stats:</p>
                <p>• XP: {v.totalXp}</p>
                <p>• Tier: {v.tier}</p>
              </div>
              {qs.totalAttempts > 0 && (
                <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                  <p className="font-semibold text-gray-800">📝 cAMP Quiz:</p>
                  <p>• Passed: {qs.quizzesPassed}/{qs.totalQuizzes}</p>
                  <p>• Avg Score: {qs.avgScorePct}%</p>
                  <p>• 1st Pass Rate: {qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}%</p>
                </div>
              )}
            </>
          ) : checkinType === "summit" ? (
            <>
              <p>I completed all 17 cAMP Clips and reached the Summit! 🏔️✨</p>
              <div className="pl-3 border-l-2 border-amber-200 space-y-1 bg-amber-50/50 rounded py-1">
                <p className="font-semibold text-gray-800">🏔️ Overall Summit Summary:</p>
                <p>• Clips: {data.clipStats.completedSessions}/{data.clipStats.totalSessions} completed</p>
                <p>• XP: {v.totalXp} · Tier: {v.tier}</p>
                <p>• 🏆 Leaderboard: #{data.leaderboard.rank} of {data.leaderboard.totalLearners} cAMPers</p>
              </div>
              <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                <p className="font-semibold text-gray-800">🔥 Engagement:</p>
                <p>• 🥾 Trail Markers: {data.engagement.avgQuestionScore}%</p>
                <p>• 👀 Focus: {data.engagement.avgFocusScore}%</p>
                <p>• ⏱️ Watch Time: {data.engagement.avgTimeScore}%</p>
                <p>• 🎯 Overall: {data.engagement.overallEngagement}%</p>
              </div>
              {qs.totalAttempts > 0 && (
                <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                  <p className="font-semibold text-gray-800">📝 cAMP Quiz (All 15 Days):</p>
                  <p>• Passed: {qs.quizzesPassed}/{qs.totalQuizzes} · Avg: {qs.avgScorePct}%</p>
                  <p>• 1st Pass Rate: {qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}%</p>
                </div>
              )}
              <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                <p className="font-semibold text-gray-800">🗓️ Week 4 Performance:</p>
                <p>• Final Tier: {v.tier}</p>
                <p>• Total XP: {v.totalXp}</p>
              </div>
            </>
          ) : (
            <>
              <p>Here's my {checkinType === "week2" ? "Week 2" : "Week 3"} cAMP Ascent update:</p>
              <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                <p className="font-semibold text-gray-800">🎬 Clips:</p>
                <p>• {data.clipStats.completedSessions}/{data.clipStats.totalSessions} completed · Avg Score: {data.clipStats.avgScore}%</p>
              </div>
              <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                <p className="font-semibold text-gray-800">📊 Stats:</p>
                <p>• XP: {v.totalXp} · Tier: {v.tier}</p>
                <p>• 🏆 Leaderboard: #{data.leaderboard.rank} of {data.leaderboard.totalLearners} cAMPers</p>
              </div>
              <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                <p className="font-semibold text-gray-800">🔥 Engagement:</p>
                <p>• 🥾 Trail Markers: {data.engagement.avgQuestionScore}%</p>
                <p>• 👀 Focus: {data.engagement.avgFocusScore}%</p>
                <p>• ⏱️ Watch Time: {data.engagement.avgTimeScore}%</p>
                <p>• 🎯 Overall: {data.engagement.overallEngagement}%</p>
              </div>
              {qs.totalAttempts > 0 && (
                <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                  <p className="font-semibold text-gray-800">📝 cAMP Quiz:</p>
                  <p>• Passed: {qs.quizzesPassed}/{qs.totalQuizzes} · Avg: {qs.avgScorePct}%</p>
                  <p>• 1st Pass Rate: {qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}%</p>
                </div>
              )}
            </>
          )}

          {reflection.trim() && (
            <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100">
              <p className="font-medium text-amber-800 text-xs mb-1">💭 My reflection:</p>
              <p className="text-gray-700 italic">"{reflection.trim()}"</p>
            </div>
          )}

          {/* Manager Key preview */}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="font-semibold text-gray-600 text-xs">📖 Quick Reference for Managers</p>
            <p className="text-[11px] text-gray-400 mt-1">Trail Markers · cAMP Quiz · Engagement Score · XP · S&R · WtS · Pacing</p>
          </div>

          <p className="text-gray-500 text-xs mt-2">📋 Manager Feedback Survey link included (Required — only JT sees responses)</p>
        </div>
      </div>

      {/* Action buttons */}
      {!sent && (
        <div className="space-y-2">
          <button
            onClick={onOpenGmail}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${
              gmailOpened
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {gmailOpened ? "✅ Gmail opened — send the email, then come back" : "✉️ Send via Gmail"}
          </button>

          {gmailOpened && (
            <button
              onClick={onMarkSent}
              disabled={marking}
              className="w-full py-3 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {marking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Marking…
                </span>
              ) : (
                "✅ I sent it — Mark as Sent"
              )}
            </button>
          )}

          {!gmailOpened && (
            <p className="text-xs text-center text-gray-400">
              This opens Gmail with your email pre-filled. After sending, come back to mark it as sent.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const LearnerCheckinModal = memo(LearnerCheckinModalInner);
export default LearnerCheckinModal;
