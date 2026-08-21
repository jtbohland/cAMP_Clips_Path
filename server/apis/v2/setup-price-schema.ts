import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupPriceSchema",
  description: "Creates Price is Right game tables",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    // ── Scenarios table ──────────────────────────────────────────────
    // Each scenario has a game_type that determines which mini-game UI renders.
    // game_data is a flexible JSONB blob with type-specific fields.
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_price_scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scenario_id TEXT NOT NULL UNIQUE,
        section TEXT NOT NULL,
        game_type TEXT NOT NULL CHECK (game_type IN (
          'higher_lower', 'bullseye', 'price_match',
          'deal_builder', 'pricing_pitfall', 'objection_closer'
        )),
        narrative TEXT NOT NULL,
        game_data JSONB NOT NULL DEFAULT '{}',
        coaching_note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create price scenarios table" }
    );

    // ── Game sessions table ──────────────────────────────────────────
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_price_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id) ON DELETE CASCADE,
        scenario_ids JSONB NOT NULL DEFAULT '[]',
        net_xp INTEGER NOT NULL DEFAULT 0,
        badge_key TEXT,
        badge_label TEXT,
        is_replay BOOLEAN NOT NULL DEFAULT FALSE,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create price sessions table" }
    );

    // ── Game responses table ─────────────────────────────────────────
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_price_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES cliptracker_v2_price_sessions(id) ON DELETE CASCADE,
        scenario_id UUID NOT NULL REFERENCES cliptracker_v2_price_scenarios(id) ON DELETE CASCADE,
        player_answer JSONB NOT NULL DEFAULT '{}',
        crux_level INTEGER NOT NULL CHECK (crux_level IN (1, 2, 3)),
        is_correct BOOLEAN NOT NULL,
        xp_change INTEGER NOT NULL,
        answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create price responses table" }
    );

    ctx.log.info("Price schema created successfully");
    return { success: true, message: "All 3 Price is Right game tables created (scenarios, sessions, responses)" };
  },
});
