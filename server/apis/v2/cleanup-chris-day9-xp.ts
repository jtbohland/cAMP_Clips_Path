import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time cleanup: Remove the accidentally-created swiss_army_knife XP event
 * for Chris English on resource_day9 (sort_order 12, "Pricing & Packaging 101").
 *
 * Root cause: The first test run of FixLegacyDay1 created this event before
 * the API errored on the audit log insert. Chris has 0 resource clicks on
 * Day 9 — she genuinely hasn't completed it.
 *
 * Created at: 2026-07-20T18:57:22.941Z (today, accidental)
 */
export default api({
  name: "CleanupChrisDay9Xp",
  description: "Removes accidentally created swiss_army_knife XP for Chris Day 9.",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    removed: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    const CHRIS_ID = "74c80649-c345-4cd9-9fce-383aa02328e1";
    const DAY9_CLIP_ID = "6caedc4f-5f1f-49aa-af9e-8c5980afb70c";

    // Verify it exists and was created today (safety check)
    const existing = await ctx.integrations.db.query(
      `SELECT id, created_at FROM cliptracker_v2_xp_events
       WHERE viewer_id = $1 AND clip_id = $2 AND event_type = 'swiss_army_knife'
       AND created_at >= '2026-07-20T00:00:00Z'
       LIMIT 1`,
      z.object({ id: z.string(), created_at: z.string() }),
      [CHRIS_ID, DAY9_CLIP_ID],
      { label: "Find accidental Chris Day 9 XP event" }
    );

    if (existing.length === 0) {
      return { removed: false, message: "No matching XP event found created today — nothing to clean up." };
    }

    // Remove the accidental record
    await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_xp_events WHERE id = $1`,
      [existing[0].id],
      { label: "Remove accidental Chris Day 9 XP" }
    );

    // Audit log
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('admin_cleanup_accidental_xp', 'viewer', $1, $2, $3)`,
      [
        CHRIS_ID,
        ctx.user.email ?? "admin",
        JSON.stringify({
          fix: "Removed accidental swiss_army_knife XP for Chris Day 9 — created by failed FixLegacyDay1 test run",
          removedEventId: existing[0].id,
          createdAt: existing[0].created_at,
        }),
      ],
      { label: "Audit log for cleanup" }
    );

    return { removed: true, message: `Removed accidental XP event ${existing[0].id} created at ${existing[0].created_at}` };
  },
});
