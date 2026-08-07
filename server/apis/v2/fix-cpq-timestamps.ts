import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "FixCpqTimestamps",
  description: "Fixes Deal Desk & CPQ trail marker timestamps that fire before content is explained",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    updates: z.array(z.object({ question: z.string(), oldSeconds: z.number(), newSeconds: z.number() })),
  }),

  async run(ctx) {
    const updates: { question: string; oldSeconds: number; newSeconds: number }[] = [];

    // Q1: PPL selection & quote name — was 189s (3:09), content covered ~3:30-5:00
    // Push to 310s (5:10) — after quote name discussion
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_questions SET trigger_at_seconds = 310 WHERE id = 'd7b21f45-5b89-4f66-ae18-9c6f1ccd07ca'`,
      undefined,
      { label: "Fix Q1 timestamp: 189s → 310s" }
    );
    updates.push({ question: "Q1: PPL selection & quote name", oldSeconds: 189, newSeconds: 310 });

    // Q2: Events/MTUs & usage term — was 416s (6:56), Events/MTUs not discussed until ~490-540s
    // Push to 560s (9:20) — after Events/MTUs package selection
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_questions SET trigger_at_seconds = 560 WHERE id = 'd3251897-5178-40fb-a797-d42386cabaae'`,
      undefined,
      { label: "Fix Q2 timestamp: 416s → 560s" }
    );
    updates.push({ question: "Q2: Events/MTUs & usage term", oldSeconds: 416, newSeconds: 560 });

    return { success: true, updates };
  },
});
