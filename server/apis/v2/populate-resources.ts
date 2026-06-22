import { api, z, postgres } from '@superblocksteam/sdk-api';

const APPS_DB = 'c6e32cf4-ca66-42ae-aeb3-58c84ffae574';

const RESOURCES_BY_SORT_ORDER: Record<number, Array<{ label: string; url: string; type: string }>> = {
  1: [
    { label: "📓 Google Slides — Day 1: ICPs", url: "https://docs.google.com/presentation/d/1i6jAipawDy9ER5Bls-FFdXdr4hQA41XKw-wYqK5RttE", type: "slides" },
    { label: "🐙 Industries Hub", url: "https://app.spekit.co/app/wiki/?topic=0a75288e-bbe4-423c-ae30-fd5703b8ad43&tag=Industries", type: "spekit" },
    { label: "🐙 Personas Hub", url: "https://app.spekit.co/app/wiki/?topic=240af8a2-52c3-4f30-ad21-fdcab0c093fe&tag=Personas", type: "spekit" },
    { label: "📚 Value Drivers", url: "https://docs.google.com/presentation/d/1ODJk8BUphrI5cgGSxxjj91xie0B9k2WiECGLnX9xwU0", type: "slides" },
    { label: "📚 Discovery Question Repository", url: "https://docs.google.com/document/d/11po0r9LxK_tiooyYb64bdDeqhIhRX_7k-HSlPppf1A4", type: "gdrive" },
  ],
  2: [
    { label: "📓 Google Slides — Day 2: TOFU", url: "https://docs.google.com/presentation/d/1cFxBuOQyJxSEnN34JrolHsnzc2DhdgUX-bxtBM_xYDM", type: "slides" },
    { label: "📓 Detailed Appendix", url: "https://docs.google.com/presentation/d/1ypASL0eeGp8uqrR00lMkN3eI2GHWUJcswfTQBYPSBE0", type: "slides" },
    { label: "📚 FAQs", url: "https://docs.google.com/document/d/14QUw9j82ZGvfDZi7w7hTz44EWibz3DzQieaIbGzsGZY", type: "gdrive" },
    { label: "☁️ GTM Launch Pad Dashboard", url: "https://amplitude.lightning.force.com/analytics/dashboard/0FKUw0000000gLpOAI", type: "sfdc" },
    { label: "🍿 TOFU Playlist: Quick Hit Clips (All 9 Scenarios)", url: "https://amplitude.zoom.us/clips/share/play-list/a8fa9ac2312b412bbdc6e71651fb942c", type: "zoom" },
  ],
  3: [
    { label: "📓 Google Slides — Day 3: GTM Launch Pad", url: "https://docs.google.com/presentation/d/1tm_q5TJVRNYRrIB6wc5AGSmqTWyFDi3Na1EwO8tp80M", type: "slides" },
    { label: "☁️ GTM Launch Pad Dashboard (SFDC)", url: "https://amplitude.lightning.force.com/analytics/dashboard/0FKUw0000000gLpOAI", type: "sfdc" },
    { label: "📮 Slack: #sales-run-the-business-dashboard", url: "https://amplitude.slack.com/archives/C03UYCM3Y05", type: "slack" },
  ],
  4: [
    { label: "📓 Google Slides — Day 4: Prospecting", url: "https://docs.google.com/presentation/d/12u9LXd4vnyNQrv9d6hB2CjrppGNUYNpxCbFRnFKAJjw", type: "slides" },
    { label: "📚 ZoomInfo Handbook", url: "https://docs.google.com/document/d/1i_NmcVSWzjSAwPR3p8RpmC8JBklA6_NL64m73bjsm4o", type: "gdrive" },
    { label: "🍿 High Intent Prospecting w/ List Views Demo", url: "https://amplitude.zoom.us/clips/share/hhl89hkIS9mg7v6SGRBpgg", type: "zoom" },
    { label: "🍿 Prospecting into Land Accounts", url: "https://amplitude.zoom.us/clips/share/84UKexEKSKOtlEqzR6Gs2Q", type: "zoom" },
    { label: "📓 Reachdesk: How to Use to Drive Pipeline", url: "https://docs.google.com/presentation/d/1pScrYlHft9xSNVfbytNvNpJaH0v-gM0W4tsWX_WKxKw", type: "slides" },
    { label: "📚 Discovery Question Repository", url: "https://docs.google.com/document/d/11po0r9LxK_tiooyYb64bdDeqhIhRX_7k-HSlPppf1A4", type: "gdrive" },
  ],
  5: [
    { label: "📓 Google Slides — Day 6: Competitive", url: "https://docs.google.com/presentation/d/1ha9NRQs2GiT49ASGf7SiFKYTUcGIbgiveQ2HGhj0q00", type: "slides" },
    { label: "🐙 Spekit: Compete Hub", url: "https://app.spekit.co/app/wiki/?topic=a63d9637-dfbc-4573-943d-d7b829870188&tag=Compete", type: "spekit" },
    { label: "📚 Discovery Question Repository", url: "https://docs.google.com/document/d/11po0r9LxK_tiooyYb64bdDeqhIhRX_7k-HSlPppf1A4", type: "gdrive" },
    { label: "📮 Slack: #competitive", url: "https://amplitude.slack.com/archives/CLL0W2XMF", type: "slack" },
  ],
  6: [
    { label: "📓 Google Slides — Day 7: Account Planning", url: "https://docs.google.com/presentation/d/1E6CvN9brHBGNkS2SZcslVNmaRyaiJhtvw4_Jrq-dJ2c", type: "slides" },
    { label: "📮 Slack: #help-salesops", url: "https://amplitude.slack.com/archives/C05F532Q29F", type: "slack" },
  ],
  7: [
    { label: "📓 Momentum for Slack Slides", url: "https://docs.google.com/presentation/d/129YPTu9OKQYZM6fFIMxlsJOqalqUWcwlLvLnC4lOvXI", type: "slides" },
    { label: "🍿 Integrating Momentum w/ Google Calendar", url: "https://drive.google.com/file/d/1RZpJouRFGPXXJ__JzQsbBbAXXwUZldyl/view", type: "zoom" },
    { label: "📚 Momentum FAQ", url: "https://amplitude.atlassian.net/wiki/spaces/BT/pages/3639705669/Momentum+FAQs", type: "gdrive" },
    { label: "📮 Slack: #momentum-help", url: "https://amplitude.slack.com/archives/C09E8C1KMCZ", type: "slack" },
  ],
  8: [
    { label: "📓 Customer Engagement Model (CEM)", url: "https://docs.google.com/document/d/1VxMWNbIWWEtJwuhNibKHUCsbOsCQqVFcin8vrZkeKZw", type: "gdrive" },
    { label: "📚 Discovery Question Repository", url: "https://docs.google.com/document/d/11po0r9LxK_tiooyYb64bdDeqhIhRX_7k-HSlPppf1A4", type: "gdrive" },
    { label: "📚 MEDDPICC Discovery Discussion", url: "https://docs.google.com/document/d/1dT5RcrPrDxQnnCPjjPXdmQVEfNtvliE92etJHLKl20Y", type: "gdrive" },
    { label: "🤖 Glean: Discovery Question Analyzer", url: "https://app.glean.com/chat/agents/daf6cbe7a5f24d328097723e8ab1ca5d?qe=https%3A%2F%2Famplitude-be.glean.com", type: "glean" },
    { label: "🤖 Glean: Discovery Question Generator", url: "https://app.glean.com/chat/agents/3b6434728f2448eb9711391807069c84?qe=https%3A%2F%2Famplitude-be.glean.com", type: "glean" },
  ],
  9: [
    { label: "🐙 Spekit: How to Create Deal Rooms", url: "https://app.spekit.co/app/wiki/business_term/97c7a503-ee0e-4228-bd72-fa1116a6bfd3", type: "spekit" },
    { label: "📮 Slack: #help-spekit", url: "https://amplitude.slack.com/archives/C0AEQ41M8RX", type: "slack" },
  ],
  10: [
    { label: "📓 PSP and Implementation Pitch Slides 2026", url: "https://docs.google.com/presentation/d/1JJlncSiWqwnxVLbTuuZrpHIgeje0RkGQobWFqlrM_f4", type: "slides" },
    { label: "📮 Slack: #ptr-deal-support", url: "https://amplitude.slack.com/archives/C08DVANACUA", type: "slack" },
    { label: "📮 Slack: #partnershipsteam", url: "https://amplitude.slack.com/archives/C983QRW77", type: "slack" },
  ],
  11: [
    { label: "📓 Google Slides — Day 11: Forecasting", url: "https://docs.google.com/presentation/d/19-B_1a-oBmuMoI_4lc1L5W1oiZZN6pXALYMZObBc9L8", type: "slides" },
    { label: "☁️ Outreach Opportunity View Templates", url: "https://amplitude.zoom.us/rec/share/nZ4egcmbLHoHequYQ2-mKe98veWQwf1Zt7wBjXmRgbTQeGb3kFxgsNJYDRmY1VKW.cYX_m_4ebLYpxZHU", type: "zoom" },
    { label: "📮 Slack: #help-salesops", url: "https://amplitude.slack.com/archives/C05F532Q29F", type: "slack" },
  ],
  12: [
    { label: "📓 Forecasting: Services Slides", url: "https://docs.google.com/presentation/d/1oWMrNqmsc4f0r4vtYmhYZCnppL1cwdIbskQcs_0COQo", type: "slides" },
    { label: "📮 Slack: #help-salesops", url: "https://amplitude.slack.com/archives/C05F532Q29F", type: "slack" },
  ],
  13: [
    { label: "🐙 Spekit: Customer Stories", url: "https://app.spekit.co/app/wiki/?topic=d07076bf-9871-42fb-9d91-63b9e3166385&tag=Customer%20Stories", type: "spekit" },
    { label: "🍿 PODcast: Chegg (NAMER)", url: "https://amplitude.zoom.us/clips/share/_YNgyrg-SqeIbQ2t1zxsKw", type: "zoom" },
    { label: "🍿 PODcast: FOX Corp (NAMER)", url: "https://amplitude.zoom.us/clips/share/eWjq8c5RQXGYvdWqXUeDWg", type: "zoom" },
    { label: "🍿 PODcast: Essent Win Story (EMEA)", url: "https://amplitude.zoom.us/clips/share/983B7Y28RqqiysZBQrxCKw", type: "zoom" },
    { label: "🍿 PODcast: Orange Win Story (EMEA)", url: "https://amplitude.zoom.us/clips/share/XtSPAK_cQrevlm2BC83Y4A", type: "zoom" },
    { label: "📮 Slack: #win-reports", url: "https://amplitude.slack.com/archives/C078PTYUU", type: "slack" },
  ],
  14: [
    { label: "📓 Google Slides — Day 13: CLM", url: "https://docs.google.com/presentation/d/1qlfiR7FE_tkMei8SNNktEAxv0YLausl_gBXxrEvTm54", type: "slides" },
    { label: "🧠 MindTickle: Legal 201", url: "https://lms.amplitude.com/new/ui/learner/training/programs/1811138233611482941", type: "mindtickle" },
    { label: "🍿 How to Create a Support Case", url: "https://amplitude.zoom.us/clips/share/WChttiMmQvaUH0nWpXzKxw", type: "zoom" },
    { label: "📮 Slack: #help-legal", url: "https://amplitude.slack.com/archives/C5GBG2J8K", type: "slack" },
  ],
  15: [
    { label: "📓 Google Slides — Day 14: Deal Desk & CPQ", url: "https://docs.google.com/presentation/d/1C6iLzRnoEpi0W-0--79GHUlaA9CYxgo3ENujCabfRDk", type: "slides" },
    { label: "🧠 MindTickle: Deal Desk Training PPL 2026", url: "https://lms.amplitude.com/new/ui/learner/training/programs/2043719217316580035/modules", type: "mindtickle" },
    { label: "🍿 How to Create a Support Case", url: "https://amplitude.zoom.us/clips/share/WChttiMmQvaUH0nWpXzKxw", type: "zoom" },
    { label: "🍿 Sales Stage 6.5", url: "https://amplitude.zoom.us/clips/share/KIeN2E7PS62-kBU--pGQUg", type: "zoom" },
    { label: "📮 Slack: #gtm-pricing-packaging-help", url: "https://amplitude.slack.com/archives/C04LW12V65N", type: "slack" },
  ],
  16: [
    { label: "📓 Google Slides — Day 15: Leveraging SEs", url: "https://docs.google.com/presentation/d/1kDmK2l_Ahv01UlrBDSWoPqhtT70dQTcBT2GJ6PoSZzA", type: "slides" },
    { label: "📮 Slack: #solutions-engineering", url: "https://amplitude.slack.com/archives/C6HCQ590C", type: "slack" },
  ],
  17: [
    { label: "📓 Google Slides — Professional Services", url: "https://app.spekit.co/app/wiki/asset/8b062e6d-9345-4eba-a4fb-7df608ea7772", type: "spekit" },
    { label: "🐙 Amplitude Services Catalog H1 FY2025", url: "https://app.spekit.co/app/wiki/asset/6d435896-7966-44ad-a3d4-5d8e46ea8874", type: "spekit" },
    { label: "🧠 MindTickle: Winning with Services", url: "https://lms.amplitude.com/new/ui/learner/update/1914790073227978349/consume", type: "mindtickle" },
  ],
};

export default api({
  name: 'PopulateResources',
  description: 'Adds resources column to clips table and populates all 17 clips.',
  integrations: {
    db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    columnAdded: z.boolean(),
    clipsUpdated: z.number(),
  }),
  async run(ctx) {
    // Step 1: Add the column if it doesn't exist
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_clips ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT NULL`,
      undefined,
      { label: 'Add resources column' }
    );

    // Step 2: Update each clip's resources by sort_order
    let updated = 0;
    for (const [sortOrderStr, resources] of Object.entries(RESOURCES_BY_SORT_ORDER)) {
      const sortOrder = Number(sortOrderStr);
      await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_clips SET resources = $1::jsonb WHERE sort_order = $2`,
        [JSON.stringify(resources), sortOrder],
        { label: `Set resources for sort_order ${sortOrder}` }
      );
      updated++;
    }

    return { columnAdded: true, clipsUpdated: updated };
  },
});
