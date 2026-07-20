import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ClipWithProgressSchema = z.object({
  id: z.string(),
  title: z.string(),
  video_url: z.string().nullable(),
  duration_seconds: z.coerce.number().nullable(),
  sort_order: z.coerce.number(),
  week_number: z.coerce.number().nullable(),
  day_label: z.string().nullable(),
  status: z.string(),
  best_score: z.string().nullable(),
  attempts: z.string().nullable(),
  completed: z.coerce.number(),
  xp_earned: z.coerce.number(),
  question_count: z.coerce.number(),
  paused_elapsed_seconds: z.coerce.number().nullable(),
  resource_count: z.coerce.number(),
});

export default api({
  name: "GetClipLibrary",
  description: "Gets all live clips with viewer progress for sequential unlock",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
  }),

  output: z.object({
    clips: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        videoUrl: z.string().nullable(),
        durationSeconds: z.number().nullable(),
        sortOrder: z.number(),
        weekNumber: z.number().nullable(),
        dayLabel: z.string().nullable(),
        bestScore: z.number().nullable(),
        attempts: z.number(),
        completed: z.boolean(),
        unlocked: z.boolean(),
        xpEarned: z.number(),
        questionCount: z.number(),
        pausedElapsedSeconds: z.number().nullable(),
        isTopicDay: z.boolean(),
        resourceCount: z.number(),
        resourcesClicked: z.number(),
      })
    ),
  }),

  async run(ctx, { viewerId }) {
    // Check if viewer is admin
    const AdminCheckSchema = z.object({ is_admin: z.boolean() });
    const adminCheck = await ctx.integrations.db.query(
      "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
      AdminCheckSchema,
      [viewerId],
      { label: "Check if viewer is admin" }
    );
    const isAdmin = adminCheck[0]?.is_admin ?? false;

    const clips = await ctx.integrations.db.query(
      `SELECT 
        c.id, c.title, c.video_url, c.duration_seconds, c.sort_order, c.week_number, c.day_label, c.status,
        (
          SELECT MAX(s.engagement_score)::text 
          FROM cliptracker_v2_sessions s 
          WHERE s.clip_id = c.id AND s.viewer_id = $1 AND s.completed = true
        ) as best_score,
        (
          SELECT COUNT(*)::text 
          FROM cliptracker_v2_sessions s 
          WHERE s.clip_id = c.id AND s.viewer_id = $1
        ) as attempts,
        (
          SELECT COUNT(*)::int 
          FROM cliptracker_v2_sessions s 
          WHERE s.clip_id = c.id AND s.viewer_id = $1 AND s.completed = true
        ) as completed,
        (
          SELECT COALESCE(SUM(xp_amount), 0)::int
          FROM cliptracker_v2_xp_events x
          WHERE x.clip_id = c.id AND x.viewer_id = $1
        ) as xp_earned,
        (
          SELECT COUNT(*)::int
          FROM cliptracker_v2_questions q
          WHERE q.clip_id = c.id AND q.is_recovery = false
        ) as question_count,
        (
          SELECT s.paused_elapsed_seconds
          FROM cliptracker_v2_sessions s
          WHERE s.clip_id = c.id AND s.viewer_id = $1
          LIMIT 1
        ) as paused_elapsed_seconds,
        COALESCE(jsonb_array_length(c.resources), 0)::int as resource_count
      FROM cliptracker_v2_clips c
      WHERE c.status = 'live'
      ORDER BY c.sort_order ASC`,
      ClipWithProgressSchema,
      [viewerId],
      { label: "Get clip library with progress" }
    );

    // Check for unlock overrides
    const OverrideSchema = z.object({ clip_id: z.string() });
    const overrides = await ctx.integrations.db.query(
      "SELECT clip_id FROM cliptracker_v2_unlock_overrides WHERE viewer_id = $1",
      OverrideSchema,
      [viewerId],
      { label: "Check unlock overrides" }
    );
    const overrideSet = new Set(overrides.map((o) => o.clip_id));

    // Get resource click counts for topic days
    const ResourceClickSchema = z.object({ clip_id: z.string(), clicked: z.coerce.number() });
    const resourceClicks = await ctx.integrations.db.query(
      `SELECT clip_id, COUNT(*)::int as clicked FROM cliptracker_v2_resource_clicks WHERE viewer_id = $1 GROUP BY clip_id`,
      ResourceClickSchema,
      [viewerId],
      { label: "Get resource click counts" }
    );
    const clickCountMap = new Map(resourceClicks.map(r => [r.clip_id, r.clicked]));

    // Check which topic days have been completed via XP (swiss_army_knife event)
    const TopicCompleteSchema = z.object({ clip_id: z.string() });
    const topicCompleted = await ctx.integrations.db.query(
      "SELECT clip_id FROM cliptracker_v2_xp_events WHERE viewer_id = $1 AND event_type = 'swiss_army_knife'",
      TopicCompleteSchema,
      [viewerId],
      { label: "Check topic day completions" }
    );
    const topicCompletedSet = new Set(topicCompleted.map(t => t.clip_id));

    // Pre-compute completion status for each clip so the unlock check
    // for clip N+1 uses the correct "isCompleted" (topic days use
    // swiss_army_knife XP, not raw session count).
    const completionStatus = clips.map((clip) => {
      const isTopicDay = clip.video_url === null && clip.duration_seconds === null;
      return isTopicDay ? topicCompletedSet.has(clip.id) : clip.completed > 0;
    });

    const result = clips.map((clip, index) => {
      const bestScore = clip.best_score ? parseFloat(clip.best_score) : null;
      const isTopicDay = clip.video_url === null && clip.duration_seconds === null;
      const resourceCount = clip.resource_count;
      const isCompleted = completionStatus[index];
      // Unlock rules (in priority order):
      // 1. Admins → all unlocked
      // 2. First clip → always unlocked
      // 3. Unlock override exists → unlocked (set by CompleteClipPath via first_pass / S&R / WtS)
      // 4. Previous clip completed → unlocked
      // No other path should unlock a clip.
      let isLocked = true;
      if (isAdmin) {
        isLocked = false;
      } else if (index === 0) {
        isLocked = false;
      } else if (overrideSet.has(clip.id)) {
        isLocked = false;
      } else {
        isLocked = !completionStatus[index - 1];
      }

      return {
        id: clip.id,
        title: clip.title,
        videoUrl: clip.video_url,
        durationSeconds: clip.duration_seconds,
        sortOrder: clip.sort_order,
        weekNumber: clip.week_number,
        dayLabel: clip.day_label,
        bestScore: bestScore,
        attempts: clip.attempts ? parseInt(clip.attempts) : 0,
        completed: isCompleted,
        unlocked: !isLocked,
        xpEarned: clip.xp_earned,
        questionCount: clip.question_count,
        pausedElapsedSeconds: clip.paused_elapsed_seconds ?? 0,
        isTopicDay,
        resourceCount,
        resourcesClicked: clickCountMap.get(clip.id) ?? 0,
      };
    });

    return { clips: result };
  },
});
