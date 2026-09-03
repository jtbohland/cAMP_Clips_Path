import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SignOffAudit",
  description: "Records an SME sign-off for a topic in the active audit cycle",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    topicKey: z.string(),
    notes: z.string().nullable(),
  }),

  output: z.object({
    success: z.boolean(),
    signedAt: z.string(),
  }),

  async run(ctx, { viewerId, topicKey, notes }) {
    // Get active cycle
    const CycleRow = z.object({ id: z.string() });
    const cycles = await ctx.integrations.apps_db.query(
      `SELECT id::text FROM cliptracker_v2_audit_cycles WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
      CycleRow,
      undefined,
      { label: "Get active cycle for sign-off" }
    );
    const cycleId = cycles[0]?.id ?? null;

    // Insert sign-off — handle NULL cycle_id (UNIQUE doesn't match NULLs)
    if (cycleId) {
      await ctx.integrations.apps_db.execute(
        `INSERT INTO cliptracker_v2_audit_signoffs (viewer_id, topic_key, cycle_id, notes)
         VALUES ($1, $2, $3::uuid, $4)
         ON CONFLICT (viewer_id, topic_key, cycle_id) DO UPDATE SET
           notes = EXCLUDED.notes,
           signed_at = NOW()`,
        [viewerId, topicKey, cycleId, notes],
        { label: "Record sign-off (with cycle)" }
      );
    } else {
      // No active cycle — ad-hoc sign-off. Check for existing first.
      const ExistingRow = z.object({ count: z.coerce.number() });
      const existing = await ctx.integrations.apps_db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_audit_signoffs
         WHERE viewer_id = $1 AND topic_key = $2 AND cycle_id IS NULL`,
        ExistingRow,
        [viewerId, topicKey],
        { label: "Check existing ad-hoc sign-off" }
      );
      if (existing[0]?.count > 0) {
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_audit_signoffs
           SET notes = $3, signed_at = NOW()
           WHERE viewer_id = $1 AND topic_key = $2 AND cycle_id IS NULL`,
          [viewerId, topicKey, notes],
          { label: "Update ad-hoc sign-off" }
        );
      } else {
        await ctx.integrations.apps_db.execute(
          `INSERT INTO cliptracker_v2_audit_signoffs (viewer_id, topic_key, cycle_id, notes)
           VALUES ($1, $2, NULL, $3)`,
          [viewerId, topicKey, notes],
          { label: "Insert ad-hoc sign-off" }
        );
      }
    }

    return { success: true, signedAt: new Date().toISOString() };
  },
});
