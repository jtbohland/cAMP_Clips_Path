import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix for legacy learners (Ben, Chris, Kabir) who completed
 * cAMP Day 1 ("Understanding Our Verticals") under the old version
 * before we migrated to cliptracker_v2. They have no session record
 * for clip #1, which blocks summit completion detection.
 */
export default api({
  name: "FixLegacyDay1",
  description: "Creates completed clip #1 sessions for 3 legacy learners.",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    sessionsCreated: z.number(),
    details: z.array(z.object({
      action: z.string(),
      viewerName: z.string(),
      viewerId: z.string(),
    })),
  }),

  async run(ctx) {
    const CLIP_1_ID = "439ad1ff-6526-4f24-a1da-f84fd40638de"; // "Understanding Our Verticals", sort_order 1

    const legacyLearners = [
      { id: "66b8a6ac-3bee-49c5-865c-e187ac73ac02", name: "Benjamin Singh" },
      { id: "74c80649-c345-4cd9-9fce-383aa02328e1", name: "Chris English" },
      { id: "273867c6-76b7-49af-8b6e-7501e0c5222f", name: "Kabir Rai" },
    ];

    const details: Array<{ action: string; viewerName: string; viewerId: string }> = [];
    let sessionsCreated = 0;

    for (const learner of legacyLearners) {
      // Check if session already exists (idempotent)
      const existing = await ctx.integrations.db.query(
        `SELECT id FROM cliptracker_v2_sessions WHERE viewer_id = $1 AND clip_id = $2 LIMIT 1`,
        z.object({ id: z.string() }),
        [learner.id, CLIP_1_ID],
        { label: `Check existing clip #1 session for ${learner.name}` }
      );

      if (existing.length > 0) {
        details.push({
          action: "SKIPPED — session already exists",
          viewerName: learner.name,
          viewerId: learner.id,
        });
        continue;
      }

      // Create a completed session with generous engagement (87 — same as Ben's other fixes)
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_sessions (
          id, clip_id, viewer_id, started_at, ended_at,
          total_focus_seconds, total_blur_seconds, total_time_seconds,
          low_volume_seconds, engagement_score, question_score,
          focus_score, time_score, initial_engagement_score, completed, attempt_number
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          600, 0, 600,
          0, 87, 60,
          90, 100, 87, true, 1
        )`,
        [CLIP_1_ID, learner.id, "2026-06-30T14:00:00.000Z", "2026-06-30T14:10:00.000Z"],
        { label: `Create clip #1 session for ${learner.name}` }
      );

      sessionsCreated++;
      details.push({
        action: "CREATED clip #1 completed session (legacy day 1)",
        viewerName: learner.name,
        viewerId: learner.id,
      });
    }

    // Audit log
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('admin_fix_legacy_day1', 'system', $1, $2, $3)`,
      [
        CLIP_1_ID,
        ctx.user.email ?? "admin",
        JSON.stringify({
          fix: "Legacy learners clip #1 session creation — completed old version pre-v2 migration",
          sessionsCreated,
          details,
        }),
      ],
      { label: "Audit log for legacy day 1 fix" }
    );

    return { sessionsCreated, details };
  },
});
