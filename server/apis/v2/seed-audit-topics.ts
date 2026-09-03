import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Seeds the cliptracker_v2_day_metadata table with all unique audit topics
 * across AE, SDR, and Promo paths. Groups by day_label + path context.
 * Idempotent — uses ON CONFLICT DO NOTHING.
 */

interface TopicSeed {
  topic_key: string;
  day_label: string;
  title: string;
  emoji: string;
  summary: string | null;
  learning_objectives: string[];
  smes: Array<{ name: string; title: string; note?: string }>;
  path_label: string | null;
  has_video: boolean;
  sort_orders: number[];
}

const TOPICS: TopicSeed[] = [
  // ── Shared (all paths) ────────────────────────────────────────────
  {
    topic_key: "day1_verticals_personas",
    day_label: "Day 1", title: "Understanding Our Verticals & Personas", emoji: "🔎",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [10, 20],
  },
  {
    topic_key: "day2_tofu",
    day_label: "Day 2", title: "Top of Funnel (TOFU) – MQLs & Inbounds", emoji: "📥",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [30],
  },
  {
    topic_key: "day3_gtm_pod",
    day_label: "Day 3", title: "GTM Launch Pad & Pod Tower", emoji: "📈",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [40, 45],
  },
  {
    topic_key: "day4_prospecting",
    day_label: "Day 4", title: "Prospecting Process", emoji: "📇",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [50],
  },
  {
    topic_key: "day6_competitive",
    day_label: "Day 6", title: "The Competitive Landscape", emoji: "🥊",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [70],
  },
  {
    topic_key: "day7_account_planning",
    day_label: "Day 7", title: "Account Planning", emoji: "🩺",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [80, 90],
  },
  {
    topic_key: "day8_discovery",
    day_label: "Day 8", title: "Discovery That Accelerates", emoji: "🏎️",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [100, 110],
  },
  {
    topic_key: "day10_partners",
    day_label: "Day 10", title: "Leveraging Partners", emoji: "🪢",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [130],
  },
  {
    topic_key: "day12_customer_stories",
    day_label: "Day 12", title: "Customer Stories", emoji: "📖",
    summary: null, learning_objectives: [], smes: [],
    path_label: null, has_video: true, sort_orders: [160],
  },

  // ── SDR-Only ──────────────────────────────────────────────────────
  {
    topic_key: "day4_sdr_marketing_events",
    day_label: "Day 4", title: "Prospecting for Marketing Events", emoji: "📇",
    summary: null, learning_objectives: [], smes: [],
    path_label: "SDR Only", has_video: true, sort_orders: [51],
  },
  {
    topic_key: "day5_sdr_cold_calling",
    day_label: "Day 5", title: "Cold Calling & Making Calls with Nooks", emoji: "📞",
    summary: null, learning_objectives: [], smes: [],
    path_label: "SDR Only", has_video: true, sort_orders: [55, 56],
  },
  {
    topic_key: "day13_sdr_roe",
    day_label: "Day 13", title: "Rules of Engagement", emoji: "⚖️",
    summary: "This session covers Amplitude's SDR Rules of Engagement — the policies that determine how sourcing credit, territory boundaries, BoB transitions, and deal crediting work.",
    learning_objectives: [
      "Apply primary and secondary sourcing credit rules to realistic SDR scenarios.",
      "Navigate territory, BoB transition, and live chat policies that affect deal crediting.",
      "Evaluate edge cases involving stage movement, clawbacks, and the statute of limitations.",
    ],
    smes: [{ name: "Derrick Williams", title: "Sales Development, Strategy & Operations Manager" }],
    path_label: "SDR Only", has_video: false, sort_orders: [165],
  },

  // ── AE/PSM/Renewals/Promo (non-SDR) ──────────────────────────────
  {
    topic_key: "day5_renewals",
    day_label: "Day 5", title: "Renewal Operations", emoji: "🐦‍🔥",
    summary: "This session introduces how renewals work at Amplitude, and how AEs plug into the broader revenue and finance motion. Reps will learn renewal stages, roles and responsibilities, and key policies that govern pricing, discounts, and approvals.",
    learning_objectives: [
      "Explain the renewal lifecycle, including stages, timelines, and required milestones.",
      "Identify who owns which parts of the renewal (AE, CS, Renewals, Deal Desk, Finance) and when to engage them.",
      "Apply guardrails and policies (discount, term, uplift expectations) when shaping renewal strategies.",
    ],
    smes: [
      { name: "Lenora Bennis", title: "Sr. Manager, Renewals Management" },
      { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" },
      { name: "Katie Helie", title: "VP of Finance" },
    ],
    path_label: "AE / PSM / Promo", has_video: false, sort_orders: [60],
  },
  {
    topic_key: "day9_pricing",
    day_label: "Day 9", title: "Pricing & Packaging 101", emoji: "💰",
    summary: "This session introduces Amplitude's 2026 pricing and packaging model and how AEs should use it in real deals. Reps will learn core components (SKUs, tiers, add-ons), how value and usage map to price, and the basics of using the pricing tools.",
    learning_objectives: [
      "Explain Amplitude's core pricing and packaging structure in plain language to customers.",
      "Use the pricing tools/templates to configure a standard offer that aligns with customer use cases.",
      "Handle common pricing objections by tying back to value, outcomes, and long-term roadmap.",
    ],
    smes: [
      { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" },
      { name: "Katie Helie", title: "VP of Finance" },
    ],
    path_label: null, has_video: false, sort_orders: [120],
  },
  {
    topic_key: "day11_forecasting",
    day_label: "Day 11", title: "Forecasting", emoji: "☂️",
    summary: null, learning_objectives: [], smes: [],
    path_label: "AE / PSM / Promo", has_video: true, sort_orders: [140, 150],
  },
  {
    topic_key: "day13_clm",
    day_label: "Day 13", title: "Contract Lifecycle Management", emoji: "📑",
    summary: null, learning_objectives: [], smes: [],
    path_label: "AE / PSM / Promo", has_video: true, sort_orders: [170],
  },
  {
    topic_key: "day14_deal_desk",
    day_label: "Day 14", title: "Deal Desk & CPQ", emoji: "🫱🏻‍🫲🏼",
    summary: null, learning_objectives: [], smes: [],
    path_label: "AE / PSM / Promo", has_video: true, sort_orders: [180],
  },
  {
    topic_key: "day15_leverage",
    day_label: "Day 15", title: "Leveraging SEs & Professional Services", emoji: "🪢",
    summary: null, learning_objectives: [], smes: [],
    path_label: "AE / PSM / Promo", has_video: true, sort_orders: [190, 200],
  },
];

export default api({
  name: "SeedAuditTopics",
  description: "Seeds day_metadata table with all audit topics across paths",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    inserted: z.number(),
  }),

  async run(ctx) {
    let inserted = 0;

    for (const t of TOPICS) {
      const result = await ctx.integrations.apps_db.execute(
        `INSERT INTO cliptracker_v2_day_metadata
          (topic_key, day_label, title, emoji, summary, learning_objectives, smes, path_label, has_video, sort_orders)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
         ON CONFLICT (topic_key) DO NOTHING`,
        [
          t.topic_key,
          t.day_label,
          t.title,
          t.emoji,
          t.summary,
          JSON.stringify(t.learning_objectives),
          JSON.stringify(t.smes),
          t.path_label,
          t.has_video,
          `{${t.sort_orders.join(",")}}`,
        ],
        { label: `Seed topic: ${t.topic_key}` }
      );
      if (result.rowCount > 0) inserted++;
    }

    return { success: true, inserted };
  },
});
