import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Audit and fix check-in timestamp mismatches.
 *
 * Finds learners who have a row in cliptracker_v2_checkin_emails but
 * a NULL timestamp on cliptracker_v2_viewers for the same checkin_type.
 * This mismatch causes the check-in modal to re-fire on every page load.
 *
 * Root cause: FixPrematureCheckins cleared the viewer timestamp but
 * left the email record, and MarkCheckinSent's early-return for
 * alreadySent skipped the viewer timestamp update.
 */

const MismatchRow = z.object({
  viewer_id: z.string(),
  viewer_name: z.string(),
  checkin_type: z.string(),
  email_created_at: z.string(),
});

const FixedRow = z.object({
  viewer_id: z.string(),
  viewer_name: z.string(),
  checkin_type: z.string(),
  fixed_timestamp: z.string(),
});

export default api({
  name: "FixCheckinTimestamps",
  description: "Audits and fixes orphaned check-in email records missing viewer timestamps",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    dryRun: z.boolean().default(true),
  }),

  output: z.object({
    mismatches: z.array(MismatchRow),
    fixed: z.array(FixedRow),
  }),

  async run(ctx, { dryRun }) {
    // Find all mismatches: email record exists but viewer timestamp is NULL
    const mismatches = await ctx.integrations.db.query(
      `SELECT
        ce.viewer_id,
        v.name AS viewer_name,
        ce.checkin_type,
        ce.created_at::text AS email_created_at
       FROM cliptracker_v2_checkin_emails ce
       JOIN cliptracker_v2_viewers v ON v.id = ce.viewer_id
       WHERE
        (ce.checkin_type = 'approach' AND v.approach_checkin_sent_at IS NULL)
        OR (ce.checkin_type = 'week2' AND v.week2_checkin_sent_at IS NULL)
        OR (ce.checkin_type = 'week3' AND v.week3_checkin_sent_at IS NULL)
       ORDER BY v.name, ce.checkin_type`,
      MismatchRow,
      [],
      { label: "Find checkin timestamp mismatches" }
    );

    ctx.log.info("Found mismatches", { count: mismatches.length, dryRun });

    if (dryRun || mismatches.length === 0) {
      return { mismatches, fixed: [] };
    }

    // Fix each mismatch — set viewer timestamp to the email's created_at
    const fixed: z.infer<typeof FixedRow>[] = [];

    const columnMap: Record<string, string> = {
      approach: "approach_checkin_sent_at",
      week2: "week2_checkin_sent_at",
      week3: "week3_checkin_sent_at",
    };

    for (const m of mismatches) {
      const column = columnMap[m.checkin_type];
      if (!column) continue;

      await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_viewers
         SET ${column} = $2::timestamptz
         WHERE id = $1 AND ${column} IS NULL`,
        [m.viewer_id, m.email_created_at],
        { label: `Fix ${column} for ${m.viewer_name}` }
      );

      fixed.push({
        viewer_id: m.viewer_id,
        viewer_name: m.viewer_name,
        checkin_type: m.checkin_type,
        fixed_timestamp: m.email_created_at,
      });
    }

    ctx.log.info("Fixed mismatches", { count: fixed.length });
    return { mismatches, fixed };
  },
});
