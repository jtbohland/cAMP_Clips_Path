import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixTylerDate",
  description: "Reverts Tyler Spaan ascent_day_1 back to his registration date",

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
      `UPDATE cliptracker_v2_viewers SET ascent_day_1 = '2026-07-28' WHERE id = '425dc49a-ddc8-496f-b352-0bd2e3932227' AND name = 'Tyler Spaan'`,
      undefined,
      { label: "Revert Tyler ascent_day_1 to registration date" }
    );

    return { success: true, message: "Reverted Tyler Spaan ascent_day_1 back to 2026-07-28 (his registration date)" };
  },
});
