import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "LogUploadFailure",
  description: "Records a failed screenshot upload in the audit log",

  integrations: {
    apps_database: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    uploadType: z.string().min(1).max(50),
    itemKey: z.string().min(1).max(100),
    attempt: z.number().int().min(1).max(5),
    errorCode: z.string().max(100).nullable(),
    errorMessage: z.string().max(1000),
    userAgent: z.string().max(500).nullable(),
  }),

  output: z.object({ logged: z.boolean() }),

  async run(ctx, { viewerId, uploadType, itemKey, attempt, errorCode, errorMessage, userAgent }) {
    await ctx.integrations.apps_database.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('upload_failure', $1, $2, $3, $4)`,
      [
        uploadType,
        viewerId,
        ctx.user.email ?? "unknown",
        JSON.stringify({ itemKey, attempt, errorCode, errorMessage, userAgent }),
      ],
      { label: "Log upload failure" }
    );
    ctx.log.warn("Upload failure", { viewerId, uploadType, itemKey, attempt, errorCode, errorMessage });
    return { logged: true };
  },
});
