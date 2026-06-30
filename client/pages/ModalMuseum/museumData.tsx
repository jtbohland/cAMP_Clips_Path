import { useState, type ReactNode } from "react";
import PacingModal from "@/components/PacingModal";
import AnchorFailureModal from "@/components/AnchorFailureModal";
import LightAnchorModal from "@/components/LightAnchorModal";
import type { PacingTier, MissedClip } from "@/lib/pacing";

// ─── Shared mock data ───────────────────────────────────────────────

const MOCK_MISSED_CLIPS: MissedClip[] = [
  { weekNumber: 2, dayLabel: "Day 1", title: "ICP Deep Dive" },
  { weekNumber: 2, dayLabel: "Day 2", title: "Discovery Framework" },
  { weekNumber: 2, dayLabel: "Day 3", title: "Champion Building" },
];

const MOCK_SUMMIT_DAY = new Date("2026-07-18");
const MOCK_ADJUSTMENT_DAY = new Date("2026-07-25");
const MOCK_START_DATE = new Date("2026-06-16");

const noop = () => {};

// ─── Types ──────────────────────────────────────────────────────────

export interface MuseumExhibit {
  id: string;
  title: string;
  trigger: string;
  render: () => ReactNode;
}

export interface MuseumSectionData {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  exhibits: MuseumExhibit[];
}

// ─── Section 1: The Approach ────────────────────────────────────────

const approachExhibits: MuseumExhibit[] = [
  {
    id: "welcome",
    title: "Welcome Modal",
    trigger: "First visit — before Begin Ascent",
    render: () => <WelcomeMockup />,
  },
  {
    id: "first-achievement-badge",
    title: "First Achievement (with Badge)",
    trigger: "Begin Ascent click — completed Approach within 5 weekdays",
    render: () => <FirstAchievementMockup earnedXp={35} earnedBadge={true} />,
  },
  {
    id: "first-achievement-no-badge",
    title: "First Achievement (no Badge)",
    trigger: "Begin Ascent click — Approach took longer than 5 weekdays",
    render: () => <FirstAchievementMockup earnedXp={17} earnedBadge={false} />,
  },
];

// ─── Section 2: Daily Pacing ────────────────────────────────────────

const PACING_TIERS: { tier: PacingTier; title: string; trigger: string; daysBehind: number; clips: number }[] = [
  { tier: "not_started", title: "Not Started", trigger: "Registered but hasn't watched any clips", daysBehind: 0, clips: 0 },
  { tier: "summit_bound", title: "Summit Bound", trigger: "On pace or ahead of schedule", daysBehind: 0, clips: 8 },
  { tier: "off_the_trail", title: "Off the Trail", trigger: "1 day behind expected pace", daysBehind: 1, clips: 6 },
  { tier: "lost_in_the_woods", title: "Lost in the Woods", trigger: "2 days behind expected pace", daysBehind: 2, clips: 5 },
  { tier: "rockslide", title: "Rockslide", trigger: "3 days behind expected pace", daysBehind: 3, clips: 4 },
  { tier: "avalanche_warning", title: "Avalanche Warning", trigger: "4+ days behind expected pace", daysBehind: 4, clips: 3 },
  { tier: "completed", title: "Completed", trigger: "All 17 clips finished", daysBehind: 0, clips: 17 },
];

const pacingExhibits: MuseumExhibit[] = PACING_TIERS.map((p) => ({
  id: `pacing-${p.tier}`,
  title: p.title,
  trigger: p.trigger,
  render: () => (
    <PacingModal
      tier={p.tier}
      daysBehind={p.daysBehind}
      clipsCompleted={p.clips}
      totalClips={17}
      weekdaysElapsed={10}
      missedClips={p.daysBehind > 0 ? MOCK_MISSED_CLIPS.slice(0, Math.min(p.daysBehind, 3)) : []}
      summitDay={MOCK_SUMMIT_DAY}
      isDayBeforeSummit={p.tier === "avalanche_warning"}
      onDismiss={noop}
    />
  ),
}));

// ─── Section 3: Anchor System ───────────────────────────────────────

