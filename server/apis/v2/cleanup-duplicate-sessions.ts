import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time cleanup: consolidate to 1 session per viewer per clip.
 * For each viewer+clip combo with multiple sessions:
 *   - If any session is completed, keep the one with the best engagement_score.
 *   - If none are completed, keep the most recently started one.
 *   - Delete all other sessions and their responses.
 * Then add a UNIQUE(clip_id, viewer_id) constraint.
 */
export default api({
  name: "CleanupDuplicateSessions",
  description: "One-time migration to enforce 1 session per viewer per clip",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    dryRun: z.boolean().default(true),
  }),

  output: z.object({
    duplicateGroups: z.number(),
    sessionsToDelete: z.number(),
    responsesDeleted: z.number(),
    sessionsDeleted: z.number(),
    constraintAdded: z.boolean(),
  }),

  async run(ctx, { dryRun }) {
    // Step 1: Find the keeper session for each viewer+clip combo
    // Priority: completed sessions by best score, then most recent incomplete
    const KeeperSchema = z.object({
      keeper_id: z.string(),
      clip_id: z.string(),
      viewer_id: z.string(),
    });

    const keepers = await ctx.integrations.db.query(
      `SELECT DISTINCT ON (clip_id, viewer_id)
         id as keeper_id, clip_id, viewer_id
       FROM cliptracker_v2_sessions
       ORDER BY clip_id, viewer_id,
         (CASE WHEN completed = true THEN 0 ELSE 1 END),
         engagement_score DESC NULLS LAST,
         started_at DESC`,
      KeeperSchema,
      [],
      { label: "Find keeper sessions" }
    );

    const keeperIds = keepers.map(k => k.keeper_id);

    // Step 2: Count duplicates (sessions NOT in keeper list)
    const CountSchema = z.object({ count: z.coerce.number() });

    const dupCount = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int as count FROM cliptracker_v2_sessions WHERE id != ALL($1::uuid[])`,
      CountSchema,
      [keeperIds],
      { label: "Count duplicate sessions" }
    );

    const sessionsToDelete = dupCount[0]?.count ?? 0;

    // Count affected groups
    const groupCount = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int as count FROM (
         SELECT clip_id, viewer_id FROM cliptracker_v2_sessions
         GROUP BY clip_id, viewer_id HAVING COUNT(*) > 1
       ) sub`,
      CountSchema,
      [],
      { label: "Count duplicate groups" }
    );

    if (dryRun) {
      return {
        duplicateGroups: groupCount[0]?.count ?? 0,
        sessionsToDelete,
        responsesDeleted: 0,
        sessionsDeleted: 0,
        constraintAdded: false,
      };
    }

    // Step 3: Delete responses for sessions being removed
    const r1 = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_responses
       WHERE session_id IN (
         SELECT id FROM cliptracker_v2_sessions WHERE id != ALL($1::uuid[])
       )`,
      [keeperIds],
      { label: "Delete orphaned responses" }
    );

    // Step 4: Delete duplicate sessions
    const r2 = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_sessions WHERE id != ALL($1::uuid[])`,
      [keeperIds],
      { label: "Delete duplicate sessions" }
    );

    // Step 5: Reset attempt_number to 1 on all remaining sessions
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions SET attempt_number = 1`,
      [],
      { label: "Reset attempt numbers to 1" }
    );

    // Step 6: Add UNIQUE constraint (idempotent — skip if already exists)
    try {
      await ctx.integrations.db.execute(
        `ALTER TABLE cliptracker_v2_sessions
         ADD CONSTRAINT uq_session_clip_viewer UNIQUE (clip_id, viewer_id)`,
        [],
        { label: "Add UNIQUE constraint" }
      );
    } catch (e: any) {
      // Constraint may already exist
      if (!String(e?.message).includes("already exists")) {
        throw e;
      }
    }

    return {
      duplicateGroups: groupCount[0]?.count ?? 0,
      sessionsToDelete,
      responsesDeleted: r1.rowCount,
      sessionsDeleted: r2.rowCount,
      constraintAdded: true,
    };
  },
});
