import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time cleanup: delete ALL first_pass_unlock XP events.
 * This reward is redundant with Perfect Hiker and is being removed system-wide.
 * Run once by admin, then this API can be removed.
 */
export default api({
  name: "CleanupFirstPassXP",
  description: "Deletes all first_pass_unlock XP events (redundant with Perfect Hiker)",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    deletedCount: z.number(),
    affectedViewers: z.array(z.object({
      name: z.string(),
      xpRemoved: z.number(),
      newTotalXp: z.number(),
    })),
  }),

  async run(ctx) {
    // First, find who is affected
    const AffectedSchema = z.object({
      viewer_id: z.string(),
      name: z.string(),
      xp_to_remove: z.coerce.number(),
    });

    const affected = await ctx.integrations.db.query(
      `SELECT xe.viewer_id, v.name,
              SUM(xe.xp_amount)::int AS xp_to_remove
       FROM cliptracker_v2_xp_events xe
       JOIN cliptracker_v2_viewers v ON v.id = xe.viewer_id
       WHERE xe.source_id = 'first_pass_unlock'
       GROUP BY xe.viewer_id, v.name
       ORDER BY v.name
       LIMIT 50`,
      AffectedSchema,
      [],
      { label: "Find viewers with first_pass_unlock XP" }
    );

    // Delete all first_pass_unlock events
    const result = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_xp_events WHERE source_id = 'first_pass_unlock'`,
      [],
      { label: "Delete all first_pass_unlock XP events" }
    );

    // Get new totals for affected viewers
    const affectedViewers: Array<{ name: string; xpRemoved: number; newTotalXp: number }> = [];
    for (const a of affected) {
      const TotalSchema = z.object({ total_xp: z.coerce.number() });
      const totals = await ctx.integrations.db.query(
        `SELECT COALESCE(SUM(xp_amount), 0)::int AS total_xp
         FROM cliptracker_v2_xp_events WHERE viewer_id = $1`,
        TotalSchema,
        [a.viewer_id],
        { label: `Get new total for ${a.name}` }
      );
      affectedViewers.push({
        name: a.name,
        xpRemoved: a.xp_to_remove,
        newTotalXp: totals[0]?.total_xp ?? 0,
      });
    }

    return {
      deletedCount: result.rowCount,
      affectedViewers,
    };
  },
});
