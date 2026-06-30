/**
 * Returns the library path including the last-active tab.
 * Reads from sessionStorage so "Back to clips" returns to the correct tab
 * (approach or ascent) instead of always defaulting to approach.
 */
export function getLibraryPath(): string {
  const tab = sessionStorage.getItem("library_active_tab");
  return tab === "ascent" ? "/library?tab=ascent" : "/library";
}
