/**
 * cAMP 101 Academy tiles — single source of truth for the client.
 *
 * Each TILE counts as 1 Approach item no matter how many courses it holds.
 * A tile is complete when every course in it has a screenshot.
 *
 * GRANDFATHERING: learners who already signed off cAMP 101 completed it under
 * the rules at that time. For them a tile is complete if its ORIGINAL primary
 * course screenshot exists — new courses added later never reopen their tiles.
 * (Keep server/apis/v2/academy-tiles.ts in sync.)
 */

export type AcademyCourse = { key: string; label: string; url: string };

export type AcademyTile = {
  /** Tile key = original course key (used for pacing "academy:<key>" + grandfathering) */
  key: string;
  label: string;
  /** Courses shown in the tile, in display order */
  courses: AcademyCourse[];
};

export const ACADEMY_TILES: AcademyTile[] = [
  {
    key: "analytics",
    label: "Analytics & Agent Analytics",
    courses: [
      { key: "analytics", label: "Analytics", url: "https://academy.amplitude.com/amplitude-getting-started-with-analytics" },
      { key: "agent_analytics", label: "Agent Analytics", url: "https://academy.amplitude.com/know-if-your-agent-is-helping-with-agent-analytics" },
    ],
  },
  {
    key: "experiment",
    label: "Experiment & Statsig",
    courses: [
      { key: "statsig", label: "Statsig Overview", url: "https://academy.amplitude.com/statsig-overview" },
      { key: "feature_gates", label: "Getting Started with Feature Gates", url: "https://academy.amplitude.com/getting-started-with-feature-gates" },
      { key: "experiment", label: "Getting Started with Experiments", url: "https://academy.amplitude.com/getting-started-with-amplitude-experiment-learning-path" },
      { key: "assignments_exposures", label: "Assignments & Exposures", url: "https://academy.amplitude.com/assignments-exposures" },
    ],
  },
  {
    key: "session_replay",
    label: "Session Replay",
    courses: [
      { key: "session_replay", label: "Session Replay", url: "https://academy.amplitude.com/contextualize-user-experience-with-session-replay" },
    ],
  },
  {
    key: "guides_surveys",
    label: "Guides & Surveys",
    courses: [
      { key: "guides_surveys", label: "Guides & Surveys", url: "https://academy.amplitude.com/engage-your-users-with-guides-and-surveys" },
    ],
  },
];

/** Every course key that belongs to a cAMP 101 tile */
export const ACADEMY_COURSE_KEYS = ACADEMY_TILES.flatMap((t) => t.courses.map((c) => c.key));

type Uploaded = Set<string> | Record<string, boolean>;
const has = (u: Uploaded, k: string) => (u instanceof Set ? u.has(k) : !!u[k]);

/** Is this tile complete? `grandfathered` = learner already signed off cAMP 101. */
export function isAcademyTileDone(tile: AcademyTile, uploaded: Uploaded, grandfathered: boolean): boolean {
  if (grandfathered) return has(uploaded, tile.key);
  return tile.courses.every((c) => has(uploaded, c.key));
}

/** Number of completed tiles (0–4). */
export function countAcademyTilesDone(uploaded: Uploaded, grandfathered: boolean): number {
  return ACADEMY_TILES.filter((t) => isAcademyTileDone(t, uploaded, grandfathered)).length;
}

export function allAcademyTilesDone(uploaded: Uploaded, grandfathered: boolean): boolean {
  return countAcademyTilesDone(uploaded, grandfathered) === ACADEMY_TILES.length;
}
