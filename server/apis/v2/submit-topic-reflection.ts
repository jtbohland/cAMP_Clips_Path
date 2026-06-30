import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const VALID_TOPIC_DAYS = ["day5", "day9"] as const;

export default api({
  name: "SubmitTopicReflection",
  description: "Submits topic day reflection answers for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    topicDay: z.enum(VALID_TOPIC_DAYS),
    question1: z.string().min(1),
    answer1: z.string().min(1),
    question2: z.string().min(1),
    answer2: z.string().min(1),
  }),

  output: z.object({
    success: z.boolean(),
    alreadySubmitted: z.boolean(),
  }),

  async run(ctx, { viewerId, topicDay, question1, answer1, question2, answer2 }) {
    const CountSchema = z.object({ count: z.coerce.number() });

    // Check if already submitted
    const existing = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_topic_reflections
       WHERE viewer_id = $1 AND topic_day = $2`,
      CountSchema,
      [viewerId, topicDay],
      { label: "Check existing topic reflection" }
    );

    if (existing[0].count > 0) {
      return { success: true, alreadySubmitted: true };
    }

    // Insert reflection
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_topic_reflections
        (viewer_id, topic_day, question_1, answer_1, question_2, answer_2)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (viewer_id, topic_day) DO NOTHING`,
      [viewerId, topicDay, question1, answer1, question2, answer2],
      { label: "Insert topic reflection" }
    );

    ctx.log.info("Topic reflection submitted", { viewerId, topicDay });
    return { success: true, alreadySubmitted: false };
  },
});
