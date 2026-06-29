import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const Week1LearnerRow = z.object({
  viewer_id: z.string(),
  name: z.string(),
  role: z.string().nullable(),
  timezone: z.string().nullable(),
  start_date: z.string().nullable(),
  week1_unlocked_at: z.string().nullable(),
  week1_unlock_type: z.string().nullable(),
  meddpicc_signed: z.coerce.boolean(),
  camp101_signed: z.coerce.boolean(),
  challenger_signed: z.coerce.boolean(),
  academy_count: z.coerce.number(),
  wd_product: z.string().nullable(),
  wd_scenario: z.string().nullable(),
  wd_score: z.coerce.number().nullable(),
});

export default api({
  name: "GetWeek1Analytics",
  description: "Fetches Week 1 (The Approach) analytics data for all learners",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    learners: z.array(z.object({
      viewerId: z.string(),
      name: z.string(),
      role: z.string().nullable(),
      timezone: z.string().nullable(),
      startDate: z.string().nullable(),
      week1UnlockedAt: z.string().nullable(),
      week1UnlockType: z.string().nullable(),
      meddpiccSigned: z.boolean(),
      camp101Signed: z.boolean(),
      challengerSigned: z.boolean(),
      academyCount: z.number(),
      wdProduct: z.string().nullable(),
      wdScenario: z.string().nullable(),
      wdScore: z.number().nullable(),
    })),
  }),

  async run(ctx) {
    const rows = await ctx.integrations.db.query(
      `SELECT
        v.id AS viewer_id,
        v.name,
        v.role,
        v.timezone,
        v.ascent_day_1::text AS start_date,
        v.week1_unlocked_at::text,
        v.week1_unlock_type,
        EXISTS(SELECT 1 FROM cliptracker_v2_module_signoffs ms WHERE ms.viewer_id = v.id AND ms.module_key = 'meddpicc') AS meddpicc_signed,
        EXISTS(SELECT 1 FROM cliptracker_v2_module_signoffs ms WHERE ms.viewer_id = v.id AND ms.module_key = 'camp101') AS camp101_signed,
        EXISTS(SELECT 1 FROM cliptracker_v2_module_signoffs ms WHERE ms.viewer_id = v.id AND ms.module_key = 'challenger') AS challenger_signed,
        COALESCE((SELECT COUNT(*) FROM cliptracker_v2_academy_screenshots acs WHERE acs.viewer_id = v.id), 0)::int AS academy_count,
        wd.product AS wd_product,
        wd.scenario AS wd_scenario,
        wd.score AS wd_score
      FROM cliptracker_v2_viewers v
      LEFT JOIN cliptracker_v2_wd_verifications wd ON wd.viewer_id = v.id
      ORDER BY v.name
      LIMIT 100`,
      Week1LearnerRow,
      [],
      { label: "Fetch Week 1 analytics for all learners" }
    );

    return {
      learners: rows.map((r) => ({
        viewerId: r.viewer_id,
        name: r.name,
        role: r.role,
        timezone: r.timezone,
        startDate: r.start_date,
        week1UnlockedAt: r.week1_unlocked_at,
        week1UnlockType: r.week1_unlock_type,
        meddpiccSigned: r.meddpicc_signed,
        camp101Signed: r.camp101_signed,
        challengerSigned: r.challenger_signed,
        academyCount: r.academy_count,
        wdProduct: r.wd_product,
        wdScenario: r.wd_scenario,
        wdScore: r.wd_score,
      })),
    };
  },
});
