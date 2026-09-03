import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SaveAuditApproval",
  description: "Toggles section approval status for audit",
  integrations: { apps_db: postgres(APPS_DB) },
  input: z.object({
    viewerId: z.string(),
    topicKey: z.string(),
    sectionKey: z.string(),
    approved: z.boolean(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { viewerId, topicKey, sectionKey, approved }) {
    if (approved) {
      await ctx.integrations.apps_db.execute(
        `INSERT INTO cliptracker_v2_audit_approvals (viewer_id, topic_key, section_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (viewer_id, topic_key, section_key) DO UPDATE SET approved_at = NOW()`,
        [viewerId, topicKey, sectionKey],
        { label: `Approve section: ${sectionKey}` }
      );
    } else {
      await ctx.integrations.apps_db.execute(
        `DELETE FROM cliptracker_v2_audit_approvals WHERE viewer_id = $1 AND topic_key = $2 AND section_key = $3`,
        [viewerId, topicKey, sectionKey],
        { label: `Unapprove section: ${sectionKey}` }
      );
    }
    return { success: true };
  },
});
