import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isVelocityPromo } from "./pacing-helpers.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Unlocks "The Ascent" for a viewer after completing all Week 1 requirements.
 * Awards the approach_complete badge + 25 XP if completed within 5 weekdays.
 */
export default api({
  name: "UnlockAscent",
  description: "Unlocks The Ascent tab after all Week 1 requirements are met",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    success: z.boolean(),
    alreadyUnlocked: z.boolean(),
    earnedBadge: z.boolean(),
    earnedXp: z.number(),
    error: z.string().nullable(),
  }),

  async run(ctx, { viewerId }) {
    const CountSchema = z.object({ count: z.coerce.number() });

    // Check if already unlocked
    const ViewerRow = z.object({
      week1_unlocked_at: z.string().nullable(),
      ascent_day_1: z.string().nullable(),
      role: z.string().nullable(),
    });
    const viewerRows = await ctx.integrations.db.query(
      `SELECT week1_unlocked_at::text, ascent_day_1::text, role
       FROM cliptracker_v2_viewers WHERE id = $1`,
      ViewerRow,
      [viewerId],
      { label: "Check viewer unlock status" }
    );

    if (!viewerRows[0]) {
      return { success: false, alreadyUnlocked: false, earnedBadge: false, earnedXp: 0, error: "Viewer not found" };
    }

    if (viewerRows[0].week1_unlocked_at) {
      return { success: true, alreadyUnlocked: true, earnedBadge: false, earnedXp: 0, error: null };
    }

    // Verify all requirements are met
    // 1. Module sign-offs — VP only requires camp101; AE/SDR require all 3
    const viewerRole = viewerRows[0].role ?? "Velocity AE";
    const isVP = isVelocityPromo(viewerRole);
    const requiredSignoffs = isVP ? 1 : 3;
    const signoffCount = await ctx.integrations.db.query(
      `SELECT COUNT(DISTINCT module_key)::int AS count
       FROM cliptracker_v2_module_signoffs WHERE viewer_id = $1`,
      CountSchema,
      [viewerId],
      { label: "Count module sign-offs" }
    );
    if (signoffCount[0]?.count < requiredSignoffs) {
      return { success: false, alreadyUnlocked: false, earnedBadge: false, earnedXp: 0, error: "Not all modules signed off" };
    }

    // 2. W&D verification
    const wdCount = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_wd_verifications WHERE viewer_id = $1`,
      CountSchema,
      [viewerId],
      { label: "Check W&D verification" }
    );
    if (wdCount[0]?.count < 1) {
      return { success: false, alreadyUnlocked: false, earnedBadge: false, earnedXp: 0, error: "W&D not verified" };
    }

    // Calculate if within deadline — VP has 3 weekdays, AE/SDR have 5
    const approachWeekdays = isVP ? 3 : 5;
    const ascentDay1 = viewerRows[0].ascent_day_1;
    let withinDeadline = false;
    if (ascentDay1) {
      const start = new Date(ascentDay1);
      const now = new Date();
      // Count weekdays between start and now
      let weekdays = 0;
      const cursor = new Date(start);
      while (cursor <= now) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) weekdays++;
        cursor.setDate(cursor.getDate() + 1);
      }
      withinDeadline = weekdays <= approachWeekdays;
    }

    // Unlock the ascent
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers
       SET week1_unlocked_at = now(), week1_unlock_type = 'earned'
       WHERE id = $1`,
      [viewerId],
      { label: "Unlock The Ascent" }
    );

    let earnedBadge = false;
    let earnedXp = 0;

    // Use lowest sort_order live clip as sentinel for approach XP/badge records
    // (clip_id FK requires a real clip — viewerId is not a valid clip_id)
    const ClipIdSchema = z.object({ id: z.string() });
    const sentinelClip = await ctx.integrations.db.query(
      `SELECT id FROM cliptracker_v2_clips WHERE status = 'live' ORDER BY sort_order ASC LIMIT 1`,
      ClipIdSchema, [], { label: "Get sentinel clip for approach XP" }
    );
    if (!sentinelClip[0]?.id) throw new Error("No live clip found for approach XP sentinel");
    const approachClipId = sentinelClip[0].id;

    if (withinDeadline) {
      // Award approach_complete badge (on-time only)
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
         VALUES ($1, 'approach_complete', $2)
         ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
        [viewerId, approachClipId],
        { label: "Award approach_complete badge" }
      );
      earnedBadge = true;

      // Award 25 XP for Peak Lift (on-time approach completion)
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
         VALUES ($1, $2, 'milestone', 'approach_complete', 25)
         ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
        [viewerId, approachClipId],
        { label: "Award approach XP (on-time)" }
      );
      earnedXp = 25;
    } else {
      // Late approach: 10 XP (reduced — incentivize finishing on time), no badge
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
         VALUES ($1, $2, 'milestone', 'approach_complete_late', 10)
         ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
        [viewerId, approachClipId],
        { label: "Award approach XP (late)" }
      );
      earnedXp = 10;
    }

    ctx.log.info("Ascent unlocked", { viewerId, earnedBadge, earnedXp });
    return { success: true, alreadyUnlocked: false, earnedBadge, earnedXp, error: null };
  },
});