const anchorExhibits: MuseumExhibit[] = [
  {
    id: "anchor-failure",
    title: "Anchor Failure",
    trigger: "First occurrence — missed Summit Day deadline",
    render: () => (
      <AnchorFailureModal
        learnerName="Alex Rivera"
        managerName="Jordan Chen"
        startDate={MOCK_START_DATE}
        summitDay={MOCK_SUMMIT_DAY}
        adjustmentDay={MOCK_ADJUSTMENT_DAY}
        sessionsBehind={5}
        missedClips={MOCK_MISSED_CLIPS}
        isEscalated={false}
        onDismiss={noop}
        defaultReason="workload"
      />
    ),
  },
  {
    id: "anchor-escalated",
    title: "Anchor Failure — Escalated",
    trigger: "Missed both Summit Day AND Ascent Adjustment deadlines",
    render: () => (
      <AnchorFailureModal
        learnerName="Alex Rivera"
        managerName="Jordan Chen"
        startDate={MOCK_START_DATE}
        summitDay={MOCK_SUMMIT_DAY}
        adjustmentDay={MOCK_ADJUSTMENT_DAY}
        sessionsBehind={5}
        missedClips={MOCK_MISSED_CLIPS}
        isEscalated={true}
        onDismiss={noop}
        defaultReason="workload"
      />
    ),
  },
  {
    id: "light-anchor-before",
    title: "Light Anchor (Adjustment Pending)",
    trigger: "Daily reminder after Anchor Failure — adjustment deadline not yet missed",
    render: () => (
      <LightAnchorModal
        summitDay={MOCK_SUMMIT_DAY}
        adjustmentDay={MOCK_ADJUSTMENT_DAY}
        adjustmentMissed={false}
        clipsCompleted={12}
        totalClips={17}
        missedClips={MOCK_MISSED_CLIPS}
        onDismiss={noop}
      />
    ),
  },
  {
    id: "light-anchor-after",
    title: "Light Anchor (Adjustment Missed)",
    trigger: "Daily reminder after both deadlines missed",
    render: () => (
      <LightAnchorModal
        summitDay={MOCK_SUMMIT_DAY}
        adjustmentDay={MOCK_ADJUSTMENT_DAY}
        adjustmentMissed={true}
        clipsCompleted={12}
        totalClips={17}
        missedClips={MOCK_MISSED_CLIPS}
        onDismiss={noop}
      />
    ),
  },
];

// ─── Section 4: Tier Unlocks ────────────────────────────────────────

const tierExhibits: MuseumExhibit[] = [
  {
    id: "tier-trailblazer",
    title: "Trailblazer Unlock",
    trigger: "Learner reaches 150 XP",
    render: () => (
      <TierUnlockMockup
        tierName="Trailblazer"
        tierEmoji="🥾"
        totalXp={162}
        leaderboardRank={4}
        nextTierName="Summit Seeker"
        nextTierEmoji="🏔️"
        xpToNextTier={163}
      />
    ),
  },
  {
    id: "tier-summit-seeker",
    title: "Summit Seeker Unlock",
    trigger: "Learner reaches 325 XP",
    render: () => (
      <TierUnlockMockup
        tierName="Summit Seeker"
        tierEmoji="🧗🏼"
        totalXp={340}
        leaderboardRank={2}
        nextTierName="Pinnacle Achiever"
        nextTierEmoji="🧗🏼✨"
        xpToNextTier={160}
      />
    ),
  },
  {
    id: "tier-pinnacle",
    title: "Pinnacle Achiever Unlock",
    trigger: "Learner reaches 500 XP — highest tier",
    render: () => (
      <TierUnlockMockup
        tierName="Pinnacle Achiever"
        tierEmoji="🧗🏼✨"
        totalXp={515}
        leaderboardRank={1}
        nextTierName={null}
        nextTierEmoji={null}
        xpToNextTier={null}
      />
    ),
  },
];

// ─── Section 5: Check-In Emails ─────────────────────────────────────

