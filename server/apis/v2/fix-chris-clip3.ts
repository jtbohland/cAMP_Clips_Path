import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// Chris English's viewer ID
const CHRIS_VIEWER = "74c80649-c345-4cd9-9fce-383aa02328e1";
// Clip 3 - GTM Launch Pad
const CLIP_3_ID = "27308b23-b9b0-4e4c-804a-d387bc307f9d";
// Clip 4 - Prospecting Process (next clip to unlock)
const CLIP_4_ID = "2b9122a4-2762-4d26-9547-3666008dcaf0";
// Chris's Clip 3 session
const SESSION_ID = "f76a8095-7b4d-42f2-bef1-c32feebe224b";

export default api({
  name: "FixChrisClip3",
  description: "Manually completes Chris's Clip 3 session with agreed engagement scores and XP",

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

    // 1. Complete Chris's Clip 3 session with agreed-upon scores:
    //    Question: 100 (5/5 trail markers correct)
    //    Focus: 60 (estimated 2 tab-aways)
    //    Time: 100 (watched entire video at 1.5x, organic)
    //    JT agreed to engagement score = 83
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions SET
        completed = true,
        ended_at = NOW(),
        engagement_score = 83,
        initial_engagement_score = COALESCE(initial_engagement_score, 83),
        question_score = 100,
        focus_score = 60,
        time_score = 100,
        is_recovery_attempt = false
       WHERE id = $1`,
      [SESSION_ID],
      { label: "Complete Chris Clip 3 session" }
    );
    steps.push("Completed session with engagement=83, question=100, focus=60, time=100");

    // 2. Insert unlock override for Clip 4 (Prospecting Process)
    // Schema: (viewer_id, clip_id, unlocked_by, reason, created_at)
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason, created_at)
       VALUES ($1, $2, $3, 'first_pass_unlock', NOW())
       ON CONFLICT (viewer_id, clip_id) DO NOTHING`,
      [CHRIS_VIEWER, CLIP_4_ID, CLIP_3_ID],
      { label: "Unlock Clip 4 for Chris" }
    );
    steps.push("Unlocked Clip 4 (Prospecting Process) for Chris");

    // 3. Award XP events for Clip 3
    // Schema: (viewer_id, clip_id, event_type, source_id, xp_amount, metadata, created_at)
    // Unique constraint: (viewer_id, source_id, clip_id)
    // XP breakdown: watch(3) + trail_markers_5(5) + first_pass_unlock(4) + perfect_hiker(8) + speed_hiker(5) = 25
    const xpEvents = [
      { sourceId: "watch", eventType: "base", xp: 3 },
      { sourceId: "trail_markers_5", eventType: "base", xp: 5 },
      { sourceId: "first_pass_unlock", eventType: "bonus", xp: 4 },
      { sourceId: "perfect_hiker", eventType: "bonus", xp: 8 },
      { sourceId: "speed_hiker", eventType: "bonus", xp: 5 },
    ];

    for (const ev of xpEvents) {
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
        [CHRIS_VIEWER, CLIP_3_ID, ev.eventType, ev.sourceId, ev.xp],
        { label: `Award ${ev.sourceId} XP` }
      );
    }
    steps.push("Awarded XP: watch(3) + trail_markers_5(5) + first_pass_unlock(4) + perfect_hiker(8) + speed_hiker(5) = 25 XP");

    // 4. Award double_summit XP (5 XP) — for completing 2+ clips in 1 day
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount, created_at)
       VALUES ($1, $2, 'milestone', 'double_summit', 5, NOW())
       ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
      [CHRIS_VIEWER, CLIP_3_ID],
      { label: "Award double_summit XP" }
    );

    // Insert badge — schema: (viewer_id, badge_id, clip_id, earned_at)
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id, earned_at)
       VALUES ($1, 'double_summit', $2, NOW())
       ON CONFLICT DO NOTHING`,
      [CHRIS_VIEWER, CLIP_3_ID],
      { label: "Award double_summit badge" }
    );
    steps.push("Awarded double_summit badge + 5 XP");

    // Total new XP: 25 (clip 3) + 5 (double_summit) = 30
    // Chris's previous XP was 21 → now should be 51
    steps.push("Total XP added: 30. Chris should now have 51 XP total.");

    return { success: true, steps };
  },
});
