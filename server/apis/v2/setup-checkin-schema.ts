import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupCheckinSchema",
  description: "Creates check-in email, manager feedback, and topic reflection tables",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    tablesCreated: z.array(z.string()),
  }),

  async run(ctx) {
    const tablesCreated: string[] = [];

    // 1. Add check-in sent columns to viewers table (safe ALTERs — column added only if missing)
    const checkColumns = [
      { col: "approach_checkin_sent_at", type: "TIMESTAMPTZ" },
      { col: "week2_checkin_sent_at", type: "TIMESTAMPTZ" },
      { col: "week3_checkin_sent_at", type: "TIMESTAMPTZ" },
    ];

    const ColCountSchema = z.object({ exists: z.coerce.number() });

    for (const { col, type } of checkColumns) {
      const rows = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int AS exists FROM information_schema.columns
         WHERE table_name = 'cliptracker_v2_viewers' AND column_name = $1`,
        ColCountSchema,
        [col],
        { label: `Check if ${col} exists` }
      );
      if (rows[0].exists === 0) {
        await ctx.integrations.db.execute(
          `ALTER TABLE cliptracker_v2_viewers ADD COLUMN ${col} ${type}`,
          undefined,
          { label: `Add ${col} column` }
        );
        tablesCreated.push(`viewers.${col}`);
      }
    }

    // 2. Also add first_achievement_shown column to track if the first achievement modal has been displayed
    const faRows = await ctx.integrations.db.query(
      `SELECT COUNT(*)::int AS exists FROM information_schema.columns
       WHERE table_name = 'cliptracker_v2_viewers' AND column_name = 'first_achievement_shown'`,
      ColCountSchema,
      [],
      { label: "Check first_achievement_shown exists" }
    );
    if (faRows[0].exists === 0) {
      await ctx.integrations.db.execute(
        `ALTER TABLE cliptracker_v2_viewers ADD COLUMN first_achievement_shown BOOLEAN DEFAULT FALSE`,
        undefined,
        { label: "Add first_achievement_shown column" }
      );
      tablesCreated.push("viewers.first_achievement_shown");
    }

    // 3. Create checkin_emails tracking table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_checkin_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        checkin_type TEXT NOT NULL,
        manager_email TEXT,
        belay_buddy_email TEXT,
        feedback_token TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(viewer_id, checkin_type)
      )`,
      undefined,
      { label: "Create checkin_emails table" }
    );
    tablesCreated.push("cliptracker_v2_checkin_emails");

    // 4. Create manager_feedback table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_manager_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        checkin_type TEXT NOT NULL,
        manager_email TEXT,
        response TEXT NOT NULL,
        comment TEXT,
        token_hash TEXT NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create manager_feedback table" }
    );
    tablesCreated.push("cliptracker_v2_manager_feedback");

    // 5. Create topic_reflections table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_topic_reflections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        topic_day TEXT NOT NULL,
        question_1 TEXT NOT NULL,
        answer_1 TEXT NOT NULL,
        question_2 TEXT NOT NULL,
        answer_2 TEXT NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(viewer_id, topic_day)
      )`,
      undefined,
      { label: "Create topic_reflections table" }
    );
    tablesCreated.push("cliptracker_v2_topic_reflections");

    ctx.log.info("Checkin schema setup complete", { tablesCreated });
    return { success: true, tablesCreated };
  },
});
