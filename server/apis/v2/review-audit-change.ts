import { api, z, postgres } from "@superblocksteam/sdk-api";
import type { PostgresClient } from "@superblocksteam/sdk-api";
import { classifyAuditChange } from "./audit-lock.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ChangeRow = z.object({
  id: z.string(),
  topic_key: z.string(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  field_name: z.string().nullable(),
  old_value: z.string().nullable(),
  new_value: z.string().nullable(),
  created_at: z.string(),
  review_status: z.string().nullable(),
  reverted_at: z.string().nullable(),
});
type Change = z.infer<typeof ChangeRow>;

const OPTION_INDEX: Record<string, number> = { option_a: 0, option_b: 1, option_c: 2, option_d: 3 };
const GEAR_TYPES = ["gear_update", "gear_remove", "gear_add"];

function parseGear(v: string | null): { label?: string; url?: string; type?: string } | null {
  if (!v) return null;
  try { const p = JSON.parse(v); return typeof p === "object" && p ? p : null; } catch { return null; }
}

/** Refuse to revert if a newer, un-reverted edit touched the same content. */
async function assertNoNewerEdit(db: PostgresClient, c: Change) {
  const sameGear = GEAR_TYPES.includes(c.entity_type);
  const rows = await db.query(
    `SELECT COUNT(*)::int AS n FROM cliptracker_v2_audit_changelog
     WHERE id::text <> $1 AND created_at > $2::timestamptz AND reverted_at IS NULL
       AND COALESCE(entity_id,'') = COALESCE($3,'')
       AND ( ($4::boolean AND entity_type = ANY($5::text[]))
          OR (NOT $4::boolean AND entity_type = $6 AND COALESCE(field_name,'') = COALESCE($7,'')) )`,
    z.object({ n: z.number() }),
    [c.id, c.created_at, c.entity_id, sameGear, GEAR_TYPES, c.entity_type, c.field_name],
    { label: "Check for newer edits on same content" }
  );
  if ((rows[0]?.n ?? 0) > 0) {
    throw new Error("A newer edit was made to this same content. Revert the newer change first, then this one.");
  }
}

/** Puts the old value back into the live training. Throws if it can't be done safely. */
async function revertLiveChange(db: PostgresClient, c: Change) {
  const oldV = c.old_value;
  const id = c.entity_id;
  switch (c.entity_type) {
    case "summary":
      await db.execute(`UPDATE cliptracker_v2_day_metadata SET summary = $1 WHERE topic_key = $2`,
        [oldV, c.topic_key], { label: "Revert day summary" });
      return;
    case "objectives":
      await db.execute(`UPDATE cliptracker_v2_day_metadata SET learning_objectives = $1::jsonb WHERE topic_key = $2`,
        [oldV ?? "[]", c.topic_key], { label: "Revert learning objectives" });
      return;
    case "question": {
      if (!id || !c.field_name) throw new Error("This change is missing the question reference.");
      if (c.field_name in OPTION_INDEX) {
        const idx = OPTION_INDEX[c.field_name];
        await db.execute(
          `UPDATE cliptracker_v2_questions SET options = jsonb_set(options, '{${idx}}', to_jsonb($1::text)) WHERE id::text = $2`,
          [oldV ?? "", id], { label: `Revert question ${c.field_name}` });
      } else if (c.field_name === "correct_option") {
        const n = Number(oldV);
        if (!Number.isInteger(n)) throw new Error("Original correct answer is missing — fix this one by hand.");
        await db.execute(`UPDATE cliptracker_v2_questions SET correct_option = $1 WHERE id::text = $2`,
          [n, id], { label: "Revert correct answer" });
      } else if (c.field_name === "question_text" || c.field_name === "correct_feedback") {
        await db.execute(`UPDATE cliptracker_v2_questions SET ${c.field_name} = $1 WHERE id::text = $2`,
          [oldV, id], { label: `Revert question ${c.field_name}` });
      } else {
        throw new Error(`Can't revert question field "${c.field_name}" automatically.`);
      }
      return;
    }
    case "weather_storm": {
      if (!id) throw new Error("This change is missing the clip reference.");
      if (c.field_name === "overview") {
        await db.execute(`UPDATE cliptracker_v2_weather_storm SET overview = $1 WHERE clip_id::text = $2`,
          [oldV, id], { label: "Revert WtS overview" });
      } else if (c.field_name === "takeaways") {
        await db.execute(`UPDATE cliptracker_v2_weather_storm SET takeaways = $1::jsonb WHERE clip_id::text = $2`,
          [oldV ?? "[]", id], { label: "Revert WtS takeaways" });
      } else {
        throw new Error("Unknown Weather the Storm field.");
      }
      return;
    }
    case "gear_update": {
      const before = parseGear(oldV); const after = parseGear(c.new_value);
      if (!id || !before || !after) throw new Error("This gear change is missing details — fix it by hand.");
      // Find the item that currently matches the SME's version and restore the original label/url
      const rows = await db.query(
        `WITH hit AS (
           SELECT (t.idx - 1)::int AS i FROM cliptracker_v2_clips cl,
                  jsonb_array_elements(cl.resources) WITH ORDINALITY AS t(elem, idx)
           WHERE cl.id::text = $1 AND t.elem->>'label' = $2 AND t.elem->>'url' = $3 LIMIT 1)
         UPDATE cliptracker_v2_clips cl
         SET resources = jsonb_set(jsonb_set(cl.resources, ARRAY[hit.i::text,'label'], to_jsonb($4::text)), ARRAY[hit.i::text,'url'], to_jsonb($5::text))
         FROM hit WHERE cl.id::text = $1
         RETURNING hit.i`,
        z.object({ i: z.number() }),
        [id, after.label ?? "", after.url ?? "", before.label ?? "", before.url ?? ""],
        { label: "Revert gear item edit" });
      if (rows.length === 0) throw new Error("That gear item has changed since this edit — fix it by hand.");
      return;
    }
    case "gear_add": {
      const added = parseGear(c.new_value);
      if (!id || !added) throw new Error("This gear addition is missing details — remove it by hand.");
      const rows = await db.query(
        `WITH hit AS (
           SELECT t.idx FROM cliptracker_v2_clips cl,
                  jsonb_array_elements(cl.resources) WITH ORDINALITY AS t(elem, idx)
           WHERE cl.id::text = $1 AND t.elem->>'label' = $2 AND t.elem->>'url' = $3 LIMIT 1)
         UPDATE cliptracker_v2_clips cl
         SET resources = (SELECT COALESCE(jsonb_agg(e ORDER BY o), '[]'::jsonb)
                          FROM jsonb_array_elements(cl.resources) WITH ORDINALITY AS x(e, o)
                          WHERE o <> hit.idx)
         FROM hit WHERE cl.id::text = $1
         RETURNING hit.idx::int AS i`,
        z.object({ i: z.number() }),
        [id, added.label ?? "", added.url ?? ""],
        { label: "Revert gear addition" });
      if (rows.length === 0) throw new Error("That added gear item is no longer there — nothing to revert.");
      return;
    }
    case "gear_remove": {
      const removed = parseGear(oldV);
      if (!id || !removed) throw new Error("This gear removal is missing details — re-add it by hand.");
      await db.execute(
        `UPDATE cliptracker_v2_clips SET resources = COALESCE(resources, '[]'::jsonb) || jsonb_build_array($1::jsonb)
         WHERE id::text = $2
           AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(resources,'[]'::jsonb)) e
                           WHERE e->>'label' = $3 AND e->>'url' = $4)`,
        [JSON.stringify(removed), id, removed.label ?? "", removed.url ?? ""],
        { label: "Restore removed gear item" });
      return;
    }
    default:
      throw new Error(`Changes of type "${c.entity_type}" can't be reverted automatically.`);
  }
}

