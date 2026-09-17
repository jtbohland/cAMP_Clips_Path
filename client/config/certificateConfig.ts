/**
 * Certificate Cabin — path-specific certificate definitions + LinkedIn share text.
 *
 * Each certificate maps to a milestone:
 *   approach  — Approach completed (modules signed off)
 *   week2     — Week 1 of Ascent complete (anchor point sent)
 *   week3     — Week 2 of Ascent complete (anchor point sent)
 *   week4     — Week 3 of Ascent complete (AE/SDR only)
 *   summit    — Summit reached (all clips done + approach complete)
 *
 * Emojis match the in-app week icons:
 *   Approach = 🚡  |  Week 2 = 🥾  |  Week 3 = 🏞️  |  Week 4 = 🧗🏻‍♂️  |  Summit = 🏆
 *
 * LinkedIn share text follows a progressive mountain-journey narrative.
 * Background watermark key tells the CertificateCard which illustration to render.
 */

// ── Hashtags (shared across all posts) ─────────────────────────────
export const LINKEDIN_HASHTAGS =
  "#salesenablement #onboarding #professionaldevelopment #growthmindset #learninganddevelopment #cAMPAscent #Amplitude";

// ── Types ──────────────────────────────────────────────────────────
export type CertificateKey = "approach" | "week2" | "week3" | "week4" | "summit";

export type WatermarkKey = "tent" | "trees" | "carabiner" | "mountain" | "flag";

export interface CertificateDef {
  key: CertificateKey;
  title: string;
  subtitle: string;
  emoji: string;
  /** Topics trained on — shown as pills */
  topics: string[];
  linkedInText: string;
  color: "amber" | "emerald" | "sky" | "indigo" | "purple";
  /** Which background watermark illustration to render */
  watermark: WatermarkKey;
}

// ── Topics per week per path ───────────────────────────────────────
const APPROACH_TOPICS_AE = ["MEDDPICC", "Challenger", "Amplitude Academy", "Wheel & Deal"];
const APPROACH_TOPICS_SDR = ["MEDDPICC", "Challenger", "Amplitude Academy", "Wheel & Deal"];
const APPROACH_TOPICS_PROMO = ["Amplitude Academy", "Wheel & Deal"];

const WEEK2_TOPICS_AE = ["Verticals & Personas", "Lead Generation", "GTM Strategy", "Prospecting", "Cold Calling", "Renewal Operations"];
const WEEK2_TOPICS_SDR = ["Verticals & Personas", "Lead Generation", "GTM Strategy", "Prospecting", "Cold Calling", "Renewal Operations"];
const WEEK2_TOPICS_PROMO = ["Renewal Operations", "Core Revenue Operations"];

const WEEK3_TOPICS_AE = ["Competitive Landscape", "Account Planning", "Discovery", "Pricing & Packaging", "Partners"];
const WEEK3_TOPICS_SDR = ["Competitive Landscape", "Account Planning", "Discovery", "Pricing & Packaging", "Partners"];
const WEEK3_TOPICS_PROMO = ["Deals", "Forecasting", "Closing the Loop"];

const WEEK4_TOPICS_AE = ["Forecasting", "CLM", "Deal Desk & CPQ", "Solution Engineers", "Professional Services"];
const WEEK4_TOPICS_SDR = ["Forecasting", "CLM", "Deal Desk & CPQ", "Solution Engineers", "Professional Services"];

