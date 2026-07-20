import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdatePartnerResources",
  description: "One-time fix: update Leveraging Partners cAMP Gear resources.",
  integrations: {
    db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ rowsUpdated: z.number() }),
  async run(ctx) {
    const newResources = JSON.stringify([
      {
        label: "Partnerships + Sales 2026",
        type: "slides",
        url: "https://docs.google.com/presentation/d/1rveB2VaUwFO2NDFagOFfSpuOCg6WUjs8_xqkN8xzc1w/edit?slide=id.g3977c0ae5fc_4_606#slide=id.g3977c0ae5fc_4_606",
      },
      {
        label: "PSP and Implementation Pitch Slides - 2026",
        type: "slides",
        url: "https://docs.google.com/presentation/d/1JJlncSiWqwnxVLbTuuZrpHIgeje0RkGQobWFqlrM_f4/edit?slide=id.g3c587841949_0_203#slide=id.g3c587841949_0_203",
      },
      {
        label: "#partnershipsteam",
        type: "slack",
        url: "https://amplitude.slack.com/archives/C983QRW77",
      },
    ]);

    const result = await ctx.integrations.db.execute(
      "UPDATE cliptracker_v2_clips SET resources = $1::jsonb WHERE id = $2",
      [newResources, "4e9e7ca4-5eae-439c-9ce7-b0d2923821ea"],
      { label: "Update Leveraging Partners resources" }
    );

    return { rowsUpdated: result.rowCount };
  },
});
