import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateClipLabels",
  description: "One-time migration: adds week_number/day_label columns and updates clip titles",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    columnsAdded: z.boolean(),
    rowsUpdated: z.number(),
  }),

  async run(ctx) {
    // Step 1: Add columns if they don't exist
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_clips ADD COLUMN IF NOT EXISTS week_number integer, ADD COLUMN IF NOT EXISTS day_label text`,
      undefined,
      { label: "Add week_number and day_label columns" }
    );

    // Step 2: Update all 17 clips
    const updates = [
      { sort: 1, week: 2, day: "Day 1", title: "🔎 Ideal Customer Profiles (Personas & Industries)" },
      { sort: 2, week: 2, day: "Day 2", title: "📥 Top of Funnel (TOFU) – MQLs & Inbounds" },
      { sort: 3, week: 2, day: "Day 3", title: "📈 GTM Launch Pad" },
      { sort: 4, week: 2, day: "Day 4", title: "📇 Prospecting Process" },
      { sort: 5, week: 3, day: "Day 6", title: "🥊 The Competitive Landscape" },
      { sort: 6, week: 3, day: "Day 7a", title: "🩺 Account Planning Best Practices" },
      { sort: 7, week: 3, day: "Day 7b", title: "🩺 Account Planning Best Practices (Momentum for Slack)" },
      { sort: 8, week: 3, day: "Day 8a", title: "🏎️ Discovery That Accelerates" },
      { sort: 9, week: 3, day: "Day 8b", title: "🏎️ Discovery That Accelerates (Spekit Deal Rooms)" },
      { sort: 10, week: 3, day: "Day 10", title: "🪢 Leveraging Partners" },
      { sort: 11, week: 4, day: "Day 11a", title: "☂️ Forecasting" },
      { sort: 12, week: 4, day: "Day 11b", title: "☂️ Forecasting (Intro to Forecasting Services)" },
      { sort: 13, week: 4, day: "Day 12", title: "📖 Customer Stories" },
      { sort: 14, week: 4, day: "Day 13", title: "📑 Contract Lifecycle Management" },
      { sort: 15, week: 4, day: "Day 14", title: "🫱🏻‍🫲🏼 Deal Desk & CPQ" },
      { sort: 16, week: 4, day: "Day 15a", title: "🪢 Leveraging Solution Engineers" },
      { sort: 17, week: 4, day: "Day 15b", title: "🪢 Leveraging Professional Services (Why Sell Services?)" },
    ];

    let rowsUpdated = 0;
    for (const u of updates) {
      const result = await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_clips SET title = $1, week_number = $2, day_label = $3 WHERE sort_order = $4`,
        [u.title, u.week, u.day, u.sort],
        { label: `Update clip sort_order=${u.sort}` }
      );
      rowsUpdated += result.rowCount;
    }

    return { columnsAdded: true, rowsUpdated };
  },
});
