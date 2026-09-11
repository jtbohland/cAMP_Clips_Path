/**
 * 🦌 DEARR Crossing — Question Bank
 *
 * 3 levels × 15+ questions each = 45+ total scenarios.
 * Each playthrough draws 5 random questions per level.
 * Failed levels reshuffle from the same bank — never the same 5 twice.
 */

export type DEARRQuestion = {
  id: string;
  pillar: "D" | "E" | "A" | "R-roi" | "R-renewal" | "multi";
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

// ══════════════════════════════════════════════════════════════
// LEVEL 1 — "The Renewal Trail" 🌲
// Basics: cadence structure, roles, DEARR pillar identification
// ══════════════════════════════════════════════════════════════
export const LEVEL_1_BANK: DEARRQuestion[] = [
  {
    id: "L1_01",
    pillar: "multi",
    scenario: "Your manager asks you to explain the Customer Operating Cadence to a new hire.",
    question: "How often does the joint review cadence rotate between Renewal Readiness and Deployment Review?",
    options: [
      "Daily standups alternate between the two",
      "Weekly — Weeks 1 & 3 are Renewal Readiness, Weeks 2 & 4 are Deployment Review",
      "Monthly — one full month per topic",
      "Quarterly business reviews cover both"
    ],
    correctIndex: 1,
    explanation: "The cadence rotates weekly on a fixed monthly schedule: Weeks 1 & 3 for Renewal Readiness, Weeks 2 & 4 for Deployment Review."
  },
  {
    id: "L1_02",
    pillar: "multi",
    scenario: "You're setting up your first POD sync and need to know who should be there.",
    question: "Who are the four mandatory POD members for every joint review?",
    options: [
      "AE, TSM, CSA, SE",
      "AE, TSM, Manager, VP",
      "AE, CSA, Deal Desk, Finance",
      "TSM, CSA, SE, Renewals Manager"
    ],
    correctIndex: 0,
    explanation: "Every POD consists of AE, TSM, CSA, and SE. Attendance is mandatory for all four members."
  },
  {
    id: "L1_03",
    pillar: "D",
    scenario: "A colleague asks what the 'D' in DEARR stands for and what metric to check first.",
    question: "What does the 'D' pillar measure, and what's the key metric?",
    options: [
      "Discovery — Number of sales calls logged",
      "Deployment — Projected Consumption and Monthly Run Rate",
      "Data — Number of events ingested per day",
      "Demand — Pipeline generated from the account"
    ],
    correctIndex: 1,
    explanation: "D = Deployment. Key metrics are Projected Consumption and Monthly Run Rate — are they consuming what they purchased?"
  },
  {
    id: "L1_04",
    pillar: "E",
    scenario: "You're reviewing a $300K strategic account and notice the 'E' column is flagged.",
    question: "What does the 'E' in DEARR focus on?",
    options: [
      "Expansion — upsell and cross-sell pipeline",
      "Engagement — Executive Sponsor alignment and last EBR date",
      "Enablement — training sessions delivered",
      "Efficiency — support ticket volume"
    ],
    correctIndex: 1,
    explanation: "E = Engagement. Key signals: Do we have an engaged Executive Buyer/Sponsor? When was the last EBR? Target: <6 months on $250K+ accounts."
  },
  {
    id: "L1_05",
    pillar: "A",
    scenario: "A customer's dashboard shows low WAU but high MAU.",
    question: "Which DEARR pillar does WAU (Weekly Active Users) map to?",
    options: [
      "Deployment — it measures product setup",
      "Adoption — it measures breadth and depth of usage",
      "ROI — it measures value delivered",
      "Renewal — it predicts churn risk"
    ],
    correctIndex: 1,
    explanation: "A = Adoption. WAU measures breadth of adoption. A large gap between MAU and WAU means there's opportunity to further embed Amplitude in workflows."
  },
  {
    id: "L1_06",
    pillar: "R-roi",
    scenario: "Your TSM mentions they haven't logged any Verified Outcomes for a key account.",
    question: "Which DEARR pillar are Verified Outcomes associated with?",
    options: [
      "Deployment",
      "Engagement",
      "ROI",
      "Renewal"
    ],
    correctIndex: 2,
    explanation: "R = ROI. Verified Outcomes quantify the value the customer is getting. Without them, you can't prove ROI at renewal time."
  },
  {
    id: "L1_07",
    pillar: "R-renewal",
    scenario: "It's renewal planning season and your manager asks about forecast categories.",
    question: "In a Renewal Readiness Review, what's the primary question being answered?",
    options: [
      "Is the customer deployed on all contracted products?",
      "Will this customer renew — and at what ARR?",
      "How many support tickets has the customer filed?",
      "Is the customer using AI features?"
    ],
    correctIndex: 1,
    explanation: "The primary question in Renewal Readiness is: 'Will this customer renew — and at what ARR?' Everything else feeds into answering that."
  },
  {
    id: "L1_08",
    pillar: "multi",
    scenario: "A new AE asks you what the difference between the two session types is.",
    question: "What's the core difference between Renewal Readiness and Deployment Review?",
    options: [
      "Different teams attend each session",
      "Renewal Readiness manages the renewal book; Deployment Review ensures new customers reach value",
      "Renewal Readiness is for Enterprise; Deployment Review is for SMB",
      "They're the same meeting with different names"
    ],
    correctIndex: 1,
    explanation: "Renewal Readiness manages risk and upside across the renewal book. Deployment Review ensures new customers hit deployment milestones and reach value."
  },
  {
    id: "L1_09",
    pillar: "multi",
    scenario: "You're looking at the review escalation tiers and see 'FLM Review' mentioned.",
    question: "Reviews escalate by deal size. What's the correct escalation order?",
    options: [
      "VP → FLM → POD → CCO",
      "POD → FLM → VP → CCO/CS SVP",
      "CCO → VP → FLM → POD",
      "FLM → POD → CCO → VP"
    ],
    correctIndex: 1,
    explanation: "Reviews escalate: POD-level first, then FLM, then VP, then CCO/CS SVP — increasing by deal size and strategic importance."
  },
  {
    id: "L1_10",
    pillar: "multi",
    scenario: "Your TSM is updating Salesforce before the weekly review.",
    question: "When must systems be updated before a joint review?",
    options: [
      "During the meeting itself",
      "Within 24 hours after the meeting",
      "By 5pm PST the day before the review",
      "Anytime during the review week"
    ],
    correctIndex: 2,
    explanation: "Systems must be current by 5pm PST the day before the review. Meeting time is for strategy, accountability, and escalation — not data entry."
  },
  {
    id: "L1_11",
    pillar: "D",
    scenario: "A customer signed 60 days ago and you're checking on their deployment.",
    question: "In a Deployment Review, what's the primary question being answered?",
    options: [
      "Will this customer renew at the same ARR?",
      "Is this customer deployed, adopting, and on track to get full value?",
      "How many users have been trained on the platform?",
      "What expansion opportunities exist?"
    ],
    correctIndex: 1,
    explanation: "The primary Deployment Review question: 'Is this customer deployed, adopting, and on track to get full value?'"
  },
  {
    id: "L1_12",
    pillar: "multi",
    scenario: "You need to understand what 'the through-line' means in the cadence.",
    question: "What do Renewal Readiness and Deployment Review share in common?",
    options: [
      "Same inspection framework (DEARR), same system of record (Salesforce), same data surface (Customer Intelligence)",
      "Same accounts reviewed, just different questions",
      "Same attendees, different VP sponsors",
      "Same cadence — both happen every week"
    ],
    correctIndex: 0,
    explanation: "Both use DEARR, Salesforce, and Customer Intelligence. The content of the conversation changes, the operating discipline does not."
  },
  {
    id: "L1_13",
    pillar: "multi",
    scenario: "A peer asks why we need both session types instead of just one big review.",
    question: "Why does Amplitude run BOTH Renewal Readiness and Deployment Reviews?",
    options: [
      "Compliance requires two separate meetings",
      "Deployment catches execution failures early; Renewal Readiness surfaces commercial risk up to 360 days out",
      "One is for Sales leadership, the other for CS leadership",
      "Historical precedent — no strategic reason"
    ],
    correctIndex: 1,
    explanation: "Deployment Reviews catch problems early while there's runway to fix them. Renewal Readiness surfaces risk up to 360 days out so nothing is a surprise at contract end."
  },
  {
    id: "L1_14",
    pillar: "R-renewal",
    scenario: "Your manager asks what timeframe Renewal Readiness covers.",
    question: "How far out does Renewal Readiness inspect renewals?",
    options: [
      "90 days before renewal",
      "180 days before renewal",
      "360 days — all renewals within a year",
      "Only current quarter renewals"
    ],
    correctIndex: 2,
    explanation: "Renewal Readiness inspects all renewals within 360 days, filtered by ARR tier and risk signal."
  },
  {
    id: "L1_15",
    pillar: "multi",
    scenario: "You're preparing for your first POD 1:1 with your TSM.",
    question: "What's the purpose of the weekly POD 1:1 between AE and TSM?",
    options: [
      "It replaces the joint review for smaller accounts",
      "Prep for joint reviews, align on account strategy, update forecasts, manage open actions",
      "It's optional and only for escalation cases",
      "To review support tickets and NPS scores"
    ],
    correctIndex: 1,
    explanation: "POD 1:1s are for prep, alignment, and forecast updates. The joint review is where you align on strategy — not where you discover new information."
  },
  {
    id: "L1_16",
    pillar: "E",
    scenario: "A customer's CSA mentions they haven't had a structured meeting with the account in two quarters.",
    question: "What DEARR pillar does this directly impact?",
    options: [
      "Deployment — they need to redeploy the product",
      "Engagement — consistent touchpoints are essential to understanding account health",
      "Discovery — consumption data will show the issue",
      "Revenue Optimization — this only matters at renewal"
    ],
    correctIndex: 1,
    explanation: "Engagement (E) requires regular, structured touchpoints — EBRs, check-ins, and POD syncs. A two-quarter gap means you're flying blind on account health."
  },
  {
    id: "L1_17",
    pillar: "A",
    scenario: "Your TSM shares that a customer's WAU has dropped 20% over 6 weeks.",
    question: "Which DEARR pillar should you investigate first?",
    options: [
      "Renewal — check when the contract ends",
      "Discovery — review the original contract terms",
      "Adoption — declining WAU is a direct adoption signal",
      "Engagement — schedule an executive meeting"
    ],
    correctIndex: 2,
    explanation: "WAU (Weekly Active Users) is a core Adoption metric. A 20% decline over 6 weeks is a clear adoption red flag that needs immediate investigation."
  },
  {
    id: "L1_18",
    pillar: "R-renewal",
    scenario: "A peer asks you how renewal accounts get prioritized in the review cadence.",
    question: "What determines which renewals get reviewed in Renewal Readiness?",
    options: [
      "All renewals are reviewed equally every week",
      "ARR tier and risk signals filter which accounts get reviewed from the 360-day pipeline",
      "Only accounts the AE flags manually",
      "Only renewals in the current quarter"
    ],
    correctIndex: 1,
    explanation: "Renewal Readiness uses ARR tier and risk signals to prioritize which accounts from the 360-day pipeline get reviewed. Not every renewal gets equal airtime."
  },
  {
    id: "L1_19",
    pillar: "D",
    scenario: "You're reviewing a new customer's onboarding and see they're at Day 30 with no instrumentation started.",
    question: "What deployment gate have they missed?",
    options: [
      "Gate 1 — Kickoff should be done by Day 15",
      "Gate 2 — Core instrumentation should be in progress by Day 30",
      "No gates have been missed yet — Day 30 is still early",
      "Gate 3 — Verified Outcomes should exist by Day 30"
    ],
    correctIndex: 1,
    explanation: "Gate 2 (Days 15-30) covers core instrumentation and initial deployment. At Day 30 with nothing started, this gate is missed and downstream milestones are at risk."
  },
  {
    id: "L1_20",
    pillar: "multi",
    scenario: "A new AE asks what 'DEARR' stands for.",
    question: "What are the five pillars of DEARR?",
    options: [
      "Deployment, Engagement, Adoption, Revenue, Retention",
      "Discovery, Engagement, Alignment, Risk Mitigation, Revenue Optimization",
      "Deployment, Engagement, Adoption, ROI (Return on Investment), Renewal",
      "Discovery, Execution, Adoption, Retention, Revenue"
    ],
    correctIndex: 2,
    explanation: "DEARR = Deployment, Engagement, Adoption, ROI (Return on Investment), Renewal. These five pillars frame every account health conversation in the operating cadence."
  },
];

// ══════════════════════════════════════════════════════════════
// LEVEL 2 — "Highway of Health Signals" 🛣️
// Intermediate: metrics, risk tiers, deployment gates
// ══════════════════════════════════════════════════════════════
export const LEVEL_2_BANK: DEARRQuestion[] = [
  {
    id: "L2_01",
    pillar: "D",
    scenario: "Account X is 120 days in with Monthly Run Rate at 45%.",
    question: "What's the correct intervention per the utilization standard?",
    options: [
      "Flag it for the next quarterly review",
      "Log a named play from the Event Volume Utilization Playbook with owner + due date in SFDC",
      "Send the customer an email asking them to use the product more",
      "Escalate directly to the CCO"
    ],
    correctIndex: 1,
    explanation: "Any account with Projected Consumption < 70% must have a named play from the Event Volume Utilization Playbook logged in SFDC with an owner and due date. Never a blank 'investigate' placeholder."
  },
  {
    id: "L2_02",
    pillar: "D",
    scenario: "A new customer signed 10 days ago. You check the deployment gates.",
    question: "What should be completed by Day 15?",
    options: [
      "Full platform deployment with all blades active",
      "Kickoff call held; use cases and success KPIs documented",
      "Monthly Run Rate ≥ 70%",
      "Executive Business Review completed"
    ],
    correctIndex: 1,
    explanation: "Gate 1 (Days 0-15): Kickoff Complete — kickoff call held, use cases and success KPIs documented. If missed, block all downstream milestones."
  },
  {
    id: "L2_03",
    pillar: "D",
    scenario: "An account is at Day 65 and shows zero events ingested.",
    question: "Which deployment gate has been missed, and what's the action?",
    options: [
      "Kickoff Complete — reschedule the kickoff",
      "Instrumentation Live — implementation escalation, identify blockers, engage CSA/Partner",
      "Utilization on Track — log a utilization play",
      "Verified Outcome — workshop with power users"
    ],
    correctIndex: 1,
    explanation: "Gate 2 (Days <60): Instrumentation Live — ≥1K events ingested. At Day 65 with zero events, this gate is missed. Escalate implementation, identify blockers, engage CSA/Partner."
  },
  {
    id: "L2_04",
    pillar: "A",
    scenario: "Customer Y has high MAU but a large gap between MAU and WAU.",
    question: "What does this signal indicate and what's the recommended action?",
    options: [
      "The account is healthy — high MAU is good",
      "Opportunity to further embed Amplitude in daily workflows — enable on scheduled reports, alerts, and integrations",
      "The customer is over-deployed and should reduce licenses",
      "Churn risk — they're only using it monthly"
    ],
    correctIndex: 1,
    explanation: "A high MAU/WAU gap means users log in but don't use it daily. Opportunity: enablement on workflow integrations, alerts, scheduled reports to build daily habits."
  },
  {
    id: "L2_05",
    pillar: "R-renewal",
    scenario: "A $180K Emerging account has LOW risk tier but only 1 core product adopted.",
    question: "What happens to the risk tier per the business logic rules?",
    options: [
      "Stays at LOW — single product doesn't matter",
      "Escalates from LOW to MEDIUM (single-product risk, $100-250K)",
      "Escalates directly to HIGH",
      "Stays LOW but gets a warning flag"
    ],
    correctIndex: 1,
    explanation: "Business rule: LOW tier + only 1 core product + ARR > $100K → escalate LOW to MEDIUM. Single-product dependency is a real churn risk."
  },
  {
    id: "L2_06",
    pillar: "R-renewal",
    scenario: "A $300K Major account is rated MEDIUM but only has 1 core product.",
    question: "What happens to the risk tier?",
    options: [
      "Stays at MEDIUM",
      "Drops to LOW since it's a Major account",
      "Escalates from MEDIUM to HIGH (single-product risk, $250K+)",
      "No change — the rule only applies to Emerging"
    ],
    correctIndex: 2,
    explanation: "Business rule: LOW or MEDIUM tier + only 1 core product + ARR > $250K → escalate to HIGH. This applies regardless of segment."
  },
  {
    id: "L2_07",
    pillar: "D",
    scenario: "A customer is 100 days into their contract. WAU is flat, no AI adoption, but data is flowing.",
    question: "Which deployment gate should you focus on?",
    options: [
      "Kickoff Complete — they need another kickoff",
      "Instrumentation Live — data issues",
      "Platform Adoption Growing — WAU not increasing, AI WAU not increasing",
      "Verified Outcome — need to log ROI"
    ],
    correctIndex: 2,
    explanation: "At 90+ days with flat WAU and no AI adoption, the 'Platform Adoption Growing' gate is the focus. Action: enablement plan on workflow integration, identify power users as internal champions."
  },
  {
    id: "L2_08",
    pillar: "A",
    scenario: "You see 'Data Health Score' flagged red in Customer Intelligence.",
    question: "Which DEARR pillar does Data Health Score map to, and what's the action?",
    options: [
      "Deployment — re-implement the data pipeline",
      "Adoption — run a Data QA or taxonomy audit and review recommendations",
      "ROI — recalculate the customer's value metrics",
      "Renewal — flag as churn risk immediately"
    ],
    correctIndex: 1,
    explanation: "Data Health Score maps to Adoption. Action: run Data QA or taxonomy audit. If recommendations aren't followed, escalate to exec to express importance of strong data foundations."
  },
  {
    id: "L2_09",
    pillar: "A",
    scenario: "A customer's MAU 3-Month Change % shows -25%.",
    question: "What does this indicate and what DEARR pillar is it?",
    options: [
      "Adoption — sustained decline is a leading indicator of churn; intervene immediately",
      "Deployment — they need to redeploy",
      "Engagement — schedule another EBR",
      "ROI — the product isn't delivering value"
    ],
    correctIndex: 0,
    explanation: "MAU 3-Month Change % maps to Adoption. A -25% decline is a leading churn indicator. Intervene immediately with an enablement and re-engagement plan."
  },
  {
    id: "L2_10",
    pillar: "A",
    scenario: "You're reviewing Cost per User (CPU) for a customer and it seems very high.",
    question: "What does high Cost per User suggest?",
    options: [
      "The customer is getting great ROI — more spend per user means more value",
      "The product isn't reaching enough people in the organization",
      "The contract is priced correctly for their tier",
      "They need to upgrade to a higher plan"
    ],
    correctIndex: 1,
    explanation: "High CPU suggests the product isn't reaching enough people. It maps to Adoption and ROI — you need to expand the user base within the org."
  },
  {
    id: "L2_11",
    pillar: "D",
    scenario: "A Velocity customer is 95 days in with Monthly Run Rate at 55%.",
    question: "Does this meet the utilization threshold for Velocity accounts?",
    options: [
      "Yes — Velocity threshold is 50%",
      "No — all accounts need 70%",
      "Yes — Velocity accounts are exempt from utilization tracking",
      "No — Velocity threshold is 60%"
    ],
    correctIndex: 0,
    explanation: "Velocity accounts have a lower utilization threshold: Monthly Run Rate >50% (vs. 70% for standard). At 55%, this Velocity customer is on track."
  },
  {
    id: "L2_12",
    pillar: "E",
    scenario: "A $400K Strategic account's last EBR was 8 months ago.",
    question: "Is this within the acceptable range?",
    options: [
      "Yes — EBRs are annual for strategic accounts",
      "No — target is <6 months for $250K+ accounts; this needs immediate attention",
      "Yes — 8 months is fine for any account size",
      "No — EBRs should be weekly for strategic accounts"
    ],
    correctIndex: 1,
    explanation: "Target: EBR within 6 months for $250K+ accounts. At 8 months on a $400K account, this is overdue and needs immediate scheduling."
  },
  {
    id: "L2_13",
    pillar: "D",
    scenario: "A customer exits implementation but their Data Health Score is red.",
    question: "Per the deployment gates, what should happen?",
    options: [
      "Ignore it — implementation is complete",
      "Run Data QA or taxonomy audit; if not followed, escalate to exec with AE support",
      "Wait for the next quarterly review",
      "Reduce the customer's contracted entitlement"
    ],
    correctIndex: 1,
    explanation: "Data Health gate (Days 90+): must exit with green Data Health Score. If red, run Data QA/taxonomy audit and if recommendations aren't followed, escalate to exec."
  },
  {
    id: "L2_14",
    pillar: "R-roi",
    scenario: "A customer at Day 120 has no Verified Outcome logged.",
    question: "What's the recommended action per the deployment gates?",
    options: [
      "Wait until renewal — ROI is only relevant then",
      "Meet with power users to identify aha moments; workshop to align on key business questions",
      "Log a placeholder Verified Outcome to check the box",
      "Escalate to VP immediately"
    ],
    correctIndex: 1,
    explanation: "Verified Outcome gate (Days 90+): meet with power users to identify aha moments, workshop to align on key business questions and hypotheses to take action."
  },
  {
    id: "L2_15",
    pillar: "multi",
    scenario: "After a Renewal Readiness session, you need to update systems.",
    question: "What three outputs are required from every reviewed account?",
    options: [
      "Email summary, Slack update, calendar invite",
      "Validated Assessment, Action Plan in SFDC, System Updates (forecast, risk notes, MAP)",
      "Meeting notes, executive summary, board deck",
      "Risk score, NPS prediction, expansion forecast"
    ],
    correctIndex: 1,
    explanation: "Every reviewed account requires: (1) Validated Assessment, (2) Action Plan in SFDC, (3) System Updates — forecast category, risk notes, MAP, exec sponsor updated within 24 hours."
  },
  {
    id: "L2_16",
    pillar: "multi",
    scenario: "You're opening the follow-up portion of a joint review.",
    question: "What's the first agenda item per the Follow-Up Discipline?",
    options: [
      "Introduce new accounts to review",
      "Review previous meeting's actions — progress vs. commitments",
      "Share new product releases",
      "Review NPS scores across the book"
    ],
    correctIndex: 1,
    explanation: "Follow-Up Discipline step 1: Review previous meeting's actions — progress vs. commitments. The pod is expected to come prepared with progress updates."
  },
  {
    id: "L2_17",
    pillar: "A",
    scenario: "A customer's AI WAU is at 5% while their overall WAU is healthy at 85%.",
    question: "What's the correct interpretation?",
    options: [
      "The account is healthy — overall WAU is strong",
      "AI is new, 5% is expected and normal",
      "AI adoption is a gap — strong WAU means the user base exists but hasn't adopted AI features yet, creating an expansion risk",
      "Switch their contract to remove AI entitlements"
    ],
    correctIndex: 2,
    explanation: "Healthy WAU + low AI WAU = the user base is there but hasn't adopted AI. This is both a risk (they're not using what they're paying for) and an opportunity (ready user base for enablement)."
  },
  {
    id: "L2_18",
    pillar: "E",
    scenario: "An account's last EBR was 7 months ago. The TSM says 'the customer doesn't want meetings.'",
    question: "What's the right response?",
    options: [
      "Respect the customer's preference and skip EBRs",
      "EBRs aren't optional — reframe the value proposition: business insights, roadmap alignment, and strategic planning that helps THEM, not just us",
      "Send them a survey instead of an EBR",
      "Only flag it if renewal is within 90 days"
    ],
    correctIndex: 1,
    explanation: "EBRs are non-negotiable engagement touchpoints. A 7-month gap means you've lost strategic visibility. Reframe the EBR as a value-add for the customer, not an internal checkbox."
  },
  {
    id: "L2_19",
    pillar: "D",
    scenario: "A customer at Day 60 has completed kickoff and instrumentation but hasn't activated any use cases.",
    question: "What deployment gate are they at risk of missing?",
    options: [
      "Gate 1 — Kickoff (already completed)",
      "Gate 2 — Instrumentation (already completed)",
      "Gate 3 — Use case activation and initial value realization, typically by Day 60-90",
      "No gates at risk — they're ahead of schedule"
    ],
    correctIndex: 2,
    explanation: "Gate 3 covers use case activation and initial value realization. Having instrumentation without activated use cases means the product is deployed but not delivering value yet."
  },
  {
    id: "L2_20",
    pillar: "R-renewal",
    scenario: "A $200K renewal is 180 days out. The account has no documented risk signals but also no recent engagement.",
    question: "What's the correct Renewal Readiness posture?",
    options: [
      "No risk signals = healthy. Move on to higher-priority accounts.",
      "Absence of data IS a risk signal. No recent engagement means you can't validate health. Investigate before assuming green.",
      "Flag as high risk and escalate immediately",
      "Wait until 90 days out when it enters the active renewal window"
    ],
    correctIndex: 1,
    explanation: "No data ≠ no risk. Absence of engagement means you can't validate whether the account is healthy. The cadence exists precisely to prevent 'surprise' at-risk renewals."
  },
];

// ══════════════════════════════════════════════════════════════
// LEVEL 3 — "The Summit Crossing" ⛰️
// Advanced: complex multi-signal scenarios, strategic decisions
// ══════════════════════════════════════════════════════════════
export const LEVEL_3_BANK: DEARRQuestion[] = [
  {
    id: "L3_01",
    pillar: "multi",
    scenario: "Account Z ($500K Strategic): Monthly Run Rate 40%, WAU declining 15% over 3 months, last EBR was 9 months ago, no Verified Outcomes, renewal in 180 days.",
    question: "What's your top priority action?",
    options: [
      "Schedule an EBR immediately — engagement is the root issue",
      "Log a utilization play — consumption is critically low",
      "This needs a full DEARR intervention: schedule EBR, log utilization play, build adoption plan, workshop for Verified Outcomes, update renewal strategy in SFDC",
      "Wait for the Week 1 Renewal Readiness to discuss it"
    ],
    correctIndex: 2,
    explanation: "Every DEARR pillar is red: D (40% MRR), E (9-month EBR gap), A (declining WAU), R-ROI (no VOs), R-Renewal (180 days out). This needs a comprehensive intervention across all pillars."
  },
  {
    id: "L3_02",
    pillar: "multi",
    scenario: "Account A ($150K Emerging): Great adoption (WAU growing), AI WAU at 30%, but Projected Consumption at 120% and renewal in 90 days.",
    question: "What's the strategic play here?",
    options: [
      "Flag as churn risk — over-consumption is bad",
      "This is an expansion opportunity — position an upsell/upgrade at renewal with multi-year",
      "Reduce their usage to match the contract",
      "Do nothing — the account is healthy"
    ],
    correctIndex: 1,
    explanation: "Over-consumption + strong adoption = expansion opportunity. Position an upsell at renewal — they're getting more value than they're paying for. Perfect time for multi-year and platform expansion."
  },
  {
    id: "L3_03",
    pillar: "multi",
    scenario: "Account B ($250K Major): Deployed on Analytics only (1 of 3 contracted products), MRR at 85%, WAU growing, EBR 3 months ago, renewal in 270 days.",
    question: "Despite strong metrics on Analytics, what risk tier should this be?",
    options: [
      "LOW — great utilization and engagement",
      "HIGH — single-product risk rule applies ($250K+ with only 1 core product adopted)",
      "MEDIUM — some concern but not urgent",
      "LOW with a note about product adoption"
    ],
    correctIndex: 1,
    explanation: "Business rule: $250K+ with only 1 core product = escalate to HIGH, regardless of other signals. They're only deployed on 1 of 3 products — that's a major risk."
  },
  {
    id: "L3_04",
    pillar: "D",
    scenario: "Account C (new, Day 45): Kickoff completed on Day 5, 500 events ingested so far, exec sponsor confirmed. The TSM says 'we're on track.'",
    question: "Is the TSM right?",
    options: [
      "Yes — kickoff done and exec aligned, they're ahead of schedule",
      "No — Instrumentation gate requires ≥1K events by Day 60; at 500 events on Day 45, they're at risk of missing it",
      "Yes — 500 events is fine for Day 45",
      "No — they should already have Monthly Run Rate data"
    ],
    correctIndex: 1,
    explanation: "Gate 2 (Instrumentation Live, Days <60) requires ≥1K cumulative events. At Day 45 with only 500, they need to double ingestion in 15 days. Flag as at-risk and identify blockers."
  },
  {
    id: "L3_05",
    pillar: "multi",
    scenario: "It's Week 2. Your manager asks you to present deployment updates for your book.",
    question: "Which accounts should you be prepared to discuss?",
    options: [
      "All accounts regardless of age",
      "All new accounts starting in the last 90 days (Days 0-90)",
      "Only accounts with open support tickets",
      "Accounts with renewals in the current quarter"
    ],
    correctIndex: 1,
    explanation: "Week 2 Deployment Reviews focus on Days 0-90: all new accounts starting in the last 90 days. Week 4 adds Year 1 accounts (90-180 days) plus any 0-90 with escalations."
  },
  {
    id: "L3_06",
    pillar: "multi",
    scenario: "It's Week 3. Your VP asks what accounts to focus on in the upcoming Renewal Readiness review.",
    question: "What's the scope for Week 3 Renewal Readiness?",
    options: [
      "Current quarter renewals only",
      "NQ and NQ+1 renewals above ARR thresholds, plus highest-ARR strategic logos regardless of date",
      "All accounts with declining health scores",
      "Only accounts the CCO has flagged"
    ],
    correctIndex: 1,
    explanation: "Week 3 focuses on 180-360 day renewals (NQ+1 and beyond) above ARR thresholds, plus highest-ARR strategic logos regardless of renewal date."
  },
  {
    id: "L3_07",
    pillar: "multi",
    scenario: "Account D ($350K Strategic): All health signals green, great adoption, AI growing, EBR 2 months ago, renewal in 120 days. But exec sponsor just left the company.",
    question: "What's your immediate action?",
    options: [
      "No action needed — health signals are green",
      "Log risk in SFDC, find and engage the new exec sponsor immediately, update renewal strategy — exec changes can rapidly shift renewal posture",
      "Wait for the replacement to settle in before reaching out",
      "Downgrade to MEDIUM risk"
    ],
    correctIndex: 1,
    explanation: "Exec sponsor departure is a critical risk signal that can flip a green account to red fast. Immediate action: log risk, find the new sponsor, update strategy. Don't wait."
  },
  {
    id: "L3_08",
    pillar: "multi",
    scenario: "Account E ($200K Emerging): MRR 90%, strong WAU, 2 products adopted, AI WAU at 25%, Data Health green. But no Verified Outcomes and the AE hasn't engaged in 4 months.",
    question: "What's the key gap to close before renewal?",
    options: [
      "Nothing — the account is healthy enough",
      "Boost AI adoption higher",
      "Document Verified Outcomes and re-engage the AE — you need quantified ROI and commercial alignment before renewal",
      "Focus on getting the third product deployed"
    ],
    correctIndex: 2,
    explanation: "Strong health but two critical gaps: no Verified Outcomes (R-ROI) and AE disengaged (E). At renewal, you'll need quantified ROI and a commercial champion. Fix both now."
  },
  {
    id: "L3_09",
    pillar: "D",
    scenario: "Account F (Day 30): Kickoff completed, data flowing, but the CSA flags that the taxonomy is messy and event naming is inconsistent.",
    question: "How urgent is this?",
    options: [
      "Not urgent — clean it up later when they're fully deployed",
      "Very urgent — dirty data at Day 30 will compound; run Data QA now and fix taxonomy before it cascades through analytics, dashboards, and AI",
      "Moderately urgent — add it to the next quarterly review",
      "Not a deployment issue — that's a CSA problem"
    ],
    correctIndex: 1,
    explanation: "Data Health is a deployment gate. Messy taxonomy at Day 30 cascades into bad dashboards, unreliable AI, and poor adoption. Fix it NOW while the implementation is still fresh."
  },
  {
    id: "L3_10",
    pillar: "multi",
    scenario: "You're a new AE and just inherited a book of 15 accounts. You need to prepare for your first Week 1 Renewal Readiness.",
    question: "What should you filter in Customer Intelligence to prepare?",
    options: [
      "Filter by your territory, sort by most recent support ticket",
      "Filter by Renewal Date (CQ, NQ), then by your Sales VP/FLM/Territory, sort by ARR",
      "Filter by product adoption score, sort alphabetically",
      "No filtering needed — review all 15 accounts"
    ],
    correctIndex: 1,
    explanation: "Week 1 = CQ renewals. Filter by Renewal Date (CQ/NQ), then your territory, sort by ARR to prioritize. Review Amp on Amp dashboard and update Pod Review by 5pm PST the day before."
  },
  {
    id: "L3_11",
    pillar: "multi",
    scenario: "Account G ($600K Strategic): Renewal in 30 days, churn risk flagged HIGH, customer is on a single product, MRR at 35%, exec sponsor unresponsive.",
    question: "At what level should this be reviewed?",
    options: [
      "POD 1:1 only — keep it at the team level",
      "FLM Review — $250K+ threshold",
      "CCO/CS SVP Review — $500K+ Strategic with HIGH risk requires the highest escalation",
      "VP Review only"
    ],
    correctIndex: 2,
    explanation: "At $600K Strategic with HIGH risk and 30 days to renewal, this hits the CCO/CS SVP Review threshold ($500K+ Strategic). All-hands-on-deck escalation."
  },
  {
    id: "L3_12",
    pillar: "multi",
    scenario: "Account H: Deployed 180 days ago, great initial adoption, but WAU has been declining for 3 straight months. AI WAU is zero. Cost per User is climbing.",
    question: "What combination of DEARR signals are failing?",
    options: [
      "Only Adoption — just a usage dip",
      "Adoption (declining WAU, zero AI, rising CPU) and ROI (declining value per user) — this is a compounding problem",
      "Only Deployment — they need to redeploy",
      "Only Engagement — need another EBR"
    ],
    correctIndex: 1,
    explanation: "Multiple Adoption signals failing (WAU decline, zero AI, rising CPU) plus ROI impact. This is compounding — each declining metric makes the others worse. Needs a comprehensive re-engagement plan."
  },
  {
    id: "L3_13",
    pillar: "multi",
    scenario: "Your follow-up review opens. The TSM's prior commitment was to 'investigate utilization.' No play logged, no owner, no due date.",
    question: "What should happen?",
    options: [
      "Give them another week to figure it out",
      "Accept the update and move on",
      "Reject it — the standard is a NAMED play with owner + due date, never a blank 'investigate' placeholder. Require a specific play before moving forward.",
      "Escalate to VP immediately"
    ],
    correctIndex: 2,
    explanation: "The utilization standard: never a blank 'investigate' placeholder. Every account under threshold needs a named play from the Playbook with owner + due date. Hold the standard."
  },
  {
    id: "L3_14",
    pillar: "multi",
    scenario: "Account I: New customer, Day 20, no kickoff yet. AE says the customer is 'busy' and wants to push to Day 40.",
    question: "What's the right call?",
    options: [
      "Accommodate the customer — flexibility builds trust",
      "Block on all downstream milestones. Kickoff gate is Days 0-15; at Day 20 it's already missed. AE must re-anchor exec priority and schedule immediately.",
      "Push the deployment timeline back by 3 weeks",
      "Skip kickoff and go straight to instrumentation"
    ],
    correctIndex: 1,
    explanation: "Kickoff gate is Days 0-15 — already missed at Day 20. If kickoff doesn't happen, everything downstream is blocked. AE must re-anchor exec priority and schedule immediately."
  },
  {
    id: "L3_15",
    pillar: "multi",
    scenario: "The cadence doc says 'No account should enter the renewal window without a documented health history.'",
    question: "What's the practical meaning of this standard?",
    options: [
      "Every account needs an NPS survey before renewal",
      "DEARR signals must be tracked continuously so every renewal has a strategy, every at-risk account has a get-well plan, and nothing is a surprise at contract end",
      "A single health check 90 days before renewal is sufficient",
      "Only HIGH risk accounts need documented health history"
    ],
    correctIndex: 1,
    explanation: "The standard: continuous health tracking via DEARR so every renewal has a strategy, every at-risk account has a get-well plan, and nothing is a surprise. This is why the cadence runs every week, not once a quarter."
  },
  {
    id: "L3_16",
    pillar: "multi",
    scenario: "Account J ($300K): Renewal in 120 days, consumption at 110%, strong adoption, but the exec sponsor left the company 3 weeks ago and no replacement identified.",
    question: "What's your priority action?",
    options: [
      "The account is healthy — consumption and adoption are strong. Monitor passively.",
      "Identify and engage the new exec sponsor immediately. Losing exec alignment before renewal creates a power vacuum where a competitor can insert themselves.",
      "Wait for the customer to introduce a new sponsor naturally",
      "Focus on upsell — the numbers support expansion"
    ],
    correctIndex: 1,
    explanation: "Exec sponsor departure is a critical Engagement risk — even with healthy metrics. Without exec alignment, renewal decisions happen without your champion in the room. Re-establish sponsorship before the renewal window."
  },
  {
    id: "L3_17",
    pillar: "multi",
    scenario: "Account K ($180K Emerging): Customer has 3 active use cases, growing WAU, AI WAU at 25%, but they're asking for a 15% discount at renewal citing 'budget pressure.'",
    question: "What's the strategic response?",
    options: [
      "Grant the discount to save the renewal",
      "Reject the discount and hold firm on pricing",
      "Counter with value: show Verified Outcomes proving ROI, frame the conversation around value delivered vs. cost, and explore multi-year for modest concession",
      "Escalate to Deal Desk for approval"
    ],
    correctIndex: 2,
    explanation: "With strong adoption and growing usage, the leverage is on your side. Lead with Verified Outcomes and ROI proof. Budget pressure is often a negotiating posture — counter with value, not capitulation."
  },
  {
    id: "L3_18",
    pillar: "multi",
    scenario: "During a Deployment Review, you discover that 4 out of 6 new accounts from last quarter missed Gate 1 (kickoff by Day 15).",
    question: "What does this pattern indicate?",
    options: [
      "Normal variability — some customers are slower to start",
      "A systemic onboarding problem. 4/6 missed gates means the process is broken, not individual accounts. Escalate to FLM to identify root cause (handoff timing, resource gaps, process failure).",
      "The TSMs need more training on kickoff procedures",
      "Adjust Gate 1 to Day 30 to be more realistic"
    ],
    correctIndex: 1,
    explanation: "4/6 missed is a pattern, not an anomaly. Deployment Review exists precisely to catch systemic failures. This needs root cause analysis at the FLM level — is it handoff timing, resource gaps, or process failure?"
  },
  {
    id: "L3_19",
    pillar: "multi",
    scenario: "Account L: $400K Strategic, renewal in 60 days, all DEARR signals green, but the customer just acquired another company and is evaluating platform consolidation.",
    question: "How should this change your renewal approach?",
    options: [
      "All green = proceed normally with standard renewal",
      "M&A changes everything. The account is now an expansion opportunity AND a churn risk. Position Amplitude as the consolidation platform, engage the acquiring company's analytics team, and structure a deal that includes the merged entity.",
      "Discount to lock in the renewal before M&A decisions are made",
      "Pause the renewal until the acquisition settles"
    ],
    correctIndex: 1,
    explanation: "M&A is a dual-signal event: expansion opportunity (larger combined entity) AND churn risk (platform consolidation could go either way). Proactively position as the consolidation platform — don't wait for them to evaluate alternatives."
  },
  {
    id: "L3_20",
    pillar: "multi",
    scenario: "Your RVP reviews the week's Renewal Readiness output and notices that 3 accounts have 'strategy TBD' in their action plans with no owner or timeline.",
    question: "What should the RVP do?",
    options: [
      "Give the team another week — they're working on it",
      "Accept the TBD and add a reminder to check next month",
      "Reject all three. The standard is clear: every reviewed account needs a Validated Assessment, Action Plan with owner + due date, and System Updates within 24 hours. 'TBD' is not a strategy.",
      "Escalate only the largest account and let the others slide"
    ],
    correctIndex: 2,
    explanation: "The cadence has clear output standards: Validated Assessment, Action Plan in SFDC, System Updates — all within 24 hours. 'TBD' violates the standard. The RVP's job is to hold the standard, not accommodate drift."
  },
];

export const LEVEL_CONFIGS = [
  { name: "The Renewal Trail", emoji: "🌲", bank: LEVEL_1_BANK, color: "#2D6A4F" },
  { name: "Highway of Health Signals", emoji: "🛣️", bank: LEVEL_2_BANK, color: "#B45309" },
  { name: "The Summit Crossing", emoji: "⛰️", bank: LEVEL_3_BANK, color: "#7C3AED" },
] as const;

/** Fisher-Yates shuffle — unbiased random ordering */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draw `count` random questions from a bank, excluding previously seen IDs */
export function drawQuestions(bank: DEARRQuestion[], count: number, exclude: Set<string> = new Set()): DEARRQuestion[] {
  const available = bank.filter(q => !exclude.has(q.id));
  const shuffled = fisherYatesShuffle(available);
  return shuffled.slice(0, count);
}
