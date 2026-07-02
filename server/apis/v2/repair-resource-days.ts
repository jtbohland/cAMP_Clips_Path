import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time repair: inserts missing swiss_army_knife XP events for learners
 * who completed all resource clicks but never got the badge due to the
 * badge_id column bug (column doesn't exist — should have been source_id).
 *
 * Also checks for submitted reflections and awards 10 XP if reflection exists.
 */
export default api({
  name: "RepairResourceDays",
  description: "Fixes missing swiss_army_knife events for completed resource days",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    fixed: z.number(),
    details: z.array(z.object({
      name: z.string(),
      dayLabel: z.string(),
      xpAwarded: z.number(),
    })),
  }),

  async run(ctx) {
    // Find all learners who completed all resource clicks but have no swiss_army_knife event
    const MissingSchema = z.object({
      viewer_id: z.string(),
      name: z.string(),
      clip_id: z.string(),
      day_label: z.string(),
      is_admin: z.boolean(),
    });
    const missing = await ctx.integrations.db.query(
      `SELECT v.id as viewer_id, v.name, c.id as clip_id, c.day_label,
              COALESCE(v.is_admin, false) as is_admin
       FROM cliptracker_v2_viewers v
       JOIN cliptracker_v2_clips c ON c.video_url IS NULL AND c.duration_seconds IS NULL AND c.status = 'live'
       WHERE COALESCE(jsonb_array_length(c.resources), 0) > 0
         AND (SELECT COUNT(*) FROM cliptracker_v2_resource_clicks rc
              WHERE rc.viewer_id = v.id AND rc.clip_id = c.id
             ) >= COALESCE(jsonb_array_length(c.resources), 0)
         AND NOT EXISTS (
           SELECT 1 FROM cliptracker_v2_xp_events xe
           WHERE xe.viewer_id = v.id AND xe.clip_id = c.id AND xe.event_type = 'swiss_army_knife'
         )
       LIMIT 10`,
      MissingSchema,
      [],
      { label: "Find learners with missing swiss_army_knife events" }
    );

    const details: { name: string; dayLabel: string; xpAwarded: number }[] = [];

    for (const row of missing) {
      if (row.is_admin) continue;

      // Determine topic_day key from day_label
      const topicDayKey = row.day_label === "Day 5" ? "day5" : row.day_label === "Day 9" ? "day9" : null;

      // Check if reflection was already submitted
      let hasReflection = false;
      if (topicDayKey) {
        const ReflCheck = z.object({ cnt: z.coerce.number() });
        const reflResult = await ctx.integrations.db.query(
          "SELECT COUNT(*)::int as cnt FROM cliptracker_v2_topic_reflections WHERE viewer_id = $1 AND topic_day = $2",
          ReflCheck,
          [row.viewer_id, topicDayKey],
          { label: `Check reflection for ${row.name} ${row.day_label}` }
        );
        hasReflection = reflResult[0].cnt > 0;
      }

      const xpAmount = hasReflection ? 10 : 0;

      // Insert the missing swiss_army_knife event
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, xp_amount, source_id)
         VALUES ($1, $2, 'swiss_army_knife', $3, 'swiss_army_knife')
         ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
        [row.viewer_id, row.clip_id, xpAmount],
        { label: `Insert swiss_army_knife for ${row.name} ${row.day_label}` }
      );

      // Also insert unlock override for next clip if missing
      const SortSchema = z.object({ sort_order: z.coerce.number() });
      const sortResult = await ctx.integrations.db.query(
        "SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1",
        SortSchema,
        [row.clip_id],
        { label: "Get sort order" }
      );
      if (sortResult.length > 0) {
        const NextClipSchema = z.object({ id: z.string() });
        const nextClip = await ctx.integrations.db.query(
          "SELECT id FROM cliptracker_v2_clips WHERE sort_order = $1 AND status = 'live' LIMIT 1",
          NextClipSchema,
          [sortResult[0].sort_order + 1],
          { label: "Find next clip" }
        );
        if (nextClip.length > 0) {
          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason)
             VALUES ($1, $2, 'system', 'Repair: completed topic day resources')
             ON CONFLICT (viewer_id, clip_id) DO NOTHING`,
            [row.viewer_id, nextClip[0].id],
            { label: `Unlock next clip for ${row.name}` }
          );
        }
      }

      details.push({ name: row.name, dayLabel: row.day_label, xpAwarded: xpAmount });
      ctx.log.info(`Fixed missing swiss_army_knife for ${row.name} ${row.day_label}`, { xpAmount });
    }

    return { fixed: details.length, details };
  },
});
