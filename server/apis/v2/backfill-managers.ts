import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "BackfillManagers",
  description: "One-off backfill of manager_name and manager_email for active learners",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    updated: z.number(),
  }),

  async run(ctx) {
    const updates = [
      { email: "benjamin.singh@amplitude.com", managerName: "Kier Johnson", managerEmail: "kier.johnson@amplitude.com" },
      { email: "kabir.rai@amplitude.com", managerName: "Matt Bennett", managerEmail: "matthew.bennett@amplitude.com" },
      { email: "chris.english@amplitude.com", managerName: "Rob Bow", managerEmail: "robert@amplitude.com" },
      { email: "gabi.kassatly@amplitude.com", managerName: "Kier Johnson", managerEmail: "kier.johnson@amplitude.com" },
    ];

    let updated = 0;
    for (const u of updates) {
      const result = await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_viewers
         SET manager_name = $1, manager_email = $2
         WHERE email = $3`,
        [u.managerName, u.managerEmail, u.email],
        { label: `Backfill manager for ${u.email}` }
      );
      updated += result.rowCount;
    }

    ctx.log.info("Backfill complete", { updated });
    return { updated };
  },
});
