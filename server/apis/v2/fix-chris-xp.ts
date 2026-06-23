import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: Corrects Chris English's XP and badges.
 *
 * Both of Chris's completed sessions (Clip 1 ICP, Clip 2 TOFU) had engagement
 * scores of ~61% but were incorrectly marked as first-pass successes because
 * the S&R trigger was checking trail marker score (100%) instead of overall
 * engagement. He should not have earned first_pass_unlock, perfect_hiker,
 * speed_hiker, or double_summit XP/badges.
 */
export default api({
  name: "FixChrisXP",
  description: "One-time fix: removes illegitimate XP and badges for Chris English",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    xpEventsDeleted: z.number(),
    badgesDeleted: z.number(),
    newTotalXp: z.number(),
    remainingBadges: z.array(z.string()),
  }),

  async run(ctx) {
    const CHRIS_ID = "74c80649-c345-4cd9-9fce-383aa02328e1";

    // 1. Delete illegitimate XP events
    // These source_ids should NOT exist because Chris's engagement was < 80%
    // on both clips — he should have gone through S&R, not first-pass
    const xpResult = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_xp_events
       WHERE viewer_id = $1
       AND source_id IN ('first_pass_unlock', 'perfect_hiker', 'speed_hiker', 'double_summit')`,
      [CHRIS_ID],
      { label: "Delete illegitimate XP events for Chris" }
    );
    const xpDeleted = xpResult.rowCount ?? 0;
    ctx.log.info("Deleted illegitimate XP events", { count: xpDeleted });

    // 2. Delete illegitimate badges
    // perfect_hiker, speed_hiker, double_summit — all earned under broken logic
    const badgeResult = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_badges
       WHERE viewer_id = $1
       AND badge_id IN ('perfect_hiker', 'speed_hiker', 'double_summit')`,
      [CHRIS_ID],
      { label: "Delete illegitimate badges for Chris" }
    );
    const badgesDeleted = badgeResult.rowCount ?? 0;
    ctx.log.info("Deleted illegitimate badges", { count: badgesDeleted });

    // 3. Get corrected total XP
    const TotalSchema = z.object({ total_xp: z.coerce.number() });
    const totalResult = await ctx.integrations.db.query(
      `SELECT COALESCE(SUM(xp_amount), 0)::int as total_xp
       FROM cliptracker_v2_xp_events WHERE viewer_id = $1`,
      TotalSchema,
      [CHRIS_ID],
      { label: "Get corrected total XP" }
    );

    // 4. Get remaining badges
    const BadgeSchema = z.object({ badge_id: z.string() });
    const remaining = await ctx.integrations.db.query(
      `SELECT badge_id FROM cliptracker_v2_badges WHERE viewer_id = $1 ORDER BY earned_at`,
      BadgeSchema,
      [CHRIS_ID],
      { label: "Get remaining badges" }
    );

    return {
      xpEventsDeleted: xpDeleted,
      badgesDeleted: badgesDeleted,
      newTotalXp: totalResult[0]?.total_xp ?? 0,
      remainingBadges: remaining.map(b => b.badge_id),
    };
  },
});
