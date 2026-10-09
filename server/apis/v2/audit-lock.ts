import { z } from "@superblocksteam/sdk-api";
import type { PostgresClient } from "@superblocksteam/sdk-api";

/**
 * Shared Ascent Audit lock check.
 *
 * SME audit writes (edits, section approvals, sign-offs) are only accepted while an
 * audit cycle is open: there is an active cycle AND its deadline day has not ended.
 * The deadline is treated as the END of that calendar day (Pacific time), so the lock
 * lands at midnight Pacific after the countdown hits 0.
 *
 * JT re-opens editing by creating the next audit cycle with a future deadline.
 * Admins are never locked out.
 */
export interface AuditLockState {
  locked: boolean;
  cycleId: string | null;
  reason: string | null;
  cycleLabel: string | null;
}

const LockRow = z.object({
  id: z.string(),
  label: z.string(),
  past_deadline: z.boolean(),
});

export async function getAuditLock(db: PostgresClient): Promise<AuditLockState> {
  const rows = await db.query(
    `SELECT id::text, label,
            (deadline IS NOT NULL AND now() >
              ((((deadline AT TIME ZONE 'UTC')::date + 1)::timestamp) AT TIME ZONE 'America/Los_Angeles')
            ) AS past_deadline
     FROM cliptracker_v2_audit_cycles
     WHERE status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    LockRow,
    undefined,
    { label: "Check audit lock (active cycle + deadline)" }
  );
  const cycle = rows[0];
  if (!cycle) {
    return {
      locked: true,
      cycleId: null,
      reason: "The Ascent Audit is closed. Edits will reopen when the next audit cycle starts.",
      cycleLabel: null,
    };
  }
  if (cycle.past_deadline) {
    return {
      locked: true,
      cycleId: cycle.id,
      reason: `The ${cycle.label} deadline has passed — the audit is closed. Edits will reopen when the next audit cycle starts.`,
      cycleLabel: cycle.label,
    };
  }
  return { locked: false, cycleId: cycle.id, reason: null, cycleLabel: cycle.label };
}

const AdminRow = z.object({ is_admin: z.boolean() });

/** True when the viewer id belongs to an admin. */
export async function isAdminViewer(db: PostgresClient, viewerId: string | null | undefined): Promise<boolean> {
  if (!viewerId) return false;
  const rows = await db.query(
    `SELECT COALESCE(is_admin, false) AS is_admin FROM cliptracker_v2_viewers WHERE id::text = $1 LIMIT 1`,
    AdminRow,
    [viewerId],
    { label: "Check viewer admin flag" }
  );
  return rows[0]?.is_admin === true;
}

/** Throws a friendly error when audit writes are locked for this (non-admin) viewer. */
export async function assertAuditOpen(db: PostgresClient, viewerId: string | null | undefined): Promise<AuditLockState> {
  const lock = await getAuditLock(db);
  if (!lock.locked) return lock;
  if (await isAdminViewer(db, viewerId)) return lock;
  throw new Error(lock.reason ?? "The Ascent Audit is closed.");
}

/**
 * Which SME edits go live immediately vs. wait for JT.
 *  - live:  applied to the training on save; JT reviews afterwards (Looks good / Revert)
 *  - held:  NOT applied; JT applies it by hand, then marks it done (or dismisses it)
 *  - note:  SME feedback only; JT marks it done
 */
export type AuditChangeKind = "live" | "held" | "note";

/** Approach (Week 1) topics — edits always need JT's manual work. */
export const APPROACH_TOPIC_KEYS = new Set(["product_101"]);

const VIDEO_EDIT_TYPES = new Set(["video_link", "video_replace"]);
const NOTE_EDIT_TYPES = new Set(["clip_notes", "academy_notes", "wheel_notes"]);
/** Saved to the changelog only today (no live storage) — JT applies them by hand. */
const MANUAL_EDIT_TYPES = new Set(["smes", "clip_summary", "clip_objectives", "game_scenario_edit"]);

export function classifyAuditChange(topicKey: string, entityType: string, entityId: string | null): AuditChangeKind {
  if (APPROACH_TOPIC_KEYS.has(topicKey)) return NOTE_EDIT_TYPES.has(entityType) ? "note" : "held";
  if (VIDEO_EDIT_TYPES.has(entityType)) return "held";
  if (NOTE_EDIT_TYPES.has(entityType)) return "note";
  if (MANUAL_EDIT_TYPES.has(entityType)) return "held";
  if (entityType.startsWith("gear_") && entityId === "topic") return "held";
  return "live";
}
