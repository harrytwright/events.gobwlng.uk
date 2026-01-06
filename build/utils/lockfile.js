import fs from "fs/promises";
import path from "path";
import { getLastModified, getFileLastModified } from "./git.js";

/**
 * Generates a lockfile for an event directory.
 *
 * @param {string} eventBasePath - Base path to the event directory
 * @param {Array<{name: string, file: string}>} files - Files config from meta.json
 * @returns {Promise<Object>} Lockfile content
 */
export async function generateLockfile(eventBasePath, files) {
  const generatedAt = new Date().toISOString();

  // Get last change for the entire directory
  const dirInfo = getLastModified(eventBasePath);

  // Get individual file stats
  const sourceFiles = {};

  // Always include meta.json
  const metaPath = path.join(eventBasePath, "meta.json");
  try {
    const metaInfo = getFileLastModified(metaPath);
    sourceFiles["meta.json"] = {
      lastModified: metaInfo.timestamp,
    };
  } catch {
    // meta.json should always exist, but handle gracefully
  }

  // Include CSV files
  for (const fileConfig of files) {
    const filePath = path.join(eventBasePath, fileConfig.file);
    try {
      await fs.access(filePath);
      const fileInfo = getFileLastModified(filePath);
      sourceFiles[fileConfig.file] = {
        lastModified: fileInfo.timestamp,
      };
    } catch {
      console.warn(`Lockfile: file not found: ${filePath}`);
    }
  }

  return {
    generatedAt,
    lastChangeAt: dirInfo.timestamp,
    lastChangeCommit: dirInfo.commitHash,
    sourceFiles,
  };
}

/**
 * Writes a lockfile to disk.
 *
 * @param {string} outputPath - Path to write the lockfile
 * @param {Object} lockfile - Lockfile content
 */
export async function writeLockfile(outputPath, lockfile) {
  await fs.writeFile(outputPath, JSON.stringify(lockfile, null, 2), "utf-8");
}
