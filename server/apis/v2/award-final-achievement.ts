import { api, z, postgres } from "@superblocksteam/sdk-api";
import {
  getClipsExpectedByWeekday,
  getEffectiveClipTotal,
  getTotalWeekdays,
  isSDR,
  isVelocityPromo,
  WEEK1_TOTAL_ITEMS_VP,
  WEEK1_WEEKDAYS_VP,
} from "./pacing-helpers.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * AwardFinalAchievement — called once at summit, BEFORE Grand Finale.
 * Awards:
 *   1. Summit Reward (one of 4 tiers)
 *   2. Pacing Streak Bonuses (new learners only)
 *   3. Grip Strength (avg engagement ≥85%)
 *
 * Pacing streak detection: Since daily pacing tiers are NOT stored,
 * we reconstruct them from clip completion timestamps by checking
 * whether the learner was "summit_bound" (daysBehind = 0) at the end
 * of each Ascent weekday.
 */

const WEEK1_EXPECTED_BY_DAY = [0, 2, 4, 5, 6, 7];
const WEEK1_TOTAL = 7;

// Map each sort_order → which Ascent day (1-N) it belongs to.
// Multi-clip days share the same Ascent day number.
// AE/SDR/PSM/Renewals use the AE map (15 Ascent days).
const SORT_TO_ASCENT_DAY_AE: Record<number, number> = {
  1: 1, 2: 1,   // Day 1: 2 clips (Industries + Personas)
  3: 2, 4: 3, 5: 4,
  6: 5,  // resource day
  7: 6,
  8: 7, 9: 7,   // Day 7: 2 clips
  10: 8, 11: 8,  // Day 8: 2 clips
  12: 9,        // resource day
  13: 10,
  14: 11, 15: 11, // Day 11: 2 clips
  16: 12,
  17: 13,
  18: 14,
  19: 15, 20: 15, // Day 15: 2 clips
};

// VP uses a curated clip set with 7 Ascent days.
const SORT_TO_ASCENT_DAY_VP: Record<number, number> = {
  60: 1,    // Day 1: Renewal Ops (resource day)
  120: 2,   // Day 2: P&P 101 (resource day)
  130: 3,   // Day 3: Partners
  140: 4, 150: 4,   // Day 4: Forecasting ×2
  170: 5,   // Day 5: CLM
  180: 6,   // Day 6: Deal Desk
  190: 7, 200: 7,   // Day 7: SE + PS ×2
};

// VP resource day labels map to VP Ascent days (not the AE day labels)
const VP_RESOURCE_DAY_MAP: Record<string, number> = {
  day5: 1,  // sort 60 → VP Ascent Day 1 (original "Day 5" label)
  day9: 2,  // sort 120 → VP Ascent Day 2 (original "Day 9" label)
};

const TOTAL_ASCENT_DAYS_AE = 15;
const TOTAL_ASCENT_DAYS_VP = 7;

// ── Pacing streak badge definitions (role-aware thresholds) ──
const AE_PACING_STREAKS = [
  { days: 5,  badgeId: "ridge_runner",      name: "Ridge Runner",      emoji: "🥾",  xp: 10 },
  { days: 10, badgeId: "alpine_endurance",  name: "Alpine Endurance",  emoji: "🏔️", xp: 15 },
  { days: 15, badgeId: "iron_legs",         name: "Iron Legs",         emoji: "🦿",  xp: 20 },
  { days: 20, badgeId: "mountain_goat",     name: "Mountain Goat",     emoji: "🐐",  xp: 30 },
];
const SDR_PACING_STREAKS = [
  { days: 3,  badgeId: "ridge_runner",      name: "Ridge Runner",      emoji: "🥾",  xp: 10 },
  { days: 6,  badgeId: "alpine_endurance",  name: "Alpine Endurance",  emoji: "🏔️", xp: 15 },
  { days: 9,  badgeId: "iron_legs",         name: "Iron Legs",         emoji: "🦿",  xp: 20 },
  { days: 12, badgeId: "mountain_goat",     name: "Mountain Goat",     emoji: "🐐",  xp: 30 },
];
const VP_PACING_STREAKS = [
  { days: 2,  badgeId: "ridge_runner",      name: "Ridge Runner",      emoji: "🥾",  xp: 10 },
  { days: 4,  badgeId: "alpine_endurance",  name: "Alpine Endurance",  emoji: "🏔️", xp: 15 },
  { days: 6,  badgeId: "iron_legs",         name: "Iron Legs",         emoji: "🦿",  xp: 20 },
  { days: 7,  badgeId: "mountain_goat",     name: "Mountain Goat",     emoji: "🐐",  xp: 30 },
];

