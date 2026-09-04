import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const RidgeScenarioSchema = z.object({
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

const PriceScenarioSchema = z.object({
  id: z.string(),
  scenario_id: z.string(),
  section: z.string(),
  game_type: z.string(),
  narrative: z.string(),
  game_data: z.any(),
  coaching_note: z.string(),
});

export default api({
  name: "GetGameScenariosForAudit",
  description: "Fetches all game scenarios for SME audit review",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    gameType: z.enum(["ridge", "price"]),
  }),

  output: z.object({
    scenarios: z.array(z.any()),
    totalCount: z.number(),
  }),

  async run(ctx, { gameType }) {
    if (gameType === "ridge") {
      const scenarios = await ctx.integrations.apps_db.query(
        `SELECT id::text, scenario_id, section, narrative, question, correct_answer,
                correct_rule, distractor_1, distractor_2, distractor_3, belay_note
         FROM cliptracker_v2_ridge_scenarios
         ORDER BY scenario_id`,
        RidgeScenarioSchema,
        [],
        { label: "Get all Ridge scenarios for audit" }
      );
      return { scenarios, totalCount: scenarios.length };
    }

    // price
    const scenarios = await ctx.integrations.apps_db.query(
      `SELECT id::text, scenario_id, section, game_type, narrative, game_data, coaching_note
       FROM cliptracker_v2_price_scenarios
       ORDER BY scenario_id`,
      PriceScenarioSchema,
      [],
      { label: "Get all Price scenarios for audit" }
    );
    return { scenarios, totalCount: scenarios.length };
  },
});
