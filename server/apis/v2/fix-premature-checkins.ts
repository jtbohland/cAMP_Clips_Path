import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: Clear approach_checkin_sent_at for Rylan and Salim
 * who were prematurely prompted to send the Approach check-in
 * immediately after registration (before completing Approach items).
 */
export default api({
  name: "FixPrematureCheckins",
  description: "Clears premature approach_checkin_sent_at for Rylan and Salim.",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    rowsUpdated: z.coerce.number(),
  }),

  async run(ctx) {
    const RYLAN_ID = "c3c6afee-a9a8-404b-bf80-039d1819e14a";
    const SALIM_ID = "a3934457-d1c9-4861-881b-25adb42f2bd3";

    const result = await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers
       SET approach_checkin_sent_at = NULL
       WHERE id = ANY($1::uuid[])
         AND approach_checkin_sent_at IS NOT NULL`,
      [[RYLAN_ID, SALIM_ID]],
      { label: "Clear premature approach check-ins for Rylan & Salim" },
    );

    ctx.log.info("Cleared premature check-ins", { rowsUpdated: result.rowCount });

    return { rowsUpdated: result.rowCount };
  },
});
