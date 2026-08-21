import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/** Crux Call XP table (same as Ridge Runner):
 *  ⛏️  (1): +1 right, −1 wrong
 *  ⛏️⛏️ (2): +2 right, −1 wrong
 *  ⛏️⛏️⛏️(3): +3 right, −2 wrong
 */
function calculateXpChange(cruxLevel: number, isCorrect: boolean): number {
  if (isCorrect) return cruxLevel; // +1, +2, or +3
  return cruxLevel <= 2 ? -1 : -2; // −1 for ⛏️/⛏️⛏️, −2 for ⛏️⛏️⛏️
}

export default api({
  name: "SubmitPriceResponse",
  description: "Records a single Price is Right response and calculates XP change",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string(),
    scenarioId: z.string(),        // UUID from price_scenarios.id
    playerAnswer: z.any(),         // Flexible JSONB — varies per game type
    cruxLevel: z.number(),         // 1, 2, or 3
    isCorrect: z.boolean(),        // Determined client-side based on game logic
    isReplay: z.boolean(),
  }),

  output: z.object({
    xpChange: z.number(),
  }),

  async run(ctx, { sessionId, scenarioId, playerAnswer, cruxLevel, isCorrect, isReplay }) {
    // Replays have no XP stakes
    const xpChange = isReplay ? 0 : calculateXpChange(cruxLevel, isCorrect);

    // Record the response
    await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_price_responses (session_id, scenario_id, player_answer, crux_level, is_correct, xp_change)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6)`,
      [sessionId, scenarioId, JSON.stringify(playerAnswer), cruxLevel, isCorrect, xpChange],
      { label: "Record Price response" }
    );

    return { xpChange };
  },
});