const checkinExhibits: MuseumExhibit[] = [
  {
    id: "checkin-approach",
    title: "The Approach Check-In",
    trigger: "Learner dismisses First Achievement modal → auto-opens if approach check-in not yet sent",
    render: () => <CheckinMockup type="approach" />,
  },
  {
    id: "checkin-week2",
    title: "Week 2 Check-In",
    trigger: "Learner completes 5+ clips & approach already sent → auto-opens once per session",
    render: () => <CheckinMockup type="week2" />,
  },
  {
    id: "checkin-week3",
    title: "Week 3 Check-In",
    trigger: "Learner completes 10+ clips & week2 already sent → auto-opens once per session",
    render: () => <CheckinMockup type="week3" />,
  },
  {
    id: "checkin-summit",
    title: "Summit Check-In (post-celebration)",
    trigger: "Follows the Grand Finale — 3-step check-in: stats → reflect → send",
    render: () => <CheckinMockup type="summit" />,
  },
];

// ─── Section 6: Summit ──────────────────────────────────────────────

const summitExhibits: MuseumExhibit[] = [
  {
    id: "summit-grand-finale",
    title: "Grand Finale",
    trigger: "All 17 clips completed — standalone celebration before the check-in flow",
    render: () => <SummitGrandFinaleMockup />,
  },
];

// ─── All sections ───────────────────────────────────────────────────

export const MUSEUM_SECTIONS: MuseumSectionData[] = [
  {
    id: "approach",
    emoji: "🏕️",
    title: "The Approach",
    subtitle: "Onboarding & first milestones",
    exhibits: approachExhibits,
  },
  {
    id: "pacing",
    emoji: "📊",
    title: "Daily Pacing",
    subtitle: "One for every tier — shown each time the learner opens the app",
    exhibits: pacingExhibits,
  },
  {
    id: "anchor",
    emoji: "⛓️",
    title: "Anchor System",
    subtitle: "Deadline accountability modals",
    exhibits: anchorExhibits,
  },
  {
    id: "tiers",
    emoji: "🏅",
    title: "Tier Unlocks",
    subtitle: "XP milestone celebrations",
    exhibits: tierExhibits,
  },
  {
    id: "checkins",
    emoji: "📧",
    title: "Check-In Emails",
    subtitle: "Learner-composed emails via Gmail — 3-step flow: stats → reflect → send",
    exhibits: checkinExhibits,
  },
  {
    id: "summit",
    emoji: "🏔️",
    title: "Summit",
    subtitle: "The grand finale — standalone celebration → 3-step check-in",
    exhibits: summitExhibits,
  },
];

// ─── Mockup components (for API/video-dependent modals) ─────────────

