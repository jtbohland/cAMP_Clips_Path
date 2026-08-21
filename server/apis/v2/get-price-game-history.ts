import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const SessionSchema = z.object({
  session_id: z.string(),
  is_replay: z.boolean(),
  net_xp: z.number().nullable(),
  badge_key: z.string().nullable(),
  badge_label: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});

export default api({
  name: "GetPriceGameHistory",
  description: "Fetches a learner's Price is Right game sessions for analytics",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
  }),

  output: z.object({
    sessions: z.array(SessionSchema),
    bestNetXp: z.number().nullable(),
    totalGamesPlayed: z.number(),
    bestBadge: z.string().nullable(),
  }),

  async run(ctx, { viewerId }) {
    const sessions = await ctx.integrations.apps_db.query(
      `SELECT id AS session_id, is_replay, net_xp, badge_key, badge_label,
              completed_at::text, created_at::text
       FROM cliptracker_v2_price_sessions
       WHERE viewer_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      SessionSchema,
      [viewerId],
      { label: "Fetch price game history" }
    );

    const realGames = sessions.filter(s => !s.is_replay && s.completed_at);
    const bestNetXp = realGames.length > 0
      ? Math.max(...realGames.map(s => s.net_xp ?? 0))
      : null;

    // Badge tier order for "best badge"
    const BADGE_RANK: Record<string, number> = {
      price_busted_deal: 1,
      price_window_shopper: 2,
      price_pricing_prodigy: 3,
      price_deal_architect: 4,
      price_jackpot_genius: 5,
    };

    let bestBadge: string | null = null;
    let bestRank = 0;
    for (const s of realGames) {
      if (s.badge_key && (BADGE_RANK[s.badge_key] ?? 0) > bestRank) {
        bestRank = BADGE_RANK[s.badge_key] ?? 0;
        bestBadge = s.badge_key;
      }
    }

    return {
      sessions,
      bestNetXp,
      totalGamesPlayed: realGames.length,
      bestBadge,
    };
  },
});
