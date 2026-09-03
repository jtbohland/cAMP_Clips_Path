import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ManageAuditCycle",
  description: "Create, close, or list audit cycles (admin only)",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({
    action: z.enum(["create", "close", "list"]),
    cycleId: z.string().uuid().nullable().optional(),
    label: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    cycleType: z.enum(["quarterly", "ad_hoc"]).optional(),
    createdBy: z.string().nullable().optional(),
  }),

  output: z.object({
    success: z.boolean(),
    cycles: z.array(z.object({
      id: z.string(),
      label: z.string(),
      cycleType: z.string(),
      status: z.string(),
      deadline: z.string().nullable(),
      description: z.string().nullable(),
      createdBy: z.string().nullable(),
      createdAt: z.string(),
      closedAt: z.string().nullable(),
      signoffCount: z.number(),
    })),
  }),

  async run(ctx, input) {
    const { action } = input;

    if (action === "create") {
      if (!input.label) throw new Error("Label is required for creating a cycle");
      await ctx.integrations.apps_db.execute(
        `INSERT INTO cliptracker_v2_audit_cycles (label, cycle_type, deadline, description, created_by)
         VALUES ($1, $2, $3::timestamptz, $4, $5)`,
        [input.label, input.cycleType ?? "quarterly", input.deadline ?? null, input.description ?? null, input.createdBy ?? null],
        { label: "Create audit cycle" }
      );
    }

    if (action === "close" && input.cycleId) {
      await ctx.integrations.apps_db.execute(
        `UPDATE cliptracker_v2_audit_cycles SET status = 'closed', closed_at = NOW() WHERE id = $1`,
        [input.cycleId],
        { label: "Close audit cycle" }
      );
    }

    // Always return current list of cycles
    const CycleRow = z.object({
      id: z.string(),
      label: z.string(),
      cycle_type: z.string(),
      status: z.string(),
      deadline: z.string().nullable(),
      description: z.string().nullable(),
      created_by: z.string().nullable(),
      created_at: z.string(),
      closed_at: z.string().nullable(),
      signoff_count: z.coerce.number(),
    });
    const rows = await ctx.integrations.apps_db.query(
      `SELECT c.id::text, c.label, c.cycle_type, c.status,
              c.deadline::text, c.description, c.created_by, c.created_at::text, c.closed_at::text,
              COUNT(s.id)::int as signoff_count
       FROM cliptracker_v2_audit_cycles c
       LEFT JOIN cliptracker_v2_audit_signoffs s ON s.cycle_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      CycleRow,
      undefined,
      { label: "List all cycles" }
    );

    return {
      success: true,
      cycles: rows.map(r => ({
        id: r.id,
        label: r.label,
        cycleType: r.cycle_type,
        status: r.status,
        deadline: r.deadline,
        description: r.description,
        createdBy: r.created_by,
        createdAt: r.created_at,
        closedAt: r.closed_at,
        signoffCount: r.signoff_count,
      })),
    };
  },
});
