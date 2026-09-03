import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupAuditSchema",
  description: "Creates Ascent Audit tables for the SME content audit system",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    // ── 1. Audit cycles (quarterly + ad-hoc) ───────────────────────
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_audit_cycles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label TEXT NOT NULL,
        cycle_type TEXT NOT NULL DEFAULT 'quarterly' CHECK (cycle_type IN ('quarterly', 'ad_hoc')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
        deadline TIMESTAMPTZ,
        description TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      )`,
      undefined,
      { label: "Create audit_cycles table" }
    );
    ctx.log.info("Created cliptracker_v2_audit_cycles");

    // ── 2. SME assignments (who owns which topics) ─────────────────
    // topic_key is a stable identifier like "day3" or "day5_sdr_cold_calling"
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_sme_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id) ON DELETE CASCADE,
        topic_key TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(viewer_id, topic_key)
      )`,
      undefined,
      { label: "Create sme_assignments table" }
    );
    ctx.log.info("Created cliptracker_v2_sme_assignments");

    // ── 3. Audit sign-offs ─────────────────────────────────────────
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_audit_signoffs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id) ON DELETE CASCADE,
        topic_key TEXT NOT NULL,
        cycle_id UUID REFERENCES cliptracker_v2_audit_cycles(id),
        notes TEXT,
        signed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(viewer_id, topic_key, cycle_id)
      )`,
      undefined,
      { label: "Create audit_signoffs table" }
    );
    ctx.log.info("Created cliptracker_v2_audit_signoffs");

    // ── 4. Audit changelog (foundation for Phase 2 rollback) ───────
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_audit_changelog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id) ON DELETE CASCADE,
        cycle_id UUID REFERENCES cliptracker_v2_audit_cycles(id),
        topic_key TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        old_value JSONB,
        new_value JSONB,
        change_type TEXT NOT NULL DEFAULT 'update' CHECK (change_type IN ('update', 'add', 'remove')),
        reverted_at TIMESTAMPTZ,
        reverted_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create audit_changelog table" }
    );
    ctx.log.info("Created cliptracker_v2_audit_changelog");

    // ── 5. Day metadata (summaries, objectives, SME lists) ─────────
    // Migrates content from hardcoded topicDays.ts into the DB
    await ctx.integrations.apps_db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_day_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_key TEXT NOT NULL UNIQUE,
        day_label TEXT NOT NULL,
        title TEXT NOT NULL,
        emoji TEXT,
        summary TEXT,
        learning_objectives JSONB DEFAULT '[]',
        smes JSONB DEFAULT '[]',
        path_label TEXT,
        has_video BOOLEAN DEFAULT true,
        sort_orders INT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create day_metadata table" }
    );
    ctx.log.info("Created cliptracker_v2_day_metadata");

    return { success: true, message: "All 5 audit tables created successfully" };
  },
});
