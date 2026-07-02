import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Records a resource click for a topic day.
 * When all resources are clicked, automatically inserts an unlock override
 * for the next clip (sort_order + 1) and records the Swiss Army Knife badge.
 * XP is awarded later when the learner submits their reflection.
 */
export default api({
  name: "TrackResourceClick",
  description: "Records resource click on topic day, unlocks next clip when all clicked",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    resourceIndex: z.number().int().min(0),
    totalResources: z.number().int().min(1),
  }),

  output: z.object({
    recorded: z.boolean(),
    clickedCount: z.number(),
    allClicked: z.boolean(),
    justCompleted: z.boolean(),
    xpAwarded: z.number(),
  }),

  async run(ctx, { viewerId, clipId, resourceIndex, totalResources }) {
    // Record the click (idempotent via UNIQUE constraint)
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_resource_clicks (viewer_id, clip_id, resource_index)
       VALUES ($1, $2, $3)
       ON CONFLICT (viewer_id, clip_id, resource_index) DO NOTHING`,
      [viewerId, clipId, resourceIndex],
      { label: "Record resource click" }
    );

    // Count total clicks for this viewer + clip
    const CountSchema = z.object({ cnt: z.coerce.number() });
    const countResult = await ctx.integrations.db.query(
      "SELECT COUNT(*)::int as cnt FROM cliptracker_v2_resource_clicks WHERE viewer_id = $1 AND clip_id = $2",
      CountSchema,
      [viewerId, clipId],
      { label: "Count resource clicks" }
    );
    const clickedCount = countResult[0].cnt;
    const allClicked = clickedCount >= totalResources;

    // Check if this was ALREADY completed before (to avoid double XP / double unlock)
    const AlreadyDoneSchema = z.object({ cnt: z.coerce.number() });
    const alreadyDone = await ctx.integrations.db.query(
      "SELECT COUNT(*)::int as cnt FROM cliptracker_v2_xp_events WHERE viewer_id = $1 AND clip_id = $2 AND event_type = 'swiss_army_knife'",
      AlreadyDoneSchema,
      [viewerId, clipId],
      { label: "Check if Swiss Army Knife XP already awarded" }
    );
    const wasAlreadyComplete = alreadyDone[0].cnt > 0;

    let justCompleted = false;
    let xpAwarded = 0;

    if (allClicked && !wasAlreadyComplete) {
      justCompleted = true;

      // Check if viewer is admin — admins don't earn XP
      const AdminCheck = z.object({ is_admin: z.boolean() });
      const adminCheck = await ctx.integrations.db.query(
        "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
        AdminCheck,
        [viewerId],
        { label: "Check if viewer is admin" }
      );
      const isAdmin = adminCheck[0]?.is_admin ?? false;

      if (!isAdmin) {
        // Record Swiss Army Knife badge (XP awarded on reflection submission)
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, xp_amount, source_id)
           VALUES ($1, $2, 'swiss_army_knife', 0, 'swiss_army_knife')
           ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
          [viewerId, clipId],
          { label: "Record Swiss Army Knife badge (no XP yet)" }
        );
      }

      // Unlock next clip (sort_order + 1)
      const SortSchema = z.object({ sort_order: z.coerce.number() });
      const currentClips = await ctx.integrations.db.query(
        "SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1",
        SortSchema,
        [clipId],
        { label: "Get topic day sort order" }
      );

      if (currentClips.length > 0) {
        const nextSortOrder = currentClips[0].sort_order + 1;
        const NextClipSchema = z.object({ id: z.string() });
        const nextClips = await ctx.integrations.db.query(
          "SELECT id FROM cliptracker_v2_clips WHERE sort_order = $1 AND status = 'live'",
          NextClipSchema,
          [nextSortOrder],
          { label: "Find next clip to unlock" }
        );

        if (nextClips.length > 0) {
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason)
             VALUES ($1, $2, 'system', 'Completed topic day resources')
             ON CONFLICT (viewer_id, clip_id) DO NOTHING`,
            [viewerId, nextClips[0].id],
            { label: "Unlock next clip via topic day completion" }
          );
        }
      }

      ctx.log.info("Topic day completed — all resources clicked", { viewerId, clipId, xpAwarded });
    }

    return { recorded: true, clickedCount, allClicked, justCompleted, xpAwarded };
  },
});
