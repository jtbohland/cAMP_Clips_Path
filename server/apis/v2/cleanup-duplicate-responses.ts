import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time cleanup: removes duplicate responses and adds a unique constraint.
 * After running, delete this API — it's not needed once the constraint exists.
 */
export default api({
  name: "CleanupDuplicateResponses",
  description: "One-time: dedup responses + add unique constraint",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    duplicatesRemoved: z.number(),
    constraintAdded: z.boolean(),
  }),

  async run(ctx) {
    // 1. Count duplicates before cleanup
    const beforeCount = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int as total FROM cliptracker_v2_responses`,
      z.object({ total: z.coerce.number() }),
      [],
      { label: "Count total responses before cleanup" }
    );

    // 2. Delete duplicates, keeping the earliest response per (session_id, question_id)
    await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_responses
       WHERE id NOT IN (
         SELECT DISTINCT ON (session_id, question_id) id
         FROM cliptracker_v2_responses
         ORDER BY session_id, question_id, answered_at ASC
       )`,
      [],
      { label: "Delete duplicate responses" }
    );

    // 3. Count after cleanup
    const afterCount = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int as total FROM cliptracker_v2_responses`,
      z.object({ total: z.coerce.number() }),
      [],
      { label: "Count total responses after cleanup" }
    );

    const duplicatesRemoved = beforeCount[0].total - afterCount[0].total;

    // 4. Add unique constraint to prevent future duplicates
    let constraintAdded = false;
    try {
      await ctx.integrations.db.execute(
        `ALTER TABLE cliptracker_v2_responses
         ADD CONSTRAINT uq_session_question UNIQUE (session_id, question_id)`,
        [],
        { label: "Add unique constraint on (session_id, question_id)" }
      );
      constraintAdded = true;
    } catch (err: any) {
      // Constraint may already exist
      if (err?.message?.includes("already exists")) {
        constraintAdded = true;
        ctx.log.info("Unique constraint already exists");
      } else {
        ctx.log.error("Failed to add unique constraint", { error: err?.message });
      }
    }

    ctx.log.info("Cleanup complete", { duplicatesRemoved, constraintAdded });

    return { duplicatesRemoved, constraintAdded };
  },
});