/** Static mockup of the Welcome Modal (avoids Wistia + API dependency) */
function WelcomeMockup() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="rounded-t-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 pt-7 pb-5 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <span className="text-4xl">🧗🏼</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Climber!</h2>
          <p className="text-sm text-indigo-100 mt-1">Let's unpack your cAMP Gear</p>
        </div>

        <div className="px-8 pt-6 pb-4">
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🗺️</span>
              <div><span className="font-semibold text-indigo-600">Ascent Guide</span> is your daily base camp — follow it closely and read it first.</div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🎞️</span>
              <div><span className="font-semibold text-indigo-600">cAMP Clips</span> (this app!) is where you watch the videos and complete Trail Markers.</div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🧠</span>
              <div><span className="font-semibold text-indigo-600">cAMP Quizzes</span> are your content-retention checks after each session.</div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">🎡</span>
              <div><span className="font-semibold text-indigo-600">Wheel & Deal</span> is for product-fluency practice — solo or multiplayer.</div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200/60 px-4 py-3">
              <span className="text-lg mt-0.5 shrink-0">⭐️</span>
              <div className="text-sm text-amber-900">
                Clips, Quizzes, and Wheel & Deal all include <span className="font-semibold">XP, bonus opportunities, and leaderboards</span>.
              </div>
            </div>
          </div>
        </div>

        {/* Elevator Pitches preview */}
        <div className="px-8 pb-4">
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-sm font-bold text-gray-900 tracking-wide mb-1">
              🪢 Before You Begin — Amplitude Elevator Pitches
            </h3>
            <p className="text-xs text-gray-500 mb-3">Begin your elevation with these quick pitches</p>
            <div className="space-y-2">
              {["Paul Fox (3m 5s)", "Brian Wagner (2m 28s)", "Dan Almond (3m 10s)", "Rob Bow (4m 34s)"].map((name) => (
                <div key={name} className="rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🍿</span>
                      <span className="text-sm font-semibold text-indigo-600">Elevator Pitch — {name.split(" (")[0]}</span>
                    </div>
                    <span className="text-xs text-gray-400">{name.split("(")[1]?.replace(")", "")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 pt-2">
          <p className="text-xs text-gray-500 text-center mb-4">
            Questions, feedback, or something not working? Reach out.
          </p>
          <div className="w-full py-3.5 rounded-lg text-sm font-bold bg-indigo-600 text-white text-center shadow-md">
            🚡 Start Your Journey
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static mockup of First Achievement Modal (avoids confetti + API side effects) */
function FirstAchievementMockup({ earnedXp, earnedBadge }: { earnedXp: number; earnedBadge: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className={`px-8 py-5 text-center ${earnedBadge ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-yellow-500'}`}>
          <p className="text-2xl font-bold uppercase tracking-widest text-white">
            🚡 The Approach is Complete!
          </p>
        </div>
        <div className="px-8 py-6 text-center space-y-4">
          <div className="text-5xl">🏕️</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Welcome to The Ascent!</h3>
            <p className="text-sm text-gray-500 mt-1">
              You've conquered The Approach and earned your first milestone. The real climb starts now.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {earnedBadge && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
                <span className="text-lg">🪓</span>
                <span className="text-sm font-bold text-amber-700">Swiss Army Badge</span>
              </div>
            )}
            {earnedXp > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-bold text-indigo-700">+{earnedXp} XP</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your cAMP Clips journey is just beginning. Each clip earns XP, unlocks badges, and moves you toward the summit.
          </p>
        </div>
        <div className="px-8 pb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white">
            Continue climbing! 🧗
          </span>
        </div>
      </div>
    </div>
  );
}

/** Static mockup of Tier Unlock Modal (avoids confetti side effects) */
function TierUnlockMockup({
  tierName, tierEmoji, totalXp, leaderboardRank, nextTierName, nextTierEmoji, xpToNextTier,
}: {
  tierName: string; tierEmoji: string; totalXp: number; leaderboardRank: number;
  nextTierName: string | null; nextTierEmoji: string | null; xpToNextTier: number | null;
}) {
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-5 text-center">
          <p className="text-2xl font-bold uppercase tracking-widest text-white">New Achievement!</p>
          <p className="mt-1 text-sm text-white/80">You unlocked a new tier</p>
        </div>
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="text-7xl mb-3">{tierEmoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{tierName}</h2>
          <p className="mt-1 text-sm text-gray-500">{totalXp.toLocaleString()} XP earned</p>
        </div>
        <div className="px-8 pb-6 space-y-2">
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <span className="text-sm text-gray-600">Leaderboard position</span>
            </div>
            <span className="text-sm font-bold text-indigo-600">{ordinal(leaderboardRank)}</span>
          </div>
          {nextTierName && xpToNextTier != null && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{nextTierEmoji ?? "⬆️"}</span>
                <span className="text-sm text-gray-600">XP to unlock {nextTierName}</span>
              </div>
              <span className="text-sm font-bold text-amber-600">{xpToNextTier.toLocaleString()} XP</span>
            </div>
          )}
          {!nextTierName && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-3.5 text-center">
              <p className="text-sm font-medium text-amber-700">✨ You've reached the highest tier — max altitude!</p>
            </div>
          )}
        </div>
        <div className="px-8 pb-8">
          <span className="block w-full py-3 rounded-lg text-sm font-bold bg-indigo-50 border border-indigo-200 text-indigo-600 text-center">
            ⭐️ Keep Climbing Clips
          </span>
        </div>
      </div>
    </div>
  );
}

/** Static mockup of the Summit Grand Finale — the standalone celebration the learner sees before the check-in */
function SummitGrandFinaleMockup() {
  const [showCheckin, setShowCheckin] = useState(false);

  if (showCheckin) {
    return <CheckinMockup type="summit" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Full-bleed celebration — NO gradient header, NO step indicator */}
        <div className="flex-1 overflow-auto p-8">
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
                <p className="text-lg font-bold text-amber-700">🧗🏼✨ Pinnacle Achiever</p>
                <p className="text-xs text-amber-500 mt-0.5">Your final tier</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-700">485 XP</p>
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
            <div className="rounded-xl border-l-4 border-indigo-400 bg-indigo-50/50 px-5 py-4">
              <p className="text-sm text-gray-600 italic leading-relaxed">
                Alex, you didn't just climb Ascent — you crushed the whole mountain. 🏔️🔥 Now take that trail-tested confidence into the field, and get ready to reach even higher at cAMP 201.
              </p>
              <p className="text-xs text-gray-400 mt-2">— JT Bohland, Sr. Global Enablement Program Manager</p>
            </div>
          </div>
        </div>

        {/* Grand Finale footer — CTA to continue into check-in */}
        <div className="px-8 pb-8 pt-2 shrink-0">
          <button
            onClick={() => setShowCheckin(true)}
            className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg"
          >
            📧 Continue to Summit Check-In →
          </button>
          <p className="text-xs text-center text-gray-400 mt-2">
            Review your stats, write a reflection, and send your Summit email
          </p>
        </div>
      </div>
    </div>
  );
}

