import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ChangeRow = z.object({
  id: z.string(),
  topic_key: z.string(),
  viewer_id: z.string().nullable(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  field_name: z.string().nullable(),
  old_value: z.any().nullable(),
  new_value: z.any().nullable(),
  change_type: z.string(),
  created_at: z.string(),
  viewer_name: z.string().nullable(),
});

export default api({
  name: "GetAuditPendingChanges",
  description: "Fetches recent audit changelog entries for admin review",
  integrations: {
    apps_db: postgres(APPS_DB),
  },
  input: z.object({
    topicKey: z.string().nullable(),
    limit: z.number().nullable(),
  }),
  output: z.object({
    changes: z.array(ChangeRow),
    totalCount: z.number(),
  }),
  async run(ctx, { topicKey, limit }) {
    const rowLimit = limit ?? 50;

    const countResult = await ctx.integrations.apps_db.query(
      `SELECT COUNT(*)::int AS cnt FROM cliptracker_v2_audit_changelog
       WHERE ($1::text IS NULL OR topic_key = $1)`,
      z.object({ cnt: z.number() }),
      [topicKey],
      { label: "Count changelog entries" }
    );

    const changes = await ctx.integrations.apps_db.query(
      `SELECT c.id, c.topic_key, c.viewer_id, c.entity_type, c.entity_id,
              c.field_name, c.old_value, c.new_value, c.change_type, c.created_at::text,
              v.name AS viewer_name
       FROM cliptracker_v2_audit_changelog c
       LEFT JOIN cliptracker_v2_viewers v ON v.id = c.viewer_id
       WHERE ($1::text IS NULL OR c.topic_key = $1)
       ORDER BY c.created_at DESC
       LIMIT $2`,
      ChangeRow,
      [topicKey, rowLimit],
      { label: "Fetch changelog entries" }
    );

    return { changes, totalCount: countResult[0]?.cnt ?? 0 };
  },
});
