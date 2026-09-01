import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const MODULE_KEYS = ['meddpicc', 'camp101', 'challenger'] as const;

export default api({
  name: "SubmitModuleSignoff",
  description: "Submits a module sign-off with screenshot, reflection, and signature",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    moduleKey: z.enum(MODULE_KEYS),
    screenshotData: z.string().min(1),
    screenshotFilename: z.string().min(1),
    screenshotHash: z.string().min(1),
    reflectionPrompt: z.string().min(1),
    reflectionResponse: z.string().min(1),
    signature: z.string().min(1),
  }),

  output: z.object({
    success: z.boolean(),
    alreadySubmitted: z.boolean(),
  }),

  async run(ctx, { viewerId, moduleKey, screenshotData, screenshotFilename, screenshotHash, reflectionPrompt, reflectionResponse, signature }) {
    // Check for duplicate screenshot hash across ALL sign-offs for this viewer
    const CountSchema = z.object({ count: z.coerce.number() });
    const dupeCheck = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM (
        SELECT screenshot_hash FROM cliptracker_v2_module_signoffs WHERE viewer_id = $1
        UNION ALL
        SELECT screenshot_hash FROM cliptracker_v2_academy_screenshots WHERE viewer_id = $1
      ) all_hashes WHERE screenshot_hash = $2`,
      CountSchema,
      [viewerId, screenshotHash],
      { label: "Check screenshot hash dedup" }
    );

    if (dupeCheck[0]?.count > 0) {
      throw new Error("This screenshot has already been uploaded. Please use a unique screenshot for each section.");
    }

    // Check if already submitted
    const existingCheck = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_module_signoffs
       WHERE viewer_id = $1 AND module_key = $2`,
      CountSchema,
      [viewerId, moduleKey],
      { label: "Check existing sign-off" }
    );

    if (existingCheck[0]?.count > 0) {
      return { success: true, alreadySubmitted: true };
    }

    // Insert sign-off
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_module_signoffs
        (viewer_id, module_key, screenshot_data, screenshot_filename, screenshot_hash, reflection_prompt, reflection_response, signature)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (viewer_id, module_key) DO NOTHING`,
      [viewerId, moduleKey, screenshotData, screenshotFilename, screenshotHash, reflectionPrompt, reflectionResponse, signature],
      { label: "Insert module sign-off" }
    );

    // Award 10 XP for Approach Accomplishment
    // Use lowest sort_order live clip as sentinel (clip_id FK requires a real clip)
    const ClipIdSchema = z.object({ id: z.string() });
    const sentinelClip = await ctx.integrations.db.query(
      `SELECT id FROM cliptracker_v2_clips WHERE status = 'live' ORDER BY sort_order ASC LIMIT 1`,
      ClipIdSchema, [], { label: "Get sentinel clip for approach module XP" }
    );
    if (!sentinelClip[0]?.id) throw new Error("No live clip found for approach XP sentinel");
    const approachClipId = sentinelClip[0].id;

    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
       VALUES ($1, $2, 'base', $3, 10)
       ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
      [viewerId, approachClipId, `approach_module_${moduleKey}`],
      { label: `Award approach module XP: ${moduleKey}` }
    );

    ctx.log.info("Module sign-off submitted + XP awarded", { viewerId, moduleKey });
    return { success: true, alreadySubmitted: false };
  },
});
