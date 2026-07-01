import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixBenChrisDates",
  description: "One-time fix: corrects ascent_day_1 for Ben (Jun 15) and Chris (Jun 8)",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    ben: z.string(),
    chris: z.string(),
  }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET ascent_day_1 = '2026-06-15' WHERE id = '66b8a6ac-3bee-49c5-865c-e187ac73ac02' AND name = 'Benjamin Singh'`,
      undefined,
      { label: "Fix Ben ascent_day_1 to June 15" }
    );

    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET ascent_day_1 = '2026-06-08' WHERE id = '74c80649-c345-4cd9-9fce-383aa02328e1' AND name = 'Chris English'`,
      undefined,
      { label: "Fix Chris ascent_day_1 to June 8" }
    );

    return {
      ben: "Updated Ben ascent_day_1 to 2026-06-15",
      chris: "Updated Chris ascent_day_1 to 2026-06-08",
    };
  },
});
