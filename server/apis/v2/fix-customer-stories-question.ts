import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time fix: updates the Customer Stories trail marker question (sort 15, question sort_order 10).
 * - Fixes "HiSpot" → "Highspot" spelling in correct answer
 * - Replaces incorrect distractor options (removed Spekit/HighSpot competitor confusion, Glean nonsense)
 * - Updates feedback explanation text with Spekit transition note
 */
export default api({
  name: "FixCustomerStoriesQuestion",
  description: "One-time fix for Customer Stories trail marker question",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    const questionId = "f5616b55-f480-4a5a-a707-20095f6294c0";

    const updatedOptions = JSON.stringify([
      "The Amplitude customer stories webpage, the competitive Slack channel, and Customer Success QBR decks shared by the CSM team",
      "Highspot (with 100+ filterable customer stories), the Win Reports Slack channel, and the Customer Verified Outcomes Slack channel",
      "Glean, the Amplitude website, and a marketing-managed customer reference database organized by industry and product area",
      "Spekit, the Amplitude YouTube channel, and a shared folder of customer references that AEs can browse on demand",
    ]);

    const feedbackExplanation =
      "Julia named three places to find customer stories at Amplitude: Highspot, the Win Reports Slack channel, and the Customer Verified Outcomes Slack channel. Together, these give AEs both formal reference material and real-world examples they can use in selling conversations.\n\nNote: We now use Spekit instead of Highspot. Highspot is still the correct answer for this question because the prompt is based on the recorded video and what Julia named at that time.";

    const correctFeedback = JSON.stringify({
      emoji: "🌲",
      label: "Forest Preserver! Correct:",
      explanation: feedbackExplanation,
    });

    const incorrectFeedback = JSON.stringify({
      emoji: "🔥",
      label: "Fire Starter! Incorrect:",
      explanation: feedbackExplanation,
    });

    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_questions
       SET options = $1::jsonb,
           correct_feedback = $2,
           incorrect_feedback = $3
       WHERE id = $4`,
      [updatedOptions, correctFeedback, incorrectFeedback, questionId],
      { label: "Fix Customer Stories question options and feedback" }
    );

    // Audit log
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('fix_question', 'question', $1, $2, $3)`,
      [
        questionId,
        ctx.user.email ?? "admin",
        JSON.stringify({
          fix: "Corrected spelling (Highspot), replaced competitor-confused distractors, updated feedback with Spekit transition note",
        }),
      ],
      { label: "Log question fix" }
    );

    return {
      success: true,
      message:
        "Updated Customer Stories question: fixed Highspot spelling, replaced distractors, updated feedback with Spekit note",
    };
  },
});
