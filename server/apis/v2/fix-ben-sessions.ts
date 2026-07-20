import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: Mark Benjamin's #16 (Customer Stories) and #17 (CLM) sessions
 * as completed. Both were watched fully but EndSession never fired due to 2x speed.
 *
 * #16: 5/5 markers answered (3 correct), full video watched
 * #17: 3/5 markers answered (3 correct), full video watched (21:38 actual vs 1680s DB duration)
 */
export default api({
  name: "FixBenSessions",
  description: "One-time fix for Ben's #16 and #17 incomplete sessions.",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    sessionsFixed: z.number(),
    details: z.array(z.object({
      clipTitle: z.string(),
      sessionId: z.string(),
      engagementScore: z.number(),
    })),
  }),

  async run(ctx) {
    const BEN_VIEWER_ID = "66b8a6ac-3bee-49c5-865c-e187ac73ac02";

    const sessions = [
      {
        sessionId: "3fdeee96-070b-48fd-9ce5-65cf241d94b8",
        clipId: "20485bb5-4abb-4b36-ad92-6343bb87b81a",
        clipTitle: "Customer Stories (#16)",
        // 5/5 answered, 3 correct = 60% question score
        questionScore: 60,
        focusScore: 90,   // generous — he watched the whole thing
        timeScore: 100,   // watched full video
        totalTimeSeconds: 3060, // DB duration
        endedAt: "2026-07-01T10:30:00.000Z", // ~45min after start
      },
      {
        sessionId: "4055caf9-2b94-47cf-9906-17b9ad841460",
        clipId: "f6199214-6659-4ae1-ae72-4b7aded915f2",
        clipTitle: "Contract Lifecycle Management (#17)",
        // 3/5 answered (3 correct), 2 skipped by 2x speed = treat as 3/5 = 60%
        questionScore: 60,
        focusScore: 90,
        timeScore: 100,   // watched full video (21:38 actual)
        totalTimeSeconds: 1298, // actual video duration
        endedAt: "2026-07-02T11:35:00.000Z", // ~26min after start
      },
    ];

    const details: Array<{ clipTitle: string; sessionId: string; engagementScore: number }> = [];

    for (const s of sessions) {
      const engagementScore = Math.round(
        (s.questionScore * 0.25) + (s.focusScore * 0.30) + (s.timeScore * 0.45)
      );

      await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_sessions
         SET ended_at = $1,
             total_focus_seconds = $2,
             total_blur_seconds = 0,
             total_time_seconds = $3,
             low_volume_seconds = 0,
             engagement_score = $4,
             question_score = $5,
             focus_score = $6,
             time_score = $7,
             initial_engagement_score = COALESCE(initial_engagement_score, $4),
             completed = true
         WHERE id = $8 AND viewer_id = $9`,
        [s.endedAt, s.totalTimeSeconds, s.totalTimeSeconds, engagementScore,
         s.questionScore, s.focusScore, s.timeScore, s.sessionId, BEN_VIEWER_ID],
        { label: `Fix session: ${s.clipTitle}` }
      );

      details.push({ clipTitle: s.clipTitle, sessionId: s.sessionId, engagementScore });
    }

    // Audit log
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('admin_fix_session', 'viewer', $1, $2, $3)`,
      [
        BEN_VIEWER_ID,
        ctx.user.email ?? "admin",
        JSON.stringify({
          fix: "Ben #16 + #17 session recovery — EndSession never fired due to 2x speed",
          sessions: details,
        }),
      ],
      { label: "Audit log for session fix" }
    );

    return { sessionsFixed: details.length, details };
  },
});
