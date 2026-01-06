import fs from "fs/promises";
import Papa from "papaparse";

/**
 * Normalizes row keys by trimming whitespace.
 * Preserves the existing logic from index.html.
 *
 * @param {Array<Object>} rows - Raw parsed rows
 * @returns {Array<Object>} Normalized rows
 */
export function normalizeRows(rows) {
  return rows.map((row) => {
    const out = {};
    Object.keys(row).forEach((k) => {
      const key = (k || "").trim();
      out[key] = row[k];
    });
    return out;
  });
}

/**
 * Parses a tab-separated CSV file.
 *
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array<Object>>} Parsed and normalized rows
 */
export async function parseCSV(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    const result = Papa.parse(content, {
      header: true,
      delimiter: "\t",
      skipEmptyLines: true,
    });

    if (result.errors && result.errors.length > 0) {
      console.warn(`CSV parsing warnings for ${filePath}:`, result.errors);
    }

    return normalizeRows(result.data || []);
  } catch (err) {
    console.error(`Error parsing CSV file ${filePath}: ${err.message}`);
    throw err;
  }
}
