/**
 * Audience path mapping for Ascent Audit topic tiles.
 * Each topic maps to one of the 5 learning paths.
 */

export type AuditPath = "approach" | "all_roles" | "ae_psm_renewals" | "sdr" | "promotions";

export const PATH_STYLES: Record<AuditPath, { label: string; bg: string; text: string; border: string }> = {
  approach:         { label: "Approach",              bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-300" },
  all_roles:        { label: "All Roles",             bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-300" },
  ae_psm_renewals:  { label: "AE / PSM / Renewals",   bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  sdr:              { label: "SDR",                   bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-300" },
  promotions:       { label: "Promotions (SDR→Velocity)", bg: "bg-rose-100", text: "text-rose-700",   border: "border-rose-300" },
};

/** Topic key → audience path */
export const TOPIC_PATH_MAP: Record<string, AuditPath> = {
  // Approach (Week 1)
  product_101:              "approach",

  // All Roles
  day1_verticals_personas:  "all_roles",
  day2_tofu:                "all_roles",
  day3_gtm_pod:             "all_roles",

  // AE / PSM / Renewals
  day5_renewals:            "ae_psm_renewals",
  day6_competitive:         "ae_psm_renewals",
  day7_account_planning:    "ae_psm_renewals",
  day8_discovery:           "ae_psm_renewals",
  day9_pricing:             "ae_psm_renewals",
  day10_partners:           "ae_psm_renewals",
  day11_forecasting:        "ae_psm_renewals",
  day12_customer_stories:   "ae_psm_renewals",
  day13_clm:                "ae_psm_renewals",
  day14_deal_desk:          "ae_psm_renewals",
  day15_leverage:           "ae_psm_renewals",

  // SDR
  day4_prospecting:         "sdr",
  day4_sdr_marketing_events:"sdr",
  day5_sdr_cold_calling:    "sdr",
  day13_sdr_roe:            "sdr",

  // Promotions (SDR→Velocity)
  // Add promotion-specific topics here when they exist
};

export function getPathForTopic(topicKey: string): AuditPath | null {
  return TOPIC_PATH_MAP[topicKey] ?? null;
}
