import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const UpdatedRow = z.object({ viewer_id: z.string(), last_login_at: z.string() });

export default api({
  name: "BackfillLastLogin",
  description: "One-time backfill: sets last_login_at from MAX(ended_at) for viewers with null values",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    updatedCount: z.number(),
    updatedViewers: z.array(z.object({ viewerId: z.string(), lastLogin: z.string() })),
  }),

  async run(ctx) {
    // Update and return the affected rows
    const updated = await ctx.integrations.db.query(
      `UPDATE cliptracker_v2_viewers v
       SET last_login_at = sub.max_ended
       FROM (
         SELECT viewer_id, MAX(ended_at) AS max_ended
         FROM cliptracker_v2_sessions
         GROUP BY viewer_id
       ) sub
       WHERE sub.viewer_id = v.id
         AND v.last_login_at IS NULL
         AND sub.max_ended IS NOT NULL
       RETURNING v.id AS viewer_id, v.last_login_at::text AS last_login_at`,
      UpdatedRow,
      undefined,
      { label: "Backfill last_login_at from session ended_at" }
    );

    ctx.log.info(`Backfilled last_login_at for ${updated.length} viewers`);

    return {
      updatedCount: updated.length,
      updatedViewers: updated.map(r => ({ viewerId: r.viewer_id, lastLogin: r.last_login_at })),
    };
  },
});
