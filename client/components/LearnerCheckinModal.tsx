import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { countWeekdays, getPacingTier, getSummitDay, PACING_TIERS, type PacingTier } from "@/lib/pacing.js";

type CheckinType = "approach" | "week2" | "week3" | "summit";

interface LearnerCheckinModalProps {
  viewerId: string;
  checkinType: CheckinType;
  onClose: () => void;
  /** Called after "Mark as Sent" succeeds — parent can unlock next content */
  onSent?: () => void;
  /** When true, always show the X close button (admin/test mode) */
  allowClose?: boolean;
  /** Admin override: force approach status to complete (true) or incomplete (false) for testing */
  approachCompleteOverride?: boolean;
}

/* ── Emojis match Library WEEK_META headers ── */
const CHECKIN_LABELS: Record<CheckinType, { title: string; emoji: string; description: string; gradient: string }> = {
  approach: {
    title: "The Approach: Anchor Point",
    emoji: "🚡",
    description: "Week 1 wrap-up — share your progress with your manager",
    gradient: "from-amber-600 to-orange-600",
  },
  week2: {
    title: "Week 2: Anchor Point",
    emoji: "🥾",
    description: "Mid-Ascent update — let your manager know how you're doing",
    gradient: "from-indigo-600 to-purple-600",
  },
  week3: {
    title: "Week 3: Anchor Point",
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
• 🚁 Search & Rescue — a second chance when engagement drops below 80%
• ⛈️ Weather the Storm — a mandatory study break when engagement is critically low
• 🧗 Pacing — tracks whether they're on schedule to finish by Summit Day
  - Summit Bound = on pace · Off the Trail = 1-2 days behind · Lost in the Woods = 3-5 days behind
  - Rockslide = 6-9 days behind · Avalanche Warning = 10+ days behind · Anchor Failure = past Summit Day
`;

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
function LearnerCheckinModalInner({ viewerId, checkinType, onClose, onSent, allowClose, approachCompleteOverride }: LearnerCheckinModalProps) {
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

  // Generate feedback token once, so it can be included in the Gmail URL
  const feedbackToken = useMemo(() => crypto.randomUUID(), []);

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
    const v = data.viewer as any;
    const qs = data.quizStats;
    const fn = firstName(v.name);
    const managerFirst = firstName(v.managerName ?? v.managerEmail);
    const buddyFirst = firstName(v.belayBuddyName ?? v.belayBuddyEmail);

    // Derive approach complete — admin override takes precedence
    const approachComplete = approachCompleteOverride ?? data.approachStatus?.complete ?? true;

    // Pacing context — shared across all templates
    const startDate = v.ascentDay1 ? new Date(v.ascentDay1) : new Date();
    const extDays = v.extensionDays ?? 0;
    const today = new Date();
    const weekdaysElapsed = countWeekdays(startDate, today);
    const effectiveWeekdaysElapsed = Math.max(0, weekdaysElapsed - extDays);
    const hasStarted = data.completedTopics > 0;
    const pacingKey = getPacingTier(data.completedTopics, effectiveWeekdaysElapsed, hasStarted);
    const pacingConfig = PACING_TIERS[pacingKey];
    const summitDay = getSummitDay(startDate, extDays);
    const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Pacing note — brief explanation
    let pacingNote = "";
    if (data.completedTopics >= data.totalTopics) {
      pacingNote = "all topics complete!";
    } else {
      const openCount = data.openDays?.length ?? 0;
      const resourceOpen = data.openDays?.filter((d: any) => d.isResourceDay) ?? [];
      const clipOpen = data.openDays?.filter((d: any) => !d.isResourceDay) ?? [];
      const parts: string[] = [];
      if (data.completedTopics > 0) parts.push(`Day ${data.completedTopics} just unlocked`);
      if (resourceOpen.length > 0) parts.push(`${resourceOpen.map((d: any) => d.dayLabel).join(" & ")} (resource ${resourceOpen.length === 1 ? "day" : "days"}) still open`);
      if (clipOpen.length > 0 && clipOpen.length <= 3) parts.push(`${clipOpen.length} clip ${clipOpen.length === 1 ? "day" : "days"} remaining`);
      else if (clipOpen.length > 3) parts.push(`${openCount} days remaining`);
      pacingNote = parts.join(". ");
    }
    const pacingLine = `${pacingConfig.emoji} ${pacingConfig.label}${pacingNote ? ` — ${pacingNote}` : ""}`;
    const feedbackUrl = `${window.location.origin}/feedback?token=${feedbackToken}`;

    // Module status helper for approach incomplete template
    const incompleteSet = new Set(data.approachStatus?.incompleteModules ?? []);
    const modStatus = (label: string) => incompleteSet.has(label) ? `❌ Incomplete` : `✅ Complete`;

    // Subject line — approach has two variants
    let subject: string;
    if (checkinType === "summit") {
      subject = `🧗🏻‍♂️ ${v.name} — Summit Reached!`;
    } else if (checkinType === "approach") {
      subject = approachComplete
        ? `🚡 ${v.name} — Approach Anchor Point`
        : `🚡cAMP Ascent Update — The Approach Incomplete / Ascent Unlocked`;
    } else if (checkinType === "week2") {
      subject = `🥾 ${v.name} — Week 2 Anchor Point`;
    } else {
      subject = `🏞️ ${v.name} — Week 3 Anchor Point`;
    }

    // To/CC — always Manager + Mentor as recipients, JT CC'd
    const toRecipients = [v.managerEmail, v.belayBuddyEmail].filter(Boolean);
    const ccRecipients = JT_EMAIL;

    // Greeting — always Manager + Mentor
    const greeting = buddyFirst
      ? `Hi ${managerFirst} and ${buddyFirst},`
      : `Hi ${managerFirst},`;

    let body = `${greeting}\n\n`;

    // ── TEMPLATE 1: APPROACH (COMPLETE) ──
    if (checkinType === "approach" && approachComplete) {
      body += `🚡I just completed The Approach, the first phase of cAMP Ascent. Here's my summary:\n\n`;
      body += `Ascent start date: ${fmtDate(startDate)}\n`;
      body += `Current pacing status: ${pacingLine}\n`;
      body += `Summit Day: ${fmtDate(summitDay)}\n\n`;
      body += `XP: ${v.totalXp}\n`;
      body += `Tier: ${v.tier}\n\n`;

      // Module reflections — only show lines for completed modules
      body += `✍🏽 Module reflections:\n`;
      const meddpicc = data.moduleReflections?.find((r: any) => r.moduleKey === "meddpicc");
      const product101 = data.moduleReflections?.find((r: any) => r.moduleKey === "camp101");
      const challenger = data.moduleReflections?.find((r: any) => r.moduleKey === "challenger");
      if (meddpicc) body += `MEDDPICC: ${meddpicc.reflectionResponse}\n`;
      if (product101) body += `Product 101: ${product101.reflectionResponse}\n`;
      if (challenger) body += `Challenger: ${challenger.reflectionResponse}\n`;
      if (data.wdVerification) {
        body += `Wheel & Deal:\n`;
        body += `  Product: ${data.wdVerification.product}\n`;
        body += `  Scenario: ${data.wdVerification.scenario}\n`;
        body += `  Self-score: ${data.wdVerification.score}/10\n`;
      }

    // ── TEMPLATE 2: APPROACH (INCOMPLETE / AUTO-UNLOCK) ──
    } else if (checkinType === "approach" && !approachComplete) {
      body += `My cAMP Ascent path has now been unlocked, and I'm moving into the next phase of onboarding. I still have unfinished Approach work that remains required before I can reach Summit.\n\n`;
      body += `🧗🏻‍♂️Current status:\n`;
      body += `Ascent start date: ${fmtDate(startDate)}\n`;
      body += `Current pacing status: ${pacingLine}\n`;
      body += `Summit Day: ${fmtDate(summitDay)}\n`;
      body += `The Approach completed: ${data.approachStatus?.completedCount ?? 0} / ${data.approachStatus?.totalCount ?? 7}\n`;
      body += `Remaining Approach modules: ${data.approachStatus?.incompleteModules?.length ?? 0}\n`;
      body += `Ascent unlocked on: ${fmtDate(startDate)}\n\n`;
      body += `🚩Remaining Approach work:\n`;
      body += `MEDDPICC: ${modStatus("MEDDPICC")}\n`;
      body += `Product 101: ${modStatus("Product 101")}\n`;
      body += `Challenger: ${modStatus("Challenger")}\n`;
      body += `Wheel & Deal: ${modStatus("Wheel & Deal")}\n`;

    // ── TEMPLATE 4: SUMMIT ──
    } else if (checkinType === "summit") {
      body += `I've completed Week 4 of cAMP Ascent. Here's my current summary:\n\n`;
      body += `Ascent start date: ${fmtDate(startDate)}\n`;
      body += `Current pacing status: ${pacingLine}\n`;
      body += `Summit Day: ${fmtDate(summitDay)}\n\n`;

      if (data.week4) {
        body += `🧗🏻‍♂️ Week 4 performance:\n`;
        body += `Clips completed: ${data.week4.clipsCompleted} / ${data.week4.totalClips}\n`;
        body += `Average engagement: ${data.week4.avgEngagement}%\n`;
        body += `Quizzes passed: ${data.week4.quizzesPassed} / ${data.week4.totalQuizzes}\n`;
        body += `Average quiz score: ${data.week4.avgQuizScore}%\n\n`;
      }

      body += `🏞️ Overall journey:\n`;
      body += `XP: ${v.totalXp}\n`;
      body += `Tier: ${v.tier}\n`;
      body += `Leaderboard rank: #${data.leaderboard.rank} of ${data.leaderboard.totalLearners}\n`;
      body += `Sessions completed: ${data.clipStats.completedClips} / ${data.clipStats.totalClips}\n`;
      body += `Search & Rescue triggered: ${data.srCount}\n`;
      body += `Weather the Storm triggered: ${data.wtsCount}\n\n`;

      body += `👀 Engagement:\n`;
      body += `Trail Markers / quizzes: ${data.engagement.avgQuestionScore}% — average\n`;
      body += `Focus: ${data.engagement.avgFocusScore}% — average\n`;
      body += `Watch time: ${data.engagement.avgTimeScore}% — average\n`;
      body += `Overall engagement: ${data.engagement.overallEngagement}% — average\n\n`;

      if (qs.totalAttempts > 0) {
        body += `🧠 Quiz performance:\n`;
        body += `Quizzes passed: ${qs.quizzesPassed} / ${qs.totalQuizzes}\n`;
        body += `Average quiz score: ${qs.avgScorePct}%\n`;
        body += `First-pass rate: ${qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}%\n`;
        body += `Retakes: ${qs.retakes}\n\n`;
      }

    // ── TEMPLATE 3: WEEK 2/3 ──
    } else {
      const weekEmoji = checkinType === "week2" ? "🥾" : "🏞️";
      body += `🧗🏻‍♂️Here's my current Ascent update:\n\n`;
      body += `Start date: ${fmtDate(startDate)}\n`;
      body += `Current status: ${pacingLine}\n`;
      body += `Summit Day: ${fmtDate(summitDay)}\n\n`;
      body += `Sessions completed: ${data.clipStats.completedClips} / ${data.clipStats.totalClips}\n`;
      body += `Sessions remaining: ${data.clipStats.totalClips - data.clipStats.completedClips}\n`;
      body += `XP: ${v.totalXp}\n`;
      body += `Leaderboard: #${data.leaderboard.rank} of ${data.leaderboard.totalLearners}\n`;
      body += `Average quiz score: ${qs.avgScorePct}%\n`;
      body += `Engagement: ${data.engagement.overallEngagement}% (quizzes: ${data.engagement.avgQuestionScore}% | focus: ${data.engagement.avgFocusScore}% | time: ${data.engagement.avgTimeScore}%)\n`;
    }

    // ── REFLECTION (all templates) ──
    if (reflection.trim()) {
      body += `\nLearner reflection:\n${reflection.trim()}\n`;
    }

    // ── APPROACH STATUS FOOTER (Week 2/3 and Summit) ──
    if (checkinType !== "approach") {
      if (approachComplete) {
        body += `\n✅ Approach: Complete\n`;
      } else {
        body += `\n🚡 Approach: ${data.approachStatus?.completedCount ?? 0}/${data.approachStatus?.totalCount ?? 7} complete\n`;
        if (data.approachStatus?.incompleteModules?.length > 0) {
          body += `Remaining: ${data.approachStatus.incompleteModules.join(", ")}\n`;
        }
      }
    }

    // ── FEEDBACK SURVEY LINK ──
    body += `\n📮 Manager feedback survey:\n${feedbackUrl}\n`;

    // ── MANAGER KEY ──
    body += MANAGER_KEY;

    body += `\nThanks,\n${fn}`;

    // Gmail compose params
    const to = toRecipients.join(",");
    const params = new URLSearchParams({
      to,
      cc: ccRecipients,
      su: subject,
      body,
    });

    return `https://mail.google.com/mail/?view=cm&${params.toString()}`;
  }, [data, checkinType, reflection, feedbackToken, approachCompleteOverride]);

  const handleOpenGmail = useCallback(() => {
    if (gmailUrl) {
      window.open(gmailUrl, "_blank");
      setGmailOpened(true);
    }
  }, [gmailUrl]);

  const handleMarkSent = useCallback(async () => {
    if (!data?.viewer) return;

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
    ? "🪝 Step 1 of 3 — Review your stats"
    : step === "reflect"
      ? "🪝 Step 2 of 3 — Share a reflection"
      : "🪝 Step 3 of 3 — Send to your manager";

  /* ── SUMMIT GRAND FINALE — its own standalone view, no check-in framing ── */
  if (isSummit && step === "celebrate") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-2xl mx-4 max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col relative">
          {/* Admin X close button */}
          {allowClose && (
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-lg leading-none transition-colors">
              &#10005;
            </button>
          )}
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
            {(sent || allowClose) && (
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
              <p className="text-sm text-red-600">Failed to load data: {(error as any)?.message ?? "Unknown error"}</p>
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
              approachCompleteOverride={approachCompleteOverride}
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
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  ✏️ Next: Add Reflection →
                </button>
              )}
              {step === "reflect" && (
                <button
                  onClick={() => setStep("email")}
                  disabled={!reflection.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  📧 Next: Email Preview →
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
    <div className="space-y-0">
      {/* Gradient header — matches summit check-in (amber-500 → yellow-500) */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8 pt-8 pb-6 text-center">
        {/* Frosted circle with emoji */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4 text-4xl">
          🚩
        </div>
        <h2 className="text-2xl font-bold text-white">Summit Reached — Ascent Complete!</h2>
        <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-lg mx-auto">
          You've completed all 17 cAMP Clips and conquered your Ascent. The trail behind you is proof — you showed up, engaged, and earned it.
        </p>
      </div>

      {/* Content body */}
      <div className="space-y-4 p-6">
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
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STATS VIEW (Step 1 for regular, Step 2 for summit)
   ════════════════════════════════════════════════════════════════════════ */
function StatsView({ data, checkinType }: { data: any; checkinType: CheckinType }) {
  const isSummit = checkinType === "summit";
  const label = CHECKIN_LABELS[checkinType];

  return (
    <div className="space-y-4">
      {/* Hero stats card — gradient accent strip on top */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <div className={`bg-gradient-to-r ${label.gradient} h-1.5`} />
        <div className="p-4 bg-gradient-to-b from-gray-50 to-white">
          <div className={`grid ${checkinType !== "approach" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"} gap-4`}>
            <div className="text-center">
              <p className="text-xl font-bold text-indigo-600">{data.viewer.totalXp}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total XP</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{data.viewer.tier}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tier</p>
            </div>
            {checkinType !== "approach" && (
              <>
                <div className="text-center">
                  <p className="text-xl font-bold text-amber-600">#{data.leaderboard.rank}</p>
                  <p className="text-xs text-gray-500 mt-0.5">of {data.leaderboard.totalLearners} cAMPers</p>
                </div>
                <div className="text-center truncate">
                  <p className="text-sm font-semibold text-gray-700 truncate">{data.viewer.managerEmail ?? "—"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Manager</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pacing Banner — shown for all check-in types when Ascent has started */}
      {data.viewer.ascentDay1 && (() => {
        const startDate = new Date(data.viewer.ascentDay1);
        const extDays = data.viewer.extensionDays ?? 0;
        const today = new Date();
        const weekdaysElapsed = countWeekdays(startDate, today);
        const effectiveWeekdaysElapsed = Math.max(0, weekdaysElapsed - extDays);
        const hasStarted = data.completedTopics > 0;
        const pacingKey = getPacingTier(data.completedTopics, effectiveWeekdaysElapsed, hasStarted);
        const pacingConfig = PACING_TIERS[pacingKey];
        const summitDay = getSummitDay(startDate, extDays);
        const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        return (
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-1.5">
              <span className="w-1 h-4 rounded-full bg-blue-500 inline-block" />🧗 Pacing
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-lg font-bold text-blue-700">{fmtDate(startDate)}</p>
                <p className="text-xs text-gray-500">Ascent Date</p>
              </div>
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-lg font-bold text-blue-700">{pacingConfig.emoji} {pacingConfig.label}</p>
                <p className="text-xs text-gray-500">Pacing Status</p>
              </div>
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-lg font-bold text-blue-700">{fmtDate(summitDay)}</p>
                <p className="text-xs text-gray-500">Summit Day</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SUMMIT: Week 4 Performance ── */}
      {isSummit && data.week4 && (
        <>
          <div className="mt-1 mb-0">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">⛰️ Week 4 Performance</h2>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-1.5"><span className="w-1 h-4 rounded-full bg-green-500 inline-block" />🎞️ Week 4 Clips</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-xl font-bold text-green-700">{data.week4.clipsCompleted}/{data.week4.totalClips}</p>
                <p className="text-xs text-gray-500">Clips Done</p>
              </div>
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-xl font-bold text-green-700">{data.week4.avgEngagement}%</p>
                <p className="text-xs text-gray-500">Avg Engagement</p>
              </div>
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-xl font-bold text-green-700">#{data.leaderboard.rank}/{data.leaderboard.totalLearners}</p>
                <p className="text-xs text-gray-500">Leaderboard</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-1.5"><span className="w-1 h-4 rounded-full bg-orange-500 inline-block" />🧠 Week 4 Quizzes</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-xl font-bold text-orange-700">{data.week4.quizzesPassed}/{data.week4.totalQuizzes}</p>
                <p className="text-xs text-gray-500">Passed</p>
              </div>
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-xl font-bold text-orange-700">{data.week4.avgQuizScore}%</p>
                <p className="text-xs text-gray-500">Avg Score</p>
              </div>
              <div className="rounded-lg bg-white/70 py-2">
                <p className="text-xl font-bold text-orange-700">{data.week4.avgEngagement}%</p>
                <p className="text-xs text-gray-500">Engagement</p>
              </div>
            </div>
          </div>
          <div className="mt-2 mb-0">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">🏔️ Overall Journey</h2>
          </div>
        </>
      )}

      {/* Clip Progress (non-approach) */}
      {checkinType !== "approach" && (
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-1.5"><span className="w-1 h-4 rounded-full bg-green-500 inline-block" />🎞️ {isSummit ? "All Clips" : "Clip Progress"}</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-green-700">
                {data.clipStats.completedClips}/{data.clipStats.totalClips}
              </p>
              <p className="text-xs text-gray-500">Clips Done</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-red-600">{data.srCount}</p>
              <p className="text-xs text-gray-500">🚁 S&R</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-amber-600">{data.wtsCount}</p>
              <p className="text-xs text-gray-500">⛈️ WtS</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-green-700">
                #{data.leaderboard.rank}/{data.leaderboard.totalLearners}
              </p>
              <p className="text-xs text-gray-500">Leaderboard</p>
            </div>
          </div>
        </div>
      )}

      {/* cAMP Quiz Stats (not shown in approach — no quizzes in week 1) */}
      {checkinType !== "approach" && data.quizStats.totalAttempts > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-1.5"><span className="w-1 h-4 rounded-full bg-orange-500 inline-block" />🧠 {isSummit ? "All Quizzes" : "cAMP Quiz Stats"}</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-orange-700">
                {data.quizStats.quizzesPassed}/{data.quizStats.totalQuizzes}
              </p>
              <p className="text-xs text-gray-500">Passed</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-orange-700">{data.quizStats.avgScorePct}%</p>
              <p className="text-xs text-gray-500">Avg Score</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-orange-700">{data.quizStats.retakes}</p>
              <p className="text-xs text-gray-500">Retakes</p>
            </div>
          </div>
        </div>
      )}

      {/* Approach-specific: Module reflections */}
      {checkinType === "approach" && data.moduleReflections.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-1.5"><span className="w-1 h-4 rounded-full bg-amber-500 inline-block" />✍🏽 Module Reflections</h3>
          <div className="space-y-3">
            {data.moduleReflections.map((r: any, i: number) => {
              const moduleEmoji = r.moduleKey === "meddpicc" ? "🧱" : r.moduleKey === "camp101" ? "📦" : r.moduleKey === "challenger" ? "⚔️" : r.moduleKey === "wheel_deal" ? "🎡" : "📝";
              const moduleLabel = r.moduleKey === "meddpicc" ? "MEDDPICC" : r.moduleKey === "camp101" ? "cAMP 101" : r.moduleKey === "challenger" ? "Challenger" : r.moduleKey === "wheel_deal" ? "Wheel & Deal" : r.moduleKey;
              return (
                <div key={i} className="bg-white/70 rounded-lg px-3 py-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">{moduleEmoji} {moduleLabel}</p>
                  <p className="text-sm text-gray-600 mb-2">{r.reflectionPrompt}</p>
                  <div className="border-t border-amber-100 pt-2">
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Their Reflection:</p>
                    <p className="text-sm text-gray-700 italic">"{r.reflectionResponse}"</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approach-specific: Wheel & Deal */}
      {checkinType === "approach" && data.wdVerification && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-1.5"><span className="w-1 h-4 rounded-full bg-purple-500 inline-block" />🎡 Wheel & Deal</h3>
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
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-1.5"><span className="w-1 h-4 rounded-full bg-red-500 inline-block" />👀 Engagement</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-red-700">{data.engagement.avgQuestionScore}%</p>
              <p className="text-xs text-gray-500">Trail Markers</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-red-700">{data.engagement.avgFocusScore}%</p>
              <p className="text-xs text-gray-500">Focus</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-red-700">{data.engagement.avgTimeScore}%</p>
              <p className="text-xs text-gray-500">Time</p>
            </div>
            <div className="rounded-lg bg-white/70 py-2">
              <p className="text-xl font-bold text-red-700">{data.engagement.overallEngagement}%</p>
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
  approachCompleteOverride,
}: {
  data: any;
  checkinType: CheckinType;
  reflection: string;
  gmailOpened: boolean;
  sent: boolean;
  onOpenGmail: () => void;
  onMarkSent: () => void;
  marking: boolean;
  approachCompleteOverride?: boolean;
}) {
  const v = data.viewer;
  const fn = firstName(v.name);
  const managerFirst = firstName(v.managerName ?? v.managerEmail);
  const buddyFirst = firstName(v.belayBuddyName ?? v.belayBuddyEmail);
  const qs = data.quizStats;

  const approachComplete = approachCompleteOverride ?? data.approachStatus?.complete ?? true;
  const incompleteSet = new Set(data.approachStatus?.incompleteModules ?? []);
  const modIcon = (label: string) => incompleteSet.has(label) ? "❌" : "✅";

  // Subject — approach has two variants
  let subjectLine: string;
  if (checkinType === "summit") {
    subjectLine = `🧗🏻‍♂️ ${v.name} — Summit Reached!`;
  } else if (checkinType === "approach") {
    subjectLine = approachComplete
      ? `🚡 ${v.name} — Approach Anchor Point`
      : `🚡 cAMP Ascent Update — The Approach Incomplete / Ascent Unlocked`;
  } else if (checkinType === "week2") {
    subjectLine = `🥾 ${v.name} — Week 2 Anchor Point`;
  } else {
    subjectLine = `🏞️ ${v.name} — Week 3 Anchor Point`;
  }

  // To — approach complete + summit → manager only; others include belay buddy
  const toDisplay = (checkinType === "approach" && approachComplete) || checkinType === "summit"
    ? v.managerEmail || "—"
    : [v.managerEmail, v.belayBuddyEmail].filter(Boolean).join(", ") || "—";

  // Greeting
  const greetingName = (checkinType === "approach" && approachComplete) || checkinType === "summit"
    ? `${managerFirst} and JT`
    : buddyFirst ? `${managerFirst} and ${buddyFirst}` : managerFirst;

  // Pacing
  const startDate = v.ascentDay1 ? new Date(v.ascentDay1) : new Date();
  const extDays = v.extensionDays ?? 0;
  const weekdaysElapsed = countWeekdays(startDate, new Date());
  const effectiveWeekdaysElapsed = Math.max(0, weekdaysElapsed - extDays);
  const hasStarted = data.completedTopics > 0;
  const pacingKey = getPacingTier(data.completedTopics, effectiveWeekdaysElapsed, hasStarted);
  const pacingConfig = PACING_TIERS[pacingKey];
  const summitDay = getSummitDay(startDate, extDays);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const label = CHECKIN_LABELS[checkinType];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Here's what your manager will receive. Click "Send via Gmail" to open a pre-filled draft.
      </p>

      {/* Email preview card */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className={`bg-gradient-to-r ${label.gradient} px-4 py-2.5`}>
          <div className="text-xs text-white/90 space-y-1">
            <div><span className="font-semibold text-white">To:</span> {toDisplay}</div>
            <div><span className="font-semibold text-white">CC:</span> {JT_EMAIL}</div>
            <div><span className="font-semibold text-white">Subject:</span> {subjectLine}</div>
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-700 space-y-1.5 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
          <p>Hi {greetingName},</p>

          {/* ── APPROACH (COMPLETE) ── */}
          {checkinType === "approach" && approachComplete && (
            <>
              <p className="mt-2">🚡I just completed The Approach, the first phase of cAMP Ascent. Here's my summary:</p>
              <p>Ascent start date: {fmtDate(startDate)}</p>
              <p>Current pacing status: {pacingConfig.emoji} {pacingConfig.label}</p>
              <p>Summit Day: {fmtDate(summitDay)}</p>
              <p className="mt-1">XP: {v.totalXp}</p>
              <p>Tier: {v.tier}</p>
              <p className="mt-1 font-semibold">✍🏽 Module reflections:</p>
              {data.moduleReflections?.find((r: any) => r.moduleKey === "meddpicc") && (
                <p>MEDDPICC: {data.moduleReflections.find((r: any) => r.moduleKey === "meddpicc").reflectionResponse}</p>
              )}
              {data.moduleReflections?.find((r: any) => r.moduleKey === "camp101") && (
                <p>Product 101: {data.moduleReflections.find((r: any) => r.moduleKey === "camp101").reflectionResponse}</p>
              )}
              {data.moduleReflections?.find((r: any) => r.moduleKey === "challenger") && (
                <p>Challenger: {data.moduleReflections.find((r: any) => r.moduleKey === "challenger").reflectionResponse}</p>
              )}
              {data.wdVerification && (
                <>
                  <p>Wheel & Deal:</p>
                  <p>{"  "}Product: {data.wdVerification.product}</p>
                  <p>{"  "}Scenario: {data.wdVerification.scenario}</p>
                  <p>{"  "}Self-score: {data.wdVerification.score}/10</p>
                </>
              )}
            </>
          )}

          {/* ── APPROACH (INCOMPLETE) ── */}
          {checkinType === "approach" && !approachComplete && (
            <>
              <p className="mt-2">My cAMP Ascent path has now been unlocked, and I'm moving into the next phase of onboarding. I still have unfinished Approach work that remains required before I can reach Summit.</p>
              <p className="mt-1 font-semibold">🧗🏻‍♂️Current status:</p>
              <p>Ascent start date: {fmtDate(startDate)}</p>
              <p>Current pacing status: {pacingConfig.emoji} {pacingConfig.label}</p>
              <p>Summit Day: {fmtDate(summitDay)}</p>
              <p>The Approach completed: {data.approachStatus?.completedCount ?? 0} / {data.approachStatus?.totalCount ?? 7}</p>
              <p>Remaining Approach modules: {data.approachStatus?.incompleteModules?.length ?? 0}</p>
              <p>Ascent unlocked on: {fmtDate(startDate)}</p>
              <p className="mt-1 font-semibold">🚩Remaining Approach work:</p>
              <p>MEDDPICC: {modIcon("MEDDPICC")} {incompleteSet.has("MEDDPICC") ? "Incomplete" : "Complete"}</p>
              <p>Product 101: {modIcon("Product 101")} {incompleteSet.has("Product 101") ? "Incomplete" : "Complete"}</p>
              <p>Challenger: {modIcon("Challenger")} {incompleteSet.has("Challenger") ? "Incomplete" : "Complete"}</p>
              <p>Wheel & Deal: {modIcon("Wheel & Deal")} {incompleteSet.has("Wheel & Deal") ? "Incomplete" : "Complete"}</p>
            </>
          )}

          {/* ── SUMMIT ── */}
          {checkinType === "summit" && (
            <>
              <p className="mt-2">I've completed Week 4 of cAMP Ascent. Here's my current summary:</p>
              <p>Ascent start date: {fmtDate(startDate)}</p>
              <p>Current pacing status: {pacingConfig.emoji} {pacingConfig.label}</p>
              <p>Summit Day: {fmtDate(summitDay)}</p>
              {data.week4 && (
                <>
                  <p className="mt-1 font-semibold">🧗🏻‍♂️ Week 4 performance:</p>
                  <p>Clips completed: {data.week4.clipsCompleted} / {data.week4.totalClips}</p>
                  <p>Average engagement: {data.week4.avgEngagement}%</p>
                  <p>Quizzes passed: {data.week4.quizzesPassed} / {data.week4.totalQuizzes}</p>
                  <p>Average quiz score: {data.week4.avgQuizScore}%</p>
                </>
              )}
              <p className="mt-1 font-semibold">🏞️ Overall journey:</p>
              <p>XP: {v.totalXp} · Tier: {v.tier}</p>
              <p>Leaderboard rank: #{data.leaderboard.rank} of {data.leaderboard.totalLearners}</p>
              <p>Sessions: {data.clipStats.completedClips}/{data.clipStats.totalClips} · S&R: {data.srCount} · WtS: {data.wtsCount}</p>
              <p className="mt-1 font-semibold">👀 Engagement:</p>
              <p>Trail Markers: {data.engagement.avgQuestionScore}% · Focus: {data.engagement.avgFocusScore}% · Time: {data.engagement.avgTimeScore}% · Overall: {data.engagement.overallEngagement}%</p>
              {qs.totalAttempts > 0 && (
                <>
                  <p className="mt-1 font-semibold">🧠 Quiz performance:</p>
                  <p>Passed: {qs.quizzesPassed}/{qs.totalQuizzes} · Avg: {qs.avgScorePct}% · 1st Pass: {qs.quizzesPassed > 0 ? Math.round((qs.firstPassCount / qs.quizzesPassed) * 100) : 0}% · Retakes: {qs.retakes}</p>
                </>
              )}
            </>
          )}

          {/* ── WEEK 2/3 ── */}
          {(checkinType === "week2" || checkinType === "week3") && (
            <>
              <p className="mt-2">🧗🏻‍♂️Here's my current Ascent update:</p>
              <p>Start date: {fmtDate(startDate)}</p>
              <p>Current status: {pacingConfig.emoji} {pacingConfig.label}</p>
              <p>Summit Day: {fmtDate(summitDay)}</p>
              <p className="mt-1">Sessions completed: {data.clipStats.completedClips} / {data.clipStats.totalClips}</p>
              <p>Sessions remaining: {data.clipStats.totalClips - data.clipStats.completedClips}</p>
              <p>XP: {v.totalXp} · Leaderboard: #{data.leaderboard.rank} of {data.leaderboard.totalLearners}</p>
              <p>Average quiz score: {qs.avgScorePct}%</p>
              <p>Engagement: {data.engagement.overallEngagement}% (quizzes: {data.engagement.avgQuestionScore}% | focus: {data.engagement.avgFocusScore}% | time: {data.engagement.avgTimeScore}%)</p>
            </>
          )}

          {/* Reflection */}
          {reflection.trim() && (
            <div className="bg-amber-50 rounded px-2 py-1.5 border border-amber-100 mt-1">
              <p className="font-semibold text-amber-800">Learner reflection:</p>
              <p className="text-gray-700">{reflection.trim()}</p>
            </div>
          )}

          {/* Approach status footer (week2/3 + summit) */}
          {checkinType !== "approach" && (
            <div className={`mt-1 rounded px-2 py-1 ${approachComplete ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              {approachComplete ? (
                <p className="font-semibold text-green-800">✅ Approach: Complete</p>
              ) : (
                <>
                  <p className="font-semibold text-amber-800">🚡 Approach: {data.approachStatus?.completedCount ?? 0}/{data.approachStatus?.totalCount ?? 7} complete</p>
                  {data.approachStatus?.incompleteModules?.length > 0 && (
                    <p className="text-gray-600">Remaining: {data.approachStatus.incompleteModules.join(", ")}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Manager Key + Survey link note */}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="font-semibold text-gray-600 text-xs">📖 Quick Reference for Managers</p>
            <p className="text-[11px] text-gray-400 mt-1">Trail Markers · cAMP Quiz · Engagement Score · XP · S&R · WtS · Pacing</p>
          </div>
          <p className="text-gray-500 text-xs mt-1">📮 Manager feedback survey link included</p>
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
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {gmailOpened ? "✅ Gmail Opened — send the email, then come back" : "📨 Send via Gmail"}
          </button>

          {gmailOpened && (
            <button
              onClick={onMarkSent}
              disabled={marking}
              className="w-full py-3 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {marking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Marking…
                </span>
              ) : (
                checkinType === "approach"
                  ? "📬 I Sent It — Unlock Week 2"
                  : checkinType === "week2"
                    ? "📬 I Sent It — Unlock Week 3"
                    : checkinType === "week3"
                      ? "📬 I Sent It — Unlock Week 4"
                      : "📬 I Sent It — Mark as Sent"
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
