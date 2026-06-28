import { api, z, postgres } from "@superblocksteam/sdk-api";
// Import the SQL batch file as a raw string at build time (Vite ?raw import)
// @ts-ignore — Vite raw import; TS doesn't know about ?raw but it works at runtime
import sqlContent from "./rebalance-batch.sql?raw";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * ONE-TIME MIGRATION: Apply all 165 rebalanced MC option sets from rebalance-batch.sql.
 *
 * The SQL file is bundled via Vite's ?raw import — no filesystem access needed at runtime.
 * Each UPDATE is idempotent (it just overwrites the options column).
 *
 * DO NOT REMOVE after use — keep as an audit trail.
 */
export default api({
  name: "RebalanceQuestions",
  description:
    "One-time migration: apply 165 rebalanced MC options from rebalance-batch.sql",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    executed: z.number(),
    failed: z.number(),
    errors: z.array(z.string()),
  }),

  async run(ctx) {
    const content = sqlContent as string;

    // Split on semicolons; keep only non-empty UPDATE statements
    const statements = content
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.toUpperCase().startsWith("UPDATE"));

    ctx.log.info(
      `RebalanceQuestions: found ${statements.length} UPDATE statements`
    );

    let executed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const idMatch = stmt.match(/WHERE id = '([^']+)'/);
      const questionId = idMatch ? idMatch[1] : `stmt_${i + 1}`;

      try {
        await ctx.integrations.db.execute(stmt, undefined, {
          label: `Rebalance ${i + 1}/${statements.length} (${questionId.slice(0, 8)}…)`,
        });
        executed++;
      } catch (e) {
        failed++;
        const msg = `Q${i + 1} (${questionId}): ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        ctx.log.error("Update failed", { questionId, error: msg });
      }
    }

    ctx.log.info("Migration complete", { executed, failed });
    return { executed, failed, errors };
  },
});
