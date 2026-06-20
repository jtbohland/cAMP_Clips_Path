import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ResetViewerSessions",
  description: "Deletes all session data for a viewer (sessions, responses, xp, badges)",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    deletedResponses: z.number(),
    deletedSessions: z.number(),
    deletedXpEvents: z.number(),
    deletedBadges: z.number(),
  }),

  async run(ctx, { viewerId }) {
    // 1. Delete responses tied to this viewer's sessions
    const r1 = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_responses
       WHERE session_id IN (SELECT id FROM cliptracker_v2_sessions WHERE viewer_id = $1)`,
      [viewerId],
      { label: "Delete viewer responses" }
    );

    // 2. Delete sessions
    const r2 = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_sessions WHERE viewer_id = $1`,
      [viewerId],
      { label: "Delete viewer sessions" }
    );

    // 3. Delete XP events
    const r3 = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_xp_events WHERE viewer_id = $1`,
      [viewerId],
      { label: "Delete viewer XP events" }
    );

    // 4. Delete badges
    const r4 = await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_badges WHERE viewer_id = $1`,
      [viewerId],
      { label: "Delete viewer badges" }
    );

    return {
      deletedResponses: r1.rowCount,
      deletedSessions: r2.rowCount,
      deletedXpEvents: r3.rowCount,
      deletedBadges: r4.rowCount,
    };
  },
});
