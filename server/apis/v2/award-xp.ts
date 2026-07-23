import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Awards XP and badges after a clip session completes.
 * Called from the frontend after EndSession returns scores.
 * Handles: base XP, performance bonuses, streak bonuses, milestone bonuses.
 * Pace bonuses are checked separately via CheckPaceBonus.
 */
export default api({
  name: "AwardXP",
  description: "Awards XP and badges based on clip session results",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    sessionId: z.string().uuid(),
    trailMarkerCorrect: z.number().int().min(0).max(5),
    trailMarkerTotal: z.number().int().min(0).max(5),
    passedFirstPass: z.boolean(),
    searchRescueTriggered: z.boolean(),
    searchRescueScore: z.number().int().nullable(),
    searchRescueTotal: z.number().int().nullable(),
    weatherStormTriggered: z.boolean(),
    totalTimeSeconds: z.number(),
    clipDurationSeconds: z.number(),
  }),

  output: z.object({
    xpAwarded: z.number(),
    sessionBreakdown: z.object({
      base: z.number(),
      milestones: z.number(),
      bonuses: z.number(),
    }),
    badgesEarned: z.array(z.object({
      badgeId: z.string(),
      name: z.string(),
      emoji: z.string(),
      xp: z.number(),
    })),
    totalXp: z.number(),
    newTier: z.object({
      tier: z.number(),
      name: z.string(),
      emoji: z.string(),
    }).nullable(),
  }),

  async run(ctx, input) {
    const { viewerId, clipId, trailMarkerCorrect, trailMarkerTotal, passedFirstPass,
      searchRescueTriggered, searchRescueScore, searchRescueTotal,
      weatherStormTriggered, totalTimeSeconds, clipDurationSeconds } = input;

    // Check if viewer is admin — admins don't earn XP
    const AdminCheckSchema = z.object({ is_admin: z.boolean() });
    const adminCheck = await ctx.integrations.db.query(
      "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
      AdminCheckSchema,
      [viewerId],
      { label: "Check if viewer is admin" }
    );
    if (adminCheck[0]?.is_admin) {
      ctx.log.info("Admin viewer — skipping XP award", { viewerId });
      return { xpAwarded: 0, sessionBreakdown: { base: 0, milestones: 0, bonuses: 0 }, badgesEarned: [], totalXp: 0, newTier: null };
    }

    const xpEvents: Array<{ sourceId: string; eventType: string; xp: number }> = [];
    const badgesEarned: Array<{ badgeId: string; name: string; emoji: string; xp: number; clipIdOverride?: string }> = [];

    // === BASE XP ===
    // Watch clip (always 3 XP if session completed)
    xpEvents.push({ sourceId: "watch", eventType: "base", xp: 3 });

    // Trail Markers score
    if (trailMarkerCorrect === 5) {
      xpEvents.push({ sourceId: "trail_markers_5", eventType: "base", xp: 5 });
    } else if (trailMarkerCorrect === 4) {
      xpEvents.push({ sourceId: "trail_markers_4", eventType: "base", xp: 3 });
    } else if (trailMarkerCorrect === 3) {
      xpEvents.push({ sourceId: "trail_markers_3", eventType: "base", xp: 1 });
    }

    // Pass Search & Rescue
    if (searchRescueTriggered && searchRescueScore !== null && searchRescueTotal !== null) {
      const srPercent = searchRescueTotal > 0 ? (searchRescueScore / searchRescueTotal) * 100 : 0;
      if (srPercent >= 80) {
        xpEvents.push({ sourceId: "pass_search_rescue", eventType: "base", xp: 2 });
      }
    }

    // Complete Weather the Storm timer
    if (weatherStormTriggered) {
      xpEvents.push({ sourceId: "weather_storm_complete", eventType: "base", xp: 1 });
    }

    // === PERFORMANCE BONUSES ===
    // Perfect Hiker: 5/5 Trail Markers + no S&R
    if (trailMarkerCorrect === 5 && !searchRescueTriggered) {
      xpEvents.push({ sourceId: "perfect_hiker", eventType: "performance", xp: 8 });
      badgesEarned.push({ badgeId: "perfect_hiker", name: "Perfect Hiker", emoji: "🌲", xp: 8 });
    }

    // Speed Hiker: completed in under video length + 5 minutes
    if (totalTimeSeconds < clipDurationSeconds + 300 && passedFirstPass) {
      xpEvents.push({ sourceId: "speed_hiker", eventType: "performance", xp: 5 });
      badgesEarned.push({ badgeId: "speed_hiker", name: "Speed Hiker", emoji: "🥾", xp: 5 });
    }

    // Search & Rescue Hero: Failed Trail Markers then scored 5/5 on S&R
    if (searchRescueTriggered && searchRescueScore === searchRescueTotal && searchRescueTotal !== null && searchRescueTotal > 0) {
      xpEvents.push({ sourceId: "search_and_rescue_hero", eventType: "performance", xp: 8 });
      badgesEarned.push({ badgeId: "search_and_rescue_hero", name: "Search & Rescue Hero", emoji: "🚁", xp: 8 });
    }

    // Storm Chaser: previously hit Weather the Storm, now passed first try
    if (passedFirstPass && !searchRescueTriggered) {
      const StormCheckSchema = z.object({ count: z.coerce.number() });
      const prevStorm = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
         WHERE viewer_id = $1 AND source_id = 'weather_storm_complete'`,
        StormCheckSchema,
        [viewerId],
        { label: "Check previous weather storm" }
      );
      if (prevStorm[0]?.count > 0) {
        // Check that the immediately preceding clip had weather storm
        const PrevClipSchema = z.object({ clip_id: z.string() });
        const prevClips = await ctx.integrations.db.query(
          `SELECT clip_id::text FROM cliptracker_v2_xp_events
           WHERE viewer_id = $1 AND source_id = 'weather_storm_complete'
           ORDER BY created_at DESC LIMIT 1`,
          PrevClipSchema,
          [viewerId],
          { label: "Get last storm clip" }
        );
        if (prevClips.length > 0) {
          // Check if that clip is the previous clip by sort_order
          const SortOrderSchema = z.object({ sort_order: z.coerce.number() });
          const currentSort = await ctx.integrations.db.query(
            `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
            SortOrderSchema, [clipId], { label: "Current clip sort" }
          );
          const prevSort = await ctx.integrations.db.query(
            `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
            SortOrderSchema, [prevClips[0].clip_id], { label: "Prev storm clip sort" }
          );
          if (currentSort[0] && prevSort[0] && currentSort[0].sort_order === prevSort[0].sort_order + 1) {
            xpEvents.push({ sourceId: "storm_chaser", eventType: "performance", xp: 3 });
            badgesEarned.push({ badgeId: "storm_chaser", name: "Storm Chaser", emoji: "⛈️", xp: 3 });
          }
        }
      }
    }

    // === STREAK BONUSES (non-overlapping windows) ===
    // No Detours: 5 clips without S&R — max 3 awards
    // Windows: clips 1-5, 6-10, 11-15
    if (!searchRescueTriggered) {
      const StreakSchema = z.object({ sort_order: z.coerce.number() });
      const currentSort = await ctx.integrations.db.query(
        `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
        StreakSchema, [clipId], { label: "Streak - current sort" }
      );
      if (currentSort[0]) {
        const currentSortOrder = currentSort[0].sort_order;
        // Non-overlapping windows: award only at the END of each window (clip 5, 10, 15)
        const noDetourWindows = [5, 10, 15];
        if (noDetourWindows.includes(currentSortOrder)) {
          const windowStart = currentSortOrder - 4;
          // Check no S&R in this window
          const SrCheckSchema = z.object({ count: z.coerce.number() });
          const srClips = await ctx.integrations.db.query(
            `SELECT COUNT(*)::int as count
             FROM cliptracker_v2_xp_events xe
             JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
             WHERE xe.viewer_id = $1 AND xe.source_id = 'pass_search_rescue'
             AND c.sort_order BETWEEN $2 AND $3`,
            SrCheckSchema,
            [viewerId, windowStart, currentSortOrder],
            { label: "Check No Detours window" }
          );
          // Also verify all 5 clips in window are completed
          const CompletedSchema = z.object({ count: z.coerce.number() });
          const completedInWindow = await ctx.integrations.db.query(
            `SELECT COUNT(DISTINCT c.id)::int as count
             FROM cliptracker_v2_xp_events xe
             JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
             WHERE xe.viewer_id = $1 AND xe.source_id = 'watch'
             AND c.sort_order BETWEEN $2 AND $3`,
            CompletedSchema,
            [viewerId, windowStart, currentSortOrder - 1],
            { label: "Check completed in No Detours window" }
          );
          if (srClips[0]?.count === 0 && completedInWindow[0]?.count === 4) {
            const ExistingBadgeSchema = z.object({ count: z.coerce.number() });
            const existing = await ctx.integrations.db.query(
              `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
               WHERE viewer_id = $1 AND badge_id = 'no_detours' AND clip_id = $2`,
              ExistingBadgeSchema, [viewerId, clipId], { label: "Check existing no_detours" }
            );
            if (existing[0]?.count === 0) {
              xpEvents.push({ sourceId: "no_detours", eventType: "streak", xp: 10 });
              badgesEarned.push({ badgeId: "no_detours", name: "No Detours", emoji: "🧭", xp: 10 });
            }
          }
        }
      }
    }

    // Leave No Trace: 5/5 Trail Markers on a 3-clip window — max 5 awards
    // Windows shifted to avoid resource days (sorts 6, 12):
    //   W1: 1-3, W2: 3-5, W3: 7-9, W4: 10-11+13, W5: 13-15
    // Each window fires when its LAST clip gets 5/5.
    // Sort 13 is the last clip in both W4 and W5, so both are checked.
    if (trailMarkerCorrect === 5) {
      const SortSchema = z.object({ sort_order: z.coerce.number() });
      const currentSort = await ctx.integrations.db.query(
        `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
        SortSchema, [clipId], { label: "LNT - current sort" }
      );
      if (currentSort[0]) {
        const cs = currentSort[0].sort_order;
        // Define windows as [triggerSort, otherSorts[]]
        // triggerSort = last clip in window (fires the check)
        // otherSorts = the other 2 clips that must also have 5/5
        const lntWindowDefs: Array<{ trigger: number; others: number[] }> = [
          { trigger: 3,  others: [1, 2] },    // W1: clips 1-3
          { trigger: 5,  others: [3, 4] },    // W2: clips 3-5
          { trigger: 9,  others: [7, 8] },    // W3: clips 7-9
          { trigger: 13, others: [10, 11] },  // W4: clips 10, 11, 13
          { trigger: 15, others: [13, 14] },  // W5: clips 13-15
        ];
        const matchingWindows = lntWindowDefs.filter(w => w.trigger === cs);
        for (const win of matchingWindows) {
          // Check the other 2 clips in this window got 5/5
          const PerfectSchema = z.object({ count: z.coerce.number() });
          const perfectInWindow = await ctx.integrations.db.query(
            `SELECT COUNT(DISTINCT xe.clip_id)::int as count
             FROM cliptracker_v2_xp_events xe
             JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
             WHERE xe.viewer_id = $1 AND xe.source_id = 'trail_markers_5'
             AND c.sort_order = ANY($2::int[])`,
            PerfectSchema,
            [viewerId, `{${win.others.join(",")}}`],
            { label: `Check LNT window (others: ${win.others.join(",")})` }
          );
          if (perfectInWindow[0]?.count === 2) {
            // Use the clip at the first sort of the window as the badge's clip_id
            // This ensures unique (viewer_id, badge_id, clip_id) per window
            const AnchorClipSchema = z.object({ id: z.string() });
            const anchorClip = await ctx.integrations.db.query(
              `SELECT id FROM cliptracker_v2_clips WHERE sort_order = $1`,
              AnchorClipSchema, [win.others[0]], { label: `LNT anchor clip for sort ${win.others[0]}` }
            );
            const anchorClipId = anchorClip[0]?.id ?? clipId;
            const ExBadgeSchema = z.object({ count: z.coerce.number() });
            const ex = await ctx.integrations.db.query(
              `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
               WHERE viewer_id = $1 AND badge_id = 'leave_no_trace' AND clip_id = $2`,
              ExBadgeSchema, [viewerId, anchorClipId], { label: `Check existing LNT sort ${win.others[0]}` }
            );
            if (ex[0]?.count === 0) {
              xpEvents.push({ sourceId: "leave_no_trace", eventType: "streak", xp: 15 });
              badgesEarned.push({ badgeId: "leave_no_trace", name: "Leave No Trace", emoji: "🌱", xp: 15, clipIdOverride: anchorClipId });
            }
          }
        }
      }
    }

    // === MILESTONE BONUSES ===
    const ClipSortSchema = z.object({ sort_order: z.coerce.number() });
    const clipSort = await ctx.integrations.db.query(
      `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
      ClipSortSchema, [clipId], { label: "Get clip sort for milestones" }
    );
    const sortOrder = clipSort[0]?.sort_order ?? 0;

    // First Step: Complete Clip 1
    if (sortOrder === 1) {
      xpEvents.push({ sourceId: "first_step", eventType: "milestone", xp: 5 });
      badgesEarned.push({ badgeId: "first_step", name: "First Step", emoji: "🎬", xp: 5 });
    }

    // Into the Summit Push: Clip 11 gets unlocked (completing clip 10 triggers this)
    if (sortOrder === 10) {
      xpEvents.push({ sourceId: "week_4_entry", eventType: "milestone", xp: 10 });
      badgesEarned.push({ badgeId: "week_4_entry", name: "Into the Summit Push", emoji: "🪢", xp: 10 });
    }

    // Ranger's Secret: Complete all 20 clips without ever triggering Weather the Storm
    if (sortOrder === 20) {
      const StormSchema = z.object({ count: z.coerce.number() });
      const stormCheck = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
         WHERE viewer_id = $1 AND source_id = 'weather_storm_complete'`,
        StormSchema, [viewerId], { label: "Check ranger secret" }
      );
      if (stormCheck[0]?.count === 0 && !weatherStormTriggered) {
        xpEvents.push({ sourceId: "mystery", eventType: "milestone", xp: 20 });
        badgesEarned.push({ badgeId: "mystery", name: "The Ranger's Secret", emoji: "🌲", xp: 20 });
      }
    }

    // === Double Summit: 2 clips in one calendar day ===
    const TodayCountSchema = z.object({ count: z.coerce.number() });
    const todayClips = await ctx.integrations.db.query(
      `SELECT COUNT(DISTINCT clip_id)::int as count
       FROM cliptracker_v2_xp_events
       WHERE viewer_id = $1 AND source_id = 'watch'
       AND clip_id != $2
       AND created_at::date = CURRENT_DATE`,
      TodayCountSchema, [viewerId, clipId], { label: "Count today clips (excl current)" }
    );
    // Exclude current clip to avoid double-counting from retries/duplicate calls.
    // If there's >= 1 OTHER clip completed today, this makes it the 2nd.
    if (todayClips[0]?.count >= 1) {
      // Cap at 8 total Double Summit awards across the program
      const TotalDsSchema = z.object({ count: z.coerce.number() });
      const totalDs = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
         WHERE viewer_id = $1 AND badge_id = 'double_summit'`,
        TotalDsSchema, [viewerId], { label: "Check total double summits" }
      );
      const ExDsSchema = z.object({ count: z.coerce.number() });
      const exDs = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
         WHERE viewer_id = $1 AND badge_id = 'double_summit'
         AND earned_at::date = CURRENT_DATE`,
        ExDsSchema, [viewerId], { label: "Check double summit today" }
      );
      if (exDs[0]?.count === 0 && (totalDs[0]?.count ?? 0) < 8) {
        xpEvents.push({ sourceId: "double_summit", eventType: "performance", xp: 5 });
        badgesEarned.push({ badgeId: "double_summit", name: "Double Summit", emoji: "⛰️", xp: 5 });
      }
    }

    // === INSERT XP EVENTS ===
    let totalAwarded = 0;
    for (const event of xpEvents) {
      try {
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
          [viewerId, clipId, event.eventType, event.sourceId, event.xp],
          { label: `Award XP: ${event.sourceId}` }
        );
        totalAwarded += event.xp;
      } catch (e) {
        // Duplicate — skip
        ctx.log.info(`XP event already exists: ${event.sourceId}`, { clipId });
      }
    }

    // === INSERT BADGES ===
    for (const badge of badgesEarned) {
      try {
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
          [viewerId, badge.badgeId, badge.clipIdOverride ?? clipId],
          { label: `Award badge: ${badge.badgeId}` }
        );
      } catch (e) {
        ctx.log.info(`Badge already earned: ${badge.badgeId}`, { clipId });
      }
    }

    // Get new total XP
    const NewTotalSchema = z.object({ total_xp: z.coerce.number() });
    const newTotal = await ctx.integrations.db.query(
      `SELECT COALESCE(SUM(xp_amount), 0)::int as total_xp
       FROM cliptracker_v2_xp_events WHERE viewer_id = $1`,
      NewTotalSchema, [viewerId], { label: "Get new total XP" }
    );
    const totalXp = newTotal[0]?.total_xp ?? 0;

    // Determine if tier changed
    const TIERS = [
      { tier: 1, name: "Base Camper", emoji: "🏕️" },
      { tier: 2, name: "Trailblazer", emoji: "🥾" },
      { tier: 3, name: "Summit Seeker", emoji: "🧗🏼" },
      { tier: 4, name: "Pinnacle Achiever", emoji: "⛰️" },
      { tier: 5, name: "Alpinist All-Star", emoji: "💫" },
    ];
    const TIER_THRESHOLDS = [0, 150, 325, 500, 700];
    const prevXp = totalXp - totalAwarded;
    const prevTierIdx = TIER_THRESHOLDS.reduce((acc, t, i) => prevXp >= t ? i : acc, 0);
    const newTierIdx = TIER_THRESHOLDS.reduce((acc, t, i) => totalXp >= t ? i : acc, 0);
    const newTier = newTierIdx > prevTierIdx ? TIERS[newTierIdx] : null;

    // Calculate per-category breakdown for this session
    const sessionBreakdown = {
      base: xpEvents.filter(e => e.eventType === "base").reduce((s, e) => s + e.xp, 0),
      milestones: xpEvents.filter(e => e.eventType === "milestone").reduce((s, e) => s + e.xp, 0),
      bonuses: xpEvents.filter(e => ["performance", "streak", "pace"].includes(e.eventType)).reduce((s, e) => s + e.xp, 0),
    };

    return {
      xpAwarded: totalAwarded,
      sessionBreakdown,
      badgesEarned,
      totalXp,
      newTier,
    };
  },
});
