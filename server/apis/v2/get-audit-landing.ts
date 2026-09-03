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
  approvedCount: z.number(),
  totalSections: z.number(),
  lastActivity: z.string().nullable(),
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

    // Get approval counts per topic
    const ApprovalCountRow = z.object({ topic_key: z.string(), cnt: z.coerce.number() });
    const approvalCounts = await ctx.integrations.apps_db.query(
      `SELECT topic_key, COUNT(*)::int as cnt FROM cliptracker_v2_audit_approvals GROUP BY topic_key`,
      ApprovalCountRow,
      undefined,
      { label: "Get approval counts per topic" }
    );
    const approvalCountMap = new Map(approvalCounts.map(a => [a.topic_key, a.cnt]));

    // Get last activity per topic (most recent approval or changelog entry)
    const LastActivityRow = z.object({ topic_key: z.string(), last_at: z.string() });
    const lastActivities = await ctx.integrations.apps_db.query(
      `SELECT topic_key, MAX(ts)::text as last_at FROM (
        SELECT topic_key, approved_at as ts FROM cliptracker_v2_audit_approvals
        UNION ALL
        SELECT topic_key, created_at as ts FROM cliptracker_v2_audit_changelog
      ) sub GROUP BY topic_key`,
      LastActivityRow,
      undefined,
      { label: "Get last activity per topic" }
    );
    const lastActivityMap = new Map(lastActivities.map(a => [a.topic_key, a.last_at]));

    // Get total expected sections per topic: for each sort_order, check which sections exist
    // Each clip can have: summary, trail_markers, search_rescue, weather_storm, gear
    // We count: 1 (summary) per clip always + 1 if has questions + 1 if has recovery questions + 1 if has WtS + 1 if has resources
    const allSortOrders = topicRows.flatMap(r => r.sort_orders);
    const SectionCountRow = z.object({
      sort_order: z.coerce.number(),
      has_markers: z.boolean(),
      has_sr: z.boolean(),
      has_wts: z.boolean(),
      has_gear: z.boolean(),
    });
    const sectionCounts = allSortOrders.length > 0
      ? await ctx.integrations.apps_db.query(
          `SELECT c.sort_order,
            EXISTS(SELECT 1 FROM cliptracker_v2_questions q WHERE q.clip_id = c.id AND NOT q.is_recovery) as has_markers,
            EXISTS(SELECT 1 FROM cliptracker_v2_questions q WHERE q.clip_id = c.id AND q.is_recovery) as has_sr,
            EXISTS(SELECT 1 FROM cliptracker_v2_weather_storm w WHERE w.clip_id = c.id) as has_wts,
            (c.resources IS NOT NULL AND jsonb_array_length(c.resources) > 0) as has_gear
           FROM cliptracker_v2_clips c
           WHERE c.sort_order = ANY($1::int[]) AND c.status = 'live'`,
          SectionCountRow,
          [`{${allSortOrders.join(",")}}`],
          { label: "Get section counts per clip" }
        )
      : [];
    // Build sort_order → section count map
    const sectionCountBySort = new Map<number, number>();
    for (const sc of sectionCounts) {
      let count = 1; // summary always counts
      if (sc.has_markers) count++;
      if (sc.has_sr) count++;
      if (sc.has_wts) count++;
      if (sc.has_gear) count++;
      sectionCountBySort.set(sc.sort_order, count);
    }

    // Build output
    let completedTopics = 0;
    const topics = topicRows.map(row => {
      const topicSignoffs = signoffMap.get(row.topic_key) ?? [];
      const smes = Array.isArray(row.smes) ? row.smes : [];
      const objectives = Array.isArray(row.learning_objectives) ? row.learning_objectives : [];
      const approvedCount = approvalCountMap.get(row.topic_key) ?? 0;
      const totalSections = row.sort_orders.reduce((sum, so) => sum + (sectionCountBySort.get(so) ?? 0), 0);

      // Status logic: complete if at least one sign-off exists for this topic
      // in_progress if someone has approved at least one section but hasn't signed off
      // not_started otherwise
      let status: "not_started" | "in_progress" | "complete" = "not_started";
      if (topicSignoffs.length > 0) {
        status = "complete";
        completedTopics++;
      } else if (approvedCount > 0) {
        status = "in_progress";
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
        approvedCount,
        totalSections,
        lastActivity: lastActivityMap.get(row.topic_key) ?? null,
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