/** Static mockup of the Learner Check-In Email Modal — 3-step flow preview */
function CheckinMockup({ type }: { type: "approach" | "week2" | "week3" | "summit" }) {
  const [step, setStep] = useState<"stats" | "reflect" | "email">("stats");
  const [reflection, setReflection] = useState("");

  const labels: Record<string, { title: string; emoji: string; gradient: string }> = {
    approach: { title: "The Approach Check-In", emoji: "🚡", gradient: "from-amber-600 to-orange-600" },
    week2: { title: "Week 2 Check-In", emoji: "🥾", gradient: "from-indigo-600 to-purple-600" },
    week3: { title: "Week 3 Check-In", emoji: "🏞️", gradient: "from-emerald-600 to-teal-600" },
    summit: { title: "Summit Celebration", emoji: "🧗🏻‍♂️", gradient: "from-amber-500 to-yellow-500" },
  };
  const label = labels[type];
  const stepIndex = step === "stats" ? 0 : step === "reflect" ? 1 : 2;

  const REFLECTION_PROMPTS: Record<string, string> = {
    approach: "What's one thing you learned during The Approach that you're excited to apply?",
    week2: "What's been the most valuable concept so far, and how are you using it?",
    week3: "What are you most confident about going into the final stretch?",
    summit: "Looking back at your entire Ascent, what's the #1 thing that will change how you sell?",
  };

  const mockClipCount = type === "approach" ? "—" : type === "week2" ? "8" : type === "week3" ? "14" : "17";
  const mockName = "Alex Rivera";
  const mockManager = "jordan.chen@amplitude.com";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header with step indicator */}
        <div className={`bg-gradient-to-r ${label.gradient} px-6 py-4 shrink-0`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-white flex items-center gap-2">
                <span>{label.emoji}</span> {label.title}
              </p>
              <p className="text-sm text-white/70 mt-0.5">
                {step === "stats" ? "Step 1 of 3 — Review your stats" : step === "reflect" ? "Step 2 of 3 — Share a reflection" : "Step 3 of 3 — Send to your manager"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i <= stepIndex ? "bg-white w-6" : "bg-white/30 w-4"}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Body — all 3 steps */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {step === "stats" && (
            <>
              {/* Clip stats */}
              {type !== "approach" && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">🎬 Clip Progress</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">{mockClipCount}/17</p>
                      <p className="text-xs text-gray-500">Clips Done</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">87%</p>
                      <p className="text-xs text-gray-500">Avg Score</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">#3/12</p>
                      <p className="text-xs text-gray-500">Leaderboard</p>
                    </div>
                  </div>
                </div>
              )}

              {/* XP / Tier */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Your XP:</span> <span className="font-bold text-indigo-600">{type === "summit" ? "485" : type === "week3" ? "340" : type === "week2" ? "210" : "95"}</span></div>
                  <div><span className="text-gray-500">Tier:</span> <span className="font-semibold text-gray-900">{type === "summit" ? "🧗🏼✨ Pinnacle Achiever" : type === "week3" ? "🧗🏼 Summit Seeker" : type === "week2" ? "🥾 Trailblazer" : "🏕️ Base Camper"}</span></div>
                </div>
              </div>

              {/* Quiz stats */}
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">📝 cAMP Quiz Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xl font-bold text-emerald-600">{type === "approach" ? "4/4" : type === "week2" ? "8/9" : "14/15"}</p><p className="text-xs text-gray-500">Passed</p></div>
                  <div><p className="text-xl font-bold text-gray-900">82%</p><p className="text-xs text-gray-500">Avg Score</p></div>
                  <div><p className="text-xl font-bold text-amber-600">2</p><p className="text-xs text-gray-500">Retakes</p></div>
                </div>
              </div>

              {/* Engagement (non-approach) */}
              {type !== "approach" && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">🔥 Engagement</h3>
                  <div className="grid grid-cols-4 gap-3 text-center text-sm">
                    <div><p className="font-bold text-gray-900">82%</p><p className="text-xs text-gray-500">Questions</p></div>
                    <div><p className="font-bold text-gray-900">91%</p><p className="text-xs text-gray-500">Focus</p></div>
                    <div><p className="font-bold text-gray-900">78%</p><p className="text-xs text-gray-500">Time</p></div>
                    <div><p className="font-bold text-indigo-600">84%</p><p className="text-xs text-gray-500">Overall</p></div>
                  </div>
                </div>
              )}

              {/* Approach-specific: Module reflections from Week 1 */}
              {type === "approach" && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">📚 Module Reflections (from Week 1)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100">
                      <p className="font-medium text-gray-700">📘 MEDDPICC:</p>
                      <p className="text-gray-600">Identifying the economic buyer early is critical.</p>
                    </div>
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100">
                      <p className="font-medium text-gray-700">🏕️ cAMP 101:</p>
                      <p className="text-gray-600">Map every deal to the cAMP framework before discovery.</p>
                    </div>
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100">
                      <p className="font-medium text-gray-700">⚔️ Challenger:</p>
                      <p className="text-gray-600">Lead with insights rather than questions.</p>
                    </div>
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100">
                      <p className="font-medium text-gray-700">🎯 W&D:</p>
                      <p className="text-gray-600">Analytics · Mid-Market Expansion · Score: 92%</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {step === "reflect" && (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-bold text-amber-800 mb-1">💭 Reflection</p>
                <p className="text-sm text-amber-700">{REFLECTION_PROMPTS[type]}</p>
              </div>
              <textarea
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder="Share your thoughts... (this will be included in the email to your manager)"
                className="w-full h-32 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right">{reflection.length}/500</p>
            </>
          )}

          {step === "email" && (
            <>
              <p className="text-sm text-gray-500">Here's what your manager will receive. Click "Send via Gmail" to open a pre-filled draft.</p>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><span className="font-semibold text-gray-600">To:</span> {mockManager}</div>
                    <div><span className="font-semibold text-gray-600">CC:</span> jt.bohland@amplitude.com</div>
                    <div>
                      <span className="font-semibold text-gray-600">Subject:</span>{" "}
                      {type === "summit" ? `🧗🏻‍♂️ ${mockName} — Summit Reached!` : type === "approach" ? `🚡 ${mockName} — Approach Check-In` : type === "week2" ? `🥾 ${mockName} — Week 2 Check-In` : `🏞️ ${mockName} — Week 3 Check-In`}
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 text-sm text-gray-700 space-y-2">
                  <p>Hi Jordan & Alex,</p>
                  {type === "approach" ? (
                    <>
                      <p>I just completed The Approach — the first phase of cAMP Ascent!</p>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">📊 Stats:</p>
                        <p>• XP: 95 · Tier: 🏕️ Base Camper</p>
                      </div>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">📝 cAMP Quiz:</p>
                        <p>• Passed: 4/4 · Avg: 82% · 1st Pass: 75%</p>
                      </div>
                    </>
                  ) : type === "summit" ? (
                    <>
                      <p>I completed all 17 cAMP Clips and reached the Summit! 🏔️✨</p>
                      <div className="pl-3 border-l-2 border-amber-200 space-y-1 bg-amber-50/50 rounded py-1">
                        <p className="font-semibold text-gray-800">🏔️ Overall Summit Summary:</p>
                        <p>• Clips: 17/17 completed</p>
                        <p>• XP: 485 · Tier: 🧗🏼✨ Pinnacle Achiever</p>
                        <p>• 🏆 Leaderboard: #3 of 12 cAMPers</p>
                      </div>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">🔥 Engagement:</p>
                        <p>• 🥾 Trail Markers: 82% · 👀 Focus: 91% · ⏱️ Time: 78% · 🎯 Overall: 84%</p>
                      </div>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">📝 cAMP Quiz (All 15 Days):</p>
                        <p>• Passed: 14/15 · Avg: 82% · 1st Pass: 79%</p>
                      </div>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">🗓️ Week 4 Performance:</p>
                        <p>• Final Tier: 🧗🏼✨ Pinnacle Achiever · Total XP: 485</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Here's my {type === "week2" ? "Week 2" : "Week 3"} cAMP Ascent update:</p>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">🎬 Clips:</p>
                        <p>• {type === "week2" ? "8" : "14"}/17 completed · Avg Score: 87%</p>
                      </div>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">📊 Stats:</p>
                        <p>• XP: {type === "week2" ? "210" : "340"} · Tier: {type === "week2" ? "🥾 Trailblazer" : "🧗🏼 Summit Seeker"}</p>
                        <p>• 🏆 Leaderboard: #3 of 12 cAMPers</p>
                      </div>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">🔥 Engagement:</p>
                        <p>• 🥾 Trail Markers: 82% · 👀 Focus: 91% · ⏱️ Time: 78% · 🎯 Overall: 84%</p>
                      </div>
                      <div className="pl-3 border-l-2 border-gray-200 space-y-1">
                        <p className="font-semibold text-gray-800">📝 cAMP Quiz:</p>
                        <p>• Passed: {type === "week2" ? "8/9" : "14/15"} · Avg: 82% · 1st Pass: 79%</p>
                      </div>
                    </>
                  )}
                  {reflection.trim() && (
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-100 mt-2">
                      <p className="font-medium text-amber-800 text-xs mb-1">💭 My reflection:</p>
                      <p className="text-gray-700 italic">"{reflection.trim()}"</p>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="font-semibold text-gray-600 text-xs">📖 Quick Reference for Managers</p>
                    <p className="text-[11px] text-gray-400 mt-1">Trail Markers · cAMP Quiz · Engagement Score · XP · S&R · WtS · Pacing</p>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">📋 Manager Feedback Survey link included (Required — only JT sees responses)</p>
                </div>
              </div>
              <span className="block w-full py-3 rounded-lg text-sm font-bold bg-indigo-600 text-white text-center cursor-pointer hover:bg-indigo-700 transition-colors">
                ✉️ Send via Gmail
              </span>
              <p className="text-xs text-center text-gray-400">This opens Gmail with your email pre-filled. After sending, come back to mark it as sent.</p>
            </>
          )}
        </div>

        {/* Footer navigation — no Skip */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {step !== "stats" && (
                <button
                  onClick={() => setStep(step === "email" ? "reflect" : "stats")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ← Back
                </button>
              )}
              {step === "stats" && (
                <p className="text-xs text-gray-500">3 steps: Stats → Reflect → Send via Gmail</p>
              )}
            </div>
            <div>
              {step === "stats" && (
                <button
                  onClick={() => setStep("reflect")}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors`}
                >
                  Next: Add Reflection →
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
        </div>
      </div>
    </div>
  );
}
