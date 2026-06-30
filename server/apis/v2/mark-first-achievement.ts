import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MarkFirstAchievement",
  description: "Marks the first achievement modal as shown for a viewer",

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
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET first_achievement_shown = true WHERE id = $1`,
      [viewerId],
      { label: "Mark first achievement shown" }
    );

    ctx.log.info("First achievement marked as shown", { viewerId });
    return { success: true };
  },
});
