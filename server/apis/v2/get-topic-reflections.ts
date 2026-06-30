import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ReflectionRow = z.object({
  topic_day: z.string(),
  question_1: z.string(),
  answer_1: z.string(),
  question_2: z.string(),
  answer_2: z.string(),
  submitted_at: z.string(),
});

export default api({
  name: "GetTopicReflections",
  description: "Fetches topic day reflection answers for a viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    reflections: z.array(z.object({
      topicDay: z.string(),
      question1: z.string(),
      answer1: z.string(),
      question2: z.string(),
      answer2: z.string(),
      submittedAt: z.string(),
    })),
  }),

  async run(ctx, { viewerId }) {
    const rows = await ctx.integrations.db.query(
      `SELECT topic_day, question_1, answer_1, question_2, answer_2, submitted_at::text
       FROM cliptracker_v2_topic_reflections
       WHERE viewer_id = $1
       ORDER BY submitted_at ASC`,
      ReflectionRow,
      [viewerId],
      { label: "Get topic reflections" }
    );

    return {
      reflections: rows.map((r) => ({
        topicDay: r.topic_day,
        question1: r.question_1,
        answer1: r.answer_1,
        question2: r.question_2,
        answer2: r.answer_2,
        submittedAt: r.submitted_at,
      })),
    };
  },
});
