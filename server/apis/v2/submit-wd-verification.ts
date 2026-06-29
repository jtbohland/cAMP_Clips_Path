import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const VALID_PRODUCTS = [
  'Analytics',
  'Experimentation',
  'Guides & Surveys',
  'Activation',
  'AI Feedback',
  'AI Assistant',
  'Session Replay & Heat Maps',
] as const;

const VALID_SCENARIOS = [
  'Tell Me About It',
  'Handle the Objection',
  'Scenario',
  'Challenger Play',
] as const;

export default api({
  name: "SubmitWdVerification",
  description: "Submits Wheel & Deal verification with validated product, scenario, and score",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    product: z.string().min(1),
    scenario: z.string().min(1),
    score: z.number().int().min(4).max(12),
  }),

  output: z.object({
    success: z.boolean(),
    alreadySubmitted: z.boolean(),
    validationError: z.string().nullable(),
  }),

  async run(ctx, { viewerId, product, scenario, score }) {
    // Validate product against allowed list
    if (!VALID_PRODUCTS.includes(product as any)) {
      return {
        success: false,
        alreadySubmitted: false,
        validationError: `Invalid product: "${product}". Valid options: ${VALID_PRODUCTS.join(', ')}`,
      };
    }

    // Validate scenario against allowed list
    if (!VALID_SCENARIOS.includes(scenario as any)) {
      return {
        success: false,
        alreadySubmitted: false,
        validationError: `Invalid scenario: "${scenario}". Valid options: ${VALID_SCENARIOS.join(', ')}`,
      };
    }

    const CountSchema = z.object({ count: z.coerce.number() });

    // Check if already submitted
    const existingCheck = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_wd_verifications
       WHERE viewer_id = $1`,
      CountSchema,
      [viewerId],
      { label: "Check existing W&D verification" }
    );

    if (existingCheck[0]?.count > 0) {
      return { success: true, alreadySubmitted: true, validationError: null };
    }

    // Insert verification
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_wd_verifications (viewer_id, product, scenario, score)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (viewer_id) DO NOTHING`,
      [viewerId, product, scenario, score],
      { label: "Insert W&D verification" }
    );

    ctx.log.info("W&D verification submitted", { viewerId, product, scenario, score });
    return { success: true, alreadySubmitted: false, validationError: null };
  },
});
