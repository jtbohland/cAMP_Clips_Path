import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Creates a DEARR Crossing game session.
 * Questions are drawn client-side from the config bank — the server
 * only tracks the session for XP accounting.
 */
export default api({
  name: "StartDEARRGame",
  description: "Creates a DEARR Crossing game session for XP tracking",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    isReplay: z.boolean(),
  }),

  output: z.object({
    sessionId: z.string(),
  }),

  async run(ctx, { viewerId, isReplay }) {
    const SessionRow = z.object({ id: z.string() });
    const [session] = await ctx.integrations.apps_db.query(
      `INSERT INTO cliptracker_v2_dearr_sessions (viewer_id, is_replay)
       VALUES ($1, $2)
       RETURNING id`,
      SessionRow,
      [viewerId, isReplay],
      { label: "Create DEARR Crossing session" }
    );

    ctx.log.info("DEARR Crossing session started", { viewerId, sessionId: session.id, isReplay });
    return { sessionId: session.id };
  },
});
