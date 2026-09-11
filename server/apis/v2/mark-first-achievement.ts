import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MarkFirstAchievement",
  description: "Marks the first achievement modal as shown — only if learner actually completed Approach",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { viewerId }) {
    // Guard: only set the flag if the learner genuinely completed Approach
    // (has a week1_unlocked_at timestamp from the real unlock flow).
    // This prevents the catch-up modal from re-setting the flag for learners
    // whose first_achievement_shown was intentionally reset.
    const [viewer] = await ctx.integrations.db.query(
      `SELECT first_achievement_shown, week1_unlocked_at
       FROM cliptracker_v2_viewers WHERE id = $1`,
      z.object({
        first_achievement_shown: z.boolean(),
        week1_unlocked_at: z.string().nullable(),
      }),
      [viewerId],
      { label: "Check viewer before marking achievement" }
    );

    if (!viewer) {
      ctx.log.warn("Viewer not found for MarkFirstAchievement", { viewerId });
      return { success: false };
    }

    // Already marked — no-op (idempotent)
    if (viewer.first_achievement_shown) {
      return { success: true };
    }

    // Only mark if Approach was genuinely unlocked (week1_unlocked_at is set)
    if (!viewer.week1_unlocked_at) {
      ctx.log.warn("Skipping MarkFirstAchievement — week1_unlocked_at not set", { viewerId });
      return { success: false };
    }

    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET first_achievement_shown = true WHERE id = $1`,
      [viewerId],
      { label: "Mark first achievement shown" }
    );

    ctx.log.info("First achievement marked as shown", { viewerId });
    return { success: true };
  },
});
