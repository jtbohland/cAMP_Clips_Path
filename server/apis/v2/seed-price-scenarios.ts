import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * All 40 Price is Right scenarios.
 * Each row: [scenario_id, section, game_type, narrative, game_data (JSON string), coaching_note]
 *
 * Game types:
 *   higher_lower     — Is the real price higher or lower than X?
 *   bullseye         — Type the exact price (±15% tolerance)
 *   price_match      — Match 4 items to their correct prices
 *   deal_builder     — Pick the right components for a deal (don't exceed budget)
 *   pricing_pitfall  — Spot the error in a pricing statement
 *   objection_closer — Pick the best response to a customer objection
 */
type ScenarioRow = [string, string, string, string, string, string];

const scenarios: ScenarioRow[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // HIGHER / LOWER (7 scenarios)
  // ═══════════════════════════════════════════════════════════════════════════
  [
    "PIR-HL-01", "Amplitude Pricing", "higher_lower",
    "Growth Analytics at 100M events/month — is the annual price higher or lower than $70,000?",
    JSON.stringify({
      reference_value: 70000, reference_label: "$70,000/yr",
      correct_direction: "higher", actual_value: 78600, actual_label: "$78,600/yr"
    }),
    "Growth Analytics at 100M EV/mo is guided at $78,600/yr. The EV-based pricing model scales with usage — always check the pricing calculator for the exact tier."
  ],
  [
    "PIR-HL-02", "Add-On Uplift", "higher_lower",
    "Feature Experimentation add-on uplift — is it higher or lower than 40%?",
    JSON.stringify({
      reference_value: 40, reference_label: "40%",
      correct_direction: "higher", actual_value: 50, actual_label: "50%"
    }),
    "Feature Experimentation has the highest add-on uplift at 50%. It's the premium experimentation capability — remember FE is 50%, while Web Experimentation and most others are 30%."
  ],
  [
    "PIR-HL-03", "Professional Services", "higher_lower",
    "Professional Services package for a $75K ARR deal — is it higher or lower than $15,000?",
    JSON.stringify({
      reference_value: 15000, reference_label: "$15,000",
      correct_direction: "higher", actual_value: 19500, actual_label: "$19,500"
    }),
    "$75K ARR falls in the S tier ($50K–$100K ARR), which prices PS at $19,500. Always match the ARR range to the right PS tier: XS(<$50K)=$8K, S=$19.5K, M=$41.1K, L=$67.8K."
  ],
  [
    "PIR-HL-04", "Statsig WHN", "higher_lower",
    "Statsig WHN Platform Fee for an M-sized customer (250 experiments) — is the suggested price higher or lower than $40,000?",
    JSON.stringify({
      reference_value: 40000, reference_label: "$40,000",
      correct_direction: "higher", actual_value: 48000, actual_label: "$48,000"
    }),
    "WHN Platform Fee M t-shirt is $40K base × 1.2 suggested uplift = $48K suggested. The platform fee is a flat annual charge separate from per-unit SKU pricing."
  ],
  [
    "PIR-HL-05", "Add-On Uplift", "higher_lower",
    "Web Experimentation add-on uplift — is it higher or lower than 25%?",
    JSON.stringify({
      reference_value: 25, reference_label: "25%",
      correct_direction: "higher", actual_value: 30, actual_label: "30%"
    }),
    "Web Experimentation add-on is 30% uplift. Most add-ons cluster around 30% (Web Exp, Activation, G&S). The outliers are FE at 50% (highest) and Zoning Insights at 10% (lowest)."
  ],
  [
    "PIR-HL-06", "Statsig Cloud", "higher_lower",
    "Statsig Cloud Feature Gates 100K units (1M checks each) — is the suggested annual price higher or lower than $25,000?",
    JSON.stringify({
      reference_value: 25000, reference_label: "$25,000/yr",
      correct_direction: "lower", actual_value: 22548, actual_label: "$22,548/yr"
    }),
    "Cloud Feature Gates at 100K units × 1M checks = $22,548/yr suggested. This is the minimum fair use volume (100B checks = 100,000 units in Salesforce). Feature Gates pricing uses a curve-fit formula that decreases per-unit cost at higher volumes."
  ],
  [
    "PIR-HL-07", "Statsig WHN", "higher_lower",
    "Total suggested annual price for a WHN deal with Platform Fee + 250 experiments + 500K Feature Gate checks — higher or lower than $200,000?",
    JSON.stringify({
      reference_value: 200000, reference_label: "$200,000/yr",
      correct_direction: "higher", actual_value: 220968, actual_label: "$220,968/yr"
    }),
    "The full M-sized WHN deal totals $220,968/yr suggested: Platform Fee $48K + Experimentation $82,275 + Feature Gates $90,693. The range spans $87K (floor) to $386K (ceiling)."
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BULLSEYE (7 scenarios) — ±15% tolerance
  // ═══════════════════════════════════════════════════════════════════════════
  [
    "PIR-BE-01", "Amplitude Pricing", "bullseye",
    "What is the annual guided price for Growth Analytics at 200M events/month?",
    JSON.stringify({ correct_value: 108600, tolerance_pct: 15, unit: "$/yr", display_hint: "Annual price in dollars" }),
    "Growth Analytics at 200M EV/mo = $108,600/yr. The jump from 100M ($78,600) to 200M ($108,600) is only ~38% more cost for 2× the volume — volume discounts kick in at higher tiers."
  ],
  [
    "PIR-BE-02", "Professional Services", "bullseye",
    "What is the PS package price for an M-tier deal ($100K–$300K ARR)?",
    JSON.stringify({ correct_value: 41100, tolerance_pct: 15, unit: "$", display_hint: "One-time PS price" }),
    "M-tier PS is $41,100. PS tiers: XS(<$50K)=$8K, S($50-100K)=$19.5K, M($100-300K)=$41.1K, L($300-500K)=$67.8K, XL(>$500K)=$300/hr."
  ],
  [
    "PIR-BE-03", "Statsig WHN", "bullseye",
    "What is the suggested annual price for WHN Experimentation with 250 experiments?",
    JSON.stringify({ correct_value: 82275, tolerance_pct: 15, unit: "$/yr", display_hint: "Annual experiment price" }),
    "WHN Experimentation at 250 experiments = ~$82,275/yr suggested ($329/experiment suggested unit price). The floor is ~$46K and ceiling ~$113K for this volume."
  ],
  [
    "PIR-BE-04", "Statsig Cloud", "bullseye",
    "What is the suggested annual price for Cloud Experimentation at 2,000 units of 1M Billable Events?",
    JSON.stringify({ correct_value: 40474, tolerance_pct: 15, unit: "$/yr", display_hint: "Annual experiment price" }),
    "Cloud Experimentation at 2,000 × 1M Billable Events = ~$40,474/yr suggested ($20.24/unit). Floor is ~$20K, ceiling ~$64K."
  ],
  [
    "PIR-BE-05", "Add-On Uplift", "bullseye",
    "What is the add-on uplift percentage for AI Assistant?",
    JSON.stringify({ correct_value: 30, tolerance_pct: 15, unit: "%", display_hint: "Uplift percentage" }),
    "AI Assistant uplift is 30%. It's in the same tier as Web Experimentation, Activation, and G&S. The uplift is applied on top of the base analytics price."
  ],
  [
    "PIR-BE-06", "Professional Services", "bullseye",
    "What is the PS package price for an XS-tier deal (under $50K ARR)?",
    JSON.stringify({ correct_value: 8000, tolerance_pct: 15, unit: "$", display_hint: "One-time PS price" }),
    "XS-tier PS is $8,000 — the entry-level implementation package for deals under $50K ARR. Even small deals get dedicated PS support."
  ],
  [
    "PIR-BE-07", "Statsig Cloud", "bullseye",
    "What is the total suggested annual contract value for a Cloud deal with Experimentation (2,000 × 1M BE) + Feature Gates (100K × 1M checks) + Standard Support?",
    JSON.stringify({ correct_value: 68022, tolerance_pct: 15, unit: "$/yr", display_hint: "Total ACV" }),
    "Total Cloud ACV = $40,474 (Exp) + $22,548 (FG) + $5,000 (Support) = $68,022. Cloud deals don't have a separate platform fee — it's built into the per-unit pricing."
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICE MATCH (6 scenarios) — match items to prices
  // ═══════════════════════════════════════════════════════════════════════════
  [
    "PIR-PM-01", "Professional Services", "price_match",
    "Match each Professional Services tier to its correct price:",
    JSON.stringify({
      pairs: [
        { item: "XS (under $50K ARR)", price: "$8,000" },
        { item: "S ($50K–$100K ARR)", price: "$19,500" },
        { item: "M ($100K–$300K ARR)", price: "$41,100" },
        { item: "L ($300K–$500K ARR)", price: "$67,800" }
      ]
    }),
    "PS tiers scale with deal ARR. The jump from XS to L is ~8.5× because larger deals require more implementation complexity, integrations, and dedicated support."
  ],
  [
    "PIR-PM-02", "Add-On Uplift", "price_match",
    "Match each add-on to its correct uplift percentage:",
    JSON.stringify({
      pairs: [
        { item: "Feature Experimentation", price: "50%" },
        { item: "Web Experimentation", price: "30%" },
        { item: "Zoning Insights", price: "10%" },
        { item: "Session Replay", price: "15%" }
      ]
    }),
    "FE is the premium add-on at 50%. Zoning Insights is the lightest at 10%. Session Replay and AI Feedback are both 15%. Most others cluster at 30%."
  ],
  [
    "PIR-PM-03", "Statsig WHN", "price_match",
    "Match each WHN Platform Fee t-shirt size to its suggested price:",
    JSON.stringify({
      pairs: [
        { item: "S (≤50 experiments)", price: "$36,000" },
        { item: "M (51–300 experiments)", price: "$48,000" },
        { item: "L (301–750 experiments)", price: "$96,000" },
        { item: "XL (751+ experiments)", price: "$216,000" }
      ]
    }),
    "Platform Fee suggested prices use the 1.2× uplift on base: S=$30K×1.2=$36K, M=$40K×1.2=$48K, L=$80K×1.2=$96K, XL=$180K×1.2=$216K. These are flat annual fees independent of per-experiment pricing."
  ],
  [
    "PIR-PM-04", "Statsig Cloud", "price_match",
    "Match each Statsig Cloud product to its suggested per-unit price:",
    JSON.stringify({
      pairs: [
        { item: "Cloud Experimentation (per 1M BE)", price: "$20.24" },
        { item: "Cloud Feature Gates (per 1M checks)", price: "$0.23" },
        { item: "Cloud Platform Fee (M tier)", price: "$25,000" },
        { item: "Standard Support", price: "$5,000" }
      ]
    }),
    "Cloud pricing is usage-based with no separate platform fee for most deals. The Cloud PF only applies when experiment volume warrants it. Standard Support is the mandatory minimum at $5K."
  ],
  [
    "PIR-PM-05", "Add-On Uplift", "price_match",
    "Match each add-on to its correct uplift percentage:",
    JSON.stringify({
      pairs: [
        { item: "Activation", price: "30%" },
        { item: "AI Feedback", price: "15%" },
        { item: "Accounts", price: "20%" },
        { item: "AI Assistant", price: "30%" }
      ]
    }),
    "Activation and AI Assistant are both 30%. AI Feedback is 15% (same as Session Replay). Accounts is 20%. Remember: uplift percentages are applied on top of the base analytics price."
  ],
  [
    "PIR-PM-06", "Amplitude Pricing", "price_match",
    "Match each Growth Analytics EV tier to its approximate annual price:",
    JSON.stringify({
      pairs: [
        { item: "100M events/month", price: "$78,600/yr" },
        { item: "200M events/month", price: "$108,600/yr" },
        { item: "PS - Small tier", price: "$19,500" },
        { item: "PS - Large tier", price: "$67,800" }
      ]
    }),
    "Growth Analytics pricing scales sub-linearly — 2× the volume costs only ~1.38× the price. Always pair the right PS tier with the analytics deal size."
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DEAL BUILDER (7 scenarios) — pick components, stay within budget/rules
  // ═══════════════════════════════════════════════════════════════════════════
  [
    "PIR-DB-01", "Amplitude Pricing", "deal_builder",
    "Your customer needs Growth Analytics (100M EV/mo) + Feature Experimentation add-on + PS. Their ARR will be around $130K. Build the quote — what's the total?",
    JSON.stringify({
      components: [
        { name: "Growth Analytics (100M EV/mo)", price: 78600, included: true },
        { name: "Feature Experimentation (50% uplift)", price: 39300, included: true },
        { name: "PS – M tier ($100K–$300K)", price: 41100, included: true },
        { name: "PS – S tier ($50K–$100K)", price: 19500, included: false },
        { name: "Web Experimentation (30% uplift)", price: 23580, included: false },
        { name: "PS – L tier ($300K–$500K)", price: 67800, included: false }
      ],
      correct_total: 159000,
      explanation: "Analytics $78,600 + FE 50% uplift ($39,300) = $117,900 ARR. PS M-tier for $100K-$300K ARR = $41,100. Total = $159,000."
    }),
    "ARR = $78,600 + $39,300 = $117,900 → falls in M-tier PS ($100K–$300K) = $41,100. Total quote = $159,000. The FE uplift is calculated on the base analytics price, not total ARR."
  ],
  [
    "PIR-DB-02", "Statsig WHN", "deal_builder",
    "Build a WHN deal for an M-sized customer: Platform Fee + 250 experiments + Feature Gates (500K × 1M checks). Which components belong?",
    JSON.stringify({
      components: [
        { name: "WHN Platform Fee – M ($48K suggested)", price: 48000, included: true },
        { name: "WHN Experimentation – 250 exp ($82,275)", price: 82275, included: true },
        { name: "WHN Feature Gates – 500K × 1M checks ($90,693)", price: 90693, included: true },
        { name: "Cloud Experimentation – 2,000 × 1M BE", price: 40474, included: false },
        { name: "Cloud Feature Gates – 100K × 1M checks", price: 22548, included: false },
        { name: "Standard Support ($5,000)", price: 5000, included: false }
      ],
      correct_total: 220968,
      explanation: "WHN deals use WHN-specific SKUs: Platform Fee + WHN Experimentation + WHN Feature Gates. Never mix Cloud and WHN products. Support is separate and not included in the base deal total here."
    }),
    "WHN deals have three core components: Platform Fee (flat by t-shirt), Experimentation (per-experiment), and Feature Gates (per 1M checks). Never mix Cloud SKUs into a WHN quote."
  ],
  [
    "PIR-DB-03", "Statsig Cloud", "deal_builder",
    "Build a Cloud deal: Experimentation (2,000 × 1M BE) + Feature Gates (100K × 1M checks) + mandatory support. What's the total ACV?",
    JSON.stringify({
      components: [
        { name: "Cloud Experimentation – 2,000 × 1M BE ($40,474)", price: 40474, included: true },
        { name: "Cloud Feature Gates – 100K × 1M checks ($22,548)", price: 22548, included: true },
        { name: "Standard Support ($5,000)", price: 5000, included: true },
        { name: "WHN Platform Fee – M", price: 48000, included: false },
        { name: "WHN Experimentation – 250 exp", price: 82275, included: false },
        { name: "Enterprise Support ($15,000)", price: 15000, included: false }
      ],
      correct_total: 68022,
      explanation: "Cloud ACV = Experimentation ($40,474) + Feature Gates ($22,548) + Standard Support ($5,000) = $68,022. No WHN products in a Cloud deal."
    }),
    "Cloud deals: Experimentation + Feature Gates + mandatory Support. Standard Support is the minimum ($5K). Cloud has no separate platform fee at standard volumes."
  ],
  [
    "PIR-DB-04", "Professional Services", "deal_builder",
    "Your deal is $250K ARR. Which PS tier and price is correct?",
    JSON.stringify({
      components: [
        { name: "PS – M tier ($100K–$300K ARR) = $41,100", price: 41100, included: true },
        { name: "PS – S tier ($50K–$100K ARR) = $19,500", price: 19500, included: false },
        { name: "PS – L tier ($300K–$500K ARR) = $67,800", price: 67800, included: false },
        { name: "PS – XS tier (under $50K ARR) = $8,000", price: 8000, included: false }
      ],
      correct_total: 41100,
      explanation: "$250K ARR falls in the M tier ($100K–$300K), so PS = $41,100."
    }),
    "$250K ARR is squarely in M-tier ($100K–$300K). PS pricing is based on total ARR, not the base analytics price alone."
  ],
  [
    "PIR-DB-05", "Amplitude Pricing", "deal_builder",
    "Customer wants Growth Analytics (200M EV/mo) + Web Experimentation + Activation + PS. ARR will be ~$170K. Build it.",
    JSON.stringify({
      components: [
        { name: "Growth Analytics (200M EV/mo)", price: 108600, included: true },
        { name: "Web Experimentation (30% uplift)", price: 32580, included: true },
        { name: "Activation (30% uplift)", price: 32580, included: true },
        { name: "PS – M tier ($100K–$300K)", price: 41100, included: true },
        { name: "Feature Experimentation (50% uplift)", price: 54300, included: false },
        { name: "PS – L tier ($300K–$500K)", price: 67800, included: false }
      ],
      correct_total: 214860,
      explanation: "Base: $108,600. Web Exp 30% = $32,580. Activation 30% = $32,580. ARR = $173,760 → M-tier PS = $41,100. Total = $214,860."
    }),
    "Both Web Exp and Activation are 30% uplift on the base analytics price ($108,600 × 0.30 = $32,580 each). The ARR of $173,760 falls in M-tier PS."
  ],
  [
    "PIR-DB-06", "Statsig WHN", "deal_builder",
    "A large enterprise wants WHN with 750 experiments. What t-shirt size Platform Fee applies?",
    JSON.stringify({
      components: [
        { name: "WHN Platform Fee – L (301–750 exp) = $96,000 suggested", price: 96000, included: true },
        { name: "WHN Platform Fee – M (51–300 exp) = $48,000", price: 48000, included: false },
        { name: "WHN Platform Fee – XL (751+ exp) = $216,000", price: 216000, included: false },
        { name: "WHN Platform Fee – S (≤50 exp) = $36,000", price: 36000, included: false }
      ],
      correct_total: 96000,
      explanation: "750 experiments falls in the L tier (301–750). Suggested = $80K base × 1.2 uplift = $96K."
    }),
    "750 experiments is the upper boundary of L-tier (301–750). One more experiment and you'd jump to XL ($216K) — a massive price step. Help customers right-size their volume."
  ],
  [
    "PIR-DB-07", "Amplitude Pricing", "deal_builder",
    "Customer wants Growth Analytics (100M EV/mo) + Session Replay + AI Feedback + PS. Estimated ARR ~$100K. Select the right components.",
    JSON.stringify({
      components: [
        { name: "Growth Analytics (100M EV/mo)", price: 78600, included: true },
        { name: "Session Replay (15% uplift)", price: 11790, included: true },
        { name: "AI Feedback (15% uplift)", price: 11790, included: true },
        { name: "PS – M tier ($100K–$300K)", price: 41100, included: true },
        { name: "PS – S tier ($50K–$100K)", price: 19500, included: false },
        { name: "Zoning Insights (10% uplift)", price: 7860, included: false }
      ],
      correct_total: 143280,
      explanation: "Base: $78,600. SR 15% = $11,790. AI Feedback 15% = $11,790. ARR = $102,180 → M-tier PS = $41,100. Total = $143,280."
    }),
    "Session Replay and AI Feedback are both 15% uplift. The combined ARR of $102,180 just crosses into M-tier PS ($100K–$300K = $41,100). Close to the S/M boundary — a key pricing conversation point."
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING PITFALL (7 scenarios) — spot the error
  // ═══════════════════════════════════════════════════════════════════════════
  [
    "PIR-PP-01", "Add-On Uplift", "pricing_pitfall",
    "One of these add-on uplift percentages is WRONG. Find the error:",
    JSON.stringify({
      statements: [
        { text: "Feature Experimentation: 50% uplift", is_error: false },
        { text: "Web Experimentation: 40% uplift", is_error: true },
        { text: "Growth & Stickiness: 30% uplift", is_error: false },
        { text: "Accounts: 20% uplift", is_error: false }
      ],
      error_explanation: "Web Experimentation uplift is 30%, not 40%. It's in the same tier as Activation, G&S, and AI Assistant."
    }),
    "Web Experimentation is 30%, not 40%. Only Feature Experimentation gets the premium 50% rate. Don't confuse them — customers will catch pricing errors fast."
  ],
  [
    "PIR-PP-02", "Professional Services", "pricing_pitfall",
    "Your colleague quoted a PS package. One line is wrong:",
    JSON.stringify({
      statements: [
        { text: "XS tier (under $50K ARR): $8,000", is_error: false },
        { text: "S tier ($50K–$100K ARR): $19,500", is_error: false },
        { text: "M tier ($100K–$300K ARR): $35,000", is_error: true },
        { text: "L tier ($300K–$500K ARR): $67,800", is_error: false }
      ],
      error_explanation: "M-tier PS is $41,100, not $35,000. Using the wrong PS price can leave money on the table or create an awkward correction later."
    }),
    "M-tier PS = $41,100. Getting this wrong by $6K+ creates a credibility issue with customers and leaves revenue on the table."
  ],
  [
    "PIR-PP-03", "Statsig Cloud", "pricing_pitfall",
    "A rep is describing Statsig Cloud billing. Spot the error:",
    JSON.stringify({
      statements: [
        { text: "Cloud Experimentation is priced per 1M Billable Events", is_error: false },
        { text: "Feature Gates are priced per 1M checks", is_error: false },
        { text: "Customers can choose monthly or annual billing terms", is_error: true },
        { text: "Standard Support starts at $5,000/year", is_error: false }
      ],
      error_explanation: "All Statsig contracts require annual usage terms. There is no monthly billing option — this is non-negotiable."
    }),
    "Statsig = annual only. No monthly billing, no quarterly terms. Every Statsig deal must be on annual usage term with annual quantity. This is a hard rule."
  ],
  [
    "PIR-PP-04", "Statsig WHN", "pricing_pitfall",
    "Review this WHN deal structure. One element is incorrect:",
    JSON.stringify({
      statements: [
        { text: "Platform Fee is a flat annual charge by t-shirt size", is_error: false },
        { text: "Experimentation is priced per experiment", is_error: false },
        { text: "Feature Gates minimum fair use is 50B checks", is_error: true },
        { text: "All WHN deals must be on 2026 PPL pricebook", is_error: false }
      ],
      error_explanation: "The minimum fair use volume for Feature Gates is 100B checks (100,000 units in Salesforce), not 50B. This is the absolute floor — no customer contract goes below 100B."
    }),
    "100B checks is the minimum fair use — never set it lower. In Salesforce, that's 100,000 units (the system divides by 1,000,000). This protects both Amplitude and the customer."
  ],
  [
    "PIR-PP-05", "Amplitude Pricing", "pricing_pitfall",
    "A new AE is describing the Amplitude plan tiers. Find the mistake:",
    JSON.stringify({
      statements: [
        { text: "Starter plan is free for up to 100K MTUs", is_error: false },
        { text: "Growth plan uses event-based pricing", is_error: false },
        { text: "Enterprise plan includes SSO and advanced governance", is_error: false },
        { text: "Enterprise+ includes custom SLA with 95% uptime guarantee", is_error: true }
      ],
      error_explanation: "Enterprise+ offers a 99.9% uptime SLA, not 95%. A 95% SLA would mean ~18 days of downtime per year — that would be unacceptable for enterprise customers."
    }),
    "Enterprise+ SLA is 99.9% uptime. Know the premium differentiators — custom SLAs at this level are a major selling point for security-conscious buyers."
  ],
  [
    "PIR-PP-06", "Statsig WHN", "pricing_pitfall",
    "A colleague is explaining Statsig fair use volumes. Find the error:",
    JSON.stringify({
      statements: [
        { text: "Fair use volumes are NOT hard caps on usage", is_error: false },
        { text: "Customer and Amplitude size the volume together", is_error: false },
        { text: "If a customer exceeds fair use, they get an automatic overage bill", is_error: true },
        { text: "The scoping calculator helps estimate the right volume", is_error: false }
      ],
      error_explanation: "Overages are NOT automatic. If the customer exceeds fair use by orders of magnitude, Amplitude works with them in good faith on a path forward via upsell or expansion — not automatic billing."
    }),
    "Fair use is not a hard cap with automatic overages. It's a mutual good-faith estimate. If exceeded significantly, the path is conversation → upsell/expansion on renewal, not surprise bills."
  ],
  [
    "PIR-PP-07", "Add-On Uplift", "pricing_pitfall",
    "Check these add-on uplift percentages. One is wrong:",
    JSON.stringify({
      statements: [
        { text: "Zoning Insights: 10% uplift", is_error: false },
        { text: "Session Replay: 15% uplift", is_error: false },
        { text: "Accounts: 25% uplift", is_error: true },
        { text: "AI Assistant: 30% uplift", is_error: false }
      ],
      error_explanation: "Accounts uplift is 20%, not 25%. It sits between Session Replay/AI Feedback (15%) and the 30% tier (Activation, Web Exp, G&S, AI Assistant)."
    }),
    "Accounts = 20%. It's the only add-on at 20% — a unique number to remember. Below it: Zoning (10%), SR/AI Feedback (15%). Above it: everything else at 30% or 50%."
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OBJECTION CLOSER (6 scenarios) — pick the best response
  // ═══════════════════════════════════════════════════════════════════════════
  [
    "PIR-OC-01", "Amplitude Pricing", "objection_closer",
    "Customer says: \"Your competitor offers similar analytics for 30% less. Why should I pay more?\"",
    JSON.stringify({
      responses: [
        { text: "I'll check with my manager about matching their price.", is_best: false },
        { text: "Our platform delivers integrated analytics, experimentation, and AI — that combined value drives measurably higher ROI than point solutions. Let me show you a case study of a customer who switched.", is_best: true },
        { text: "That's just how our pricing works — we're the market leader.", is_best: false },
        { text: "We can throw in a free add-on to make up the difference.", is_best: false }
      ]
    }),
    "Lead with value, not price. Amplitude's differentiation is the integrated platform — analytics + experimentation + AI in one. Case studies showing measurable ROI give customers confidence the premium is justified."
  ],
  [
    "PIR-OC-02", "Statsig Cloud", "objection_closer",
    "Customer asks: \"Why can't we do a monthly contract to start? We want to test Statsig before committing for a year.\"",
    JSON.stringify({
      responses: [
        { text: "All Statsig contracts are annual usage terms — this ensures both sides commit to a meaningful engagement. We do offer a proof-of-concept period within the annual structure to validate value before full rollout.", is_best: true },
        { text: "Sorry, that's just our policy. I can't change it.", is_best: false },
        { text: "Let me see if I can get you a quarterly deal instead.", is_best: false },
        { text: "You can start with our free tier and upgrade when ready.", is_best: false }
      ]
    }),
    "Annual contracts are mandatory for Statsig — no monthly, no quarterly. But reframe it positively: the annual commitment enables better pricing, dedicated support, and a structured POC within the contract."
  ],
  [
    "PIR-OC-03", "Professional Services", "objection_closer",
    "Customer pushes back: \"$41,000 for Professional Services seems steep. Our team can handle implementation ourselves.\"",
    JSON.stringify({
      responses: [
        { text: "I understand the concern. The PS package accelerates your time-to-value by 60% on average. Customers who skip PS typically take 3–4 months longer to see ROI, and many end up needing rescue engagements that cost more. Let me share what's included.", is_best: true },
        { text: "We can waive the PS fee entirely to get the deal done.", is_best: false },
        { text: "PS is optional — feel free to skip it if your team is confident.", is_best: false },
        { text: "I'll discount it to $25,000 to meet you halfway.", is_best: false }
      ]
    }),
    "Never waive PS or deeply discount without approval. Instead, sell the value: faster time-to-value, reduced risk, dedicated expertise. Customers who skip PS often have worse outcomes and churn risk increases."
  ],
  [
    "PIR-OC-04", "Statsig WHN", "objection_closer",
    "Customer questions: \"Why do I need to pay a Platform Fee on top of per-experiment pricing? That feels like double-charging.\"",
    JSON.stringify({
      responses: [
        { text: "The Platform Fee covers your dedicated infrastructure, SSO, team management, and ongoing platform maintenance — it's separate from experiment execution costs. Think of it like a SaaS platform license that ensures reliability and performance at scale.", is_best: true },
        { text: "I agree it's confusing — let me see if we can bundle it into the per-experiment price.", is_best: false },
        { text: "That's just how Statsig pricing works. Every vendor has platform fees.", is_best: false },
        { text: "We can waive the Platform Fee for the first year.", is_best: false }
      ]
    }),
    "The Platform Fee is non-negotiable but explainable: it covers infrastructure, security, team management, and platform reliability — separate from experiment execution. Frame it as a standard SaaS licensing model."
  ],
  [
    "PIR-OC-05", "Statsig Cloud", "objection_closer",
    "Prospect says: \"We want to start with 50 experiments but might grow to 2,000. Can we pay as we go?\"",
    JSON.stringify({
      responses: [
        { text: "Statsig pricing is annual, but we can right-size your initial commitment and build in expansion terms. Start with a volume that covers your first-year plan, and we'll structure the contract so scaling up is straightforward on renewal.", is_best: true },
        { text: "You'll need to commit to 2,000 experiments upfront to get the best per-unit price.", is_best: false },
        { text: "We don't do pay-as-you-go. You need to commit to an annual volume.", is_best: false },
        { text: "Start with 50 and we'll bill you for overages when you exceed it.", is_best: false }
      ]
    }),
    "Right-size the initial commitment, don't oversell or undersell. Annual contracts with thoughtful initial volumes + clear expansion terms = happy customers who grow with the platform."
  ],
  [
    "PIR-OC-06", "Amplitude Pricing", "objection_closer",
    "CFO pushes back: \"The 50% uplift for Feature Experimentation is too high. We're already paying six figures for analytics.\"",
    JSON.stringify({
      responses: [
        { text: "Feature Experimentation is our most powerful optimization tool — customers typically see 2–5× ROI through conversion improvements and faster shipping. The 50% uplift on a $100K base is $50K, but one winning experiment can generate millions in incremental revenue. Let me walk through a value model.", is_best: true },
        { text: "I can try to get you a discount down to 35% uplift.", is_best: false },
        { text: "Would you consider Web Experimentation instead? It's only 30% uplift.", is_best: false },
        { text: "The 50% uplift is standard — I can't change it.", is_best: false }
      ]
    }),
    "When CFOs push back on FE pricing, lead with ROI — not discounts. Frame the $50K as an investment that drives millions. Build a value model specific to their business. Only pivot to Web Exp if it truly fits their use case."
  ],
];

export default api({
  name: "SeedPriceScenarios",
  description: "Seeds all 40 Price is Right scenarios across 6 game types",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    inserted: z.number(),
    skipped: z.number(),
    message: z.string(),
  }),

  async run(ctx) {
    let inserted = 0;
    let skipped = 0;

    for (const [scenarioId, section, gameType, narrative, gameData, coachingNote] of scenarios) {
      const ExistingSchema = z.object({ cnt: z.coerce.number() });
      const [{ cnt }] = await ctx.integrations.apps_db.query(
        `SELECT COUNT(*)::int as cnt FROM cliptracker_v2_price_scenarios WHERE scenario_id = $1`,
        ExistingSchema, [scenarioId], { label: `Check ${scenarioId}` }
      );

      if (cnt > 0) {
        skipped++;
        continue;
      }

      await ctx.integrations.apps_db.execute(
        `INSERT INTO cliptracker_v2_price_scenarios (scenario_id, section, game_type, narrative, game_data, coaching_note)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [scenarioId, section, gameType, narrative, gameData, coachingNote],
        { label: `Insert ${scenarioId}` }
      );
      inserted++;
    }

    return {
      success: true,
      inserted,
      skipped,
      message: `Seeded ${inserted} scenarios (${skipped} already existed). Total: ${scenarios.length} across 6 game types.`,
    };
  },
});
