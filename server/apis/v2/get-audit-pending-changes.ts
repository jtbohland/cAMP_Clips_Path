import { api, z, postgres } from "@superblocksteam/sdk-api";
import { classifyAuditChange } from "./audit-lock.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const Row = z.object({
  id: z.string(),
  topic_key: z.string(),
  topic_title: z.string().nullable(),
  day_label: z.string().nullable(),
  viewer_name: z.string().nullable(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  field_name: z.string().nullable(),
  old_value: z.any().nullable(),
  new_value: z.any().nullable(),
  change_type: z.string(),
  created_at: z.string(),
  review_status: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  reverted_at: z.string().nullable(),
  /** Readable context for question edits: "Trail Marker" / "S&R" + question text */
  question_kind: z.string().nullable(),
  question_text: z.string().nullable(),
  clip_title: z.string().nullable(),
});

const ChangeSchema = z.object({
  id: z.string(),
  topicKey: z.string(),
  topicTitle: z.string(),
  dayLabel: z.string().nullable(),
  viewerName: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  fieldName: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  changeType: z.string(),
  createdAt: z.string(),
  /** live = already in the training; held = waits for JT; note = SME feedback */
  kind: z.enum(["live", "held", "note"]),
  /** pending | approved | reverted | applied | dismissed */
  status: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  questionKind: z.string().nullable(),
  questionText: z.string().nullable(),
  clipTitle: z.string().nullable(),
});

/** jsonb values were stored as JSON strings \u2014 unwrap to plain text for display. */
function asText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export default api({
  name: "GetAuditPendingChanges",
  description: "Lists SME audit changes for admin review with status",
  integrations: {
    apps_db: postgres(APPS_DB),
  },
  input: z.object({
    topicKey: z.string().nullable(),
    limit: z.number().nullable(),
  }),
  output: z.object({
    changes: z.array(ChangeSchema),
    totalCount: z.number(),
    counts: z.object({
      needsAction: z.number(),
      liveToReview: z.number(),
      reviewed: z.number(),
    }),
  }),
  async run(ctx, { topicKey, limit }) {
    const rowLimit = Math.min(limit ?? 500, 1000);

    const rows = await ctx.integrations.apps_db.query(
      `SELECT c.id::text, c.topic_key,
              dm.title AS topic_title, dm.day_label,
              v.name AS viewer_name,
              c.entity_type, c.entity_id, c.field_name, c.old_value, c.new_value, c.change_type,
              c.created_at::text,
              c.review_status, c.reviewed_at::text, c.reviewed_by, c.reverted_at::text,
              CASE WHEN q.id IS NULL THEN NULL
                   WHEN q.is_recovery THEN 'S&R'
                   ELSE 'Trail Marker' END AS question_kind,
              q.question_text,
              COALESCE(qc.title, wc.title) AS clip_title
       FROM cliptracker_v2_audit_changelog c
       LEFT JOIN cliptracker_v2_viewers v ON v.id = c.viewer_id
       LEFT JOIN cliptracker_v2_day_metadata dm ON dm.topic_key = c.topic_key
       LEFT JOIN cliptracker_v2_questions q
              ON c.entity_type = 'question' AND q.id::text = c.entity_id
       LEFT JOIN cliptracker_v2_clips qc ON qc.id = q.clip_id
       LEFT JOIN cliptracker_v2_clips wc
              ON c.entity_type <> 'question' AND wc.id::text = c.entity_id
       WHERE ($1::text IS NULL OR c.topic_key = $1)
       ORDER BY c.created_at DESC
       LIMIT $2`,
      Row,
      [topicKey, rowLimit],
      { label: "Fetch audit changelog with context" }
    );

    const changes = rows.map((r) => {
      const kind = classifyAuditChange(r.topic_key, r.entity_type, r.entity_id);
      // Legacy rows have no review_status; reverted_at also means reverted
      const status = r.reverted_at ? "reverted" : (r.review_status ?? "pending");
      return {
        id: r.id,
        topicKey: r.topic_key,
        topicTitle: r.topic_title ?? r.topic_key,
        dayLabel: r.day_label,
        viewerName: r.viewer_name ?? "Unknown",
        entityType: r.entity_type,
        entityId: r.entity_id,
        fieldName: r.field_name,
        oldValue: asText(r.old_value),
        newValue: asText(r.new_value),
        changeType: r.change_type,
        createdAt: r.created_at,
        kind,
        status,
        reviewedAt: r.reviewed_at,
        reviewedBy: r.reviewed_by,
        questionKind: r.question_kind,
        questionText: r.question_text,
        clipTitle: r.clip_title,
      };
    });

    const counts = { needsAction: 0, liveToReview: 0, reviewed: 0 };
    for (const c of changes) {
      if (c.status !== "pending") counts.reviewed++;
      else if (c.kind === "live") counts.liveToReview++;
      else counts.needsAction++;
    }

    return { changes, totalCount: changes.length, counts };
  },
});
