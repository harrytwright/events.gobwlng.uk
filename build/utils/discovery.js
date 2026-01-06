import fs from "fs/promises";
import path from "path";

/**
 * Discovers all events in the data/events directory.
 * Scans for directories matching the pattern: data/events/{slug}/{year}/meta.json
 *
 * @param {string} eventsDir - Path to the events directory
 * @returns {Promise<Array<{slug: string, year: string, basePath: string, metaPath: string}>>}
 */
export async function discoverEvents(eventsDir) {
  const events = [];

  try {
    const slugDirs = await fs.readdir(eventsDir, { withFileTypes: true });

    for (const slugDir of slugDirs) {
      if (!slugDir.isDirectory()) continue;

      const slugPath = path.join(eventsDir, slugDir.name);
      const yearDirs = await fs.readdir(slugPath, { withFileTypes: true });

      for (const yearDir of yearDirs) {
        if (!yearDir.isDirectory()) continue;

        const basePath = path.join(slugPath, yearDir.name);
        const metaPath = path.join(basePath, "meta.json");

        // Validate meta.json exists
        try {
          await fs.access(metaPath);
          events.push({
            slug: slugDir.name,
            year: yearDir.name,
            basePath,
            metaPath,
          });
        } catch {
          // Skip directories without meta.json
          console.warn(`Skipping ${basePath}: no meta.json found`);
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning events directory: ${err.message}`);
    throw err;
  }

  // Sort by year descending, then slug
  events.sort((a, b) => {
    const yearDiff = parseInt(b.year) - parseInt(a.year);
    if (yearDiff !== 0) return yearDiff;
    return a.slug.localeCompare(b.slug);
  });

  return events;
}
