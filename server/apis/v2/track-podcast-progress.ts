import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "TrackPodcastProgress",
  description: "Upserts podcast watch progress for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    mediaId: z.string(),
    percentWatched: z.number().min(0).max(1),
  }),

  output: z.object({
    updated: z.boolean(),
    completed: z.boolean(),
  }),

  async run(ctx, { viewerId, mediaId, percentWatched }) {
    const completed = percentWatched >= 0.8;

    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_podcast_progress (viewer_id, media_id, max_percent_watched, completed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (viewer_id, media_id) DO UPDATE SET
         max_percent_watched = GREATEST(cliptracker_v2_podcast_progress.max_percent_watched, EXCLUDED.max_percent_watched),
         completed = cliptracker_v2_podcast_progress.completed OR EXCLUDED.completed,
         updated_at = now()`,
      [viewerId, mediaId, percentWatched, completed],
      { label: "Upsert podcast progress" }
    );

    return { updated: true, completed };
  },
});
