import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const CLIP_1_ID = "9d023d60-9cf5-4d9a-8907-d59055edec33";

const CountRow = z.object({ total: z.coerce.number(), with_feedback: z.coerce.number() });

// Clip 1 (ICP) feedback — the only 10 questions with null feedback.
// Source: server/seed-data/trail-markers.json + search-rescue.json
const clip1Feedback = [
  // Trail Markers (is_recovery = false)
  { so: 1, rec: false, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Michelle listed the five key industries as retail and e-commerce, B2B SaaS (technology), financial services, media and entertainment, and healthcare. Travel, government, and telecom were mentioned by attendees as industries they had previously sold into — but are not among Amplitude's five focus industries." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Michelle listed the five key industries as retail and e-commerce, B2B SaaS (technology), financial services, media and entertainment, and healthcare. Travel, government, and telecom were mentioned by attendees as industries they had previously sold into — but are not among Amplitude's five focus industries." } },
  { so: 2, rec: false, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Michelle stated that value maps are created for deals at $250,000 or higher and described them as 'basically a requirement' at that threshold. She also noted they are useful beyond closing — they serve as a great handoff resource for the customer success manager." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Michelle stated that value maps are created for deals at $250,000 or higher and described them as 'basically a requirement' at that threshold. She also noted they are useful beyond closing — they serve as a great handoff resource for the customer success manager." } },
  { so: 3, rec: false, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Julia listed three common PM challenges: blind spots into user behavior, metric overload from tracking too many metrics, and slow feedback loops that make validating ideas difficult. Budget authority and Salesforce integration were not mentioned as PM challenges in this session." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Julia listed three common PM challenges: blind spots into user behavior, metric overload from tracking too many metrics, and slow feedback loops that make validating ideas difficult. Budget authority and Salesforce integration were not mentioned as PM challenges in this session." } },
  { so: 4, rec: false, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "In the roleplay, Michelle's character explained she was 60% through her backlog of ad hoc requests from last quarter and felt like she was 'reinventing the wheel.' She said: 'I would rather spend my time digging into deeper analyses that you all can't get from a simple dashboard. But without self-serve analytics, I feel like I'm the bottleneck.'" }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "In the roleplay, Michelle's character explained she was 60% through her backlog of ad hoc requests from last quarter and felt like she was 'reinventing the wheel.' She said: 'I would rather spend my time digging into deeper analyses that you all can't get from a simple dashboard. But without self-serve analytics, I feel like I'm the bottleneck.'" } },
  { so: 5, rec: false, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Michelle described the 'honest reporter' as the analyst focused on pulling reports and presenting KPIs, and what she called internally 'the back ender' — the data engineer focused on what's under the hood: integrations, pipelines, and questions like whether Amplitude can connect with Snowflake." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Michelle described the 'honest reporter' as the analyst focused on pulling reports and presenting KPIs, and what she called internally 'the back ender' — the data engineer focused on what's under the hood: integrations, pipelines, and questions like whether Amplitude can connect with Snowflake." } },
  // Search & Rescue (is_recovery = true)
  { so: 1, rec: true, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Michelle specified that for enterprise and emerging enterprise, the top three industries are technology (which includes B2B SaaS — she noted it is labeled 'technology' in Salesforce), retail, and financial services. For velocity, the top three shift slightly to technology, retail, and healthcare." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Michelle specified that for enterprise and emerging enterprise, the top three industries are technology (which includes B2B SaaS — she noted it is labeled 'technology' in Salesforce), retail, and financial services. For velocity, the top three shift slightly to technology, retail, and healthcare." } },
  { so: 2, rec: true, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Julia stated that about 75% of users and 65% of buyers are represented in the core personas discussed in the session — product, data, and marketing. She used this statistic to explain why understanding these personas matters for the AEs in the room." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Julia stated that about 75% of users and 65% of buyers are represented in the core personas discussed in the session — product, data, and marketing. She used this statistic to explain why understanding these personas matters for the AEs in the room." } },
  { so: 3, rec: true, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "After some debate in the debrief — with attendees suggesting retention, acquisition, and all three — Julia and the group agreed the primary value driver in the roleplay was acquisition, because the marketing character was focused on understanding how users from her latest campaign were converting on product features." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "After some debate in the debrief — with attendees suggesting retention, acquisition, and all three — Julia and the group agreed the primary value driver in the roleplay was acquisition, because the marketing character was focused on understanding how users from her latest campaign were converting on product features." } },
  { so: 4, rec: true, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Michelle explained that industry use case cheat sheets are aligned by value driver — acquisition, monetization, and retention — which she described as 'the trifecta of things that we need to know and love here.' The cheat sheets map industry-specific use cases to these three drivers." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Michelle explained that industry use case cheat sheets are aligned by value driver — acquisition, monetization, and retention — which she described as 'the trifecta of things that we need to know and love here.' The cheat sheets map industry-specific use cases to these three drivers." } },
  { so: 5, rec: true, cf: { emoji: "🌲", label: "Forest Preserver! Correct:", explanation: "Julia said: 'One thing about marketing is that we do always have a budget. So I think if you're able to make a case to a marketer, there's like a better chance of you figuring out a way to get a deal to happen because product teams have budget, but marketers definitely have more budget.' She positioned this as a reason landing with product and expanding to marketing is a strong strategy." }, if_: { emoji: "🔥", label: "Fire Starter! Incorrect:", explanation: "Julia said: 'One thing about marketing is that we do always have a budget. So I think if you're able to make a case to a marketer, there's like a better chance of you figuring out a way to get a deal to happen because product teams have budget, but marketers definitely have more budget.' She positioned this as a reason landing with product and expanding to marketing is a strong strategy." } },
];

export default api({
  name: "BackfillFeedback",
  description: "Backfills correct_feedback and incorrect_feedback for Clip 1 questions",

  integrations: { db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    updated: z.number(),
    verificationPassed: z.boolean(),
    totalQuestions: z.number(),
    questionsWithFeedback: z.number(),
  }),

  async run(ctx) {
    let updated = 0;

    for (const q of clip1Feedback) {
      await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_questions
         SET correct_feedback = $1, incorrect_feedback = $2
         WHERE clip_id = $3 AND sort_order = $4 AND is_recovery = $5`,
        [JSON.stringify(q.cf), JSON.stringify(q.if_), CLIP_1_ID, q.so, q.rec],
        { label: `Clip1 ${q.rec ? "SR" : "TM"} Q${q.so}` }
      );
      updated++;
    }

    // Verify ALL 165 questions now have feedback
    const verification = await ctx.integrations.db.query(
      `SELECT COUNT(*) as total, COUNT(correct_feedback) as with_feedback FROM cliptracker_v2_questions`,
      CountRow,
      undefined,
      { label: "Verify feedback coverage" }
    );

    return {
      updated,
      verificationPassed: verification[0].total === verification[0].with_feedback,
      totalQuestions: verification[0].total,
      questionsWithFeedback: verification[0].with_feedback,
    };
  },
});
