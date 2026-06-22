import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const SessionSchema = z.object({
  id: z.string(),
  already_passed: z.boolean(),
});

/**
 * Upserts a session for a viewer+clip combo.
 * - If no session exists → INSERT a new one.
 * - If an incomplete session exists → return its id (resume or fresh-start it).
 * - If a passed session exists (completed=true AND score≥80) → reject (clip is done).
 * - If a completed-but-not-passed session exists → reset it for retry.
 */
export default api({
  name: "StartSession",
  description: "Creates or returns the single session for a viewer+clip pair",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    sessionId: z.string(),
    alreadyPassed: z.boolean(),
    isExisting: z.boolean(),
  }),

  async run(ctx, { clipId, viewerId }) {
    // Check for existing session
    const ExistingSchema = z.object({
      id: z.string(),
      completed: z.boolean(),
      engagement_score: z.coerce.number().nullable(),
    });

    const existing = await ctx.integrations.db.query(
      `SELECT id, completed, engagement_score
       FROM cliptracker_v2_sessions
       WHERE clip_id = $1 AND viewer_id = $2
       LIMIT 1`,
      ExistingSchema,
      [clipId, viewerId],
      { label: "Check existing session" }
    );

    if (existing.length > 0) {
      const session = existing[0];
      const passed = session.completed && (session.engagement_score ?? 0) >= 80;

      if (passed) {
        // Clip is done forever — no new sessions allowed
        return {
          sessionId: session.id,
          alreadyPassed: true,
          isExisting: true,
        };
      }

      // Session exists but not passed — return it for reuse
      return {
        sessionId: session.id,
        alreadyPassed: false,
        isExisting: true,
      };
    }

    // No session exists — create one
    const InsertSchema = z.object({ id: z.string() });
    const newSession = await ctx.integrations.db.query(
      `INSERT INTO cliptracker_v2_sessions (clip_id, viewer_id, attempt_number)
       VALUES ($1, $2, 1)
       RETURNING id`,
      InsertSchema,
      [clipId, viewerId],
      { label: "Create new session" }
    );

    return {
      sessionId: newSession[0].id,
      alreadyPassed: false,
      isExisting: false,
    };
  },
});
