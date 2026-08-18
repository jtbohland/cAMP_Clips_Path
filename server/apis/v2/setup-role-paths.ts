import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-shot migration for role-based learning paths (Phase 1).
 *
 * 1. Adds `roles` jsonb column to clips table (NULL = all roles).
 * 2. Re-spaces sort_orders from 1-20 → 10-200 for insertion gaps.
 * 3. Tags 7 clips that SDRs skip with explicit AE/PSM role lists.
 * 4. Inserts 3 new Ascent clips: Pod Tower (all), Cold Calling + Nooks (SDR).
 */
export default api({
  name: "SetupRolePaths",
  description: "Migration: role-based learning paths — column, sort gaps, tags, new clips",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    steps: z.array(z.string()),
  }),

  async run(ctx) {
    const steps: string[] = [];

    // Step 1: Add roles column
    await ctx.integrations.apps_db.execute(
      "ALTER TABLE cliptracker_v2_clips ADD COLUMN IF NOT EXISTS roles jsonb DEFAULT NULL",
      undefined,
      { label: "Add roles column" }
    );
    steps.push("Added roles column");

    // Step 2: Re-space sort_orders (1-20 → 10-200)
    // Only if they're currently in 1-20 range (idempotent check)
    const checkResult = await ctx.integrations.apps_db.query(
      "SELECT MAX(sort_order) as max_sort FROM cliptracker_v2_clips",
      z.object({ max_sort: z.coerce.number() }),
      undefined,
      { label: "Check current max sort_order" }
    );
    
    if (checkResult[0].max_sort <= 20) {
      await ctx.integrations.apps_db.execute(
        "UPDATE cliptracker_v2_clips SET sort_order = sort_order * 10",
        undefined,
        { label: "Re-space sort_orders ×10" }
      );
      steps.push("Re-spaced sort_orders (×10)");
    } else {
      steps.push("Sort_orders already re-spaced (max=" + checkResult[0].max_sort + ")");
    }

    // Step 3: Tag clips SDRs skip — set roles to AE/PSM-only list
    const aeOnlyRoles = JSON.stringify(["Velocity AE", "Emerging AE", "Majors AE", "Strategic AE", "PSM", "Renewals"]);
    
    // These are the 7 clips SDRs don't see:
    const sdrSkipClipIds = [
      "172cdf47-89cd-46f2-84c1-f6fbe66a8849",  // Renewal Operations
      "3c3dd2bd-9b0f-47cd-872b-74ef23f986c2",  // Forecasting
      "7049746a-1625-4de3-9fda-9aab03a37d5d",  // Forecasting (Intro to Forecasting Services)
      "f6199214-6659-4ae1-ae72-4b7aded915f2",  // Contract Lifecycle Management
      "b81ed1dd-d8a6-4089-a70c-cc5436f49883",  // Deal Desk & CPQ
      "f4ec8a47-302a-4c73-a930-e0b9d4417eff",  // Leveraging Solution Engineers
      "5b5dded3-1d97-410f-9e7a-83b5968ca652",  // Leveraging Professional Services
    ];

    for (const clipId of sdrSkipClipIds) {
      await ctx.integrations.apps_db.execute(
        "UPDATE cliptracker_v2_clips SET roles = $1::jsonb WHERE id = $2::uuid AND roles IS NULL",
        [aeOnlyRoles, clipId],
        { label: "Tag clip " + clipId.slice(0, 8) + " as AE-only" }
      );
    }
    steps.push("Tagged 7 clips as AE/PSM-only");

    // Step 4: Insert 3 new clips (idempotent — skip if title already exists)
    // Pod Tower — all roles, Day 3, after GTM Launch Pad (sort 40) → sort 45
    const podTowerResult = await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_clips (title, sort_order, day_label, week_number, status, video_url, duration_seconds)
       SELECT 'Pod Tower', 45, 'Day 3', 2, 'live', '', 0
       WHERE NOT EXISTS (SELECT 1 FROM cliptracker_v2_clips WHERE title = 'Pod Tower')`,
      undefined,
      { label: "Insert Pod Tower clip" }
    );
    steps.push("Pod Tower: " + (podTowerResult.rowCount > 0 ? "inserted" : "already exists"));

    // Cold Calling in an AI World — SDR-only, Day 5, sort 55
    const sdrOnlyRoles = JSON.stringify(["SDR"]);
    const coldCallingResult = await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_clips (title, sort_order, day_label, week_number, status, video_url, duration_seconds, roles)
       SELECT 'Cold Calling in an AI World', 55, 'Day 5', 2, 'live', '', 0, $1::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM cliptracker_v2_clips WHERE title = 'Cold Calling in an AI World')`,
      [sdrOnlyRoles],
      { label: "Insert Cold Calling clip" }
    );
    steps.push("Cold Calling: " + (coldCallingResult.rowCount > 0 ? "inserted" : "already exists"));

    // Making Calls with Nooks — SDR-only, Day 5, sort 56
    const nooksResult = await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_clips (title, sort_order, day_label, week_number, status, video_url, duration_seconds, roles)
       SELECT 'Making Calls with Nooks', 56, 'Day 5', 2, 'live', '', 0, $1::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM cliptracker_v2_clips WHERE title = 'Making Calls with Nooks')`,
      [sdrOnlyRoles],
      { label: "Insert Nooks clip" }
    );
    steps.push("Nooks: " + (nooksResult.rowCount > 0 ? "inserted" : "already exists"));

    ctx.log.info("SetupRolePaths complete: " + steps.join("; "));
    return { success: true, steps };
  },
});
