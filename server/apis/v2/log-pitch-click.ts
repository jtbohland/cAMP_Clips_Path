import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "LogPitchClick",
  description: "Logs when a viewer clicks to play an elevator pitch video",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    pitchName: z.string(),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { viewerId, pitchName }) {
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_pitch_clicks (viewer_id, pitch_name)
       VALUES ($1, $2)`,
      [viewerId, pitchName],
      { label: "Log pitch click" }
    );

    ctx.log.info("Pitch click logged", { viewerId, pitchName });
    return { success: true };
  },
});
