import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateTimezoneDayLabels",
  description: "Adds timezone column to viewers and strips a/b suffixes from day labels",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    timezoneColumnAdded: z.boolean(),
    dayLabelsUpdated: z.number(),
  }),

  async run(ctx) {
    // 1. Add timezone column to viewers table
    await ctx.integrations.db.execute(
      "ALTER TABLE cliptracker_v2_viewers ADD COLUMN IF NOT EXISTS timezone text",
      undefined,
      { label: "Add timezone column" }
    );

    // 2. Strip a/b suffixes from day_label (e.g. "Day 11a" → "Day 11", "Day 7b" → "Day 7")
    const result = await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_clips
       SET day_label = regexp_replace(day_label, '([0-9]+)[a-z]$', '\\1')
       WHERE day_label ~ '[0-9]+[a-z]$'`,
      undefined,
      { label: "Strip a/b suffixes from day labels" }
    );

    ctx.log.info("Migration complete", {
      dayLabelsUpdated: result.rowCount,
    });

    return {
      timezoneColumnAdded: true,
      dayLabelsUpdated: result.rowCount,
    };
  },
});
