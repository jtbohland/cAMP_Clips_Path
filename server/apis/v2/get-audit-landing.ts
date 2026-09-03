import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TopicSchema = z.object({
  topicKey: z.string(),
  dayLabel: z.string(),
  title: z.string(),
  emoji: z.string().nullable(),
  pathLabel: z.string().nullable(),
  hasVideo: z.boolean(),
  sortOrders: z.array(z.number()),
  summary: z.string().nullable(),
  learningObjectives: z.array(z.string()),
  smes: z.array(z.object({
    name: z.string(),
    title: z.string(),
    note: z.string().nullable().optional(),
  })),
  signoffs: z.array(z.object({
    viewerName: z.string(),
    signedAt: z.string(),
  })),
  status: z.enum(["not_started", "in_progress", "complete"]),
  isAssignedToMe: z.boolean(),
});

export default api({
  name: "GetAuditLanding",
  description: "Returns all audit topics with SME assignments and sign-off status",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().nullable(),
  }),

  output: z.object({
    topics: z.array(TopicSchema),
    activeCycle: z.object({
      id: z.string(),
      label: z.string(),
      deadline: z.string().nullable(),
      description: z.string().nullable(),
    }).nullable(),
    totalTopics: z.number(),
    completedTopics: z.number(),
  }),

  async run(ctx, { viewerId }) {
    // Get active cycle (most recent active one)
    const CycleSchema = z.object({
      id: z.string(),
      label: z.string(),
      deadline: z.string().nullable(),
      description: z.string().nullable(),
    });
    const cycles = await ctx.integrations.apps_db.query(
      `SELECT id::text, label, deadline::text, description
       FROM cliptracker_v2_audit_cycles
       WHERE status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      CycleSchema,
      undefined,
      { label: "Get active audit cycle" }
    );
    const activeCycle = cycles[0] ?? null;

    // Get all topics ordered by first sort_order
    const TopicRow = z.object({
      topic_key: z.string(),
      day_label: z.string(),
      title: z.string(),
      emoji: z.string().nullable(),
      path_label: z.string().nullable(),
      has_video: z.boolean(),
      sort_orders: z.array(z.coerce.number()),
      summary: z.string().nullable(),
      learning_objectives: z.any(),
      smes: z.any(),
    });
    const topicRows = await ctx.integrations.apps_db.query(
      `SELECT topic_key, day_label, title, emoji, path_label, has_video, sort_orders,
              summary, learning_objectives, smes
       FROM cliptracker_v2_day_metadata
       ORDER BY sort_orders[1]`,
      TopicRow,
      undefined,
      { label: "Get all audit topics" }
    );

    // Get SME assignments for this viewer
    const AssignmentRow = z.object({ topic_key: z.string() });
    let myTopicKeys = new Set<string>();
    if (viewerId) {
      const myAssignments = await ctx.integrations.apps_db.query(
        `SELECT topic_key FROM cliptracker_v2_sme_assignments WHERE viewer_id = $1`,
        AssignmentRow,
        [viewerId],
        { label: "Get my SME assignments" }
      );
      myTopicKeys = new Set(myAssignments.map(a => a.topic_key));
    }

    // Get sign-offs for active cycle (or all if no cycle)
    const SignoffRow = z.object({
      topic_key: z.string(),
      viewer_name: z.string(),
      signed_at: z.string(),
    });
    const signoffs = await ctx.integrations.apps_db.query(
      `SELECT so.topic_key, v.name as viewer_name, so.signed_at::text
       FROM cliptracker_v2_audit_signoffs so
       JOIN cliptracker_v2_viewers v ON v.id = so.viewer_id
       WHERE ($1::uuid IS NULL OR so.cycle_id = $1)`,
      SignoffRow,
      [activeCycle?.id ?? null],
      { label: "Get sign-offs" }
    );

    // Group sign-offs by topic
    const signoffMap = new Map<string, Array<{ viewerName: string; signedAt: string }>>();
    for (const so of signoffs) {
      const arr = signoffMap.get(so.topic_key) ?? [];
      arr.push({ viewerName: so.viewer_name, signedAt: so.signed_at });
      signoffMap.set(so.topic_key, arr);
    }

    // Build output
    let completedTopics = 0;
    const topics = topicRows.map(row => {
      const topicSignoffs = signoffMap.get(row.topic_key) ?? [];
      const smes = Array.isArray(row.smes) ? row.smes : [];
      const objectives = Array.isArray(row.learning_objectives) ? row.learning_objectives : [];

      // Status logic: complete if at least one sign-off exists for this topic
      // in_progress if someone is assigned but hasn't signed off
      // not_started otherwise
      let status: "not_started" | "in_progress" | "complete" = "not_started";
      if (topicSignoffs.length > 0) {
        status = "complete";
        completedTopics++;
      }

      return {
        topicKey: row.topic_key,
        dayLabel: row.day_label,
        title: row.title,
        emoji: row.emoji,
        pathLabel: row.path_label,
        hasVideo: row.has_video,
        sortOrders: row.sort_orders,
        summary: row.summary,
        learningObjectives: objectives as string[],
        smes: smes as Array<{ name: string; title: string; note?: string | null }>,
        signoffs: topicSignoffs,
        status,
        isAssignedToMe: myTopicKeys.has(row.topic_key),
      };
    });

    return {
      topics,
      activeCycle,
      totalTopics: topics.length,
      completedTopics,
    };
  },
});
