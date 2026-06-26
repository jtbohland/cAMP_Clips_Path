import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const PODCAST_MEDIA_IDS = ["d4ykhvht66", "wtmth6596f", "pe2bvt2sdq", "c9lxd0wsbg"];

export default api({
  name: "AwardPodcastXp",
  description: "Awards 50 XP + Cast badge when all 4 podcasts completed",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    awarded: z.boolean(),
    alreadyEarned: z.boolean(),
  }),

  async run(ctx, { viewerId }) {
    // Check if viewer is admin — admins don't earn XP
    const AdminCheckSchema = z.object({ is_admin: z.boolean() });
    const adminCheck = await ctx.integrations.db.query(
      "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
      AdminCheckSchema,
      [viewerId],
      { label: "Check if viewer is admin" }
    );
    if (adminCheck[0]?.is_admin) {
      return { awarded: false, alreadyEarned: false };
    }

    // Check if badge already awarded
    const ExistingSchema = z.object({ count: z.coerce.number() });
    const existing = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
       WHERE viewer_id = $1 AND badge_id = 'podcast_cast'`,
      ExistingSchema,
      [viewerId],
      { label: "Check existing podcast badge" }
    );
    if (existing[0]?.count > 0) {
      return { awarded: false, alreadyEarned: true };
    }

    // Verify all 4 podcasts are completed
    const CompletedSchema = z.object({ count: z.coerce.number() });
    const completed = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int as count FROM cliptracker_v2_podcast_progress
       WHERE viewer_id = $1 AND completed = true AND media_id = ANY($2::text[])`,
      CompletedSchema,
      [viewerId, PODCAST_MEDIA_IDS],
      { label: "Count completed podcasts" }
    );
    if (completed[0]?.count < 4) {
      return { awarded: false, alreadyEarned: false };
    }

    // Award 50 XP (milestone type)
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
       VALUES ($1, NULL, 'milestone', 'podcast_cast', 50)
       ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
      [viewerId],
      { label: "Award podcast XP" }
    );

    // Award badge (clip_id is NULL for non-clip badges)
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
       VALUES ($1, 'podcast_cast', NULL)
       ON CONFLICT DO NOTHING`,
      [viewerId],
      { label: "Award podcast badge" }
    );

    return { awarded: true, alreadyEarned: false };
  },
});
