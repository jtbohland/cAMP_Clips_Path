import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// Standard product names (what gets saved). Learners can type them loosely —
// see normalizeProduct below.
const VALID_PRODUCTS = [
  'AI Feedback',
  'Analytics',
  'Session Replay + Heatmaps',
  'Experimentation',
  'Guides & Surveys',
  'Statsig',
  'Activation',
] as const;

/** Loose form: lowercase, "+"/"&"/"and" all become "&", "heat maps" → "heatmaps", single spaces */
function looseKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*(\+|&|\band\b)\s*/g, " & ")
    .replace(/heat\s+maps/g, "heatmaps")
    .replace(/\s+/g, " ")
    .trim();
}

const PRODUCT_BY_KEY = new Map<string, string>(VALID_PRODUCTS.map((p) => [looseKey(p), p]));

/** Returns the standard product name, or null if it isn't a Wheel & Deal product */
function normalizeProduct(input: string): string | null {
  return PRODUCT_BY_KEY.get(looseKey(input)) ?? null;
}

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
    score: z.number().int(),
    aiCoachScore: z.number().int(),
  }),

  output: z.object({
    success: z.boolean(),
    alreadySubmitted: z.boolean(),
    validationError: z.string().nullable(),
  }),

  async run(ctx, { viewerId, product: rawProduct, scenario, score, aiCoachScore }) {
    // Validate product against allowed list (forgiving on +/&/and, spacing, capitalization)
    const product = normalizeProduct(rawProduct);
    if (!product) {
      return {
        success: false,
        alreadySubmitted: false,
        validationError: `"${rawProduct}" is not a valid Wheel & Deal product. Double-check the product from your spin and try again.`,
      };
    }

    // Validate scenario against allowed list
    if (!VALID_SCENARIOS.includes(scenario as any)) {
      return {
        success: false,
        alreadySubmitted: false,
        validationError: `"${scenario}" is not a valid challenge type. Select the correct option from the dropdown.`,
      };
    }

    const CountSchema = z.object({ count: z.coerce.number() });

    // Validate score range
    if (score < 4 || score > 15) {
      return {
        success: false,
        alreadySubmitted: false,
        validationError: `That score doesn't look right. Complete a Wheel & Deal spin with your manager and enter the score from the app.`,
      };
    }

    // Validate AI Coach score range
    if (aiCoachScore < 4 || aiCoachScore > 15) {
      return {
        success: false,
        alreadySubmitted: false,
        validationError: `AI Coach score must be between 4 and 15. Enter the score from your AI Coach session.`,
      };
    }

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
      `INSERT INTO cliptracker_v2_wd_verifications (viewer_id, product, scenario, score, ai_coach_score)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (viewer_id) DO NOTHING`,
      [viewerId, product, scenario, score, aiCoachScore],
      { label: "Insert W&D verification" }
    );

    // Award 10 XP for Approach Accomplishment (Wheel & Deal module)
    const ClipIdSchema = z.object({ id: z.string() });
    const sentinelClip = await ctx.integrations.db.query(
      `SELECT id FROM cliptracker_v2_clips WHERE status = 'live' ORDER BY sort_order ASC LIMIT 1`,
      ClipIdSchema, [], { label: "Get sentinel clip for approach module XP" }
    );
    if (!sentinelClip[0]?.id) throw new Error("No live clip found for approach XP sentinel");
    const approachClipId = sentinelClip[0].id;

    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
       VALUES ($1, $2, 'base', 'approach_module_wheel_deal', 10)
       ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
      [viewerId, approachClipId],
      { label: "Award approach module XP: wheel_deal" }
    );

    ctx.log.info("W&D verification submitted + XP awarded", { viewerId, product, scenario, score, aiCoachScore });
    return { success: true, alreadySubmitted: false, validationError: null };
  },
});
