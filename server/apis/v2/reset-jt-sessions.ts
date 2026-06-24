import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// JT's viewer ID
const JT_VIEWER = "ccd730f9-8b5b-4967-9310-8dd49a9018aa";

// Clips to reset (sort_order 3, 4, 5, 9)
const CLIPS_TO_RESET = [
  "27308b23-b9b0-4e4c-804a-d387bc307f9d", // 3 - GTM Launch Pad
  "2b9122a4-2762-4d26-9547-3666008dcaf0", // 4 - Prospecting Process
  "8f2bb85e-3ea7-4e72-820d-8a1a44ccdeb6", // 5 - Competitive Landscape
  "6114e90f-97df-4408-9cac-a8cf9a3ee0de", // 9 - Discovery (Spekit Deal Rooms)
];

export default api({
  name: "ResetJTSessions",
  description: "Resets JT's sessions for clips 3, 4, 5, 9 back to Watch Clip state",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    steps: z.array(z.string()),
  }),

  async run(ctx) {
    const steps: string[] = [];

    // Get session IDs for these clips first
    const SessionRow = z.object({ id: z.string() });
    const sessions = await ctx.integrations.db.query(
      `SELECT id FROM cliptracker_v2_sessions
       WHERE viewer_id = $1 AND clip_id = ANY($2::uuid[])`,
      SessionRow,
      [JT_VIEWER, CLIPS_TO_RESET],
      { label: "Get JT session IDs for target clips" }
    );
    const sessionIds = sessions.map(s => s.id);
    steps.push(`Found ${sessionIds.length} sessions to reset`);

    if (sessionIds.length > 0) {
      // 1. Delete responses for these sessions
      await ctx.integrations.db.execute(
        `DELETE FROM cliptracker_v2_responses
         WHERE session_id = ANY($1::uuid[])`,
        [sessionIds],
        { label: "Delete responses for target sessions" }
      );
      steps.push("Deleted responses");

      // 2. Delete XP events for these clips
      await ctx.integrations.db.execute(
        `DELETE FROM cliptracker_v2_xp_events
         WHERE viewer_id = $1 AND clip_id = ANY($2::uuid[])`,
        [JT_VIEWER, CLIPS_TO_RESET],
        { label: "Delete XP events for target clips" }
      );
      steps.push("Deleted XP events");

      // 3. Delete sessions
      await ctx.integrations.db.execute(
        `DELETE FROM cliptracker_v2_sessions
         WHERE viewer_id = $1 AND clip_id = ANY($2::uuid[])`,
        [JT_VIEWER, CLIPS_TO_RESET],
        { label: "Delete sessions for target clips" }
      );
      steps.push("Deleted sessions");
    }

    // 4. Delete unlock overrides for these clips (both as target and as source)
    await ctx.integrations.db.execute(
      `DELETE FROM cliptracker_v2_unlock_overrides
       WHERE viewer_id = $1 AND (clip_id = ANY($2::uuid[]) OR unlocked_by = ANY($2::text[]))`,
      [JT_VIEWER, CLIPS_TO_RESET],
      { label: "Delete unlock overrides for target clips" }
    );
    steps.push("Deleted unlock overrides");

    // 5. Delete badges earned from these clips (double_summit etc)
    // We should only remove badges if they were earned from these clips specifically
    // Since badges table doesn't link to clips directly, we'll leave them
    // unless they need reset too
    steps.push("Badges left intact (not clip-specific in schema)");

    steps.push("JT's clips 3, 4, 5, 9 are now reset to 'Watch Clip' state");

    return { success: true, steps };
  },
});
