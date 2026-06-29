/**
 * Topic day content configuration — used by TopicGear page.
 * These are resource-only days (no video clips) inserted at Day 5 and Day 9.
 */

export interface TopicResource {
  label: string;
  url: string;
  type: string;
  emoji: string;
  note?: string;
}

export interface TopicSME {
  name: string;
  title: string;
  note?: string;
}

export interface SlackChannel {
  name: string;
  url: string;
}

export interface TopicDayConfig {
  dayLabel: string;
  title: string;
  emoji: string;
  summary: string;
  learningObjectives: string[];
  smes: TopicSME[];
  slackChannels: SlackChannel[];
  resources: TopicResource[];
  dealDeskNote?: string;
}

export const TOPIC_DAYS: Record<string, TopicDayConfig> = {
  // Day 5 — sort_order 5 after migration
  "day5": {
    dayLabel: "Day 5",
    title: "Renewal Operations",
    emoji: "🐦‍🔥",
    summary: "This session introduces how renewals work at Amplitude, and how AEs plug into the broader revenue and finance motion. Reps will learn renewal stages, roles and responsibilities, and key policies that govern pricing, discounts, and approvals. The goal is to demystify \"who does what when\" so renewals feel like a managed process, not one-off fire drills.",
    learningObjectives: [
      "Explain the renewal lifecycle, including stages, timelines, and required milestones.",
      "Identify who owns which parts of the renewal (AE, CS, Renewals, Deal Desk, Finance) and when to engage them.",
      "Apply guardrails and policies (discount, term, uplift expectations) when shaping renewal strategies.",
    ],
    smes: [
      { name: "Lenora Bennis", title: "Sr. Manager, Renewals Management" },
      { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" },
      { name: "Katie Helie", title: "VP of Finance" },
    ],
    slackChannels: [
      { name: "#help-salesops", url: "https://amplitude.slack.com/archives/C05F532Q29F" },
      { name: "#gtm-pricing-packaging-help", url: "https://amplitude.slack.com/archives/C04LW12V65N" },
    ],
    resources: [
      {
        label: "Sales Operating Cadence & Manager Playbook (2026)",
        url: "https://docs.google.com/presentation/d/1CQLqFWy3M6JiprYlgNh8FelgJorPT-eZ_uvpg3F0IFE/edit?slide=id.ge0112cd95c_5_4#slide=id.ge0112cd95c_5_4",
        type: "slides",
        emoji: "💻",
        note: "Renewals: pages 10, 21, 27, 32, 33, 40",
      },
      {
        label: "2026 Sales Policy Handbook",
        url: "https://app.spekit.co/app/wiki/asset/817909a3-30d8-4b9b-9a35-d8c07150b365?type=asset&expanded=true",
        type: "spekit",
        emoji: "🐙",
        note: "Renewals: pages 6, 7, 9, 22",
      },
      {
        label: "2026 Sales Finance & PPL Enablement Deck",
        url: "https://app.spekit.co/app/wiki/asset/101068d2-21c1-4d12-9f66-ab1f7fda4e8b?type=asset&expanded=true",
        type: "spekit",
        emoji: "🐙",
      },
      {
        label: "Customer Engagement Model (CEM) – Renewal Motion",
        url: "https://docs.google.com/document/d/1VxMWNbIWWEtJwuhNibKHUCsbOsCQqVFcin8vrZkeKZw/edit?tab=t.0#heading=h.k0bsvsa98x07",
        type: "gdrive",
        emoji: "📑",
      },
      {
        label: "Renewal Readiness Dashboard (SFDC)",
        url: "https://amplitude.lightning.force.com/analytics/dashboard/0FKUw0000000eOrOAI",
        type: "sfdc",
        emoji: "☁️",
      },
    ],
  },

  // Day 9 — sort_order 11 after migration
  "day9": {
    dayLabel: "Day 9",
    title: "Pricing & Packaging 101",
    emoji: "💰",
    summary: "This session introduces Amplitude's 2026 pricing and packaging model and how AEs should use it in real deals. Reps will learn core components (SKUs, tiers, add-ons), how value and usage map to price, and the basics of using the pricing tools. The focus is on enabling confident, value-based pricing conversations rather than tactical discounting.",
    learningObjectives: [
      "Explain Amplitude's core pricing and packaging structure in plain language to customers.",
      "Use the pricing tools/templates to configure a standard offer that aligns with customer use cases.",
      "Handle common pricing objections by tying back to value, outcomes, and long-term roadmap.",
    ],
    smes: [
      { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" },
      { name: "Katie Helie", title: "VP of Finance" },
    ],
    slackChannels: [
      { name: "#gtm-pricing-packaging-help", url: "https://amplitude.slack.com/archives/C04LW12V65N" },
    ],
    resources: [
      {
        label: "MindTickle: Introduction to new Pricing & Packaging (6-lessons, 55m)",
        url: "https://amplitude.mindtickle.com/new/ui/learner/training/files/2026021170074268112?loSeriesId=2026020954479627972&loModuleId=2026021077838173257",
        type: "mindtickle",
        emoji: "🧠",
      },
      {
        label: "2026 Proposal Template",
        url: "https://docs.google.com/presentation/d/1jhDGkH9jdm1mYj1b179mAn6pkphmCiStresnsAvKtQs/edit?slide=id.g3ca72f6abd4_1_2017#slide=id.g3ca72f6abd4_1_2017",
        type: "slides",
        emoji: "💻",
      },
      {
        label: "Pricing Scenario Exercise (for AEs & Partners)",
        url: "https://docs.google.com/presentation/d/1U44Rs5ZGuNiORIzteK-W1n0EN3HPDvnXXEHMOLbemUc/edit?slide=id.g342929c60aa_0_229#slide=id.g342929c60aa_0_229",
        type: "slides",
        emoji: "💻",
      },
      {
        label: "2026 Sales Finance & PPL Enablement Deck",
        url: "https://app.spekit.co/app/wiki/asset/101068d2-21c1-4d12-9f66-ab1f7fda4e8b?type=asset&expanded=true",
        type: "spekit",
        emoji: "🐙",
      },
    ],
    dealDeskNote: "For pricing/quoting help on 2026 PPL, open a case with Deal Desk from the associated opportunity in Salesforce.",
  },
};
