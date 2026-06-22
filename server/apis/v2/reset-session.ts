import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Fresh Start: wipes the existing session's responses and XP events,
 * then resets session columns to start fresh.
 * 
 * Blocked if the session is already passed (completed=true AND score≥80).
 */
export default api({
  name: "ResetSession",
  description: "Wipes responses/XP and resets a session for a fresh start",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    sessionId: z.string(),
    success: z.boolean(),
    alreadyPassed: z.boolean(),
  }),

  async run(ctx, { clipId, viewerId }) {
    // Find the existing session
    const SessionSchema = z.object({
      id: z.string(),
      completed: z.boolean(),
      engagement_score: z.coerce.number().nullable(),
    });

    const sessions = await ctx.integrations.db.query(
      `SELECT id, completed, engagement_score
       FROM cliptracker_v2_sessions
       WHERE clip_id = $1 AND viewer_id = $2
       LIMIT 1`,
      SessionSchema,
      [clipId, viewerId],
      { label: "Find session to reset" }
    );

    if (sessions.length === 0) {
      throw new Error("No session found for this clip and viewer");
    }

    const session = sessions[0];
    const passed = session.completed && (session.engagement_score ?? 0) >= 80;

    if (passed) {
      return {
        sessionId: session.id,
        success: false,
        alreadyPassed: true,
      };
    }

    // 1. Delete responses for this session
    await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_responses WHERE session_id = $1`,
      [session.id],
      { label: "Delete session responses" }
    );

    // 2. Delete XP events for this viewer+clip
    await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_xp_events
       WHERE viewer_id = $1 AND clip_id = $2`,
      [viewerId, clipId],
      { label: "Delete clip XP events" }
    );

    // 3. Reset session columns
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions SET
         completed = false,
         engagement_score = NULL,
         question_score = NULL,
         focus_score = NULL,
         time_score = NULL,
         total_focus_seconds = NULL,
         total_blur_seconds = NULL,
         total_time_seconds = NULL,
         ended_at = NULL,
         paused_at = NULL,
         paused_elapsed_seconds = NULL,
         paused_focus_seconds = NULL,
         paused_blur_seconds = NULL,
         paused_answered_ids = NULL,
         paused_correct_count = NULL,
         paused_phase = NULL,
         started_at = NOW()
       WHERE id = $1`,
      [session.id],
      { label: "Reset session to fresh state" }
    );

    return {
      sessionId: session.id,
      success: true,
      alreadyPassed: false,
    };
  },
});
