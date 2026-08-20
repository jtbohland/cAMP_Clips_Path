import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ScenarioSchema = z.object({
  id: z.string(),
  scenario_id: z.string(),
  section: z.string(),
  narrative: z.string(),
  question: z.string(),
  correct_answer: z.string(),
  correct_rule: z.string(),
  distractor_1: z.string(),
  distractor_2: z.string(),
  distractor_3: z.string(),
  belay_note: z.string(),
});

export type RidgeScenario = z.infer<typeof ScenarioSchema>;

export default api({
  name: "StartRidgeGame",
  description: "Draws 10 random scenarios and creates a Ridge game session",

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
    // Draw 10 random scenarios
    const scenarios = await ctx.integrations.apps_db.query(
      `SELECT id, scenario_id, section, narrative, question, correct_answer, correct_rule,
              distractor_1, distractor_2, distractor_3, belay_note
       FROM cliptracker_v2_ridge_scenarios
       ORDER BY random()
       LIMIT 10`,
      ScenarioSchema,
      [],
      { label: "Draw 10 random Ridge scenarios" }
    );

    const scenarioIds = scenarios.map((s) => s.id);

    // Create session row
    const SessionRow = z.object({ id: z.string() });
    const [session] = await ctx.integrations.apps_db.query(
      `INSERT INTO cliptracker_v2_ridge_sessions (viewer_id, is_replay, scenario_ids)
       VALUES ($1, $2, $3)
       RETURNING id`,
      SessionRow,
      [viewerId, isReplay, JSON.stringify(scenarioIds)],
      { label: "Create Ridge game session" }
    );

    return {
      sessionId: session.id,
      scenarios,
    };
  },
});
