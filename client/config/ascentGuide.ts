// Ascent Guide — session metadata for cAMP Clips
// Maps clip sort order → guide entry (summary, learning objectives, SMEs)
// Clips sharing a topic show the same entry. No entry = no card shown.

export type AscentGuideSme = {
  name: string;
  title: string;
};

export type AscentGuideEntry = {
  id: string;
  summary: string;
  learningObjectives: string[];
  smes: AscentGuideSme[];
};

// Full guide data, keyed by session ID
const GUIDE_SESSIONS: Record<string, AscentGuideEntry> = {
  day1: {
    id: "day1",
    summary:
      "This session introduces who we sell to and why it matters. New hires will dig into Amplitude's priority industries and buyer personas to understand their goals, challenges, and success metrics. The focus is on connecting product value to real-world problems, not just memorizing attributes. By the end, AEs should see ICPs as a filter for focus and qualification, not a slide to skim once.",
    learningObjectives: [
      "Identify Amplitude's target industries and core buyer personas, including their top priorities and pain points.",
      "Map Amplitude value drivers to specific persona and industry needs.",
      "Use ICP criteria to quickly qualify or deprioritize accounts and opportunities.",
    ],
    smes: [{ name: "Michele Morales", title: "Group Product Marketing Manager" }],
  },
  day2: {
    id: "day2",
    summary:
      "This session explains how top-of-funnel demand gets generated, scored, and routed to AEs. Reps will learn how MQLs are defined, how inbounds move through the funnel, and what 'good' follow-up looks like. Emphasis is on speed-to-lead, context-rich outreach, and clean Salesforce hygiene.",
    learningObjectives: [
      "Explain how MQLs and inbounds are created, scored, and assigned in our GTM system.",
      "Interpret key TOFU dashboards/fields to understand lead source, intent, and next best action.",
      "Execute a high-quality follow-up motion (email, call, sequence) for different inbound scenarios.",
    ],
    smes: [
      { name: "Nathan Youmans", title: "Director, Marketing Operations" },
      { name: "Chelsie Cauthon", title: "Sr. Marketing Transformation Manager" },
    ],
  },
  day3: {
    id: "day3",
    summary:
      "This day orients AEs around the GTM Launch Pad as their 'single pane of glass' for managing pipeline and priorities. Reps will learn how to navigate the dashboard, interpret core metrics, and use it to drive their daily workflow. The focus is on turning data into action: which accounts to touch, which deals to progress, and what risks to mitigate.",
    learningObjectives: [
      "Navigate the GTM Launch Pad dashboard and locate key views for pipeline, coverage, and activity.",
      "Interpret core metrics (e.g., coverage, stage distribution, conversion rates) to assess territory health.",
      "Use Launch Pad insights to build a daily/weekly action plan for accounts and opportunities.",
    ],
    smes: [{ name: "Matt Kahan", title: "Sr. Manager, GTM Strategy & Analytics" }],
  },
  day4: {
    id: "day4",
    summary:
      "This session defines our standard prospecting motion across channels (email, phone, LinkedIn, gifting, etc.). New hires will learn how to use our tools, messaging frameworks, and cadences to generate meetings in a focused way. We'll connect prospecting back to ICPs, TOFU signals, and outreach best practices so reps can build repeatable pipeline.",
    learningObjectives: [
      "Describe the end-to-end prospecting process from account selection to meeting booked.",
      "Build and execute a multi-touch, multi-channel outreach sequence aligned to persona and intent.",
      "Use our prospecting tools and data sources correctly to maintain clean, compliant records.",
    ],
    smes: [{ name: "JT Bohland", title: "Sr. Enablement Program Manager" }],
  },
  day6: {
    id: "day6",
    summary:
      "This day equips AEs with a practical understanding of our competitive landscape and how to position Amplitude. Reps will explore our main competitors, where we win/lose, and the narratives that resonate with different buyers. The emphasis is on confident, honest positioning and using competitive intel to guide discovery and strategy, not trash talk.",
    learningObjectives: [
      "Identify our primary competitors and articulate their typical strengths and weaknesses.",
      "Position Amplitude clearly and credibly against competitors for key use cases and segments.",
      "Use competitive intel to shape questions, proof points, and deal strategy.",
    ],
    smes: [{ name: "Darshil Gandhi", title: "Director, Product Marketing" }],
  },
  day7: {
    id: "day7",
    summary:
      "This session teaches AEs how to think like owners of their territories and strategic accounts. They'll learn how to build an account plan that covers stakeholders, whitespace, risk, and multi-threading strategies. The goal is to move from reactive 'opportunity management' to proactive account orchestration.",
    learningObjectives: [
      "Build a basic account plan that includes customer goals, org map, whitespace, and risk areas.",
      "Identify and prioritize strategic plays within an account (expansion, retention, new business).",
      "Use account planning artifacts to align POD members (SE, CS, partners, leadership) on strategy.",
    ],
    smes: [
      { name: "Christian Newth", title: "Director, Sales Strategy & Operations (NAMER)" },
      { name: "Simon Levinson", title: "Sr. Solutions Lead" },
    ],
  },
  day8: {
    id: "day8",
    summary:
      "This day deepens discovery skills within the context of MEDDPICC and the Customer Engagement Model (CEM), and then shows how to operationalize them in our tools. Reps will practice asking high-quality questions, sequencing discovery across stakeholders, and capturing insights that drive urgency and differentiation. We'll also introduce Spekit as your just-in-time enablement layer for discovery (including the Discovery Question Repository) and Deal Rooms as a way to curate and share those insights with customers.",
    learningObjectives: [
      "Craft and deliver discovery questions that uncover pains, metrics, and decision dynamics, using the Discovery Question Repository + Glean agents.",
      "Map discovery findings into MEDDPICC components and CEM stages in Salesforce to drive clear, evidence-based next steps.",
      "Create and use Deal Rooms in Spekit to share discovery recaps, value hypotheses, and mutual action plans with customers and prospects.",
    ],
    smes: [],
  },
  day10: {
    id: "day10",
    summary:
      "This day shows AEs how to use partners as a force multiplier throughout the deal cycle. Reps will learn partner types, when to bring them in, and how to co-create value with them for customers. The emphasis is on practical scenarios: influence, co-sell, implementation support, and expansion.",
    learningObjectives: [
      "Identify which partner types (SIs, tech partners, agencies) are most relevant for a given account.",
      "Describe where in the deal cycle partners can add the most value (discovery, validation, implementation, success).",
      "Coordinate with partner and internal teams to design joint plans and next steps for key opportunities.",
    ],
    smes: [{ name: "Nick Iyengar", title: "Head of Global Partnerships" }],
  },
  day11: {
    id: "day11",
    summary:
      "This session focuses on building accurate, defensible forecasts that leadership can trust. AEs will learn the mechanics of forecasting in our tools, how to incorporate services into deal structures, and how to avoid 'happy ears.' The goal is to make forecasting a disciplined, evidence-based habit rather than a last-minute spreadsheet exercise.",
    learningObjectives: [
      "Update opportunity stages, amounts, and close dates based on clear criteria and buyer verifiers.",
      "Incorporate professional services into deal structures appropriately and reflect them in forecasts.",
      "Articulate the rationale behind forecast calls (commit, upside, best case) using concrete signals.",
    ],
    smes: [{ name: "Corey Gibbel", title: "Sales Strategy & Operations Manager" }],
  },
  day12: {
    id: "day12",
    summary:
      "This day equips AEs with a library of real customer stories and the skills to use them effectively. Reps will learn how to select the right story for the audience, frame it in a Teach–Tailor–Take Control narrative, and connect outcomes back to the prospect's world. The focus is on storytelling as a sales tool, not just name-dropping logos.",
    learningObjectives: [
      "Recall several relevant Amplitude customer stories across priority industries and use cases.",
      "Structure a customer story (context, challenge, action, outcome) that reinforces your commercial insight.",
      "Tailor the story to different stakeholders so it lands as 'people like me' rather than generic proof.",
    ],
    smes: [],
  },
  day13: {
    id: "day13",
    summary:
      "This session walks AEs through the contract lifecycle from initial request to signature and storage. They'll learn how Legal and Sales Ops think, what slows deals down, and what good deal hygiene looks like. The goal is to reduce surprises, rework, and last-minute escalations by getting contracts right the first time.",
    learningObjectives: [
      "Describe the end-to-end contract lifecycle and systems involved (e.g., CLM & Salesforce).",
      "Identify common red flags and deal structures that require early Legal/Deal Desk involvement.",
      "Prepare clean, complete inputs (order forms, terms, approvals) to minimize contract friction and cycle time.",
    ],
    smes: [
      { name: "Craig Rudrud", title: "Senior Systems Engineer" },
      { name: "Joy Udom", title: "Director, Associate General Counsel" },
      { name: "Sarah Simmons", title: "Legal Operations Manager" },
    ],
  },
  day14: {
    id: "day14",
    summary:
      "This day explains how to partner with Deal Desk and use CPQ effectively. Reps will learn how to submit structured requests, what information is required, and how to stay within policy while still being creative. The focus is on building muscle for scalable, compliant deal-making rather than ad hoc exceptions.",
    learningObjectives: [
      "Explain the role of Deal Desk and when/how to engage them on complex deals.",
      "Use CPQ correctly to configure quotes that align with pricing, packaging, and policy.",
      "Anticipate and prepare for approval paths (discounts, non-standard terms, structure) to avoid last-minute delays.",
    ],
    smes: [
      { name: "Matt Murray", title: "Director, Sales Finance" },
      { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations (on leave)" },
      { name: "Katie Helie", title: "VP of Finance" },
    ],
  },
  day15: {
    id: "day15",
    summary:
      "This session shows AEs how to orchestrate SEs and Professional Services as part of a winning deal team. Reps will learn when to pull in SEs for discovery, demos, and validation, and how to position Services as a value accelerator rather than a cost line. The emphasis is on pod-based selling and making sure each expert is used intentionally.",
    learningObjectives: [
      "Define the core responsibilities of SEs and Professional Services in the sales cycle.",
      "Write effective internal briefs and meeting plans so SEs and PS can deliver targeted, high-impact engagements.",
      "Position Services as a strategic investment that de-risks deployment and accelerates time-to-value for customers.",
    ],
    smes: [
      { name: "Taylor Wolfe", title: "Enablement Program Manager – SEs" },
      { name: "Ganit Bar-Dor", title: "Sr. Director, Global Professional Services" },
      { name: "Angela Dunstan", title: "Professional Services Operations Manager" },
    ],
  },
};

// Map from clip sort order → guide session ID
// Days without cAMP Clips (Day 5 Renewals, Day 9 Pricing) are not included
const SORT_ORDER_TO_SESSION_ID: Record<number, string> = {
  1: "day1",
  2: "day2",
  3: "day3",
  4: "day4",
  5: "day6",  // clip sort 5 = Competitive Landscape (Day 6 in guide)
  6: "day7",
  7: "day7",  // Account Planning (Momentum for Slack) — same guide
  8: "day8",
  9: "day8",  // Discovery (Spekit Deal Rooms) — same guide
  10: "day10",
  11: "day11",
  12: "day11", // Forecasting (Intro to Services) — same guide
  13: "day12",
  14: "day13",
  15: "day14",
  16: "day15",
  17: "day15", // Leveraging Professional Services — same guide
};

/**
 * Returns the Ascent Guide entry for a given clip sort order,
 * or null if no guide entry exists for that clip.
 */
export function getGuideEntryForClip(sortOrder: number): AscentGuideEntry | null {
  const sessionId = SORT_ORDER_TO_SESSION_ID[sortOrder];
  if (!sessionId) return null;
  return GUIDE_SESSIONS[sessionId] ?? null;
}
