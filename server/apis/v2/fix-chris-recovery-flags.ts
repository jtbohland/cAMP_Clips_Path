import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: Chris English's sessions for Personas (sort 2) and TOFU (sort 3)
 * have is_recovery_attempt = false, but unlock overrides prove they were completed
 * via weather_storm and search_rescue respectively.
 *
 * Session IDs (verified from DB):
 * - 392d9219-6b4c-446c-b8c2-6c304277661b (sort 2 Personas — completed via weather_storm)
 * - 7e2afb44-c39f-4282-a3cc-6391474265d9 (sort 3 TOFU — completed via search_rescue)
 */
export default api({
  name: "FixChrisRecoveryFlags",
  description: "Fix is_recovery_attempt flags on Chris's Personas and TOFU sessions",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    fixed: z.number(),
  }),

  async run(ctx) {
    const CHRIS_VIEWER_ID = "74c80649-c345-4cd9-9fce-383aa02328e1";
    const SESSION_IDS = [
      "392d9219-6b4c-446c-b8c2-6c304277661b", // Personas (sort 2) — weather_storm
      "7e2afb44-c39f-4282-a3cc-6391474265d9",  // TOFU (sort 3) — search_rescue
    ];

    const result = await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions
       SET is_recovery_attempt = true
       WHERE id = ANY($1::uuid[])
         AND viewer_id = $2
         AND is_recovery_attempt = false`,
      [SESSION_IDS, CHRIS_VIEWER_ID],
      { label: "Fix Chris recovery flags" }
    );

    ctx.log.info("Fixed Chris recovery flags", { rowCount: result.rowCount });

    return { fixed: result.rowCount ?? 0 };
  },
});
