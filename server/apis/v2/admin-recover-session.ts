import { api, z, postgres } from '@superblocksteam/sdk-api';

const APPS_DB = 'c6e32cf4-ca66-42ae-aeb3-58c84ffae574';

const AdminCheckSchema = z.object({
  is_admin: z.boolean(),
});

export default api({
  name: 'AdminRecoverSession',
  description: 'Admin-only: manually recovers an incomplete session with scores and XP events.',
  integrations: {
    db: postgres(APPS_DB),
  },
  input: z.object({
    sessionId: z.string().uuid(),
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    engagementScore: z.number(),
    questionScore: z.number(),
    focusScore: z.number(),
    timeScore: z.number(),
    xpEvents: z.array(
      z.object({
        eventType: z.string(),
        sourceId: z.string(),
        xpAmount: z.number(),
      })
    ),
  }),
  output: z.object({
    sessionUpdated: z.boolean(),
    xpEventsInserted: z.number(),
  }),
  async run(ctx, input) {
    // Admin gate: verify the calling user is an admin
    const callerEmail = ctx.user.email;
    if (!callerEmail) {
      throw new Error('Access denied: unable to identify caller.');
    }

    const rows = await ctx.integrations.db.query(
      'SELECT is_admin FROM cliptracker_v2_viewers WHERE email = $1',
      AdminCheckSchema,
      [callerEmail],
      { label: 'Check caller is admin' }
    );

    if (rows.length === 0 || !rows[0].is_admin) {
      throw new Error('Access denied: admin privileges required.');
    }

    // Step 1: Mark session as completed
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions
       SET completed = true,
           ended_at = NOW(),
           engagement_score = $1,
           question_score = $2,
           focus_score = $3,
           time_score = $4
       WHERE id = $5 AND viewer_id = $6`,
      [
        input.engagementScore,
        input.questionScore,
        input.focusScore,
        input.timeScore,
        input.sessionId,
        input.viewerId,
      ],
      { label: 'Mark session completed' }
    );

    // Step 2: Insert XP events
    for (const evt of input.xpEvents) {
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_xp_events (id, viewer_id, clip_id, event_type, source_id, xp_amount, metadata, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, '{}', NOW())`,
        [input.viewerId, input.clipId, evt.eventType, evt.sourceId, evt.xpAmount],
        { label: `Insert XP: ${evt.sourceId}` }
      );
    }

    return {
      sessionUpdated: true,
      xpEventsInserted: input.xpEvents.length,
    };
  },
});
