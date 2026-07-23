import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time backfill: insert missing approach completion XP for learners
 * who unlocked Ascent but never received their XP event.
 * Also unlocks Ascent for Levi who completed all requirements but never clicked "Begin Ascent".
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 */
export default api({
  name: "BackfillApproachXP",
  description: "Backfills missing approach completion XP for Levi, Rylan, and Salim",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    results: z.array(z.object({
      name: z.string(),
      action: z.string(),
      xp: z.number(),
    })),
  }),

  async run(ctx) {
    const results: Array<{ name: string; action: string; xp: number }> = [];

    // Use clip at sort 1 as sentinel for approach XP events
    // (clip_id FK requires a real clip — using viewerId as clip_id was the original bug)
    const APPROACH_CLIP = "439ad1ff-6526-4f24-a1da-f84fd40638de"; // sort 1

    // 1. Levi Verry — unlock Ascent + 17 XP (late: started Jul 7, finished Jul 22 = 12 weekdays)
    const leviId = "8654b855-1eaf-465c-91b0-2c20f889a33e";
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers
       SET week1_unlocked_at = now(), week1_unlock_type = 'earned'
       WHERE id = $1 AND week1_unlocked_at IS NULL`,
      [leviId],
      { label: "Unlock Ascent for Levi" }
    );
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
       VALUES ($1, $2, 'milestone', 'approach_complete_late', 17)
       ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
      [leviId, APPROACH_CLIP],
      { label: "Award Levi 17 XP (late approach)" }
    );
    results.push({ name: "Levi Verry", action: "Unlocked Ascent + 17 XP (late)", xp: 17 });

    // 2. Rylan Holey — 17 XP (late: started Jul 13, finished Jul 21 = 6 weekdays)
    const rylanId = "c3c6afee-a9a8-404b-bf80-039d1819e14a";
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
       VALUES ($1, $2, 'milestone', 'approach_complete_late', 17)
       ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
      [rylanId, APPROACH_CLIP],
      { label: "Award Rylan 17 XP (late approach)" }
    );
    results.push({ name: "Rylan Holey", action: "17 XP (late)", xp: 17 });

    // 3. Salim Al Sabaa — 35 XP (on-time: started Jul 13, finished Jul 20 = 5 weekdays)
    const salimId = "a3934457-d1c9-4861-881b-25adb42f2bd3";
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
       VALUES ($1, $2, 'milestone', 'approach_complete', 35)
       ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
      [salimId, APPROACH_CLIP],
      { label: "Award Salim 35 XP (on-time approach)" }
    );
    // Also award approach_complete badge for on-time completion
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
       VALUES ($1, 'approach_complete', $2)
       ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
      [salimId, APPROACH_CLIP],
      { label: "Award Salim approach_complete badge" }
    );
    results.push({ name: "Salim Al Sabaa", action: "35 XP + badge (on-time)", xp: 35 });

    ctx.log.info("Backfill complete", { results });
    return { results };
  },
});