export default api({
  name: "ReviewAuditChange",
  description: "Admin approves, reverts, or resolves an SME audit change",
  integrations: { apps_db: postgres(APPS_DB) },
  input: z.object({
    changeId: z.string(),
    /** approve/revert = live edits; applied/dismiss = held edits & notes; reopen = undo a review */
    action: z.enum(["approve", "revert", "applied", "dismiss", "reopen"]),
  }),
  output: z.object({ success: z.boolean(), status: z.string() }),
  async run(ctx, { changeId, action }) {
    const db = ctx.integrations.apps_db;

    // Admin only — verified server-side from the signed-in Superblocks user
    const email = (ctx.user.email ?? "").toLowerCase();
    const admins = await db.query(
      `SELECT id::text, name FROM cliptracker_v2_viewers WHERE lower(email) = $1 AND COALESCE(is_admin,false) LIMIT 1`,
      z.object({ id: z.string(), name: z.string() }),
      [email], { label: "Verify admin" });
    const admin = admins[0];
    if (!admin) throw new Error("Only admins can review audit changes.");

    const found = await db.query(
      `SELECT id::text, topic_key, entity_type, entity_id, field_name,
              old_value #>> '{}' AS old_value, new_value #>> '{}' AS new_value,
              created_at::text, review_status, reverted_at::text
       FROM cliptracker_v2_audit_changelog WHERE id::text = $1`,
      ChangeRow, [changeId], { label: "Load change" });
    const change = found[0];
    if (!change) throw new Error("Change not found.");

    const kind = classifyAuditChange(change.topic_key, change.entity_type, change.entity_id);
    const current = change.reverted_at ? "reverted" : (change.review_status ?? "pending");

    if (action === "reopen") {
      if (current === "reverted") throw new Error("A reverted change can't be reopened — ask the SME to re-submit it.");
      await db.execute(
        `UPDATE cliptracker_v2_audit_changelog SET review_status = 'pending', reviewed_at = NULL, reviewed_by = NULL WHERE id::text = $1`,
        [changeId], { label: "Reopen change" });
      return { success: true, status: "pending" };
    }

    if (current === "reverted") throw new Error("This change was already reverted.");

    let status: string;
    if (action === "revert") {
      if (kind !== "live") throw new Error("This change was never applied — use Dismiss instead.");
      await assertNoNewerEdit(db, change);
      await revertLiveChange(db, change);
      await db.execute(
        `UPDATE cliptracker_v2_audit_changelog
         SET review_status = 'reverted', reverted_at = now(), reverted_by = $2::uuid, reviewed_at = now(), reviewed_by = $3
         WHERE id::text = $1`,
        [changeId, admin.id, admin.name], { label: "Mark change reverted" });
      return { success: true, status: "reverted" };
    }

    if (action === "approve") {
      if (kind !== "live") throw new Error("This change isn't live yet — apply it by hand, then mark it Applied.");
      status = "approved";
    } else {
      if (kind === "live") throw new Error("This change is already live — use Looks good or Revert.");
      status = action === "applied" ? "applied" : "dismissed";
    }

    await db.execute(
      `UPDATE cliptracker_v2_audit_changelog SET review_status = $2, reviewed_at = now(), reviewed_by = $3 WHERE id::text = $1`,
      [changeId, status, admin.name], { label: `Mark change ${status}` });
    return { success: true, status };
  },
});