// ── Week themes per path ───────────────────────────────────────────
export const WEEK_THEMES: Record<string, Record<string, string>> = {
  AE: {
    week2: "Building Your Revenue Engine Foundations",
    week3: "Designing & Winning Strategic Deals",
    week4: "Executing, Governing & Scaling Deals",
  },
  SDR: {
    week2: "Building Your Pipeline Foundations",
    week3: "Sharpening Your Competitive & Discovery Skills",
    week4: "Closing the Loop",
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
  return "AE";
}

// ── LinkedIn post text builders ────────────────────────────────────
// Public-facing professional posts — grammar and tone matter.

function approachText(pathLabel: string): string {
  return `Just started my cAMP Ascent journey with @Amplitude's Global Sales Enablement team! Completed the Approach — mastering ${pathLabel}. Now it's time to climb. 🏔️\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week2Text(): string {
  return `Week 2 of cAMP Ascent ✅ — Built my revenue engine foundations with @Amplitude's Global Sales Enablement team. From verticals and personas to GTM strategy, the base camp is set. The trail ahead is calling. 🥾\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week2TextSDR(): string {
  return `Week 2 of cAMP Ascent ✅ — Built my revenue engine foundations with @Amplitude's Global Sales Enablement team. Prospecting, cold calling, and pipeline generation are dialed in. The trail ahead is calling. 🥾\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week3Text(): string {
  return `Halfway up the mountain! Week 3 of cAMP Ascent complete — sharpening my skills in deal design, competitive positioning, and account planning with @Amplitude. The summit is in sight. ⛰️\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week3TextPromo(): string {
  return `Halfway up the mountain! Week 3 of cAMP Ascent complete — diving deep into deals, forecasting, and closing the loop with @Amplitude. The summit is in sight. ⛰️\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
}

function week4Text(): string {
  return `The final push before the summit! Week 4 of cAMP Ascent done — mastering deal execution, forecasting, and partner strategy with @Amplitude. One more step to go. 🦅\n\nEarned in cAMP Ascent — Amplitude's AI-powered enablement app.\n\n${LINKEDIN_HASHTAGS}`;
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
  const isSDR = pathKey === "SDR";

  const approachTopics = isPromo ? APPROACH_TOPICS_PROMO : isSDR ? APPROACH_TOPICS_SDR : APPROACH_TOPICS_AE;
  const week2Topics = isPromo ? WEEK2_TOPICS_PROMO : isSDR ? WEEK2_TOPICS_SDR : WEEK2_TOPICS_AE;
  const week3Topics = isPromo ? WEEK3_TOPICS_PROMO : isSDR ? WEEK3_TOPICS_SDR : WEEK3_TOPICS_AE;

  const approachPathLabel = isPromo
    ? "Amplitude Academy & Wheel & Deal"
    : "MEDDPICC, Challenger, Amplitude Academy & Wheel & Deal";

  const certs: CertificateDef[] = [
    {
      key: "approach",
      title: "The Approach",
      subtitle: "Frameworks, Product Knowledge & Practice Reps",
      emoji: "🚡",
      topics: approachTopics,
      linkedInText: approachText(approachPathLabel),
      color: "amber",
      watermark: "tent",
    },
    {
      key: "week2",
      title: "Week 2 Complete",
      subtitle: themes.week2,
      emoji: "🥾",
      topics: week2Topics,
      linkedInText: isSDR ? week2TextSDR() : week2Text(),
      color: "emerald",
      watermark: "trees",
    },
    {
      key: "week3",
      title: "Week 3 Complete",
      subtitle: themes.week3,
      emoji: "🏞️",
      topics: week3Topics,
      linkedInText: isPromo ? week3TextPromo() : week3Text(),
      color: "sky",
      watermark: "carabiner",
    },
  ];

  // AE and SDR get week 4; Promo does not
  if (!isPromo) {
    certs.push({
      key: "week4",
      title: "Week 4 Complete",
      subtitle: themes.week4,
      emoji: "🧗🏻‍♂️",
      topics: WEEK4_TOPICS_AE,
      linkedInText: week4Text(),
      color: "indigo",
      watermark: "mountain",
    });
  }

  const totalWeeks = isPromo ? 3 : 4;
  certs.push({
    key: "summit",
    title: "Summit Reached",
    subtitle: "cAMP Ascent Complete",
    emoji: "🏆",
    topics: [],
    linkedInText: summitText(tierName, totalWeeks),
    color: "purple",
    watermark: "flag",
  });

  return certs;
}
