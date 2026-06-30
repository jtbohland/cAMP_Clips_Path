import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const VALID_RESPONSES = [
  "summit_bound",
  "acknowledged",
  "want_to_discuss",
  "have_concerns",
] as const;

export default api({
  name: "SubmitManagerFeedback",
  description: "Submits manager feedback for a check-in email via token validation",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    token: z.string().min(1),
    response: z.enum(VALID_RESPONSES),
    comment: z.string().max(500).nullable(),
  }),

  output: z.object({
    success: z.boolean(),
    error: z.string().nullable(),
    learnerName: z.string().nullable(),
  }),

  async run(ctx, { token, response, comment }) {
    // Look up the checkin email by feedback token to find the viewer
    const TokenRow = z.object({
      id: z.string(),
      viewer_id: z.string(),
      checkin_type: z.string(),
      manager_email: z.string().nullable(),
    });

    const tokenRows = await ctx.integrations.db.query(
      `SELECT id, viewer_id, checkin_type, manager_email
       FROM cliptracker_v2_checkin_emails
       WHERE feedback_token = $1
       LIMIT 1`,
      TokenRow,
      [token],
      { label: "Lookup checkin email by token" }
    );

    if (tokenRows.length === 0) {
      return {
        success: false,
        error: "Invalid or expired feedback link. Please contact JT if you need a new link.",
        learnerName: null,
      };
    }

    const checkinEmail = tokenRows[0];

    // Get the learner's name for confirmation
    const NameRow = z.object({ name: z.string() });
    const nameRows = await ctx.integrations.db.query(
      `SELECT name FROM cliptracker_v2_viewers WHERE id = $1 LIMIT 1`,
      NameRow,
      [checkinEmail.viewer_id],
      { label: "Get learner name" }
    );

    const learnerName = nameRows[0]?.name ?? "Unknown";

    // Simple hash of token for storage (not cryptographic, just for reference)
    const tokenHash = token.slice(0, 8) + "..." + token.slice(-4);

    // Check for duplicate submission
    const CountSchema = z.object({ count: z.coerce.number() });
    const existing = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS count FROM cliptracker_v2_manager_feedback
       WHERE viewer_id = $1 AND checkin_type = $2`,
      CountSchema,
      [checkinEmail.viewer_id, checkinEmail.checkin_type],
      { label: "Check duplicate manager feedback" }
    );

    if (existing[0].count > 0) {
      return {
        success: true,
        error: null,
        learnerName,
      };
    }

    // Insert manager feedback
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_manager_feedback
        (viewer_id, checkin_type, manager_email, response, comment, token_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [checkinEmail.viewer_id, checkinEmail.checkin_type, checkinEmail.manager_email, response, comment, tokenHash],
      { label: "Insert manager feedback" }
    );

    ctx.log.info("Manager feedback submitted", {
      viewerId: checkinEmail.viewer_id,
      checkinType: checkinEmail.checkin_type,
      response,
    });

    return {
      success: true,
      error: null,
      learnerName,
    };
  },
});
