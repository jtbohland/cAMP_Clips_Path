import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time migration: inserts the two resource-only topic day rows
 * (Day 5: Renewal Operations and Day 9: Pricing & Packaging 101)
 * and shifts existing sort_orders to accommodate them.
 * Also creates the resource click tracking table.
 *
 * Idempotent — safe to re-run.
 */
export default api({
  name: "SetupTopicDays",
  description: "Migration: inserts Day 5 and Day 9 topic day rows, shifts sort_orders",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    // 1. Create resource click tracking table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_resource_clicks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        clip_id UUID NOT NULL REFERENCES cliptracker_v2_clips(id),
        resource_index INT NOT NULL,
        clicked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(viewer_id, clip_id, resource_index)
      )`,
      undefined,
      { label: "Create resource click tracking table" }
    );

    // 2. Check if topic days already exist
    const ExistCheck = z.object({ cnt: z.coerce.number() });
    const existing = await ctx.integrations.db.query(
      "SELECT COUNT(*)::int as cnt FROM cliptracker_v2_clips WHERE title LIKE '%Renewal Operations%' OR title LIKE '%Pricing & Packaging 101%'",
      ExistCheck,
      [],
      { label: "Check if topic days already exist" }
    );

    if (existing[0].cnt > 0) {
      return { success: true, message: "Topic days already exist — migration skipped." };
    }

    // 3. Shift sort_orders to make room
    // First shift: everything >= 5 moves up by 1 (makes room for Day 5 at sort_order 5)
    await ctx.integrations.db.execute(
      "UPDATE cliptracker_v2_clips SET sort_order = sort_order + 1 WHERE sort_order >= 5",
      undefined,
      { label: "Shift sort_orders >= 5 up by 1" }
    );

    // Second shift: after first shift, Day 8b is at sort_order 10.
    // Everything >= 11 moves up by 1 (makes room for Day 9 at sort_order 11)
    await ctx.integrations.db.execute(
      "UPDATE cliptracker_v2_clips SET sort_order = sort_order + 1 WHERE sort_order >= 11",
      undefined,
      { label: "Shift sort_orders >= 11 up by 1" }
    );

    // 4. Insert Day 5: Renewal Operations
    const day5Resources = JSON.stringify([
      {
        label: "Sales Operating Cadence & Manager Playbook (2026)",
        url: "https://docs.google.com/presentation/d/1CQLqFWy3M6JiprYlgNh8FelgJorPT-eZ_uvpg3F0IFE/edit?slide=id.ge0112cd95c_5_4#slide=id.ge0112cd95c_5_4",
        type: "slides",
        emoji: "🐙",
        note: "Renewals: pages 10, 21, 27, 32, 33, 40"
      },
      {
        label: "2026 Sales Policy Handbook",
        url: "https://app.spekit.co/app/wiki/asset/817909a3-30d8-4b9b-9a35-d8c07150b365?type=asset&expanded=true",
        type: "spekit",
        emoji: "🐙",
        note: "Renewals: pages 6, 7, 9, 22"
      },
      {
        label: "Customer Engagement Model (CEM) – Renewal Motion",
        url: "https://docs.google.com/document/d/1VxMWNbIWWEtJwuhNibKHUCsbOsCQqVFcin8vrZkeKZw/edit?tab=t.0#heading=h.k0bsvsa98x07",
        type: "gdrive",
        emoji: "📓"
      },
      {
        label: "2026 Sales Finance & PPL Enablement Deck",
        url: "https://app.spekit.co/app/wiki/asset/101068d2-21c1-4d12-9f66-ab1f7fda4e8b?type=asset&expanded=true",
        type: "spekit",
        emoji: "📓"
      },
      {
        label: "Renewal Readiness Dashboard (SFDC)",
        url: "https://amplitude.lightning.force.com/analytics/dashboard/0FKUw0000000eOrOAI",
        type: "sfdc",
        emoji: "☁️"
      }
    ]);

    const day5Meta = JSON.stringify({
      type: "topic_day",
      summary: "This session introduces how renewals work at Amplitude, and how AEs plug into the broader revenue and finance motion. Reps will learn renewal stages, roles and responsibilities, and key policies that govern pricing, discounts, and approvals. The goal is to demystify \"who does what when\" so renewals feel like a managed process, not one-off fire drills.",
      learning_objectives: [
        "Explain the renewal lifecycle, including stages, timelines, and required milestones.",
        "Identify who owns which parts of the renewal (AE, CS, Renewals, Deal Desk, Finance) and when to engage them.",
        "Apply guardrails and policies (discount, term, uplift expectations) when shaping renewal strategies."
      ],
      smes: [
        { name: "Lenora Bennis", title: "Sr. Manager, Renewals Management" },
        { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" },
        { name: "Katie Helie", title: "VP of Finance" }
      ],
      slack_channels: [
        { name: "#help-salesops", url: "https://amplitude.slack.com/archives/C05F532Q29F" },
        { name: "#gtm-pricing-packaging-help", url: "https://amplitude.slack.com/archives/C04LW12V65N" }
      ]
    });

    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_clips (id, title, video_url, duration_seconds, sort_order, status, week_number, day_label, resources, transcript)
       VALUES (gen_random_uuid(), $1, NULL, NULL, 5, 'live', 2, 'Day 5', $2, $3)`,
      ["🐦‍🔥 Renewal Operations", day5Resources, day5Meta],
      { label: "Insert Day 5: Renewal Operations" }
    );

    // 5. Insert Day 9: Pricing & Packaging 101
    const day9Resources = JSON.stringify([
      {
        label: "MindTickle: Introduction to new Pricing & Packaging (6-lessons, 55m)",
        url: "https://amplitude.mindtickle.com/new/ui/learner/training/files/2026021170074268112?loSeriesId=2026020954479627972&loModuleId=2026021077838173257",
        type: "mindtickle",
        emoji: "🧠"
      },
      {
        label: "2026 Sales Finance & PPL Enablement Deck",
        url: "https://app.spekit.co/app/wiki/asset/101068d2-21c1-4d12-9f66-ab1f7fda4e8b?type=asset&expanded=true",
        type: "spekit",
        emoji: "📓"
      },
      {
        label: "2026 Proposal Template",
        url: "https://docs.google.com/presentation/d/1jhDGkH9jdm1mYj1b179mAn6pkphmCiStresnsAvKtQs/edit?slide=id.g3ca72f6abd4_1_2017#slide=id.g3ca72f6abd4_1_2017",
        type: "slides",
        emoji: "📓"
      },
      {
        label: "Pricing Scenario Exercise (for AEs & Partners)",
        url: "https://docs.google.com/presentation/d/1U44Rs5ZGuNiORIzteK-W1n0EN3HPDvnXXEHMOLbemUc/edit?slide=id.g342929c60aa_0_229#slide=id.g342929c60aa_0_229",
        type: "slides",
        emoji: "💻"
      }
    ]);

    const day9Meta = JSON.stringify({
      type: "topic_day",
      summary: "This session introduces Amplitude's 2026 pricing and packaging model and how AEs should use it in real deals. Reps will learn core components (SKUs, tiers, add-ons), how value and usage map to price, and the basics of using the pricing tools. The focus is on enabling confident, value-based pricing conversations rather than tactical discounting.",
      learning_objectives: [
        "Explain Amplitude's core pricing and packaging structure in plain language to customers.",
        "Use the pricing tools/templates to configure a standard offer that aligns with customer use cases.",
        "Handle common pricing objections by tying back to value, outcomes, and long-term roadmap."
      ],
      smes: [
        { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" },
        { name: "Katie Helie", title: "VP of Finance" }
      ],
      slack_channels: [
        { name: "#gtm-pricing-packaging-help", url: "https://amplitude.slack.com/archives/C04LW12V65N" }
      ],
      deal_desk_note: "For pricing/quoting help on 2026 PPL, open a case with Deal Desk from the associated opportunity in Salesforce."
    });

    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_clips (id, title, video_url, duration_seconds, sort_order, status, week_number, day_label, resources, transcript)
       VALUES (gen_random_uuid(), $1, NULL, NULL, 11, 'live', 3, 'Day 9', $2, $3)`,
      ["💰 Pricing & Packaging 101", day9Resources, day9Meta],
      { label: "Insert Day 9: Pricing & Packaging 101" }
    );

    // 6. Update unlock overrides — shift clip_id references
    // The unlock_overrides table stores clip_id (UUID), not sort_order, so they don't need updating.
    // The unlock logic in GetClipLibrary uses array index, not sort_order.

    ctx.log.info("Topic days migration completed successfully");

    return {
      success: true,
      message: "Created resource_clicks table, inserted Day 5 (Renewal Operations) and Day 9 (Pricing & Packaging 101), shifted sort_orders."
    };
  },
});
