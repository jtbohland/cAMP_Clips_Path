import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ProgressSchema = z.object({
  media_id: z.string(),
  max_percent_watched: z.coerce.number(),
  completed: z.boolean(),
});

export default api({
  name: "GetPodcastProgress",
  description: "Fetches podcast watch progress for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    progress: z.array(z.object({
      mediaId: z.string(),
      maxPercentWatched: z.number(),
      completed: z.boolean(),
    })),
    allCompleted: z.boolean(),
  }),

  async run(ctx, { viewerId }) {
    const rows = await ctx.integrations.db.query(
      `SELECT media_id, max_percent_watched, completed
       FROM cliptracker_v2_podcast_progress
       WHERE viewer_id = $1`,
      ProgressSchema,
      [viewerId],
      { label: "Get podcast progress for viewer" }
    );

    const PODCAST_MEDIA_IDS = ["d4ykhvht66", "wtmth6596f", "pe2bvt2sdq", "c9lxd0wsbg"];

    const completedCount = rows.filter(r => r.completed && PODCAST_MEDIA_IDS.includes(r.media_id)).length;

    return {
      progress: rows.map(r => ({
        mediaId: r.media_id,
        maxPercentWatched: r.max_percent_watched,
        completed: r.completed,
      })),
      allCompleted: completedCount >= 4,
    };
  },
});
