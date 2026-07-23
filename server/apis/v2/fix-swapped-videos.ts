import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: CLM (sort 17) and Deal Desk & CPQ (sort 18) had their
 * video_url values swapped in the clips table.  This API:
 *   1. Swaps the video_url between the two clips
 *   2. Swaps duration_seconds to match the correct videos
 *   3. Resets Chris English's CLM session + responses so he can re-watch
 */
export default api({
  name: "FixSwappedVideos",
  description: "Swaps CLM ↔ Deal Desk video URLs and resets Chris's CLM session",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    videosSwapped: z.boolean(),
    durationsSwapped: z.boolean(),
    chrisResponsesDeleted: z.number(),
    chrisSessionsDeleted: z.number(),
  }),

  async run(ctx) {
    const CLM_CLIP_ID = "f6199214-6659-4ae1-ae72-4b7aded915f2";
    const DEAL_DESK_CLIP_ID = "b81ed1dd-d8a6-4089-a70c-cc5436f49883";
    const CHRIS_VIEWER_ID = "74c80649-c345-4cd9-9fce-383aa02328e1";

    // 1. Swap video URLs
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_clips
       SET video_url = CASE
         WHEN id = $1 THEN 'https://fast.wistia.com/embed/medias/7ajmd3s1h0'
         WHEN id = $2 THEN 'https://fast.wistia.com/embed/medias/et1txe9w5f'
       END
       WHERE id IN ($1, $2)`,
      [CLM_CLIP_ID, DEAL_DESK_CLIP_ID],
      { label: "Swap video URLs: CLM ↔ Deal Desk" }
    );

    // 2. Swap duration_seconds
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_clips
       SET duration_seconds = CASE
         WHEN id = $1 THEN 1260
         WHEN id = $2 THEN 1680
       END
       WHERE id IN ($1, $2)`,
      [CLM_CLIP_ID, DEAL_DESK_CLIP_ID],
      { label: "Swap durations: CLM → 1260, Deal Desk → 1680" }
    );

    // 3. Delete Chris's responses for his CLM session
    const respResult = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_responses
       WHERE session_id IN (
         SELECT id FROM cliptracker_v2_sessions
         WHERE viewer_id = $1 AND clip_id = $2
       )`,
      [CHRIS_VIEWER_ID, CLM_CLIP_ID],
      { label: "Delete Chris's CLM question responses" }
    );

    // 4. Delete Chris's CLM session
    const sessResult = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_sessions
       WHERE viewer_id = $1 AND clip_id = $2`,
      [CHRIS_VIEWER_ID, CLM_CLIP_ID],
      { label: "Delete Chris's CLM session" }
    );

    ctx.log.info("Video swap + Chris reset complete", {
      responsesDeleted: respResult.rowCount,
      sessionsDeleted: sessResult.rowCount,
    });

    return {
      videosSwapped: true,
      durationsSwapped: true,
      chrisResponsesDeleted: respResult.rowCount,
      chrisSessionsDeleted: sessResult.rowCount,
    };
  },
});
