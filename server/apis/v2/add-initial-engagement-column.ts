import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time migration: adds initial_engagement_score column to sessions table
 * and backfills existing first-pass sessions from engagement_score.
 */
export default api({
  name: "AddInitialEngagementColumn",
  description: "Migration: adds initial_engagement_score column and backfills existing data",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    columnAdded: z.boolean(),
    backfilled: z.number(),
  }),

  async run(ctx) {
    // Add the column if it doesn't exist
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_sessions
       ADD COLUMN IF NOT EXISTS initial_engagement_score NUMERIC(5,2) DEFAULT NULL`,
      undefined,
      { label: "Add initial_engagement_score column" }
    );

    // Backfill: for first-pass sessions (is_recovery_attempt = false),
    // the stored engagement_score IS the initial score (never overwritten by S&R).
    // For recovery sessions, reconstruct from question/focus/time scores.
    const result = await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions
       SET initial_engagement_score = CASE
         WHEN is_recovery_attempt = false THEN engagement_score
         ELSE ROUND((question_score * 0.25) + (focus_score * 0.30) + (time_score * 0.45))
       END
       WHERE initial_engagement_score IS NULL
         AND engagement_score IS NOT NULL`,
      undefined,
      { label: "Backfill initial_engagement_score for existing sessions" }
    );

    ctx.log.info("Migration complete", { rowsUpdated: result.rowCount });

    return {
      columnAdded: true,
      backfilled: result.rowCount ?? 0,
    };
  },
});
