import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupRidgeSchema",
  description: "Creates Rules of the Ridge game tables",

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
    // 50 ROE scenarios with narrative, answers, distractors, coaching note
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_ridge_scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scenario_id TEXT NOT NULL UNIQUE,
        section TEXT NOT NULL,
        narrative TEXT NOT NULL,
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL CHECK (correct_answer IN ('Yes', 'No')),
        correct_rule TEXT NOT NULL,
        distractor_1 TEXT NOT NULL,
        distractor_2 TEXT NOT NULL,
        distractor_3 TEXT NOT NULL,
        belay_note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create ridge scenarios table" }
    );

    // ── Game sessions table ──────────────────────────────────────────
    // One row per game play (first play or replay)
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_ridge_sessions (
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
      { label: "Create ridge sessions table" }
    );

    // ── Game responses table ─────────────────────────────────────────
    // One row per scenario answered within a session
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_ridge_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES cliptracker_v2_ridge_sessions(id) ON DELETE CASCADE,
        scenario_id UUID NOT NULL REFERENCES cliptracker_v2_ridge_scenarios(id) ON DELETE CASCADE,
        yes_no_answer TEXT NOT NULL CHECK (yes_no_answer IN ('Yes', 'No')),
        rule_answer TEXT NOT NULL,
        crux_level INTEGER NOT NULL CHECK (crux_level IN (1, 2, 3)),
        is_correct BOOLEAN NOT NULL,
        xp_change INTEGER NOT NULL,
        answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create ridge responses table" }
    );

    ctx.log.info("Ridge schema created successfully");
    return { success: true, message: "All 3 Ridge game tables created (scenarios, sessions, responses)" };
  },
});
