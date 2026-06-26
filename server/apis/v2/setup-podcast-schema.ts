import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupPodcastSchema",
  description: "Creates the podcast progress tracking table",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),
  output: z.object({ created: z.boolean() }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_podcast_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL,
        media_id TEXT NOT NULL,
        max_percent_watched REAL NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(viewer_id, media_id)
      )`,
      undefined,
      { label: "Create podcast progress table" }
    );

    return { created: true };
  },
});
