import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ScenarioSchema = z.object({
  id: z.string(),
  scenario_id: z.string(),
  section: z.string(),
  game_type: z.string(),
  narrative: z.string(),
  game_data: z.any(),
  coaching_note: z.string(),
});

export type PriceScenario = z.infer<typeof ScenarioSchema>;

export default api({
  name: "StartPriceGame",
  description: "Draws 10 random Price is Right scenarios and creates a game session",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
    isReplay: z.boolean(),
  }),

  output: z.object({
    sessionId: z.string(),
    scenarios: z.array(ScenarioSchema),
  }),

  async run(ctx, { viewerId, isReplay }) {
    // Draw 10 random scenarios (mix of all 6 game types)
    const scenarios = await ctx.integrations.apps_db.query(
      `SELECT id, scenario_id, section, game_type, narrative, game_data, coaching_note
       FROM cliptracker_v2_price_scenarios
       ORDER BY random()
       LIMIT 10`,
      ScenarioSchema,
      [],
      { label: "Draw 10 random Price scenarios" }
    );

    const scenarioIds = scenarios.map((s) => s.id);

    // Create session row
    const SessionRow = z.object({ id: z.string() });
    const [session] = await ctx.integrations.apps_db.query(
      `INSERT INTO cliptracker_v2_price_sessions (viewer_id, is_replay, scenario_ids)
       VALUES ($1, $2, $3)
       RETURNING id`,
      SessionRow,
      [viewerId, isReplay, JSON.stringify(scenarioIds)],
      { label: "Create Price game session" }
    );

    return {
      sessionId: session.id,
      scenarios,
    };
  },
});
