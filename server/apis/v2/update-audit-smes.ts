import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const SME_UPDATES: Array<{ topicKey: string; title?: string; smes: Array<{ name: string; title: string; note?: string }> }> = [
  { topicKey: "day1_verticals_personas", title: "Ideal Customer Profiles", smes: [{ name: "Michele Morales", title: "Group Product Marketing Manager" }] },
  { topicKey: "day2_tofu", smes: [{ name: "Nathan Youmans", title: "Director, Marketing Operations" }, { name: "Chelsie Cauthon", title: "Senior Marketing Transformation Manager" }] },
  { topicKey: "day3_gtm_pod", smes: [{ name: "Matt Kahan", title: "Senior Manager GTM Strategy & Analytics" }, { name: "Simon Levison", title: "Senior Solutions Lead" }, { name: "Hugo S. Robein", title: "Director, Sales Operations" }] },
  { topicKey: "day4_prospecting", smes: [{ name: "JT Bohland", title: "Sr. Enablement Program Manager, Global Sales" }] },
  { topicKey: "day4_sdr_marketing_events", smes: [{ name: "JT Bohland", title: "Sr. Enablement Program Manager, Global Sales" }] },
  { topicKey: "day5_sdr_cold_calling", smes: [{ name: "Lauren Hargarten", title: "Senior Sales Development Manager" }, { name: "Halle Morris", title: "Sales Development Manager" }] },
  { topicKey: "day5_renewals", smes: [{ name: "Katie Helie", title: "Vice President, Finance" }, { name: "Lenora Bennis", title: "Senior Manager, Renewals Management" }, { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" }] },
  { topicKey: "day6_competitive", smes: [{ name: "Darshil Gandhi", title: "Director, Product Marketing" }] },
  { topicKey: "day7_account_planning", smes: [{ name: "Simon Levison", title: "Senior Solutions Lead" }, { name: "Hugo S. Robein", title: "Director, Sales Operations" }] },
  { topicKey: "day8_discovery", smes: [{ name: "JT Bohland", title: "Sr. Enablement Program Manager, Global Sales" }] },
  { topicKey: "day9_pricing", smes: [{ name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" }, { name: "Katie Helie", title: "Vice President, Finance" }, { name: "Kyle Helstad", title: "Sales Finance Director" }] },
  { topicKey: "day10_partners", smes: [{ name: "Nick Iyengar", title: "Head Of Global Partner Sales" }, { name: "Perri O'Brien", title: "Partner Sales Manager" }, { name: "Jaimie Taketa", title: "Partner Sales Manager" }] },
  { topicKey: "day11_forecasting", title: "Forecasting, including Services", smes: [{ name: "Corey Gibbel", title: "Sales Strategy & Operations Manager" }, { name: "Ganit Bar-Dor", title: "Sr. Director, Customer Success" }, { name: "Hugo S. Robein", title: "Director, Sales Operations" }] },
  { topicKey: "day12_customer_stories", smes: [{ name: "JT Bohland", title: "Sr. Enablement Program Manager, Global Sales" }] },
  { topicKey: "day13_sdr_roe", smes: [{ name: "Derrick Williams", title: "Sales Development Strategy & Operations Manager" }] },
  { topicKey: "day13_clm", smes: [{ name: "Craig Rudrud", title: "Staff Systems Engineer" }, { name: "Joy Udom", title: "Director, Associate General Council" }, { name: "Sarah Simmons", title: "Legal Operations Manager" }, { name: "Skyla Banks", title: "Associate General Counsel, Commercial" }] },
  { topicKey: "day14_deal_desk", smes: [{ name: "Matt Murray", title: "Director, Sales Finance" }, { name: "Katie Helie", title: "Vice President, Finance" }, { name: "Megha Sisaudia", title: "Head of Pricing Strategy & Operations", note: "on leave" }, { name: "Erin Del Mundo", title: "Deal Desk Manager" }, { name: "Jessica Adona", title: "Deal Desk Manager" }] },
  { topicKey: "day15_leverage", smes: [{ name: "Taylor Wolfe", title: "GTM Enablement Program Manager" }, { name: "Ganit Bar-Dor", title: "Sr. Director, Customer Success" }] },
];

export default api({
  name: "UpdateAuditSmes",
  description: "Updates SME assignments with correct titles for all audit topics",
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

    // Insert/update Product 101
    const p101Smes = JSON.stringify([{ name: "Lisa Mullen", title: "Sr. Program Manager Product Enablement" }]);
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
