import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixKabirDoubleSummit",
  description: "Removes false double_summit badge and XP from Kabir",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    badgeDeleted: z.boolean(),
    xpDeleted: z.boolean(),
  }),

  async run(ctx) {
    const KABIR_VIEWER_ID = "273867c6-76b7-49af-8b6e-7501e0c5222f";
    const BADGE_ROW_ID = "c5871d31-446e-48dd-87ed-3af3141dc205";
    const XP_ROW_ID = "77c8bc20-6e09-46b2-abfc-297087e45503";

    // Delete the false double_summit badge
    await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_badges
       WHERE id = $1 AND badge_id = 'double_summit' AND viewer_id = $2`,
      [BADGE_ROW_ID, KABIR_VIEWER_ID],
      { label: "Delete false double_summit badge" }
    );

    // Delete the corresponding XP event (+5 XP)
    await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_xp_events
       WHERE id = $1 AND source_id = 'double_summit' AND viewer_id = $2`,
      [XP_ROW_ID, KABIR_VIEWER_ID],
      { label: "Delete false double_summit XP event" }
    );

    ctx.log.info("Fixed Kabir double_summit", { viewerId: KABIR_VIEWER_ID });
    return { badgeDeleted: true, xpDeleted: true };
  },
});
