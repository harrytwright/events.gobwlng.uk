import { execSync } from "child_process";

/**
 * Gets the last git modification info for a path.
 * Falls back to current timestamp if git is unavailable or path is untracked.
 *
 * @param {string} targetPath - File or directory path
 * @returns {{commitHash: string|null, timestamp: string}}
 */
export function getLastModified(targetPath) {
  try {
    const result = execSync(`git log -1 --format='%H %ci' -- "${targetPath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!result) {
      // Path exists but has no git history (untracked)
      return {
        commitHash: null,
        timestamp: new Date().toISOString(),
      };
    }

    // Parse: "abc123def 2026-01-05 22:56:00 +0000"
    const firstSpace = result.indexOf(" ");
    const hash = result.substring(0, firstSpace);
    const dateStr = result.substring(firstSpace + 1);

    return {
      commitHash: hash,
      timestamp: new Date(dateStr).toISOString(),
    };
  } catch (err) {
    // Git not available or error
    console.warn(`Git lookup failed for ${targetPath}: ${err.message}`);
    return {
      commitHash: null,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Gets the last modification time for a specific file.
 *
 * @param {string} filePath - Path to the file
 * @returns {{commitHash: string|null, timestamp: string}}
 */
export function getFileLastModified(filePath) {
  return getLastModified(filePath);
}
