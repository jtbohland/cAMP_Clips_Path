import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupReactionsFeedbackSchema",
  description: "Creates reactions and daily feedback tables",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),

  async run(ctx) {
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        lesson_key TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(viewer_id, lesson_key, emoji)
      )`,
      undefined,
      { label: "Create reactions table" }
    );

    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_daily_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        day_key TEXT NOT NULL,
        rating TEXT,
        usefulness TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(viewer_id, day_key)
      )`,
      undefined,
      { label: "Create daily feedback table" }
    );

    return { success: true, message: "Reactions + daily feedback tables created" };
  },
});
