import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixGabiDate",
  description: "One-time fix: corrects Gabi Kassatly ascent_day_1 to her actual registration date",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET ascent_day_1 = '2026-06-24' WHERE id = 'c638031b-5698-493b-8f36-4d7e4d5fc629' AND name = 'Gabi Kassatly'`,
      undefined,
      { label: "Fix Gabi ascent_day_1 to registration date" }
    );

    return { success: true, message: "Updated Gabi Kassatly ascent_day_1 from 2026-07-01 to 2026-06-24" };
  },
});
