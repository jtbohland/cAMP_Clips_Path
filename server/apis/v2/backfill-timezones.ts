import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "BackfillTimezones",
  description: "Backfills timezone values for existing viewers by viewer ID",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    updates: z.array(
      z.object({
        viewerId: z.string().uuid(),
        timezone: z.enum(["NAMER", "EMEA", "AAPJ"]),
      })
    ),
  }),

  output: z.object({
    updatedCount: z.number(),
  }),

  async run(ctx, { updates }) {
    let updatedCount = 0;

    for (const { viewerId, timezone } of updates) {
      const result = await ctx.integrations.db.execute(
        "UPDATE cliptracker_v2_viewers SET timezone = $1 WHERE id = $2",
        [timezone, viewerId],
        { label: `Set timezone=${timezone} for ${viewerId}` }
      );
      updatedCount += result.rowCount;
    }

    ctx.log.info("Backfilled timezones", { updatedCount });
    return { updatedCount };
  },
});
