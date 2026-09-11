import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupDEARRSchema",
  description: "Creates DEARR Crossing game tables (sessions + responses)",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    // ── Sessions table ──────────────────────────────────────────────
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_dearr_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        net_xp INT,
        badge_key TEXT,
        badge_label TEXT,
        is_replay BOOLEAN NOT NULL DEFAULT false
      )`,
      undefined,
      { label: "Create DEARR sessions table" }
    );

    // ── Responses table ─────────────────────────────────────────────
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_dearr_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES cliptracker_v2_dearr_sessions(id),
        question_id TEXT NOT NULL,
        level_number INT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        antler_ante INT NOT NULL DEFAULT 1,
        xp_change INT NOT NULL DEFAULT 0,
        answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create DEARR responses table" }
    );

    ctx.log.info("DEARR Crossing schema created successfully");
    return { success: true, message: "DEARR Crossing tables created (sessions + responses)" };
  },
});
