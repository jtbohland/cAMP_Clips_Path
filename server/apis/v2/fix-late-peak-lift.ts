import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: adjust late Peak Lift XP from 17 → 10 for all learners
 * who have approach_complete_late at 17 XP.
 * Idempotent — only updates rows where xp_amount = 17.
 */
export default api({
  name: "FixLatePeakLift",
  description: "One-time fix: late Peak Lift 17→10 XP",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    affected: z.array(z.object({
      name: z.string(),
      oldXp: z.number(),
      newXp: z.number(),
    })),
    rowsUpdated: z.number(),
  }),

  async run(ctx) {
    // First, identify who will be affected
    const AffectedSchema = z.object({
      name: z.string(),
      xp_amount: z.coerce.number(),
    });
    const affected = await ctx.integrations.db.query(
      `SELECT v.name, xe.xp_amount
       FROM cliptracker_v2_xp_events xe
       JOIN cliptracker_v2_viewers v ON v.id = xe.viewer_id
       WHERE xe.source_id = 'approach_complete_late' AND xe.xp_amount = 17
       ORDER BY v.name
       LIMIT 50`,
      AffectedSchema, [],
      { label: "Find learners with late Peak Lift at 17 XP" }
    );

    if (affected.length === 0) {
      ctx.log.info("No learners with approach_complete_late at 17 XP — already adjusted or none exist");
      return { affected: [], rowsUpdated: 0 };
    }

    // Update all at once
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_xp_events
       SET xp_amount = 10
       WHERE source_id = 'approach_complete_late' AND xp_amount = 17`,
      [],
      { label: "Adjust late Peak Lift 17→10" }
    );

    const results = affected.map(a => ({
      name: a.name,
      oldXp: 17,
      newXp: 10,
    }));

    ctx.log.info("Late Peak Lift adjusted", { count: results.length });
    return { affected: results, rowsUpdated: results.length };
  },
});
