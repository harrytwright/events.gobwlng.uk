/**
 * Shared helper functions used by both build script and templates.
 * These are extracted directly from the original index.html.
 */

// Format display name mappings
export const formatDisplayNames = {
  "doubles-reentry": "Re-Entry Doubles",
  "doubles-standard": "Standard Doubles",
  "fives-combination": "Combination 5's",
  "fives-diamond": "Diamond 5's",
  "fives-standard": "Standard 5's",
  "trios-reentry": "Re-Entry Trios",
  "singles-standard": "Singles",
  "scotch-doubles": "Scotch Doubles",
};

// Type display name mappings
export const typeDisplayNames = {
  handicap: "Handicap",
  scratch: "Scratch",
  mixed: "Mixed",
};

// Type display name mappings
export const categoryDisplayNames = {
  junior: "Junior",
  adult: "Adult",
  senior: "Senior",
  mixed: "Open",
};

// Preset minimum widths per column key (flexible, content-based)
export const columnWidthMap = {
  // Short numeric/code columns
  Place: "min-w-[4rem]",
  Squad: "min-w-[4rem]",
  HCP: "min-w-[4rem]",
  Pace: "min-w-[4rem]",

  // Game score columns
  "Game 1": "min-w-[4.5rem]",
  "Game 2": "min-w-[4.5rem]",
  "Game 3": "min-w-[4.5rem]",

  // Medium numeric columns
  Scratch: "min-w-[5rem]",
  Average: "min-w-[5rem]",

  // Series columns
  "Scratch Series": "min-w-[6rem]",
  "HCP Series": "min-w-[6rem]",

  // Name/text columns (more flexible)
  Team: "min-w-[8rem]",
  Player: "min-w-[10rem]",
  "Player 1": "min-w-[10rem]",
  "Player 2": "min-w-[10rem]",

  // Team HCP (if present)
  "Team HCP": "min-w-[5rem]",

  // Fallback for unknown columns
  "*": "min-w-[6rem]",
};

export const numericHeaderHints = [
  "place",
  "game",
  "series",
  "hcp",
  "average",
  "pace",
  "scratch",
];

/**
 * Slugify a string for use as an ID.
 */
export function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
}

/**
 * Check if a header is likely numeric based on hints.
 */
export function isLikelyNumericHeader(h) {
  return numericHeaderHints.some((k) => h.toLowerCase().includes(k));
}

/**
 * Parse a value that may be numeric.
 */
export function parseMaybeNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const s = v.replace(/,/g, "").trim();
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Sort rows by a key and direction.
 */
export function sortRows(rows, key, dir, columns = null) {
  const withIndex = rows.map((r, i) => ({ r, i }));
  const numericPreferred =
    (columns || []).find((col) => col.key === key)?.type === "number" ||
    isLikelyNumericHeader(key);

  withIndex.sort((a, b) => {
    const av = a.r[key] ?? a.r[key?.trim?.()];
    const bv = b.r[key] ?? b.r[key?.trim?.()];

    if (numericPreferred) {
      const an = parseMaybeNumber(av);
      const bn = parseMaybeNumber(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return dir === "asc" ? an - bn : bn - an;
      }
    }

    // Fallback string compare
    const as = (av ?? "").toString().toLowerCase();
    const bs = (bv ?? "").toString().toLowerCase();
    if (as < bs) return dir === "asc" ? -1 : 1;
    if (as > bs) return dir === "asc" ? 1 : -1;

    // stable
    return a.i - b.i;
  });

  return withIndex.map((x) => x.r);
}

/**
 * Get the Tailwind width class for a column header.
 */
export function getColumnWidthClass(h) {
  return columnWidthMap[h] || columnWidthMap["*"];
}

/**
 * Format a date range from an array of dates.
 */
export function formatDateRange(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return "";
  if (dates.length === 1) return dates[0];
  if (dates.length === 2) return dates[0] + " – " + dates[1];
  return dates.join(", ");
}

/**
 * Get display name from a mapping, with fallback.
 */
export function getDisplayName(value, mappings, defaultValue = "Unknown") {
  if (!value) return defaultValue;
  return mappings[value] || defaultValue;
}

/**
 * Format a timestamp for display.
 */
export function formatLastUpdated(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Check if a value is likely numeric for table cell alignment.
 */
export function isNumericValue(value, header) {
  const v = value;
  const isNumeric =
    (typeof v === "number" && !isNaN(v)) ||
    (typeof v === "string" &&
      v.trim() !== "" &&
      !isNaN(Number(v.replaceAll(",", ""))));
  const hintNumeric = isLikelyNumericHeader(header);
  return isNumeric || hintNumeric;
}
