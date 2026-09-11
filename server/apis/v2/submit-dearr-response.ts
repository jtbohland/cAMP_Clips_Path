import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/** Antler Ante XP table (same scale as Crux Call):
 *  🫎  (1): +1 right, −1 wrong
 *  🫎🫎 (2): +2 right, −1 wrong
 *  🫎🫎🫎(3): +3 right, −2 wrong
 */
function calculateXpChange(anteLevel: number, isCorrect: boolean): number {
  if (isCorrect) return anteLevel; // +1, +2, or +3
  return anteLevel <= 2 ? -1 : -2; // −1 for 🫎/🫎🫎, −2 for 🫎🫎🫎
}

export default api({
  name: "SubmitDEARRResponse",
  description: "Records a DEARR Crossing answer and calculates XP change",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string().uuid(),
    questionId: z.string(),
    levelNumber: z.number().int().min(0).max(2),
    isCorrect: z.boolean(),
    anteLevel: z.number().int().min(1).max(3),
    isReplay: z.boolean(),
  }),

  output: z.object({
    isCorrect: z.boolean(),
    xpChange: z.number(),
  }),

  async run(ctx, { sessionId, questionId, levelNumber, isCorrect, anteLevel, isReplay }) {
    // Replays have no XP stakes
    const xpChange = isReplay ? 0 : calculateXpChange(anteLevel, isCorrect);

    await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_dearr_responses
         (session_id, question_id, level_number, is_correct, antler_ante, xp_change)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, questionId, levelNumber, isCorrect, anteLevel, xpChange],
      { label: `DEARR response: ${isCorrect ? "✅" : "❌"} ante ${anteLevel} → ${xpChange > 0 ? "+" : ""}${xpChange}` }
    );

    return { isCorrect, xpChange };
  },
});
