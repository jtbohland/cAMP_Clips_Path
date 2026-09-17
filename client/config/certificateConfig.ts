/**
 * Certificate Cabin — path-specific certificate definitions + LinkedIn share text.
 *
 * Each certificate maps to a milestone:
 *   approach  — Approach completed (modules signed off)
 *   week2     — Week 2 anchor point sent
 *   week3     — Week 3 anchor point sent
 *   week4     — Week 4 anchor point sent  (AE only — SDR/Promo have fewer weeks)
 *   summit    — Summit reached (all clips done + approach complete)
 *
 * LinkedIn share text follows a progressive mountain-journey narrative.
 */

// ── Hashtags (shared across all posts) ─────────────────────────────
export const LINKEDIN_HASHTAGS =
  "#salesenablement #onboarding #professionaldevelopment #growthmindset #learninganddevelopment #cAMPAscent #Amplitude";

// ── Types ──────────────────────────────────────────────────────────
export type CertificateKey = "approach" | "week2" | "week3" | "week4" | "summit";

export interface CertificateDef {
  key: CertificateKey;
  /** Display title on the certificate card */
  title: string;
  /** Subtitle / week theme */
  subtitle: string;
  /** Emoji shown on card */
  emoji: string;
  /** Path-specific modules / topics listed on the certificate */
  modules: string[];
  /** Pre-filled LinkedIn post body (progressive narrative per week) */
  linkedInText: string;
  /** Card color theme */
  color: "amber" | "emerald" | "sky" | "indigo" | "purple";
}

// ── Approach modules per path ──────────────────────────────────────
const APPROACH_MODULES_AE = [
  "MEDDPICC Framework",
  "Amplitude Academy (Analytics, Experiment & Statsig, Session Replay, Guides & Surveys)",
  "Challenger Sales Methodology",
  "Wheel & Deal Simulation",
];

const APPROACH_MODULES_SDR = [
  "MEDDPICC Framework",
  "Amplitude Academy (Analytics, Experiment & Statsig, Session Replay, Guides & Surveys)",
  "Challenger Sales Methodology",
  "Wheel & Deal Simulation",
];

const APPROACH_MODULES_PROMO = [
  "Amplitude Academy (Analytics, Experiment & Statsig, Session Replay, Guides & Surveys)",
  "Wheel & Deal Simulation",
];

// ── Week themes per path ───────────────────────────────────────────
export const WEEK_THEMES: Record<string, Record<string, string>> = {
  AE: {
    week2: "Building Your Revenue Engine Foundations",
    week3: "Designing & Winning Strategic Deals",
    week4: "Executing, Governing & Scaling Deals",
  },
  SDR: {
    week2: "Building Your Revenue Engine Foundations",
    week3: "Designing & Winning Strategic Deals",
    week4: "Executing, Governing & Scaling Deals",
  },
  "SDR>Velocity Promo": {
    week2: "Core Revenue Operations & Renewals",
    week3: "Deals, Forecasting & Closing the Loop",
  },
};

// ── Helper: normalise role → path key ──────────────────────────────
export function roleToPathKey(role: string): string {
  if (role === "SDR>Velocity Promo" || role === "Velocity Promo") return "SDR>Velocity Promo";
  if (role === "SDR") return "SDR";
  return "AE"; // Velocity AE, Emerging AE, Majors AE, Strategic AE, PSM, Renewals
}

// ── LinkedIn post text builders ────────────────────────────────────
function approachText(pathLabel: string): string {
  return `Just started my cAMP Ascent journey with @Amplitude's Global Sales Enablement team! Completed the Approach — mastering ${pathLabel}. Now it's time to climb. 🏔️\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week2Text(weekTheme: string): string {
  return `Week 1 of cAMP Ascent ✅ — ${weekTheme} with @Amplitude's Global Sales Enablement team. From verticals and personas to GTM strategy, the base camp is set. The trail ahead is calling. 🥾\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week3Text(weekTheme: string): string {
  return `Halfway up the mountain! Week 2 of cAMP Ascent complete — learning to ${weekTheme.toLowerCase()} with @Amplitude. Discovery, competitive positioning, and account planning are sharpened. The summit is in sight. ⛰️\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week4Text(weekTheme: string): string {
  return `The final push before the summit! Week 3 of cAMP Ascent done — ${weekTheme.toLowerCase()} with @Amplitude. Forecasting, CLM, and partner strategy locked in. One more step to go. 🦅\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function summitText(tierName: string, weeksCount: number): string {
  return `🏔️ Summit Reached! Just completed cAMP Ascent — Amplitude's AI-powered sales enablement program! Earned my ${tierName} badge after ${weeksCount} weeks of discovery, prospecting, and deal strategy training. Huge thanks to @Amplitude's Global Sales Enablement team for building something genuinely innovative.\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

// ── Build certificates for a given path ────────────────────────────
export function getCertificatesForPath(
  pathKey: string,
  tierName: string = "Trailblazer"
): CertificateDef[] {
  const themes = WEEK_THEMES[pathKey] ?? WEEK_THEMES.AE;
  const isPromo = pathKey === "SDR>Velocity Promo";

  const approachModules = isPromo
    ? APPROACH_MODULES_PROMO
    : pathKey === "SDR"
    ? APPROACH_MODULES_SDR
    : APPROACH_MODULES_AE;

  const approachPathLabel = isPromo
    ? "Amplitude Academy & Wheel & Deal"
    : "MEDDPICC, Challenger, Amplitude Academy & Wheel & Deal";

  const certs: CertificateDef[] = [
    {
      key: "approach",
      title: "The Approach",
      subtitle: "Frameworks, Product Knowledge & Practice Reps",
      emoji: "🏕️",
      modules: approachModules,
      linkedInText: approachText(approachPathLabel),
      color: "amber",
    },
    {
      key: "week2",
      title: "Week 1 Complete",
      subtitle: themes.week2,
      emoji: "⛺",
      modules: [],
      linkedInText: week2Text(themes.week2),
      color: "emerald",
    },
    {
      key: "week3",
      title: "Week 2 Complete",
      subtitle: themes.week3,
      emoji: "🧗",
      modules: [],
      linkedInText: week3Text(themes.week3),
      color: "sky",
    },
  ];

  // AE and SDR get week 4; Promo does not
  if (!isPromo) {
    certs.push({
      key: "week4",
      title: "Week 3 Complete",
      subtitle: themes.week4,
      emoji: "🏔️",
      modules: [],
      linkedInText: week4Text(themes.week4),
      color: "indigo",
    });
  }

  const totalWeeks = isPromo ? 3 : 4;
  certs.push({
    key: "summit",
    title: "Summit Reached",
    subtitle: "cAMP Ascent Complete",
    emoji: "🏆",
    modules: [],
    linkedInText: summitText(tierName, totalWeeks),
    color: "purple",
  });

  return certs;
}
