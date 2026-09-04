import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetAuditDayContent",
  description: "Loads all auditable content for a topic: clips, markers, S&R, WtS, gear",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    topicKey: z.string(),
    viewerId: z.string().nullable().optional(),
  }),

  output: z.object({
    topic: z.object({
      topicKey: z.string(),
      dayLabel: z.string(),
      title: z.string(),
      emoji: z.string().nullable(),
      pathLabel: z.string().nullable(),
      hasVideo: z.boolean(),
      summary: z.string().nullable(),
      learningObjectives: z.array(z.string()),
      smes: z.array(z.object({ name: z.string(), title: z.string(), note: z.string().nullable().optional() })),
    }),
    clips: z.array(z.object({
      clipId: z.string(),
      title: z.string(),
      sortOrder: z.number(),
      videoUrl: z.string().nullable(),
      resources: z.any(),
      trailMarkers: z.array(z.object({
        id: z.string(),
        questionText: z.string(),
        options: z.any(),
        correctOption: z.number(),
        correctFeedback: z.string().nullable(),
        triggerAtSeconds: z.number().nullable(),
        sortOrder: z.number(),
      })),
      searchRescue: z.array(z.object({
        id: z.string(),
        questionText: z.string(),
        options: z.any(),
        correctOption: z.number(),
        correctFeedback: z.string().nullable(),
        sortOrder: z.number(),
      })),
      weatherStorm: z.object({
        overview: z.string(),
        takeaways: z.any(),
        timerMinutes: z.number(),
      }).nullable(),
    })),
    approvedSections: z.array(z.string()),
    peerProgress: z.array(z.object({
      viewerName: z.string(),
      approvedCount: z.number(),
      totalSections: z.number(),
      signedOff: z.boolean(),
    })),
    topicResources: z.array(z.object({
      label: z.string(),
      url: z.string(),
      type: z.string(),
    })),
    /** Structured product_101 data — only populated for product_101 */
    academyCourses: z.array(z.object({
      label: z.string(),
      url: z.string(),
      screenshotUploaded: z.boolean(),
      notes: z.string().nullable(),
    })),
    wheelProducts: z.array(z.object({
      name: z.string(),
      flaggedForRemoval: z.boolean(),
    })),
    campGearResources: z.array(z.object({
      label: z.string(),
      url: z.string(),
      type: z.string(),
    })),
  }),

  async run(ctx, { topicKey, viewerId }) {
    // 1. Get topic metadata
    const MetaRow = z.object({
      topic_key: z.string(),
      day_label: z.string(),
      title: z.string(),
      emoji: z.string().nullable(),
      path_label: z.string().nullable(),
      has_video: z.boolean(),
      summary: z.string().nullable(),
      learning_objectives: z.any(),
      smes: z.any(),
      sort_orders: z.array(z.coerce.number()),
    });
    const metaRows = await ctx.integrations.apps_db.query(
      `SELECT * FROM cliptracker_v2_day_metadata WHERE topic_key = $1`,
      MetaRow,
      [topicKey],
      { label: "Get topic metadata" }
    );
    if (metaRows.length === 0) throw new Error(`Topic not found: ${topicKey}`);
    const meta = metaRows[0];

    // 2. Get clips for this topic's sort_orders
    const ClipRow = z.object({
      id: z.string(),
      title: z.string(),
      sort_order: z.coerce.number(),
      video_url: z.string().nullable(),
      resources: z.any(),
    });
    const clips = await ctx.integrations.apps_db.query(
      `SELECT id::text, title, sort_order, video_url, resources
       FROM cliptracker_v2_clips
       WHERE sort_order = ANY($1::int[]) AND status = 'live'
       ORDER BY sort_order`,
      ClipRow,
      [`{${meta.sort_orders.join(",")}}`],
      { label: "Get clips for topic" }
    );

    // 3. For each clip, get trail markers and S&R questions
    const QuestionRow = z.object({
      id: z.string(),
      question_text: z.string(),
      options: z.any(),
      correct_option: z.coerce.number(),
      correct_feedback: z.string().nullable(),
      trigger_at_seconds: z.coerce.number().nullable(),
      sort_order: z.coerce.number(),
      is_recovery: z.boolean(),
    });

    const clipIds = clips.map(c => c.id);
    const allQuestions = clipIds.length > 0
      ? await ctx.integrations.apps_db.query(
          `SELECT id::text, clip_id::text, question_text, options, correct_option,
                  correct_feedback, trigger_at_seconds, sort_order, is_recovery
           FROM cliptracker_v2_questions
           WHERE clip_id = ANY($1::uuid[])
           ORDER BY clip_id, sort_order`,
          z.object({ ...QuestionRow.shape, clip_id: z.string() }),
          [`{${clipIds.join(",")}}`],
          { label: "Get questions for clips" }
        )
      : [];

    // 4. Get Weather the Storm data
    const WtsRow = z.object({
      clip_id: z.string(),
      overview: z.string(),
      takeaways: z.any(),
      timer_minutes: z.coerce.number(),
    });
    const allWts = clipIds.length > 0
      ? await ctx.integrations.apps_db.query(
          `SELECT clip_id::text, overview, takeaways, timer_minutes
           FROM cliptracker_v2_weather_storm
           WHERE clip_id = ANY($1::uuid[])`,
          WtsRow,
          [`{${clipIds.join(",")}}`],
          { label: "Get WtS for clips" }
        )
      : [];

    // Group questions and WtS by clip
    const questionsByClip = new Map<string, typeof allQuestions>();
    for (const q of allQuestions) {
      const arr = questionsByClip.get(q.clip_id) ?? [];
      arr.push(q);
      questionsByClip.set(q.clip_id, arr);
    }
    const wtsByClip = new Map(allWts.map(w => [w.clip_id, w]));

    // Build output
    const enrichedClips = clips.map(clip => {
      const questions = questionsByClip.get(clip.id) ?? [];
      const trailMarkers = questions.filter(q => !q.is_recovery).map(q => ({
        id: q.id,
        questionText: q.question_text,
        options: q.options,
        correctOption: q.correct_option,
        correctFeedback: q.correct_feedback,
        triggerAtSeconds: q.trigger_at_seconds,
        sortOrder: q.sort_order,
      }));
      const searchRescue = questions.filter(q => q.is_recovery).map(q => ({
        id: q.id,
        questionText: q.question_text,
        options: q.options,
        correctOption: q.correct_option,
        correctFeedback: q.correct_feedback,
        sortOrder: q.sort_order,
      }));
      const wts = wtsByClip.get(clip.id);

      return {
        clipId: clip.id,
        title: clip.title,
        sortOrder: clip.sort_order,
        videoUrl: clip.video_url,
        resources: clip.resources,
        trailMarkers,
        searchRescue,
        weatherStorm: wts ? {
          overview: wts.overview,
          takeaways: wts.takeaways,
          timerMinutes: wts.timer_minutes,
        } : null,
      };
    });

    // 5. Get approvals for this viewer + topic
    const approvedSections: string[] = [];
    if (viewerId) {
      const ApprovalRow = z.object({ section_key: z.string() });
      const approvals = await ctx.integrations.apps_db.query(
        `SELECT section_key FROM cliptracker_v2_audit_approvals
         WHERE viewer_id = $1 AND topic_key = $2`,
        ApprovalRow,
        [viewerId, topicKey],
        { label: "Get section approvals" }
      );
      approvedSections.push(...approvals.map(a => a.section_key));
    }

    // 6. Peer progress — other SMEs' approval counts and sign-off status
    const PeerRow = z.object({
      viewer_id: z.string(),
      viewer_name: z.string(),
      approved_count: z.coerce.number(),
      signed_off: z.boolean(),
    });
    const peers = await ctx.integrations.apps_db.query(
      `SELECT
         a.viewer_id::text,
         COALESCE(v.name, 'Unknown') AS viewer_name,
         COUNT(DISTINCT a.section_key)::int AS approved_count,
         EXISTS(
           SELECT 1 FROM cliptracker_v2_audit_signoffs s
           WHERE s.viewer_id = a.viewer_id AND s.topic_key = $1
         ) AS signed_off
       FROM cliptracker_v2_audit_approvals a
       LEFT JOIN cliptracker_v2_viewers v ON v.id = a.viewer_id
       WHERE a.topic_key = $1
         AND ($2::uuid IS NULL OR a.viewer_id != $2::uuid)
       GROUP BY a.viewer_id, v.name
       LIMIT 20`,
      PeerRow,
      [topicKey, viewerId],
      { label: "Get peer SME progress" }
    );

    // Total sections count for peer progress denominator
    const totalSections = enrichedClips.reduce((sum, c) => {
      let count = 1; // summary
      if (c.trailMarkers.length > 0) count++;
      if (c.searchRescue.length > 0) count++;
      if (c.weatherStorm) count++;
      if (Array.isArray(c.resources) && (c.resources as any[]).length > 0) count++;
      return sum + count;
    }, 0);

    // Topic-level resources for topics without clips (e.g. product_101 / Approach)
    const TOPIC_RESOURCES: Record<string, Array<{ label: string; url: string; type: string }>> = {
      product_101: [
        { label: "🎓 Academy: Getting Started with Analytics", url: "https://academy.amplitude.com/amplitude-getting-started-with-analytics", type: "academy" },
        { label: "🎓 Academy: Experiment & Statsig", url: "https://academy.amplitude.com/getting-started-with-amplitude-experiment-learning-path", type: "academy" },
        { label: "🎓 Academy: Statsig Overview", url: "https://academy.amplitude.com/statsig-overview", type: "academy" },
        { label: "🎓 Academy: Session Replay", url: "https://academy.amplitude.com/contextualize-user-experience-with-session-replay", type: "academy" },
        { label: "🎓 Academy: Guides & Surveys", url: "https://academy.amplitude.com/engage-your-users-with-guides-and-surveys", type: "academy" },
        { label: "🡠 Wheel & Deal Simulation", url: "https://app.superblocks.com/code-mode/applications/fef97ebe-4fb9-401f-b97c-c52c1693b31b/", type: "app" },
        { label: "🔭 Spekit: Platform & Products Hub", url: "https://app.spekit.co/app/wiki/?&topic=1d04d90d-e516-408c-bab2-837788fed772&tag=Platform%20and%20Products", type: "spekit" },
        { label: "🔭 Spekit: cAMP 101 Cheat Sheet", url: "https://app.spekit.co/app/wiki/asset/8a45c361-c2a2-4f57-95ec-6c09a93e8d0d?type=asset&expanded=true", type: "spekit" },
        { label: "🔭 Spekit: Use Case Library", url: "https://app.spekit.co/app/wiki/asset/a36c9b70-dfb7-440d-be25-b2b7060b1728?type=asset&expanded=true", type: "spekit" },
        { label: "📝 cAMP 101 Study Guide", url: "https://docs.google.com/document/d/1ty44HjkNk3Wxc4UqO9yfmuErq-aaZcwwcN22qAf7A5o/edit?tab=t.0", type: "gdrive" },
        { label: "🔭 Spekit: Getting Started with Amplitude", url: "https://app.spekit.co/app/wiki/asset/fdc1993a-7446-457d-881c-5ed1069f42ef?type=asset&expanded=true", type: "spekit" },
        { label: "📊 GTM POD Model Deck", url: "https://docs.google.com/presentation/d/1WF9CXT9P5pI8CoxAxvBJKFX8Oe9F1H3S30hDVWeJPgY/edit?slide=id.p1#slide=id.p1", type: "slides" },
        { label: "🔭 Spekit: Amplitude Demo Environments", url: "https://app.spekit.co/app/wiki/asset/5044cec5-ccef-45b4-9ad8-27e7fe81b7ce?type=asset&expanded=true", type: "spekit" },
      ],
    };
    const topicResources = TOPIC_RESOURCES[topicKey] ?? [];

    // Structured data for product_101 tile layout
    const ACADEMY_COURSES: Record<string, Array<{ label: string; url: string }>> = {
      product_101: [
        { label: "Analytics", url: "https://academy.amplitude.com/amplitude-getting-started-with-analytics" },
        { label: "Experiment & Statsig", url: "https://academy.amplitude.com/getting-started-with-amplitude-experiment-learning-path" },
        { label: "Statsig Overview", url: "https://academy.amplitude.com/statsig-overview" },
        { label: "Session Replay", url: "https://academy.amplitude.com/contextualize-user-experience-with-session-replay" },
        { label: "Guides & Surveys", url: "https://academy.amplitude.com/engage-your-users-with-guides-and-surveys" },
      ],
    };

    const WHEEL_PRODUCTS: Record<string, string[]> = {
      product_101: [
        "Analytics",
        "Session Replay + Heatmaps",
        "Experimentation",
        "Guides & Surveys",
        "Statsig",
        "Activation",
        "AI Feedback",
        "AI Assistant",
      ],
    };

    const CAMP_GEAR: Record<string, Array<{ label: string; url: string; type: string }>> = {
      product_101: [
        { label: "Spekit: Platform & Products Hub", url: "https://app.spekit.co/app/wiki/?&topic=1d04d90d-e516-408c-bab2-837788fed772&tag=Platform%20and%20Products", type: "spekit" },
        { label: "Spekit: cAMP 101 Cheat Sheet", url: "https://app.spekit.co/app/wiki/asset/8a45c361-c2a2-4f57-95ec-6c09a93e8d0d?type=asset&expanded=true", type: "spekit" },
        { label: "Spekit: Use Case Library", url: "https://app.spekit.co/app/wiki/asset/a36c9b70-dfb7-440d-be25-b2b7060b1728?type=asset&expanded=true", type: "spekit" },
        { label: "cAMP 101 Study Guide", url: "https://docs.google.com/document/d/1ty44HjkNk3Wxc4UqO9yfmuErq-aaZcwwcN22qAf7A5o/edit?tab=t.0", type: "gdrive" },
        { label: "Spekit: Getting Started with Amplitude", url: "https://app.spekit.co/app/wiki/asset/fdc1993a-7446-457d-881c-5ed1069f42ef?type=asset&expanded=true", type: "spekit" },
        { label: "GTM POD Model Deck", url: "https://docs.google.com/presentation/d/1WF9CXT9P5pI8CoxAxvBJKFX8Oe9F1H3S30hDVWeJPgY/edit?slide=id.p1#slide=id.p1", type: "slides" },
        { label: "Spekit: Amplitude Demo Environments", url: "https://app.spekit.co/app/wiki/asset/5044cec5-ccef-45b4-9ad8-27e7fe81b7ce?type=asset&expanded=true", type: "spekit" },
      ],
    };

    const academyCourses = (ACADEMY_COURSES[topicKey] ?? []).map(c => ({
      ...c,
      screenshotUploaded: false,
      notes: null as string | null,
    }));
    const wheelProducts = (WHEEL_PRODUCTS[topicKey] ?? []).map(name => ({
      name,
      flaggedForRemoval: false,
    }));
    const campGearResources = CAMP_GEAR[topicKey] ?? [];

    return {
      topic: {
        topicKey: meta.topic_key,
        dayLabel: meta.day_label,
        title: meta.title,
        emoji: meta.emoji,
        pathLabel: meta.path_label,
        hasVideo: meta.has_video,
        summary: meta.summary,
        learningObjectives: (meta.learning_objectives ?? []) as string[],
        smes: (meta.smes ?? []) as Array<{ name: string; title: string; note?: string | null }>,
      },
      clips: enrichedClips,
      approvedSections,
      peerProgress: peers.map(p => ({
        viewerName: p.viewer_name,
        approvedCount: p.approved_count,
        totalSections,
        signedOff: p.signed_off,
      })),
      topicResources,
      academyCourses,
      wheelProducts,
      campGearResources,
    };
  },
});
