import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixKabirDate",
  description: "One-time fix: corrects Kabir Rai ascent_day_1 to his actual week 1 start date",

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
      `UPDATE cliptracker_v2_viewers SET ascent_day_1 = '2026-06-17' WHERE id = '273867c6-76b7-49af-8b6e-7501e0c5222f' AND name = 'Kabir Rai'`,
      undefined,
      { label: "Fix Kabir ascent_day_1 to actual week 1 start" }
    );

    return { success: true, message: "Updated Kabir Rai ascent_day_1 from 2026-06-24 to 2026-06-17" };
  },
});
