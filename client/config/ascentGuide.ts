// Ascent Guide — session metadata for cAMP Clips
// Maps clip sort order → guide entry (summary, learning objectives, SMEs)
// Clips sharing a topic show the same entry. No entry = no card shown.

export type AscentGuideSme = {
  name: string;
  title: string;
  emoji?: string;
};

export type AscentGuideEntry = {
  id: string;
  summary: string;
  learningObjectives: string[];
  smes: AscentGuideSme[];
  /** Optional "Follow Along" link — opens the tool being demo'd in the clip */
  followAlongUrl?: string;
  followAlongLabel?: string;
};

// Full guide data, keyed by session ID
const GUIDE_SESSIONS: Record<string, AscentGuideEntry> = {
  // ── Day 1 (sort 1): Understanding Our Verticals ──
  day1_industries: {
    id: "day1_industries",
    summary:
      "This session introduces who we sell to at the industry level. New hires will learn why vertical fluency matters, explore Amplitude's priority industries, and practice a five-step repeatable habit for selling into any vertical. The focus is on connecting product value to real-world industry workflows, not just memorizing company names.",
    learningObjectives: [
      "Explain why vertical fluency matters and how it reduces uncertainty for buyers.",
      "Identify Amplitude's priority industries and the key challenges each one faces.",
      "Apply the five-step repeatable habit to prepare for conversations in any industry.",
    ],
    smes: [{ name: "Michele Morales", title: "Group Product Marketing Manager" }],
  },

  // ── Day 1 (sort 2): Understanding Our Personas ──
  day1_personas: {
    id: "day1_personas",
    summary:
      "This session digs into the buyer personas reps will engage across Amplitude's target accounts. Reps will learn how to identify decision-makers, influencers, and end-users, understand their goals, challenges, and success metrics, and map Amplitude value drivers to specific persona needs. The emphasis is on seeing ICPs as a filter for focus and qualification.",
    learningObjectives: [
      "Identify core buyer personas at target accounts, including their top priorities and pain points.",
      "Map Amplitude value drivers to specific persona needs and buying motivations.",
      "Use ICP criteria to quickly qualify or deprioritize accounts and opportunities.",
    ],
    smes: [{ name: "Michele Morales", title: "Group Product Marketing Manager" }],
  },

  // ── Day 2 (sort 3): Top of Funnel ──
  day2: {
    id: "day2",
    summary:
      "This session explains how top-of-funnel demand gets generated, scored, and routed to reps. Reps will learn how MQLs are defined, how inbounds move through the funnel, and what 'good' follow-up looks like. Emphasis is on speed-to-lead, context-rich outreach, and clean Salesforce hygiene.",
    learningObjectives: [
      "Explain how MQLs and inbounds are created, scored, and assigned in our GTM system.",
      "Interpret key TOFU dashboards/fields to understand lead source, intent, and next best action.",
      "Execute a high-quality follow-up motion (email, call, sequence) for different inbound scenarios.",
    ],
    smes: [
      { name: "Nathan Youmans", title: "Director, Marketing Operations" },
      { name: "Chelsie Cauthon", title: "Sr. Marketing Transformation Manager" },
    ],
    followAlongUrl:
      "https://amplitude.lightning.force.com/lightning/o/Lead/list?filterName=My_MQLs_Slack",
    followAlongLabel: "My MQLs (SFDC)",
  },

  // ── Day 3 (sort 4): GTM Launch Pad ──
  day3: {
    id: "day3",
    summary:
      "This day orients reps around the GTM Launch Pad as their 'single pane of glass' for managing pipeline and priorities. Reps will learn how to navigate the dashboard, interpret core metrics, and use it to drive their daily workflow. The focus is on turning data into action: which accounts to touch, which deals to progress, and what risks to mitigate.",
    learningObjectives: [
      "Navigate the GTM Launch Pad dashboard and locate key views for pipeline, coverage, and activity.",
      "Interpret core metrics (e.g., coverage, stage distribution, conversion rates) to assess territory health.",
      "Use Launch Pad insights to build a daily/weekly action plan for accounts and opportunities.",
    ],
    smes: [{ name: "Matt Kahan", title: "Sr. Manager, GTM Strategy & Analytics" }],
    followAlongUrl: "https://amplitude.lightning.force.com/analytics/dashboard/0FKUw0000000gLpOAI",
    followAlongLabel: "GTM Launch Pad (SFDC)",
  },

  // ── Day 3 (sort 45): Pod Tower ──
  day3_pod_tower: {
    id: "day3_pod_tower",
    summary:
      "This session introduces the GTM Tower — Amplitude's AI-powered prospecting, revenue actions, and customer intelligence platform. Reps will learn how to activate their Tower agents, navigate the three core modules (Prospecting Actions, Revenue Actions, and Customer Intelligence), and use AI-generated artifacts like email sequences, mutual action plans, and customer health alerts to drive their daily workflow.",
    learningObjectives: [
      "Activate and configure the GTM Tower connector agents and understand when to re-run them.",
      "Navigate the three core modules — Prospecting Actions, Revenue Actions, and Customer Intelligence — and identify the key workflows in each.",
      "Review, approve, and provide feedback on AI-generated artifacts (email sequences, mutual action plans, pricing proposals) to accelerate deal progression.",
    ],
    smes: [{ name: "Simon Levinson", title: "Sr. Solutions Lead" }],
    followAlongUrl: "https://app.amplitude.com/customer-intel/amplitude/dashboard?source=left+nav",
    followAlongLabel: "GTM Tower",
  },

  // ── Day 4 (sort 5): Prospecting Process ──
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

  // ── Day 4 (sort 51): Prospecting for Marketing Events (SDR) ──
  day4_mktg_events: {
    id: "day4_mktg_events",
    summary:
      "This session walks you through the end-to-end process of prospecting for Amplitude marketing events. Hope Flower demonstrates how to use the marketing events calendar to identify upcoming opportunities, build targeted prospect lists in Sales Navigator using ICP personas and geographic filters, tag and export contacts via ZoomInfo into Salesforce, and sequence them in Outreach to drive event registrations.",
    learningObjectives: [
      "Use the marketing events calendar to identify upcoming events and build a territory-relevant prospect list in Sales Navigator.",
      "Tag, export, and verify contacts through ZoomInfo into Salesforce for clean prospecting workflows.",
      "Import Salesforce contacts into Outreach sequences to systematically invite prospects to marketing events.",
    ],
    smes: [{ name: "Talk to your Mentor or a Teammate", title: "", emoji: "👥" }],
  },

  // ── Day 5 (sort 55): Cold Calling in an AI World (SDR) ──
  day5_cold_calling: {
    id: "day5_cold_calling",
    summary:
      "This session is a hands-on cold calling masterclass led by Giulio, covering why reps fear cold calling (evolutionary biology of social rejection), how to build habits that reduce call anxiety, and how to gamify rejection to stay motivated. Giulio walks through three proven opener formulas \u2014 cheeky, neutral time-bound, and flattery-based \u2014 and explains the psychology behind each. The session also covers tone and delivery, getting past AI gatekeepers, and the PACE framework (Pause, Acknowledge, Challenge, Educate) for handling any objection on the spot.",
    learningObjectives: [
      "Understand why cold calling triggers fear of rejection and how to manage it through preparation and habit-building.",
      "Apply three opener formulas to immediately level the playing field with prospects.",
      "Use the PACE framework to handle any objection without over-talking or losing control of the call.",
    ],
    smes: [{ name: "Talk to your Mentor or a Teammate", title: "", emoji: "\ud83d\udc65" }],
  },

  // ── Day 5 (sort 56): Making Calls with Nooks (SDR) ──
  day5_nooks: {
    id: "day5_nooks",
    summary:
      "This session is a hands-on Nooks onboarding led by Kate that walks reps through setting up the AI-powered parallel dialer, choosing between power and parallel dialing modes, and using Smart Lists, Smart Presence, and phone type filters to maximize live conversations per calling session.",
    learningObjectives: [
      "Set up Nooks correctly by connecting Outreach and installing the Chrome extension for automatic prospect context.",
      "Choose the right dialing mode — parallel for volume, power for hot leads — and configure voicemail drops for unanswered calls.",
      "Use Smart Lists, phone type filters, and phone number rotation to increase connect rates and maximize daily at-bats.",
    ],
    smes: [{ name: "Talk to your Mentor or a Teammate", title: "", emoji: "👥" }],
  },

  // ── Day 5 (sort 6): Renewal Operations ──
  day5: {
    id: "day5",
    summary:
      "This session introduces how renewals work at Amplitude, and how AEs plug into the broader revenue and finance motion. Reps will learn renewal stages, roles and responsibilities, and key policies that govern pricing, discounts, and approvals. The goal is to demystify 'who does what when' so renewals feel like a managed process, not one-off fire drills.",
    learningObjectives: [
      "Explain the renewal lifecycle, including stages, timelines, and required milestones.",
      "Identify who owns which parts of the renewal (AE, CS, Renewals, Deal Desk, Finance) and when to engage them.",
      "Apply guardrails and policies (discount, term, uplift expectations) when shaping renewal strategies.",
    ],
    smes: [
      { name: "Lenora Bennis", title: "Sr. Manager, Renewals Management" },
      { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations (on leave)" },
      { name: "Katie Helie", title: "VP of Finance" },
    ],
  },

  // ── Day 6 (sort 7): The Competitive Landscape ──
  day6: {
    id: "day6",
    summary:
      "This day equips reps with a practical understanding of our competitive landscape and how to position Amplitude. Reps will explore our main competitors, where we win/lose, and the narratives that resonate with different buyers. The emphasis is on confident, honest positioning and using competitive intel to guide discovery and strategy, not trash talk.",
    learningObjectives: [
      "Identify our primary competitors and articulate their typical strengths and weaknesses.",
      "Position Amplitude clearly and credibly against competitors for key use cases and segments.",
      "Use competitive intel to shape questions, proof points, and deal strategy.",
    ],
    smes: [{ name: "Darshil Gandhi", title: "Director, Product Marketing" }],
  },

  // ── Day 7 (sorts 8–9): Account Planning ──
  day7: {
    id: "day7",
    summary:
      "This session teaches reps how to think like owners of their territories and strategic accounts. They'll learn how to build an account plan that covers stakeholders, whitespace, risk, and multi-threading strategies. The goal is to move from reactive 'opportunity management' to proactive account orchestration.",
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

    // ── Day 8 (sorts 10–11): Discovery That Accelerates ──
  day8: {
    id: "day8",
    summary:
      "This day deepens discovery skills within the context of MEDDPICC and the Customer Engagement Model (CEM), and then shows how to operationalize them in our tools. Reps will practice asking high-quality questions, sequencing discovery across stakeholders, and capturing insights that drive urgency and differentiation. We'll also introduce Spekit as your just-in-time enablement layer for discovery (including the Discovery Question Repository) and Deal Rooms as a way to curate and share those insights with customers.",
    learningObjectives: [
      "Craft and deliver discovery questions that uncover pains, metrics, and decision dynamics, using the Discovery Question Repository + Glean agents.",
      "Map discovery findings into MEDDPICC components and CEM stages in Salesforce to drive clear, evidence-based next steps.",
      "Create and use Deal Rooms in Spekit to share discovery recaps, value hypotheses, and mutual action plans with customers and prospects.",
    ],
    smes: [{ name: "YOU 🫵🏼", title: "You are the subject matter expert" }],
  },

  // ── Day 9 (sort 12): Pricing & Packaging 101 ──
  day9: {
    id: "day9",
    summary:
      "This session introduces Amplitude's 2026 pricing and packaging model and how reps should use it in real deals. Reps will learn core components (SKUs, tiers, add-ons), how value and usage map to price, and the basics of using the pricing tools. The focus is on enabling confident, value-based pricing conversations rather than tactical discounting.",
    learningObjectives: [
      "Explain Amplitude's core pricing and packaging structure in plain language to customers.",
      "Use the pricing tools/templates to configure a standard offer that aligns with customer use cases.",
      "Handle common pricing objections by tying back to value, outcomes, and long-term roadmap.",
    ],
    smes: [
      { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations (on leave)" },
      { name: "Katie Helie", title: "VP of Finance" },
    ],
  },

  // ── Day 10 (sort 13): Leveraging Partners ──
  day10: {
    id: "day10",
    summary:
      "This day shows reps how to use partners as a force multiplier throughout the deal cycle. Reps will learn partner types, when to bring them in, and how to co-create value with them for customers. The emphasis is on practical scenarios: influence, co-sell, implementation support, and expansion.",
    learningObjectives: [
      "Identify which partner types (SIs, tech partners, agencies) are most relevant for a given account.",
      "Describe where in the deal cycle partners can add the most value (discovery, validation, implementation, success).",
      "Coordinate with partner and internal teams to design joint plans and next steps for key opportunities.",
    ],
    smes: [{ name: "Nick Iyengar", title: "Head of Global Partnerships" }],
  },

  // ── Day 11 (sorts 14–15): Forecasting ──
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

  // ── Day 12 (sort 16): Customer Stories ──
  day12: {
    id: "day12",
    summary:
      "This day equips reps with a library of real customer stories and the skills to use them effectively. Reps will learn how to select the right story for the audience, frame it in a Teach–Tailor–Take Control narrative, and connect outcomes back to the prospect's world. The focus is on storytelling as a sales tool, not just name-dropping logos.",
    learningObjectives: [
      "Recall several relevant Amplitude customer stories across priority industries and use cases.",
      "Structure a customer story (context, challenge, action, outcome) that reinforces your commercial insight.",
      "Tailor the story to different stakeholders so it lands as 'people like me' rather than generic proof.",
    ],
    smes: [{ name: "YOU 🫵🏼", title: "You are the subject matter expert" }],
  },

  // ── Day 13 SDR (sort 165): Rules of Engagement ──
  day13_roe: {
    id: "day13_roe",
    summary:
      "This session teaches SDRs the Rules of Engagement — the policies that govern sourcing credit, territory boundaries, BoB transitions, and deal crediting. SDRs will play Rules of the Ridge, a scenario-based game that tests ROE knowledge through realistic case studies with real cAMP XP wagered on every answer.",
    learningObjectives: [
      "Apply primary and secondary sourcing credit rules to realistic SDR scenarios.",
      "Identify when territory, BoB transition, and live chat policies affect deal crediting.",
      "Evaluate edge cases around stage movement, clawbacks, and statute of limitations.",
    ],
    smes: [{ name: "Derrick Williams", title: "Sr. Director, Sales Development" }],
  },

  // ── Day 13 AE (sort 17): Contract Lifecycle Management ──
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

  // ── Day 14 (sort 18): Deal Desk & CPQ ──
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

  // ── Day 15 (sort 19): Leveraging Solution Engineers ──
  day15_se: {
    id: "day15_se",
    summary:
      "This session shows AEs how to orchestrate Solution Engineers as part of a winning deal team. Reps will learn when to pull in SEs for discovery, demos, and technical validation, and how to brief them so every engagement is targeted and high-impact. The emphasis is on pod-based selling and using your SE intentionally, not reactively.",
    learningObjectives: [
      "Define the core responsibilities of Solution Engineers in the sales cycle and when to engage them.",
      "Write effective internal briefs and meeting plans so SEs can deliver targeted, high-impact engagements.",
      "Collaborate with SEs to co-run discovery, build compelling demos, and validate technical fit.",
    ],
    smes: [{ name: "Taylor Wolfe", title: "Enablement Program Manager – SEs" }],
  },

  // ── Day 15 (sort 20): Leveraging Professional Services ──
  day15_ps: {
    id: "day15_ps",
    summary:
      "This session teaches AEs how to position Professional Services as a value accelerator rather than a cost line. Reps will learn when and how to bring PS into deals, how to scope engagements, and how to use services to de-risk deployment and accelerate time-to-value for customers.",
    learningObjectives: [
      "Define the core offerings and engagement models of Professional Services.",
      "Position Services as a strategic investment that de-risks deployment and accelerates time-to-value for customers.",
      "Coordinate with PS leadership to scope engagements and incorporate services into deal structures.",
    ],
    smes: [
      { name: "Ganit Bar-Dor", title: "Sr. Director, Global Professional Services" },
      { name: "Angela Dunstan", title: "Professional Services Operations Manager" },
    ],
  },
};

// Map from clip sort order → guide session ID
// Every clip in cliptracker_v2_clips must have an entry here.
// Clips that share a day/topic reuse the same session ID.
const SORT_ORDER_TO_SESSION_ID: Record<number, string> = {
  10: "day1_industries",  // Day 1: Understanding Our Verticals
  20: "day1_personas",    // Day 1: Understanding Our Personas
  30: "day2",             // Day 2: TOFU – MQLs & Inbounds
  40: "day3",             // Day 3: GTM Launch Pad
  45: "day3_pod_tower",   // Day 3: Pod Tower
  50: "day4",             // Day 4: Prospecting Process
  51: "day4_mktg_events", // Day 4: Prospecting for Marketing Events (SDR, lite)
  55: "day5_cold_calling", // Day 5: Cold Calling in an AI World (SDR)
  56: "day5_nooks",        // Day 5: Making Calls with Nooks (SDR)
  60: "day5",             // Day 5: Renewal Operations
  70: "day6",             // Day 6: The Competitive Landscape
  80: "day7",             // Day 7: Account Planning Best Practices
  90: "day7",             // Day 7: Account Planning (Momentum for Slack)
  100: "day8",            // Day 8: Discovery That Accelerates
  110: "day8",            // Day 8: Discovery (Spekit Deal Rooms)
  120: "day9",            // Day 9: Pricing & Packaging 101
  130: "day10",           // Day 10: Leveraging Partners
  140: "day11",           // Day 11: Forecasting
  150: "day11",           // Day 11: Forecasting (Intro to Services)
  160: "day12",           // Day 12: Customer Stories
  165: "day13_roe",       // Day 13 SDR: Rules of Engagement (SDR-only)
  170: "day13",           // Day 13 AE: Contract Lifecycle Management
  180: "day14",           // Day 14: Deal Desk & CPQ
  190: "day15_se",        // Day 15: Leveraging Solution Engineers
  200: "day15_ps",        // Day 15: Leveraging Professional Services
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
