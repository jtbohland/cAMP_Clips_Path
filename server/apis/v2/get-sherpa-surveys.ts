import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TopicReflectionSchema = z.object({
  viewerName: z.string(),
  viewerEmail: z.string(),
  topicDay: z.string(),
  question1: z.string(),
  answer1: z.string(),
  question2: z.string().nullable(),
  answer2: z.string().nullable(),
  submittedAt: z.string(),
});

const ModuleReflectionSchema = z.object({
  viewerName: z.string(),
  viewerEmail: z.string(),
  moduleKey: z.string(),
  reflectionPrompt: z.string().nullable(),
  reflectionResponse: z.string().nullable(),
  completedAt: z.string(),
});

export default api({
  name: "GetSherpaSurveys",
  description: "Fetches topic day reflections and module signoff reflections for analytics",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    topicReflections: z.array(TopicReflectionSchema),
    moduleReflections: z.array(ModuleReflectionSchema),
  }),

  async run(ctx) {
    const TopicRowSchema = z.object({
      viewer_name: z.string(),
      viewer_email: z.string(),
      topic_day: z.string(),
      question_1: z.string(),
      answer_1: z.string(),
      question_2: z.string().nullable(),
      answer_2: z.string().nullable(),
      submitted_at: z.string(),
    });

    const topicRows = await ctx.integrations.db.query(
      `SELECT v.name AS viewer_name, v.email AS viewer_email,
              tr.topic_day, tr.question_1, tr.answer_1, tr.question_2, tr.answer_2,
              tr.submitted_at::text
       FROM cliptracker_v2_topic_reflections tr
       JOIN cliptracker_v2_viewers v ON v.id = tr.viewer_id
       WHERE COALESCE(v.is_admin, false) = false
       ORDER BY tr.submitted_at DESC
       LIMIT 200`,
      TopicRowSchema,
      undefined,
      { label: "Get topic day reflections" }
    );

    const ModuleRowSchema = z.object({
      viewer_name: z.string(),
      viewer_email: z.string(),
      module_key: z.string(),
      reflection_prompt: z.string().nullable(),
      reflection_response: z.string().nullable(),
      completed_at: z.string(),
    });

    const moduleRows = await ctx.integrations.db.query(
      `SELECT v.name AS viewer_name, v.email AS viewer_email,
              ms.module_key, ms.reflection_prompt, ms.reflection_response,
              ms.completed_at::text
       FROM cliptracker_v2_module_signoffs ms
       JOIN cliptracker_v2_viewers v ON v.id = ms.viewer_id
       WHERE COALESCE(v.is_admin, false) = false
         AND ms.reflection_response IS NOT NULL
       ORDER BY ms.completed_at DESC
       LIMIT 200`,
      ModuleRowSchema,
      undefined,
      { label: "Get module signoff reflections" }
    );

    return {
      topicReflections: topicRows.map(r => ({
        viewerName: r.viewer_name,
        viewerEmail: r.viewer_email,
        topicDay: r.topic_day,
        question1: r.question_1,
        answer1: r.answer_1,
        question2: r.question_2,
        answer2: r.answer_2,
        submittedAt: r.submitted_at,
      })),
      moduleReflections: moduleRows.map(r => ({
        viewerName: r.viewer_name,
        viewerEmail: r.viewer_email,
        moduleKey: r.module_key,
        reflectionPrompt: r.reflection_prompt,
        reflectionResponse: r.reflection_response,
        completedAt: r.completed_at,
      })),
    };
  },
});
