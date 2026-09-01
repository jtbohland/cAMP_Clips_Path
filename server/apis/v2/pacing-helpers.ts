/**
 * Role-aware pacing constants and helpers.
 *
 * Shared across all server APIs that compute pacing.
 * The client has its own copy at client/lib/pacing.ts — keep them in sync.
 *
 * ─── Clip Counts by Role ─────────────────────────────────────────────────────
 *
 * AE / PSM / Renewals path: 21 clips (19 video + 2 resource days)
 *   Day 1: 2 → Day 2: 1 → Day 3: 2 (GTM LP + Pod Tower) → Day 4: 1 →
 *   Day 5: 1 (resource) → Day 6: 1 → Day 7: 2 → Day 8: 2 →
 *   Day 9: 1 (resource) → Day 10: 1 → Day 11: 2 → Day 12: 1 →
 *   Day 13: 1 → Day 14: 1 → Day 15: 2
 *
 * SDR path: 17 clips (14 video + 3 resource days)
 *   Day 1: 2 → Day 2: 1 → Day 3: 2 (GTM LP + Pod Tower) → Day 4: 1 →
 *   Day 5: 2 (Cold Calling + Nooks) → Day 6: 1 (resource) →
 *   Day 7: 1 → Day 8: 2 → Day 9: 2 →
 *   Day 10: 1 (resource) → Day 11: 1 → Day 12: 1 → Day 13: 1 →
 *   Day 14: 1 (resource — ROE / Ridge game, SDR-only)
 *
 * SDR>Velocity Promo path: 9 clips (7 video + 2 resource days)
 *   Approach: 3 weekdays, 5 items (4 academy + W&D), no MEDDPICC/Challenger
 *   Ascent: 7 topic-days across 7 weekdays (weekdays 4–10)
 *   Day 1: Renewal Ops (resource, sort 60)
 *   Day 2: Pricing & Packaging (resource + Price is Right, sort 120)
 *   Day 3: Partners (clip + W&D, sort 130)
 *   Day 4: Forecasting ×2 (sorts 140, 150)
 *   Day 5: CLM (sort 170)
 *   Day 6: Deal Desk (clip + W&D, sort 180)
 *   Day 7: SE+PS ×2 (sorts 190, 200)
 *
 * Legacy path (pre–Pod Tower): 20 clips for AE, 15 for SDR
 *   Same as above but without Pod Tower (sort 45).
 *   A learner is "legacy exempt" from a newly-added clip if they've
 *   already completed clips beyond that clip's insertion point.
 */

// ─── AE / PSM / Renewals ────────────────────────────────────────────────────

export const TOTAL_ASCENT_CLIPS_AE = 21;
export const TOTAL_WEEKDAYS_AE = 20;

/** Cumulative clips expected by weekday for AE / PSM / Renewals */
export const CLIPS_EXPECTED_BY_WEEKDAY_AE = [
  0,   // 0 weekdays elapsed
  0, 0, 0, 0, 0,            // weekdays 1-5: Approach (no clips)
  2, 3, 5, 6, 7,            // weekdays 6-10
  8, 10, 12, 13, 14,        // weekdays 11-15
  16, 17, 18, 19, 21,       // weekdays 16-20
];

// ─── SDR ─────────────────────────────────────────────────────────────────────

export const TOTAL_ASCENT_CLIPS_SDR = 17;
export const TOTAL_WEEKDAYS_SDR = 19; // 5 Approach + 14 Ascent days

/** Cumulative clips expected by weekday for SDR.
 *  SDR has 14 Ascent days (vs 15 for AE) — fewer clips, faster summit.
 *
 *  Weekday 6  → Day 1: 2 (Verticals + Personas)
 *  Weekday 7  → Day 2: 1 (TOFU)
 *  Weekday 8  → Day 3: 2 (GTM LP + Pod Tower)
 *  Weekday 9  → Day 4: 1 (Prospecting)
 *  Weekday 10 → Day 5: 2 (Cold Calling + Nooks)
 *  Weekday 11 → Day 6: 1 (resource day)
 *  Weekday 12 → Day 7: 1 (Competitive Landscape)
 *  Weekday 13 → Day 8: 2 (Account Planning)
 *  Weekday 14 → Day 9: 2 (Discovery)
 *  Weekday 15 → Day 10: 1 (resource day)
 *  Weekday 16 → Day 11: 1 (Pricing & Packaging)
 *  Weekday 17 → Day 12: 1 (Partners)
 *  Weekday 18 → Day 13: 1 (Customer Stories)
 *  Weekday 19 → Day 14: 1 (ROE — resource day, Ridge game)
 */
export const CLIPS_EXPECTED_BY_WEEKDAY_SDR = [
  0,   // 0 weekdays elapsed
  0, 0, 0, 0, 0,            // weekdays 1-5: Approach (no clips)
  2, 3, 5, 6, 8,            // weekdays 6-10  (Day 5 adds 2 SDR clips)
  9, 10, 12, 14, 15,        // weekdays 11-15
  16, 16, 16, 17,           // weekdays 16-19 (ROE at weekday 19)
];

// ─── SDR>Velocity Promo ──────────────────────────────────────────────────────

export const TOTAL_ASCENT_CLIPS_VP = 9;
export const TOTAL_WEEKDAYS_VP = 10; // 3 Approach + 7 Ascent days

