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
    leaderboard: z.array(z.object({
      name: z.string(),
      topicsAssigned: z.number(),
      topicsCompleted: z.number(),
      sectionsApproved: z.number(),
      editsMade: z.number(),
      progressPct: z.number(),
      badge: z.string().nullable(),
    })),
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

    // ── Build leaderboard ──
    // Collect unique SMEs from all topics with their assigned topic keys
    const smeTopicMap = new Map<string, Set<string>>(); // name → set of topicKeys
    for (const row of topicRows) {
      const smes = Array.isArray(row.smes) ? row.smes : [];
      for (const sme of smes as Array<{ name: string }>) {
        const existing = smeTopicMap.get(sme.name) ?? new Set();
        existing.add(row.topic_key);
        smeTopicMap.set(sme.name, existing);
      }
    }

    // Get per-viewer edit counts and approval counts from changelog/approvals
    // We join on viewer name since SMEs may not have viewer IDs yet
    const EditCountRow = z.object({ viewer_name: z.string(), cnt: z.coerce.number() });
    const editCounts = await ctx.integrations.apps_db.query(
      `SELECT v.name as viewer_name, COUNT(*)::int as cnt
       FROM cliptracker_v2_audit_changelog cl
       JOIN cliptracker_v2_viewers v ON v.id = cl.viewer_id
       GROUP BY v.name`,
      EditCountRow,
      undefined,
      { label: "Get edit counts per SME" }
    );
    const editCountMap = new Map(editCounts.map(e => [e.viewer_name, e.cnt]));

    const ApprovalBySmeRow = z.object({ viewer_name: z.string(), cnt: z.coerce.number() });
    const approvalsBySme = await ctx.integrations.apps_db.query(
      `SELECT v.name as viewer_name, COUNT(*)::int as cnt
       FROM cliptracker_v2_audit_approvals ap
       JOIN cliptracker_v2_viewers v ON v.id = ap.viewer_id
       GROUP BY v.name`,
      ApprovalBySmeRow,
      undefined,
      { label: "Get approval counts per SME" }
    );
    const approvalBySmeMap = new Map(approvalsBySme.map(a => [a.viewer_name, a.cnt]));

    // Sign-offs per SME name
    const signoffBySme = new Map<string, number>();
    for (const so of signoffs) {
      signoffBySme.set(so.viewer_name, (signoffBySme.get(so.viewer_name) ?? 0) + 1);
    }

    // Build leaderboard rows
    const BADGES = [
      { key: "trailwright", emoji: "🛠️", name: "Trailwright", minEdits: 5 },
      { key: "cartographer", emoji: "🗺️", name: "Cartographer", minEdits: 3 },
      { key: "peak_spotter", emoji: "🔭", name: "Peak Spotter", minEdits: 1 },
      { key: "smoke_signal", emoji: "🏕️", name: "Smoke Signal", minEdits: 0 },
    ];
    function getBadge(edits: number, completed: number, assigned: number) {
      if (completed === 0) return null; // No badge until at least one topic signed off
      for (const b of BADGES) { if (edits >= b.minEdits) return `${b.emoji} ${b.name}`; }
      return null;
    }

    const leaderboard = Array.from(smeTopicMap.entries()).map(([name, topicKeys]) => {
      const topicsAssigned = topicKeys.size;
      const topicsCompleted = signoffBySme.get(name) ?? 0;
      const editsMade = editCountMap.get(name) ?? 0;
      const sectionsApproved = approvalBySmeMap.get(name) ?? 0;

      // Progress: total approved / total sections across assigned topics
      let totalSects = 0;
      let totalApproved = 0;
      for (const tk of topicKeys) {
        const t = topics.find(t => t.topicKey === tk);
        if (t) {
          totalSects += t.totalSections;
          totalApproved += Math.min(t.approvedCount, t.totalSections);
        }
      }
      const progressPct = totalSects > 0 ? Math.round((totalApproved / totalSects) * 100) : 0;

      return {
        name,
        topicsAssigned,
        topicsCompleted,
        sectionsApproved,
        editsMade,
        progressPct,
        badge: getBadge(editsMade, topicsCompleted, topicsAssigned),
      };
    }).sort((a, b) => b.progressPct - a.progressPct || b.editsMade - a.editsMade);

    return {
      topics,
      activeCycle,
      totalTopics: topics.length,
      completedTopics,
      leaderboard,
    };
  },
});