const BadgeEarnedSchema = z.object({
  badgeId: z.string(),
  name: z.string(),
  emoji: z.string(),
  xp: z.number(),
});

type BadgeEarned = z.infer<typeof BadgeEarnedSchema>;

export default api({
  name: "AwardFinalAchievement",
  description: "Awards summit rewards, pacing streaks, and grip strength at program completion",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    summitReward: BadgeEarnedSchema.nullable(),
    pacingStreaks: z.array(BadgeEarnedSchema),
    gripStrength: BadgeEarnedSchema.nullable(),
    totalXpAwarded: z.number(),
    alreadyAwarded: z.boolean(),
  }),

  async run(ctx, { viewerId }) {
    // ── Guard: skip admins ──
    const AdminSchema = z.object({ is_admin: z.boolean() });
    const adminCheck = await ctx.integrations.db.query(
      "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
      AdminSchema, [viewerId], { label: "Admin check" }
    );
    if (adminCheck[0]?.is_admin) {
      return { summitReward: null, pacingStreaks: [], gripStrength: null, totalXpAwarded: 0, alreadyAwarded: false };
    }

    // ── Guard: idempotency — check if summit reward already awarded ──
    const ExistingSchema = z.object({ count: z.coerce.number() });
    const existing = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
       WHERE viewer_id = $1 AND source_id IN ('golden_summit', 'speed_ascent', 'second_wind', 'every_step_counts')`,
      ExistingSchema, [viewerId], { label: "Check existing summit reward" }
    );
    if (existing[0].count > 0) {
      return { summitReward: null, pacingStreaks: [], gripStrength: null, totalXpAwarded: 0, alreadyAwarded: true };
    }

    // ── Fetch viewer data ──
    const ViewerSchema = z.object({
      ascent_day_1: z.string().nullable(),
      week1_unlock_type: z.string().nullable(),
      role: z.string(),
      clips_completed: z.coerce.number(),
      extension_days: z.coerce.number(),
      max_sort_done: z.coerce.number(),
    });
    const viewers = await ctx.integrations.db.query(
      `SELECT v.ascent_day_1::text,
              v.week1_unlock_type,
              v.role,
              COALESCE((SELECT COUNT(DISTINCT s.clip_id)::int FROM cliptracker_v2_sessions s WHERE s.viewer_id = v.id AND s.completed = true), 0) as clips_completed,
              COALESCE(v.extension_days, 0)::int as extension_days,
              COALESCE((SELECT MAX(c2.sort_order)::int FROM cliptracker_v2_sessions s2 JOIN cliptracker_v2_clips c2 ON c2.id = s2.clip_id WHERE s2.viewer_id = v.id AND s2.completed = true AND c2.status = 'live'), 0) as max_sort_done
       FROM cliptracker_v2_viewers v WHERE v.id = $1`,
      ViewerSchema, [viewerId], { label: "Fetch viewer data" }
    );
    if (viewers.length === 0) throw new Error("Viewer not found");
    const viewer = viewers[0];

    const isLegacy = viewer.clips_completed > 0 && viewer.week1_unlock_type === null;
    const ascentDay1 = viewer.ascent_day_1 ? new Date(viewer.ascent_day_1) : null;
    const extensionDays = viewer.extension_days;
    const learnerRole = viewer.role;
    const vpPath = isVelocityPromo(learnerRole);
    const effectiveTotal = getEffectiveClipTotal(learnerRole, viewer.max_sort_done);
    const schedule = getClipsExpectedByWeekday(learnerRole);
    const SORT_TO_ASCENT_DAY = vpPath ? SORT_TO_ASCENT_DAY_VP : SORT_TO_ASCENT_DAY_AE;
    const TOTAL_ASCENT_DAYS = vpPath ? TOTAL_ASCENT_DAYS_VP : TOTAL_ASCENT_DAYS_AE;
    const approachTotal = vpPath ? WEEK1_TOTAL_ITEMS_VP : WEEK1_TOTAL;
    const approachWeekdays = vpPath ? WEEK1_WEEKDAYS_VP : 5;

    const xpEvents: Array<{ sourceId: string; eventType: string; xp: number }> = [];
    const badgesAwarded: BadgeEarned[] = [];
    let summitReward: BadgeEarned | null = null;
    const pacingStreaks: BadgeEarned[] = [];
    let gripStrength: BadgeEarned | null = null;

    // ── 1. SUMMIT REWARD ──
    // Determine approach completion
    // Legacy learners auto-complete approach (they skipped Week 1)
    let approachComplete = isLegacy;

    if (!isLegacy) {
      // Check approach progress tables. VP only requires camp101 (no MEDDPICC/Challenger).
      const SignoffSchema = z.object({ module_key: z.string() });
      const signoffs = await ctx.integrations.db.query(
        `SELECT module_key FROM cliptracker_v2_module_signoffs WHERE viewer_id = $1`,
        SignoffSchema, [viewerId], { label: "Fetch approach signoffs" }
      );
      const signoffKeys = new Set(signoffs.map(s => s.module_key));

      const ScreenshotSchema = z.object({ course_key: z.string() });
      const screenshots = await ctx.integrations.db.query(
        `SELECT course_key FROM cliptracker_v2_academy_screenshots WHERE viewer_id = $1 AND course_key IN ('analytics', 'experiment', 'session_replay', 'guides_surveys')`,
        ScreenshotSchema, [viewerId], { label: "Fetch academy screenshots" }
      );
      const screenshotKeys = new Set(screenshots.map(s => s.course_key));

      const WdSchema = z.object({ count: z.coerce.number() });
      const wdCheck = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_wd_verifications WHERE viewer_id = $1`,
        WdSchema, [viewerId], { label: "Check Wheel & Deal completion" }
      );
      const wdDone = wdCheck[0].count > 0;

      const allAcademies = screenshotKeys.has("analytics") && screenshotKeys.has("experiment")
        && screenshotKeys.has("session_replay") && screenshotKeys.has("guides_surveys");

      if (vpPath) {
        // VP: camp101 + 4 academies + W&D
        approachComplete = signoffKeys.has("camp101") && allAcademies && wdDone;
      } else {
        // AE/SDR: meddpicc + camp101 + challenger + 4 academies + W&D
        approachComplete = signoffKeys.has("meddpicc") && signoffKeys.has("camp101") && signoffKeys.has("challenger")
          && allAcademies && wdDone;
      }
    }

    // Determine timing: summit day vs adjustment day
    const now = new Date();
    const nowNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let summitDay: Date | null = null;
    let adjustmentDay: Date | null = null;

    if (ascentDay1) {
      // Summit Day = ascentDay1 + (15 + extensionDays) weekdays
      summitDay = addWeekdays(ascentDay1, TOTAL_ASCENT_DAYS + extensionDays);

      // Adjustment Day needs completion timestamps, which we fetch now
      // (also used by pacing streaks below).
    }

    // ── Fetch completion timestamps (used by summit reward timing + pacing streaks) ──
    const CompletionSchema = z.object({
      sort_order: z.coerce.number(),
      completed_at: z.string(),
    });
    const completions = ascentDay1 ? await ctx.integrations.db.query(
      `SELECT c.sort_order, MIN(s.ended_at)::text as completed_at
       FROM cliptracker_v2_sessions s
       JOIN cliptracker_v2_clips c ON c.id = s.clip_id
       WHERE s.viewer_id = $1 AND s.completed = true AND s.ended_at IS NOT NULL
       GROUP BY c.sort_order
       ORDER BY c.sort_order`,
      CompletionSchema, [viewerId], { label: "Get clip completion timestamps" }
    ) : [];

    const ReflectionSchema = z.object({
      topic_day: z.string(),
      submitted_at: z.string(),
    });
    const reflections = ascentDay1 ? await ctx.integrations.db.query(
      `SELECT topic_day, submitted_at::text as submitted_at
       FROM cliptracker_v2_topic_reflections
       WHERE viewer_id = $1`,
      ReflectionSchema, [viewerId], { label: "Get resource day reflections" }
    ) : [];

    // Build a map: ascentDay → date when that topic was completed
    const topicCompletedDate = new Map<number, Date>();

    // For clip-based topics: a topic is complete when ALL clips in that day are done
    const clipsByDay = new Map<number, Date[]>();
    for (const c of completions) {
      const ascentDay = SORT_TO_ASCENT_DAY[c.sort_order];
      if (ascentDay === undefined) continue;
      if (!clipsByDay.has(ascentDay)) clipsByDay.set(ascentDay, []);
      clipsByDay.get(ascentDay)!.push(new Date(c.completed_at));
    }

    // For multi-clip days, the topic is complete when the LAST clip is finished
    const resourceDays = vpPath ? new Set([1, 2]) : new Set([5, 9]);
    for (const [day, dates] of clipsByDay) {
      if (resourceDays.has(day)) continue; // resource days handled separately via reflections
      const expectedClips = Object.values(SORT_TO_ASCENT_DAY).filter(d => d === day).length;
      if (dates.length >= expectedClips) {
        topicCompletedDate.set(day, new Date(Math.max(...dates.map(d => d.getTime()))));
      }
    }

    // For resource days: topic complete when reflection is submitted
    for (const r of reflections) {
      let ascentDay: number | null;
      if (vpPath) {
        ascentDay = VP_RESOURCE_DAY_MAP[r.topic_day] ?? null;
      } else {
        ascentDay = r.topic_day === "day5" ? 5 : r.topic_day === "day9" ? 9 : null;
      }
      if (ascentDay !== null) {
        topicCompletedDate.set(ascentDay, new Date(r.submitted_at));
      }
    }

    // ── Compute Adjustment Day ──
    // Adjustment Day = Summit Day + N weekdays, where N = topics incomplete on summit day
    if (summitDay && ascentDay1) {
      const summitDayNormCalc = new Date(summitDay.getFullYear(), summitDay.getMonth(), summitDay.getDate());
      let topicsDoneBySummit = 0;
      for (const [, completedDate] of topicCompletedDate) {
        const compNorm = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
        if (compNorm <= summitDayNormCalc) topicsDoneBySummit++;
      }
      const incompleteAtSummit = TOTAL_ASCENT_DAYS - topicsDoneBySummit;
      if (incompleteAtSummit > 0) {
        adjustmentDay = addWeekdays(summitDay, incompleteAtSummit);
      } else {
        // If all topics were done by summit day, adjustment day = summit day
        adjustmentDay = new Date(summitDay);
      }
    }

    // Determine which summit reward tier
    const summitDayNorm = summitDay ? new Date(summitDay.getFullYear(), summitDay.getMonth(), summitDay.getDate()) : null;
    const adjDayNorm = adjustmentDay ? new Date(adjustmentDay.getFullYear(), adjustmentDay.getMonth(), adjustmentDay.getDate()) : null;
    const finishedBySummit = summitDayNorm ? nowNorm <= summitDayNorm : false;
    const finishedByAdj = adjDayNorm ? nowNorm <= adjDayNorm : false;

    if (approachComplete && finishedBySummit) {
      // Golden Summit: Approach ✅ + Ascent ✅ by Summit Day
      summitReward = { badgeId: "golden_summit", name: "Golden Summit", emoji: "🌄", xp: 40 };
    } else if (!approachComplete && finishedBySummit) {
      // Speed Ascent: Ascent ✅ by Summit Day, Approach ❌
      summitReward = { badgeId: "speed_ascent", name: "Speed Ascent", emoji: "⛷️", xp: 30 };
    } else if (finishedByAdj) {
      // Second Wind: Both ✅ by Adjustment Day (approach doesn't matter here)
      summitReward = { badgeId: "second_wind", name: "Second Wind", emoji: "💨", xp: 20 };
    } else {
      // Every Step Counts: Finished after Adjustment
      summitReward = { badgeId: "every_step_counts", name: "Every Step Counts", emoji: "👣", xp: 10 };
    }

    xpEvents.push({ sourceId: summitReward.badgeId, eventType: "summit_reward", xp: summitReward.xp });
    badgesAwarded.push(summitReward);

    // ── 2. PACING STREAKS (new learners only) ──
    if (!isLegacy && ascentDay1) {
      // Reconstruct daily pacing tiers from completion timestamps.
      // For each Ascent day (1-15), check if learner was summit_bound.

      // Now walk each Ascent weekday and check clip-level pacing %.
      // Extension days come at the START — during those days, expected = 0 (summit_bound by default).
      // After extension days, normal Ascent schedule resumes.
      // We use individual clip completion timestamps (not topic-level).
      const ascentStart = new Date(ascentDay1.getFullYear(), ascentDay1.getMonth(), ascentDay1.getDate());
      const totalAscentWithExtension = TOTAL_ASCENT_DAYS + extensionDays;

      // Build per-clip completion date list for clip-level counting
      const clipCompletionDates: Date[] = [];
      for (const c of completions) {
        clipCompletionDates.push(new Date(c.completed_at));
      }
      // Add resource day completions (tracked via reflections)
      for (const r of reflections) {
        clipCompletionDates.push(new Date(r.submitted_at));
      }

      // Approach count (static — either done or not by the time we award)
      const approachDone = approachComplete ? approachTotal : 0;

      let consecutiveSummitBound = 0;
      let maxConsecutive = 0;

      for (let ascentDayNum = 1; ascentDayNum <= totalAscentWithExtension; ascentDayNum++) {
        const dayDate = addWeekdays(ascentStart, ascentDayNum - 1);

        let clipsExpected: number;
        let approachExpected: number;
        if (ascentDayNum <= extensionDays) {
          clipsExpected = 0;
          approachExpected = approachTotal; // Approach should be done by Ascent start
        } else {
          const effectiveAscentDay = ascentDayNum - extensionDays;
          const weekday = effectiveAscentDay + approachWeekdays;
          clipsExpected = schedule[weekday] ?? effectiveTotal;
          approachExpected = approachTotal;
        }

        // Count clips done by this day
        let clipsDoneByDay = 0;
        for (const compDate of clipCompletionDates) {
          const compNorm = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate());
          const dayNorm = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          if (compNorm <= dayNorm) clipsDoneByDay++;
        }

        const totalExpected = approachExpected + clipsExpected;
        const totalDone = Math.min(approachDone, approachTotal) + Math.min(clipsDoneByDay, effectiveTotal);
        const percent = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 100;
        const isSummitBound = percent >= 90;

        if (isSummitBound) {
          consecutiveSummitBound++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveSummitBound);
        } else {
          consecutiveSummitBound = 0;
        }
      }

      // Award pacing streak badges based on max consecutive summit_bound days
      // These are cumulative — if you hit 10, you also earned 5
      // SDRs use scaled thresholds (3/6/9/12) vs AEs (5/10/15/20)
      const pacingStreakDefs = isVelocityPromo(learnerRole) ? VP_PACING_STREAKS : isSDR(learnerRole) ? SDR_PACING_STREAKS : AE_PACING_STREAKS;
      for (const streak of pacingStreakDefs) {
        if (maxConsecutive >= streak.days) {
          xpEvents.push({ sourceId: streak.badgeId, eventType: "pacing_streak", xp: streak.xp });
          const badge: BadgeEarned = { badgeId: streak.badgeId, name: streak.name, emoji: streak.emoji, xp: streak.xp };
          badgesAwarded.push(badge);
          pacingStreaks.push(badge);
        }
      }

      // (Free Solo check uses clip-level pacing % computed above)

      // Free Solo: never hit rockslide (< 60%) or worse at ANY point during Ascent.
      // Uses clip-level pacing %. Rockslide = 60-69%, so Free Solo = never below 70%.
      let minPercent = 100;
      for (let ascentDayNum = 1; ascentDayNum <= totalAscentWithExtension; ascentDayNum++) {
        const dayDate = addWeekdays(ascentStart, ascentDayNum - 1);
        let clipsExpected: number;
        if (ascentDayNum <= extensionDays) {
          clipsExpected = 0;
        } else {
          const effectiveAscentDay = ascentDayNum - extensionDays;
          const weekday = effectiveAscentDay + approachWeekdays;
          clipsExpected = schedule[weekday] ?? effectiveTotal;
        }
        let clipsDoneByDay = 0;
        for (const compDate of clipCompletionDates) {
          const compNorm = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate());
          const dayNorm = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          if (compNorm <= dayNorm) clipsDoneByDay++;
        }
        const totalExpected = approachTotal + clipsExpected;
        const totalDone = Math.min(approachDone, approachTotal) + Math.min(clipsDoneByDay, effectiveTotal);
        const pct = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 100;
        minPercent = Math.min(minPercent, pct);
      }

      // Free Solo: never dropped below 70% (never hit rockslide/avalanche/anchor)
      // VP path doesn't include Free Solo — Mountain Goat (7/7 days) already covers it
      if (!vpPath && minPercent >= 70) {
        const freeSoloBadge: BadgeEarned = { badgeId: "free_solo", name: "Free Solo", emoji: "🧗", xp: 40 };
        xpEvents.push({ sourceId: "free_solo", eventType: "pacing_streak", xp: 40 });
        badgesAwarded.push(freeSoloBadge);
        pacingStreaks.push(freeSoloBadge);
      }
    }

    // ── 3. GRIP STRENGTH ──
    // Average engagement score ≥85% across all video clips (role-aware count)
    const requiredClips = vpPath ? 7 : isSDR(learnerRole) ? 14 : 19;
    const EngagementSchema = z.object({
      avg_engagement: z.coerce.number(),
      session_count: z.coerce.number(),
    });
    const engData = await ctx.integrations.db.query(
      `SELECT
         AVG(engagement_score)::numeric(5,2) as avg_engagement,
         COUNT(DISTINCT clip_id)::int as session_count
       FROM cliptracker_v2_sessions
       WHERE viewer_id = $1 AND completed = true AND engagement_score IS NOT NULL`,
      EngagementSchema, [viewerId], { label: "Calculate average engagement" }
    );
    if (engData[0] && engData[0].session_count >= requiredClips && engData[0].avg_engagement >= 85) {
      gripStrength = { badgeId: "grip_strength", name: "Grip Strength", emoji: "💪", xp: 35 };
      xpEvents.push({ sourceId: "grip_strength", eventType: "performance", xp: 35 });
      badgesAwarded.push(gripStrength);
    }

    // ── INSERT XP EVENTS & BADGES ──
    // Use last clip in the viewer's path as the clip reference for these awards
    const lastSortOrder = vpPath ? 200 : 20;
    const LastClipSchema = z.object({ id: z.string() });
    const lastClip = await ctx.integrations.db.query(
      "SELECT id FROM cliptracker_v2_clips WHERE sort_order = $1 LIMIT 1",
      LastClipSchema, [lastSortOrder], { label: "Get last clip ID" }
    );
    const lastClipId = lastClip[0]?.id;
    if (!lastClipId) throw new Error(`Clip sort_order ${lastSortOrder} not found`);

    let totalXpAwarded = 0;
    for (const event of xpEvents) {
      try {
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, xp_amount, source_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
          [viewerId, lastClipId, event.eventType, event.xp, event.sourceId],
          { label: `Award XP: ${event.sourceId}` }
        );
        totalXpAwarded += event.xp;
      } catch (e) {
        ctx.log.info(`XP event already exists: ${event.sourceId}`);
      }
    }

    for (const badge of badgesAwarded) {
      try {
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
          [viewerId, badge.badgeId, lastClipId],
          { label: `Award badge: ${badge.badgeId}` }
        );
      } catch (e) {
        ctx.log.info(`Badge already exists: ${badge.badgeId}`);
      }
    }

    ctx.log.info("Final achievement awarded", {
      viewerId,
      summitReward: summitReward?.badgeId,
      pacingStreaks: pacingStreaks.map(p => p.badgeId),
      gripStrength: !!gripStrength,
      totalXpAwarded,
    });

    return {
      summitReward,
      pacingStreaks,
      gripStrength,
      totalXpAwarded,
      alreadyAwarded: false,
    };
  },
});

/**
 * Add N weekdays to a date (0-indexed: addWeekdays(date, 0) = date itself if weekday).
 * Skips weekends.
 */
function addWeekdays(start: Date, count: number): Date {
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  // If start is a weekend, advance to Monday first
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() + 1);
  }
  let added = 0;
  while (added < count) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return cursor;
}
