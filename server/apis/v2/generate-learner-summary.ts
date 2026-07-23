import { api, z, anthropic } from "@superblocksteam/sdk-api";

const ANTHROPIC_INTEGRATION = "c7c693c4-0472-4c6b-952c-122c8d884281";

const SYSTEM_PROMPT = `You are a coaching assistant for cAMP (Sales Academy), an internal new hire training program. You analyze learner progress data and write concise, professional snapshot summaries for the training manager.

Your summaries are:
- 1–2 sentences MAX (short paragraph, no bullet points)
- Written in plain English, suitable to forward to a manager or learner
- Focused on: what they've done, pacing status, notable wins, and any concerns or red flags
- Honest but constructive — flag issues clearly without being harsh
- Action-oriented when relevant (e.g., "needs to close the gap on X by Y")

Tone: professional, direct, warm. Like a sherpa giving a quick status update.`;

const MessageResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
    })
  ),
});

export default api({
  name: "GenerateLearnerSummary",
  description: "Generates a 1-paragraph AI coaching summary for a learner using Anthropic Claude",

  integrations: {
    ai: anthropic(ANTHROPIC_INTEGRATION),
  },

  input: z.object({
    learnerName: z.string(),
    role: z.string(),
    timezone: z.string().nullable(),
    managerName: z.string().nullable(),
    ascentDay1: z.string().nullable(),
    summitDay: z.string().nullable(),
    pacingStatus: z.string(),
    daysBehind: z.number(),
    topicsCompleted: z.number(),
    totalTopics: z.number(),
    clipsCompleted: z.number(),
    totalClips: z.number(),
    totalXp: z.number(),
    tierName: z.string(),
    badgeCount: z.number(),
    clipScoreAvg: z.number().nullable(),
    firstAttemptAvg: z.number().nullable(),
    recoveryAvg: z.number().nullable(),
    wtsCount: z.number(),
    srCount: z.number(),
    gearClicks: z.number(),
    approachComplete: z.boolean(),
    approachCompletedCount: z.number(),
    journalCount: z.number(),
    lastLoginAt: z.string().nullable(),
    isAnchorFailure: z.boolean(),
    ascentAdjustmentDay: z.string().nullable(),
    extensionDays: z.number(),
  }),

  output: z.object({
    summary: z.string(),
  }),

  async run(ctx, input) {
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const pacingLabel: Record<string, string> = {
      summit_bound: "On pace (Summit Bound)",
      off_the_trail: "Slightly behind (Off the Trail)",
      lost_in_the_woods: "Behind (Lost in the Woods)",
      rockslide: "Significantly behind (Rockslide)",
      avalanche_warning: "Critically behind (Avalanche Warning)",
      anchor_failure: "ANCHOR FAILURE — past summit day, still incomplete",
      completed: "Completed cAMP",
      not_started: "Not started",
    };

    const prompt = `Today is ${today}. Write a coaching snapshot for this new hire:

Name: ${input.learnerName}
Role: ${input.role}${input.timezone ? ` (${input.timezone})` : ""}
Manager: ${input.managerName ?? "Unknown"}
Ascent started: ${input.ascentDay1 ?? "Not started"}
Summit day: ${input.summitDay ?? "TBD"}${input.extensionDays > 0 ? ` (+${input.extensionDays} extension days)` : ""}

PACING: ${pacingLabel[input.pacingStatus] ?? input.pacingStatus}${input.daysBehind > 0 ? ` — ${input.daysBehind} day(s) behind` : ""}${input.isAnchorFailure && input.ascentAdjustmentDay ? ` — Adjustment day: ${input.ascentAdjustmentDay}` : ""}

PROGRESS:
- Ascent topics: ${input.topicsCompleted}/${input.totalTopics} complete
- Clips completed: ${input.clipsCompleted}/${input.totalClips}
- Approach (Week 1): ${input.approachComplete ? "Complete ✓" : `${input.approachCompletedCount}/8 modules done`}

PERFORMANCE:
- XP: ${input.totalXp} (${input.tierName})
- Badges earned: ${input.badgeCount}
- Overall engagement avg: ${input.clipScoreAvg != null ? `${input.clipScoreAvg}%` : "N/A"}
- First attempt avg: ${input.firstAttemptAvg != null ? `${input.firstAttemptAvg}%` : "N/A"}
- Recovery avg (S&R): ${input.recoveryAvg != null ? `${input.recoveryAvg}%` : "N/A"}
- Weather the Storm events: ${input.wtsCount}
- Search & Rescue activations: ${input.srCount}

ENGAGEMENT:
- cAMP Gear clicks: ${input.gearClicks}
- Journal entries submitted: ${input.journalCount}
- Last login: ${input.lastLoginAt ? new Date(input.lastLoginAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown"}

Write a 1–2 sentence summary (no bullet points) covering their overall status, notable wins, and any concerns or red flags. Keep it copy-pasteable for a manager or the learner themselves.`;

    const result = await ctx.integrations.ai.apiRequest(
      {
        method: "POST",
        path: "/v1/messages",
        body: {
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        },
      },
      { response: MessageResponseSchema },
      { label: "Generate learner summary" }
    );

    const text = result.content
      .filter(c => c.type === "text")
      .map(c => c.text ?? "")
      .join("")
      .trim();

    return { summary: text };
  },
});
