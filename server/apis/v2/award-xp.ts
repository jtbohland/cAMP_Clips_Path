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

    // === STREAK BONUSES (dynamic role-based windows) ===
    // Fetch the viewer's role and their ordered video clip list so windows
    // use real sort_orders instead of hardcoded values.
    const RoleSchema = z.object({ role: z.string().nullable() });
    const roleRow = await ctx.integrations.db.query(
      "SELECT role FROM cliptracker_v2_viewers WHERE id = $1",
      RoleSchema, [viewerId], { label: "Get viewer role for streaks" }
    );
    const viewerRole = roleRow[0]?.role ?? "Velocity AE";

    // VP uses a curated sort list; others use the roles JSONB filter
    const VP_CLIP_SORTS = [60, 120, 130, 140, 150, 170, 180, 190, 200];
    const isVP = viewerRole === "SDR>Velocity Promo";
    const VideoClipSchema = z.object({ sort_order: z.coerce.number(), id: z.string() });
    const videoClips = await ctx.integrations.db.query(
      `SELECT sort_order, id::text FROM cliptracker_v2_clips
       WHERE status = 'live' AND video_url IS NOT NULL
         AND (CASE WHEN $1 THEN sort_order = ANY($2::int[])
              ELSE (roles IS NULL OR roles @> to_jsonb($3::text)) END)
       ORDER BY sort_order`,
      VideoClipSchema,
      [isVP, isVP ? VP_CLIP_SORTS : [], viewerRole],
      { label: "Get viewer video clips for streaks" }
    );

    // Build ordinal → sort_order map (1-indexed)
    const clipSorts = videoClips.map(c => c.sort_order);
    const clipIds = videoClips.map(c => c.id);

    // Get current clip's ordinal position (1-based) in the viewer's path
    const ClipSortForStreaks = z.object({ sort_order: z.coerce.number() });
    const currentClipSort = await ctx.integrations.db.query(
      "SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1",
      ClipSortForStreaks, [clipId], { label: "Current clip sort for streaks" }
    );
    const currentSort = currentClipSort[0]?.sort_order ?? 0;
    const ordinalIdx = clipSorts.indexOf(currentSort); // 0-based
    const ordinal = ordinalIdx + 1; // 1-based

    // Define No Detours windows per role path (ordinal positions, 1-based)
    // Each window: [startOrdinal, endOrdinal] — trigger fires on the endOrdinal clip
    type Window = { start: number; end: number };
    const noDetourWindows: Window[] =
      isVP                   ? [{ start: 1, end: 4 }, { start: 5, end: 7 }]
      : viewerRole === "SDR" ? [{ start: 1, end: 5 }, { start: 6, end: 10 }, { start: 11, end: 15 }]
      :                        [{ start: 1, end: 5 }, { start: 6, end: 10 }, { start: 11, end: 15 }];

    // No Detours: complete a window of clips without triggering S&R
    if (!searchRescueTriggered && ordinal > 0) {
      const matchingNd = noDetourWindows.filter(w => w.end === ordinal);
      for (const win of matchingNd) {
        // Get sort_orders for all clips in this window
        const windowSorts = clipSorts.slice(win.start - 1, win.end);
        // Check no S&R in this window
        const SrCheckSchema = z.object({ count: z.coerce.number() });
        const srClips = await ctx.integrations.db.query(
          `SELECT COUNT(*)::int as count
           FROM cliptracker_v2_xp_events xe
           JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
           WHERE xe.viewer_id = $1 AND xe.source_id = 'pass_search_rescue'
           AND c.sort_order = ANY($2::int[])`,
          SrCheckSchema,
          [viewerId, `{${windowSorts.join(",")}}`],
          { label: `No Detours window ${win.start}-${win.end}` }
        );
        // Verify all preceding clips in window are completed (current clip is being completed now)
        const prevSorts = windowSorts.slice(0, -1);
        const CompletedSchema = z.object({ count: z.coerce.number() });
        const completedInWindow = await ctx.integrations.db.query(
          `SELECT COUNT(DISTINCT c.id)::int as count
           FROM cliptracker_v2_xp_events xe
           JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
           WHERE xe.viewer_id = $1 AND xe.source_id = 'watch'
           AND c.sort_order = ANY($2::int[])`,
          CompletedSchema,
          [viewerId, `{${prevSorts.join(",")}}`],
          { label: `No Detours completed check ${win.start}-${win.end}` }
        );
        if (srClips[0]?.count === 0 && completedInWindow[0]?.count === prevSorts.length) {
          // Use anchor clip (first clip in window) for dedup
          const anchorClipId = clipIds[win.start - 1] ?? clipId;
          const ExistingBadgeSchema = z.object({ count: z.coerce.number() });
          const existing = await ctx.integrations.db.query(
            `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
             WHERE viewer_id = $1 AND badge_id = 'no_detours' AND clip_id = $2`,
            ExistingBadgeSchema, [viewerId, anchorClipId], { label: `Check existing no_detours w${win.start}` }
          );
          if (existing[0]?.count === 0) {
            xpEvents.push({ sourceId: "no_detours", eventType: "streak", xp: 10 });
            badgesEarned.push({ badgeId: "no_detours", name: "No Detours", emoji: "🧭", xp: 10, clipIdOverride: anchorClipId });
          }
        }
      }
    }

    // Leave No Trace: 5/5 Trail Markers on every clip in a 3-clip window
    // Windows per role (ordinal positions, 1-based):
    //   AE  ×5: 1-3, 4-6, 7-9, 10-12, 13-15
    //   SDR ×4: 1-3, 4-6, 7-9, 10-12
    //   VP  ×2: 1-3, 4-6
    const lntWindows: Window[] =
      isVP                   ? [{ start: 1, end: 3 }, { start: 4, end: 6 }]
      : viewerRole === "SDR" ? [{ start: 1, end: 3 }, { start: 4, end: 6 }, { start: 7, end: 9 }, { start: 10, end: 12 }]
      :                        [{ start: 1, end: 3 }, { start: 4, end: 6 }, { start: 7, end: 9 }, { start: 10, end: 12 }, { start: 13, end: 15 }];

    if (trailMarkerCorrect === 5 && ordinal > 0) {
      const matchingLnt = lntWindows.filter(w => w.end === ordinal);
      for (const win of matchingLnt) {
        // Get sort_orders for the other clips in this window (not the trigger clip)
        const otherSorts = clipSorts.slice(win.start - 1, win.end - 1);
        // Check the other clips in this window got 5/5
        const PerfectSchema = z.object({ count: z.coerce.number() });
        const perfectInWindow = await ctx.integrations.db.query(
          `SELECT COUNT(DISTINCT xe.clip_id)::int as count
           FROM cliptracker_v2_xp_events xe
           JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
           WHERE xe.viewer_id = $1 AND xe.source_id = 'trail_markers_5'
           AND c.sort_order = ANY($2::int[])`,
          PerfectSchema,
          [viewerId, `{${otherSorts.join(",")}}`],
          { label: `LNT window ${win.start}-${win.end}` }
        );
        if (perfectInWindow[0]?.count === otherSorts.length) {
          // Use anchor clip (first clip in window) for dedup
          const anchorClipId = clipIds[win.start - 1] ?? clipId;
          const ExBadgeSchema = z.object({ count: z.coerce.number() });
          const ex = await ctx.integrations.db.query(
            `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
             WHERE viewer_id = $1 AND badge_id = 'leave_no_trace' AND clip_id = $2`,
            ExBadgeSchema, [viewerId, anchorClipId], { label: `Check existing LNT w${win.start}` }
          );
          if (ex[0]?.count === 0) {
            xpEvents.push({ sourceId: "leave_no_trace", eventType: "streak", xp: 15 });
            badgesEarned.push({ badgeId: "leave_no_trace", name: "Leave No Trace", emoji: "🌱", xp: 15, clipIdOverride: anchorClipId });
          }
        }
      }
    }

    // === MILESTONE BONUSES ===
    // Use ordinal position (1-based, among viewer's video clips) for role-agnostic triggers
    const totalVideoClips = clipSorts.length; // 15 for AE, 12/14 for SDR, 7 for VP

    // First Step: Complete first video clip (ordinal 1)
    if (ordinal === 1) {
      xpEvents.push({ sourceId: "first_step", eventType: "milestone", xp: 5 });
      badgesEarned.push({ badgeId: "first_step", name: "First Step", emoji: "🎬", xp: 5 });
    }

    // Into the Summit Push: Unlock Week 3 for VP (ordinal 4 = after Day 5/CLM) or Week 4 for AE/SDR (sort 100)
    const summitPushTrigger = isVP ? ordinal === 4 : currentSort === 100;
    if (summitPushTrigger) {
      xpEvents.push({ sourceId: "week_4_entry", eventType: "milestone", xp: 10 });
      badgesEarned.push({ badgeId: "week_4_entry", name: "Into the Summit Push", emoji: "🪢", xp: 10 });
    }

    // Ranger's Secret: Complete ALL video clips without ever triggering Weather the Storm
    if (ordinal === totalVideoClips) {
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
