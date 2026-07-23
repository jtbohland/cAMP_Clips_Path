import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * One-time migration: add extension_days column and set initial values
 * for Kabir Rai (5 days) and Benjamin Singh (5 days).
 */
export default api({
  name: "AddExtensionDays",
  description: "Adds extension_days column and sets values for Kabir & Ben",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    columnAdded: z.boolean(),
    rowsUpdated: z.number(),
  }),

  async run(ctx) {
    // Add the column (idempotent)
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_viewers ADD COLUMN IF NOT EXISTS extension_days INTEGER DEFAULT 0`,
      undefined,
      { label: "Add extension_days column" }
    );

    // Set extension_days = 5 for Kabir Rai, Benjamin Singh, and Levi Verry (Portland trip July 13-17)
    const result = await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET extension_days = 5 WHERE id IN ($1, $2, $3)`,
      [
        "273867c6-76b7-49af-8b6e-7501e0c5222f",  // Kabir Rai
        "66b8a6ac-3bee-49c5-865c-e187ac73ac02",   // Benjamin Singh
        "8654b855-1eaf-465c-91b0-2c20f889a33e",   // Levi Verry
      ],
      { label: "Set extension_days for Kabir, Ben & Levi" }
    );

    ctx.log.info("Extension days migration complete", { rowsUpdated: result.rowCount });

    return {
      columnAdded: true,
      rowsUpdated: result.rowCount ?? 0,
    };
  },
});