/** Cumulative clips expected by weekday for SDR>Velocity Promo.
 *  Approach is only 3 weekdays (vs 5 for other roles).
 *
 *  Weekday 1-3  → Approach (4 academy + W&D)
 *  Weekday 4  → Day 1: 1 (Renewal Ops — resource)
 *  Weekday 5  → Day 2: 1 (Pricing & Packaging — resource + PiR)
 *  Weekday 6  → Day 3: 1 (Partners)
 *  Weekday 7  → Day 4: 2 (Forecasting ×2)
 *  Weekday 8  → Day 5: 1 (CLM)
 *  Weekday 9  → Day 6: 1 (Deal Desk)
 *  Weekday 10 → Day 7: 2 (SE+PS ×2)
 */
export const CLIPS_EXPECTED_BY_WEEKDAY_VP = [
  0,   // 0 weekdays elapsed
  0, 0, 0,                   // weekdays 1-3: Approach (no clips)
  1,                         // weekday 4  → Day 1 (Renewal Ops)
  2,                         // weekday 5  → Day 2 (P&P)
  3,                         // weekday 6  → Day 3 (Partners)
  5,                         // weekday 7  → Day 4 (Forecasting ×2)
  6,                         // weekday 8  → Day 5 (CLM)
  7,                         // weekday 9  → Day 6 (Deal Desk)
  9,                         // weekday 10 → Day 7 (SE+PS ×2)
];

/** Approach schedule for Velocity Promo: 5 items over 3 weekdays.
 *  Day 1: 2 academies, Day 2: 2 academies, Day 3: W&D */
export const WEEK1_EXPECTED_BY_DAY_VP = [0, 2, 4, 5];
export const WEEK1_TOTAL_ITEMS_VP = 5;
export const WEEK1_WEEKDAYS_VP = 3;

// ─── Legacy (pre–Pod Tower) ──────────────────────────────────────────────────

export const TOTAL_ASCENT_CLIPS_LEGACY_AE = 20;  // old AE total without Pod Tower
export const TOTAL_ASCENT_CLIPS_LEGACY_SDR = 15;  // old SDR total without Pod Tower

/** Sort orders of clips that were added after the original path launched.
 *  Learners who completed clips beyond these insertion points are exempt. */
export const EXEMPT_CLIP_SORT_ORDERS = [45, 55, 56] as const;

// ─── Role grouping ───────────────────────────────────────────────────────────

const SDR_ROLES = ["SDR"];
const AE_ROLES = ["Velocity AE", "Emerging AE", "Majors AE", "Strategic AE"];
const VELOCITY_PROMO_ROLES = ["SDR>Velocity Promo"];

export type RoleGroup = "SDR" | "AE" | "PSM" | "Renewals" | "VelocityPromo";

export function getRoleGroup(role: string): RoleGroup {
  if (VELOCITY_PROMO_ROLES.includes(role)) return "VelocityPromo";
  if (SDR_ROLES.includes(role)) return "SDR";
  if (AE_ROLES.includes(role)) return "AE";
  if (role === "PSM") return "PSM";
  if (role === "Renewals") return "Renewals";
  // Default to AE for unknown roles
  return "AE";
}

export function isSDR(role: string): boolean {
  return SDR_ROLES.includes(role);
}

export function isVelocityPromo(role: string): boolean {
  return VELOCITY_PROMO_ROLES.includes(role);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the total ascent clips for a role, accounting for legacy exemptions.
 *
 * @param role         The learner's role
 * @param maxSortDone  The highest sort_order of any clip the learner has completed.
 *                     Used to determine legacy exemptions: if they've completed
 *                     clips beyond a newly-added clip's sort_order, they're exempt.
 *                     Pass 0 if unknown (no exemption applied).
 */
export function getEffectiveClipTotal(role: string, maxSortDone: number): number {
  if (isVelocityPromo(role)) return TOTAL_ASCENT_CLIPS_VP; // VP has no legacy exemptions
  const sdr = isSDR(role);
  const baseTotal = sdr ? TOTAL_ASCENT_CLIPS_SDR : TOTAL_ASCENT_CLIPS_AE;

  if (maxSortDone <= 0) return baseTotal;

  // Count how many exempt clips the learner has passed beyond
  let exemptions = 0;
  for (const sortOrder of EXEMPT_CLIP_SORT_ORDERS) {
    // Only exempt if:
    // 1. The learner has completed clips beyond this sort_order
    // 2. The clip is relevant to their role (Pod Tower is all-roles, SDR clips are SDR-only)
    if (maxSortDone > sortOrder) {
      if (sortOrder === 45) {
        // Pod Tower (sort 45) — all roles can be exempt
        exemptions++;
      } else if (sortOrder === 55 || sortOrder === 56) {
        // Cold Calling (55) / Nooks (56) — only SDR can be exempt
        if (sdr) exemptions++;
      }
    }
  }

  return baseTotal - exemptions;
}

/**
 * Get the correct pacing schedule for a role.
 */
export function getClipsExpectedByWeekday(role: string): readonly number[] {
  if (isVelocityPromo(role)) return CLIPS_EXPECTED_BY_WEEKDAY_VP;
  return isSDR(role) ? CLIPS_EXPECTED_BY_WEEKDAY_SDR : CLIPS_EXPECTED_BY_WEEKDAY_AE;
}

/**
 * Get total weekdays for a role's path.
 */
export function getTotalWeekdays(role: string): number {
  if (isVelocityPromo(role)) return TOTAL_WEEKDAYS_VP;
  return isSDR(role) ? TOTAL_WEEKDAYS_SDR : TOTAL_WEEKDAYS_AE;
}
