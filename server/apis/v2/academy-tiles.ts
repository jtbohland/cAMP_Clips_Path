/**
 * cAMP 101 Academy tiles — single source of truth for the server.
 * (Keep client/lib/academyTiles.ts in sync.)
 *
 * Each tile counts as 1 Approach item. A tile is complete when every course in
 * it has a screenshot.
 *
 * GRANDFATHERING: learners who already signed off cAMP 101 are judged by the
 * original primary course only (the tile key), so courses added later never
 * reopen a completed learner's Approach.
 */

export const ACADEMY_TILE_COURSES: Record<string, string[]> = {
  analytics: ["analytics", "agent_analytics"],
  experiment: ["statsig", "feature_gates", "experiment", "assignments_exposures"],
  session_replay: ["session_replay"],
  guides_surveys: ["guides_surveys"],
};

export const ACADEMY_TILE_KEYS = Object.keys(ACADEMY_TILE_COURSES);

/** All course keys belonging to cAMP 101 tiles (for SQL IN lists). */
export const ACADEMY_COURSE_KEYS = Object.values(ACADEMY_TILE_COURSES).flat();

/** SQL-ready quoted list, e.g. 'analytics','agent_analytics',... (static, no user input) */
export const ACADEMY_COURSE_KEYS_SQL = ACADEMY_COURSE_KEYS.map((k) => `'${k}'`).join(",");

export function isAcademyTileDone(tileKey: string, uploaded: Set<string>, grandfathered: boolean): boolean {
  if (grandfathered) return uploaded.has(tileKey);
  return (ACADEMY_TILE_COURSES[tileKey] ?? [tileKey]).every((k) => uploaded.has(k));
}

/** Completed tiles (0–4). `grandfathered` = learner has a cAMP 101 sign-off. */
export function countAcademyTilesDone(uploaded: Set<string>, grandfathered: boolean): number {
  return ACADEMY_TILE_KEYS.filter((t) => isAcademyTileDone(t, uploaded, grandfathered)).length;
}

export function allAcademyTilesDone(uploaded: Set<string>, grandfathered: boolean): boolean {
  return countAcademyTilesDone(uploaded, grandfathered) === ACADEMY_TILE_KEYS.length;
}

/**
 * SQL expression counting completed tiles for viewer column `vid` (e.g. "v.id").
 * Grandfathered (has camp101 sign-off) → original 4 primary keys; otherwise every
 * course in a tile must exist. Only static strings are interpolated.
 */
export function academyTilesDoneSql(vid: string): string {
  const exists = (k: string) =>
    `EXISTS (SELECT 1 FROM cliptracker_v2_academy_screenshots acs_t WHERE acs_t.viewer_id = ${vid} AND acs_t.course_key = '${k}')`;
  const signed = `EXISTS (SELECT 1 FROM cliptracker_v2_module_signoffs ms_t WHERE ms_t.viewer_id = ${vid} AND ms_t.module_key = 'camp101')`;
  const tiles = ACADEMY_TILE_KEYS.map((tile) => {
    const allCourses = ACADEMY_TILE_COURSES[tile].map(exists).join(" AND ");
    return `(CASE WHEN (${signed} AND ${exists(tile)}) OR (${allCourses}) THEN 1 ELSE 0 END)`;
  });
  return `(${tiles.join(" + ")})`;
}
