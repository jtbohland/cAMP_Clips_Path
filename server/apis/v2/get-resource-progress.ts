import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Returns which resources a viewer has clicked for given topic day clip(s).
 * Used by the library page to show progress bars and the gear page for checkmarks.
 */
export default api({
  name: "GetResourceProgress",
  description: "Gets resource click progress for topic day clips",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    clipIds: z.array(z.string().uuid()),
  }),

  output: z.object({
    progress: z.array(z.object({
      clipId: z.string(),
      clickedIndices: z.array(z.number()),
      completed: z.boolean(),
    })),
  }),

  async run(ctx, { viewerId, clipIds }) {
    if (clipIds.length === 0) {
      return { progress: [] };
    }

    // Get all clicks for specified clips
    const ClickSchema = z.object({
      clip_id: z.string(),
      resource_index: z.coerce.number(),
    });
    const clicks = await ctx.integrations.db.query(
      "SELECT clip_id, resource_index FROM cliptracker_v2_resource_clicks WHERE viewer_id = $1 AND clip_id = ANY($2::uuid[])",
      ClickSchema,
      [viewerId, clipIds],
      { label: "Get resource clicks for topic days" }
    );

    // Get resource counts from clips table (resources JSONB column)
    const ClipResourceCount = z.object({
      id: z.string(),
      resource_count: z.coerce.number(),
    });
    const clipResourceCounts = await ctx.integrations.db.query(
      "SELECT id, COALESCE(jsonb_array_length(resources), 0)::int as resource_count FROM cliptracker_v2_clips WHERE id = ANY($1::uuid[])",
      ClipResourceCount,
      [clipIds],
      { label: "Get resource counts for topic days" }
    );

    // Build response grouped by clipId
    const clicksByClip = new Map<string, number[]>();
    for (const click of clicks) {
      if (!clicksByClip.has(click.clip_id)) clicksByClip.set(click.clip_id, []);
      clicksByClip.get(click.clip_id)!.push(click.resource_index);
    }

    const resourceCountMap = new Map(clipResourceCounts.map(c => [c.id, c.resource_count]));

    const progress = clipIds.map(clipId => {
      const indices = clicksByClip.get(clipId) ?? [];
      const totalResources = resourceCountMap.get(clipId) ?? 0;
      return {
        clipId,
        clickedIndices: indices.sort((a, b) => a - b),
        completed: totalResources > 0 && indices.length >= totalResources,
      };
    });

    return { progress };
  },
});
