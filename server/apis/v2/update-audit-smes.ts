import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const SME_UPDATES: Array<{ topicKey: string; title?: string; smes: Array<{ name: string; title: string; note?: string }> }> = [
  { topicKey: "day1_verticals_personas", title: "Ideal Customer Profiles", smes: [{ name: "Michele Morales", title: "Senior Director, Product Marketing" }] },
  { topicKey: "day2_tofu", smes: [{ name: "Nathan Youmans", title: "Senior Manager, Marketing Operations" }, { name: "Chelsie Cauthon", title: "Senior Manager, Demand Generation" }] },
  { topicKey: "day3_gtm_pod", smes: [{ name: "Matt Kahan", title: "Senior Director, Revenue Operations" }, { name: "Simon Levinson", title: "VP, Revenue Operations" }, { name: "Hugo S. Robein", title: "Director, Sales Operations" }] },
  { topicKey: "day4_prospecting", smes: [{ name: "JT Bohland", title: "GTM Enablement Lead" }] },
  { topicKey: "day4_sdr_marketing_events", smes: [{ name: "JT Bohland", title: "GTM Enablement Lead" }] },
  { topicKey: "day5_sdr_cold_calling", smes: [{ name: "Lauren Hargarten", title: "Sales Development Manager" }, { name: "Halle Morris", title: "Sales Development Manager" }] },
  { topicKey: "day5_renewals", smes: [{ name: "Katie Helie", title: "VP of Finance" }, { name: "Lenora Bennis", title: "Sr. Manager, Renewals Management" }, { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" }] },
  { topicKey: "day6_competitive", smes: [{ name: "Darshil Gandhi", title: "Senior Director, Competitive Intelligence" }] },
  { topicKey: "day7_account_planning", smes: [{ name: "Simon Levinson", title: "VP, Revenue Operations" }, { name: "Hugo S. Robein", title: "Director, Sales Operations" }] },
  { topicKey: "day8_discovery", smes: [{ name: "JT Bohland", title: "GTM Enablement Lead" }] },
  { topicKey: "day9_pricing", smes: [{ name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" }, { name: "Katie Helie", title: "VP of Finance" }, { name: "Kyle Helstad", title: "Sales Finance Director" }] },
  { topicKey: "day10_partners", smes: [{ name: "Nick Iyengar", title: "VP, Alliances & Partnerships" }, { name: "Perri O'Brien", title: "Director, Partner Solutions" }, { name: "Jaimie Taketa", title: "Senior Partner Manager" }] },
  { topicKey: "day11_forecasting", title: "Forecasting, including Services", smes: [{ name: "Corey Gibbel", title: "VP, Revenue Operations" }, { name: "Ganit Bar-Dor", title: "VP, Professional Services" }, { name: "Hugo S. Robein", title: "Director, Sales Operations" }] },
  { topicKey: "day12_customer_stories", smes: [{ name: "JT Bohland", title: "GTM Enablement Lead" }] },
  { topicKey: "day13_sdr_roe", smes: [{ name: "Derrick Williams", title: "Sales Development, Strategy & Operations Manager" }] },
  { topicKey: "day13_clm", smes: [{ name: "Craig Rudrud", title: "Sr. Director, Legal" }, { name: "Joy Udom", title: "Senior Corporate Counsel" }, { name: "Sarah Simmons", title: "Deal Desk Manager" }, { name: "Skyla Banks", title: "Deal Desk Analyst" }] },
  { topicKey: "day14_deal_desk", smes: [{ name: "Matt Murray", title: "VP, Revenue Operations" }, { name: "Katie Helie", title: "VP of Finance" }, { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" }, { name: "Erin Del Mundo", title: "Deal Desk Manager" }, { name: "Jessica Adona", title: "Deal Desk Manager" }] },
  { topicKey: "day15_leverage", smes: [{ name: "Taylor Wolfe", title: "Director, Solutions Engineering" }, { name: "Ganit Bar-Dor", title: "VP, Professional Services" }] },
];

export default api({
  name: "UpdateAuditSmes",
  description: "Updates SME assignments and optionally titles for all audit topics",
  integrations: { apps_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ updated: z.number(), productInserted: z.boolean() }),
  async run(ctx) {
    let updated = 0;

    for (const u of SME_UPDATES) {
      const smesJson = JSON.stringify(u.smes);
      if (u.title) {
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_day_metadata SET smes = $1::jsonb, title = $2 WHERE topic_key = $3`,
          [smesJson, u.title, u.topicKey],
          { label: `Update SMEs + title: ${u.topicKey}` }
        );
      } else {
        await ctx.integrations.apps_db.execute(
          `UPDATE cliptracker_v2_day_metadata SET smes = $1::jsonb WHERE topic_key = $2`,
          [smesJson, u.topicKey],
          { label: `Update SMEs: ${u.topicKey}` }
        );
      }
      updated++;
    }

    // Insert Product 101 as a new topic
    const p101Smes = JSON.stringify([{ name: "Lisa Mullen", title: "Director, Product Education" }]);
    const p101Objs = JSON.stringify([]);
    await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_day_metadata (topic_key, day_label, title, emoji, summary, learning_objectives, smes, path_label, has_video, sort_orders)
       VALUES ('product_101', 'Approach', 'Product 101', '🧪', NULL, $1::jsonb, $2::jsonb, 'Approach', false, '{}')
       ON CONFLICT (topic_key) DO UPDATE SET smes = $2::jsonb`,
      [p101Objs, p101Smes],
      { label: "Insert/update Product 101" }
    );

    return { updated, productInserted: true };
  },
});
