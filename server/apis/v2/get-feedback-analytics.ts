import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ReactionRow = z.object({
  lesson_key: z.string(),
  emoji: z.string(),
  count: z.coerce.number(),
});

const FeedbackRow = z.object({
  day_key: z.string(),
  rating: z.string().nullable(),
  usefulness: z.string().nullable(),
  count: z.coerce.number(),
});

const ClipPathRow = z.object({
  id: z.string(),
  title: z.string(),
  sort_order: z.coerce.number(),
  roles: z.array(z.string()).nullable(),
  week_number: z.coerce.number().nullable(),
});

const PathStatRow = z.object({
  clip_id: z.string(),
  path_group: z.string(),
  completed_count: z.coerce.number(),
  avg_engagement: z.coerce.number().nullable(),
  avg_focus: z.coerce.number().nullable(),
  avg_recovery: z.coerce.number().nullable(),
  sr_triggered: z.coerce.number(),
  wts_count: z.coerce.number(),
});

const GameStatRow = z.object({
  game_type: z.string(),
  total_sessions: z.coerce.number(),
  completed_sessions: z.coerce.number(),
  avg_net_xp: z.coerce.number().nullable(),
  replay_count: z.coerce.number(),
});

export default api({
  name: "GetFeedbackAnalytics",
  description: "Aggregated reactions, feedback, path stats, and game metrics for admin analytics",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),
  output: z.object({
    reactions: z.array(ReactionRow),
    ratings: z.array(FeedbackRow),
    clipPaths: z.array(ClipPathRow),
    pathStats: z.array(PathStatRow),
    gameStats: z.array(GameStatRow),
  }),

  async run(ctx) {
    const [reactions, ratings, clipPaths, pathStats, gameStats] = await Promise.all([
      // Reactions
      ctx.integrations.apps_db.query(
        `SELECT lesson_key, emoji, COUNT(*)::int AS count
         FROM cliptracker_v2_reactions
         GROUP BY lesson_key, emoji
         ORDER BY count DESC
         LIMIT 200`,
        ReactionRow,
        undefined,
        { label: "Aggregated reactions" }
      ),
      // Feedback
      ctx.integrations.apps_db.query(
        `SELECT day_key, rating, usefulness, COUNT(*)::int AS count
         FROM cliptracker_v2_daily_feedback
         GROUP BY day_key, rating, usefulness
         ORDER BY day_key, count DESC
         LIMIT 200`,
        FeedbackRow,
        undefined,
        { label: "Aggregated feedback" }
      ),
      // Clip paths
      ctx.integrations.apps_db.query(
        `SELECT id, title, sort_order, roles, week_number
         FROM cliptracker_v2_clips
         ORDER BY sort_order
         LIMIT 50`,
        ClipPathRow,
        undefined,
        { label: "Clip path assignments" }
      ),
      // Per-clip per-path-group stats (first completions only, no re-watches)
      ctx.integrations.apps_db.query(
        `WITH first_completions AS (
           SELECT s.clip_id, s.viewer_id,
                  MIN(s.ended_at) AS first_ended,
                  (array_agg(s.engagement_score ORDER BY s.ended_at))[1] AS engagement,
                  (array_agg(s.focus_score ORDER BY s.ended_at))[1] AS focus_score,
                  (array_agg(s.question_score ORDER BY s.ended_at))[1] AS question_score
           FROM cliptracker_v2_sessions s
           WHERE s.completed = true
           GROUP BY s.clip_id, s.viewer_id
         ),
         with_role AS (
           SELECT fc.clip_id, fc.viewer_id, fc.engagement, fc.focus_score, fc.question_score,
                  CASE
                    WHEN v.role = 'SDR>Velocity Promo' THEN 'promo'
                    WHEN v.role = 'SDR' THEN 'sdr'
                    ELSE 'ae'
                  END AS path_group
           FROM first_completions fc
           JOIN cliptracker_v2_viewers v ON v.id = fc.viewer_id
         ),
         sr_counts AS (
           SELECT s.clip_id,
                  CASE
                    WHEN v.role = 'SDR>Velocity Promo' THEN 'promo'
                    WHEN v.role = 'SDR' THEN 'sdr'
                    ELSE 'ae'
                  END AS path_group,
                  COUNT(*)::int AS sr_triggered
           FROM cliptracker_v2_sessions s
           JOIN cliptracker_v2_viewers v ON v.id = s.viewer_id
           WHERE s.completed = true AND s.is_recovery_attempt = true
           GROUP BY s.clip_id, path_group
         ),
         wts_counts AS (
           SELECT s.clip_id,
                  CASE
                    WHEN v.role = 'SDR>Velocity Promo' THEN 'promo'
                    WHEN v.role = 'SDR' THEN 'sdr'
                    ELSE 'ae'
                  END AS path_group,
                  COUNT(*)::int AS wts_count
           FROM cliptracker_v2_sessions s
           JOIN cliptracker_v2_viewers v ON v.id = s.viewer_id
           WHERE s.completed = true AND s.attempt_number >= 3
           GROUP BY s.clip_id, path_group
         )
         SELECT
           wr.clip_id,
           wr.path_group,
           COUNT(*)::int AS completed_count,
           ROUND(AVG(wr.engagement))::int AS avg_engagement,
           ROUND(AVG(wr.focus_score))::int AS avg_focus,
           ROUND(AVG(
             CASE WHEN wr.question_score IS NOT NULL AND wr.question_score > 0
                  THEN wr.question_score END
           ))::int AS avg_recovery,
           COALESCE(MAX(sc.sr_triggered), 0)::int AS sr_triggered,
           COALESCE(MAX(wc.wts_count), 0)::int AS wts_count
         FROM with_role wr
         LEFT JOIN sr_counts sc ON sc.clip_id = wr.clip_id AND sc.path_group = wr.path_group
         LEFT JOIN wts_counts wc ON wc.clip_id = wr.clip_id AND wc.path_group = wr.path_group
         GROUP BY wr.clip_id, wr.path_group
         ORDER BY wr.clip_id
         LIMIT 200`,
        PathStatRow,
        undefined,
        { label: "Per-clip per-path completion stats" }
      ),
      // Game stats (Ridge, Price, DEARR)
      ctx.integrations.apps_db.query(
        `SELECT 'ridge' AS game_type,
                COUNT(*)::int AS total_sessions,
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed_sessions,
                ROUND(AVG(net_xp) FILTER (WHERE completed_at IS NOT NULL))::int AS avg_net_xp,
                COUNT(*) FILTER (WHERE is_replay = true)::int AS replay_count
         FROM cliptracker_v2_ridge_sessions
         UNION ALL
         SELECT 'price' AS game_type,
                COUNT(*)::int,
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int,
                ROUND(AVG(net_xp) FILTER (WHERE completed_at IS NOT NULL))::int,
                COUNT(*) FILTER (WHERE is_replay = true)::int
         FROM cliptracker_v2_price_sessions
         UNION ALL
         SELECT 'dearr' AS game_type,
                COUNT(*)::int,
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int,
                ROUND(AVG(net_xp) FILTER (WHERE completed_at IS NOT NULL))::int,
                COUNT(*) FILTER (WHERE is_replay = true)::int
         FROM cliptracker_v2_dearr_sessions
         LIMIT 10`,
        GameStatRow,
        undefined,
        { label: "Game performance stats" }
      ),
    ]);

    return { reactions, ratings, clipPaths, pathStats, gameStats };
  },
});
