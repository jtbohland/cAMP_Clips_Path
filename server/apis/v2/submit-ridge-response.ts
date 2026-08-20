import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/** Crux Call XP table:
 *  ⛏️  (1): +1 right, −1 wrong
 *  ⛏️⛏️ (2): +2 right, −1 wrong
 *  ⛏️⛏️⛏️(3): +3 right, −2 wrong
 */
function calculateXpChange(cruxLevel: number, isCorrect: boolean): number {
  if (isCorrect) return cruxLevel; // +1, +2, or +3
  return cruxLevel <= 2 ? -1 : -2; // −1 for ⛏️/⛏️⛏️, −2 for ⛏️⛏️⛏️
}

export default api({
  name: "SubmitRidgeResponse",
  description: "Records a single Ridge scenario response and calculates XP change",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string(),
    scenarioId: z.string(),
    yesNoAnswer: z.string(),        // "Yes" or "No"
    ruleAnswer: z.string(),          // The ROE section they picked
    cruxLevel: z.number(),           // 1, 2, or 3
    correctAnswer: z.string(),       // "Yes" or "No" (from scenario)
    correctRule: z.string(),         // Correct ROE section
    isReplay: z.boolean(),
  }),

  output: z.object({
    isCorrect: z.boolean(),
    xpChange: z.number(),
    yesNoCorrect: z.boolean(),
    ruleCorrect: z.boolean(),
  }),

  async run(ctx, { sessionId, scenarioId, yesNoAnswer, ruleAnswer, cruxLevel, correctAnswer, correctRule, isReplay }) {
    const yesNoCorrect = yesNoAnswer === correctAnswer;
    const ruleCorrect = ruleAnswer === correctRule;
    const isCorrect = yesNoCorrect && ruleCorrect;

    // Replays have no XP stakes
    const xpChange = isReplay ? 0 : calculateXpChange(cruxLevel, isCorrect);

    // Record the response
    await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_ridge_responses (session_id, scenario_id, yes_no_answer, rule_answer, crux_level, is_correct, xp_change)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, scenarioId, yesNoAnswer, ruleAnswer, cruxLevel, isCorrect, xpChange],
      { label: "Record Ridge response" }
    );

    return { isCorrect, xpChange, yesNoCorrect, ruleCorrect };
  },
});
