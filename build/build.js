#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import postcss from "postcss";
import postcssConfig from "../postcss.config.mjs";

import { discoverEvents } from "./utils/discovery.js";
import { parseCSV } from "./utils/csv.js";
import { generateLockfile, writeLockfile } from "./utils/lockfile.js";
import { buildTabConfig } from "./utils/table-config.js";
import {
  slugify,
  sortRows,
  formatDisplayNames,
  typeDisplayNames,
  categoryDisplayNames,
  columnWidthMap,
  numericHeaderHints,
  getColumnWidthClass,
  isLikelyNumericHeader,
  isNumericValue,
  formatDateRange,
  getDisplayName,
  formatLastUpdated,
} from "./utils/helpers.js";
import { generateOgImages } from "./utils/og-images.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const DIST_DIR = path.join(ROOT_DIR, "dist");
const DATA_DIR = path.join(ROOT_DIR, "data", "events");
const TEMPLATES_DIR = path.join(ROOT_DIR, "templates");
const STATIC_DIR = path.join(ROOT_DIR, "static");
const STYLE_ENTRY = path.join(STATIC_DIR, "style", "index.css");
const STYLE_OUTPUT = path.join(DIST_DIR, "style", "index.css");
const postcssPlugins = Array.isArray(postcssConfig?.plugins)
  ? postcssConfig.plugins
  : Object.values(postcssConfig?.plugins ?? {});
const DEFAULT_SITE_URL = `http://localhost:${process.env.PORT || 3000}`;
const RAW_SITE_URL = process.env.SITE_URL || process.env.CF_PAGES_URL;
const SITE_URL =
  RAW_SITE_URL && RAW_SITE_URL.trim()
    ? RAW_SITE_URL.replace(/\/$/, "")
    : DEFAULT_SITE_URL;

/**
 * Clean and recreate the dist directory.
 */
async function cleanDist() {
  console.log("Cleaning dist directory...");
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.mkdir(path.join(DIST_DIR, "events"), { recursive: true });
}

/**
 * Process a single event and generate its HTML page.
 */
async function processEvent(event) {
  console.log(`Processing event: ${event.slug}/${event.year}`);

  // Read meta.json
  const metaContent = await fs.readFile(event.metaPath, "utf-8");
  const meta = JSON.parse(metaContent);

  // Parse all CSV files and build tabs
  const tabs = [];
  const files = Array.isArray(meta.files) ? meta.files : [];

  for (const fileConfig of files) {
    const csvPath = path.join(event.basePath, fileConfig.file);
    const resolvedFileConfig = { ...fileConfig };
    if (!resolvedFileConfig.format && !resolvedFileConfig.columns) {
      if (resolvedFileConfig.file === "results.csv") {
        resolvedFileConfig.format = "results";
      }
      if (resolvedFileConfig.file === "singles.csv") {
        resolvedFileConfig.format = "singles";
      }
    }

    try {
      const rows = await parseCSV(csvPath);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      // Apply default sort by "Place" column if it exists
      const defaultKey = headers.includes("Place") ? "Place" : headers[0];
      const tabConfig = buildTabConfig({
        headers,
        rows,
        fileConfig: resolvedFileConfig,
        defaultSortKey: defaultKey,
      });
      const sortedRows = tabConfig.defaultSortKey
        ? sortRows(tabConfig.rows, tabConfig.defaultSortKey, "asc", tabConfig.columns)
        : tabConfig.rows;

      tabs.push({
        id: slugify(fileConfig.name || `tab-${tabs.length + 1}`),
        name: fileConfig.name || `Tab ${tabs.length + 1}`,
        columns: tabConfig.columns,
        rows: sortedRows,
        rowsOriginal: tabConfig.rows,
        defaultSortKey: tabConfig.defaultSortKey,
        isActive: tabs.length === 0,
      });
    } catch (err) {
      console.error(`Error processing ${csvPath}: ${err.message}`);
      // Skip this tab but continue with others
    }
  }

  // Generate lockfile
  const lockfile = await generateLockfile(event.basePath, files);

  // Write lockfile to source directory
  const sourceLockfilePath = path.join(event.basePath, "meta-lock.json");
  await writeLockfile(sourceLockfilePath, lockfile);

  // Build tableState for client-side JS
  const tableState = {};
  for (const tab of tabs) {
    tableState[tab.id] = {
      columns: tab.columns,
      rowsOriginal: tab.rowsOriginal,
      sort: {
        key: tab.defaultSortKey || "",
        dir: "asc",
      },
      defaultSortKey: tab.defaultSortKey || "",
    };
  }

  // Render the event page
  const html = await ejs.renderFile(
    path.join(TEMPLATES_DIR, "pages", "event.ejs"),
    {
      meta,
      tabs,
      tableState,
      lockfile,
      siteUrl: SITE_URL,
      pageUrl: `${SITE_URL}/events/${event.slug}/${event.year}/`,
      ogImageUrl: `${SITE_URL}/og/${event.slug}/${event.year}.png`,
      // Helper functions and mappings for the template
      formatDisplayNames,
      typeDisplayNames,
      categoryDisplayNames,
      columnWidthMap,
      numericHeaderHints,
      slugify,
      getColumnWidthClass,
      isLikelyNumericHeader,
      isNumericValue,
      formatDateRange,
      getDisplayName,
      formatLastUpdated,
    },
    { async: true },
  );

  // Create output directory
  const outputDir = path.join(DIST_DIR, "events", event.slug, event.year);
  await fs.mkdir(outputDir, { recursive: true });

  // Write HTML
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf-8");

  // Copy lockfile to dist
  await fs.copyFile(sourceLockfilePath, path.join(outputDir, "meta-lock.json"));

  const badges = [];
  if (meta.format) {
    badges.push({
      type: "format",
      label: getDisplayName(meta.format, formatDisplayNames),
    });
  }
  if (meta.type) {
    badges.push({
      type: "type",
      label: getDisplayName(meta.type, typeDisplayNames),
    });
  }
  if (meta.category) {
    badges.push({
      type: "category",
      label: getDisplayName(meta.category, categoryDisplayNames),
    });
  }
  if (meta.pattern) {
    badges.push({ type: "pattern", label: meta.pattern });
  }
  const dateRange = formatDateRange(meta.dates);
  if (dateRange) {
    badges.push({ type: "date", label: dateRange });
  }

  // Extract top 3 from results.csv for OG image podium
  const podium = [];
  const resultsFileConfig = meta.files?.find((f) => f.file === "results.csv");
  if (resultsFileConfig) {
    const resultsTab = tabs.find((t) => t.name === resultsFileConfig.name);
    if (resultsTab && resultsTab.rows.length > 0) {
      const top3 = resultsTab.rows.slice(0, 3);
      for (const row of top3) {
        // Collect all player columns dynamically (Player 1, Player 2, etc.)
        const players = Object.keys(row)
          .filter((k) => k.startsWith("Player"))
          .sort()
          .map((k) => row[k])
          .filter(Boolean)
          .join(" & ");

        // Score priority: HCP Series > Scratch Series > Scratch > Score
        const score =
          row["HCP Series"] ||
          row["Scratch Series"] ||
          row["Scratch"] ||
          row["Score"] ||
          "";

        podium.push({
          place: parseInt(row["Place"], 10) || podium.length + 1,
          players: players || row["Team"] || "Unknown",
          score: String(score),
        });
      }
    }
  }

  const ogData = {
    name: meta.name || "Tournament Results",
    description: meta.description || "",
    badges,
    podium,
    slug: event.slug,
    year: event.year,
    lastUpdated: lockfile?.lastChangeAt || lockfile?.generatedAt || null,
  };

  const ogDir = path.join(DIST_DIR, "og-data", "events", event.slug);
  await fs.mkdir(ogDir, { recursive: true });
  await fs.writeFile(
    path.join(ogDir, `${event.year}.json`),
    JSON.stringify(ogData, null, 2),
    "utf-8",
  );

  console.log(`  -> ${outputDir}/index.html`);

  return { slug: event.slug, year: event.year, meta, lockfile };
}

/**
 * Generate the events index/listing page.
 */
async function generateIndexPage(eventsData) {
  console.log("Generating index page...");

  // Sort events by date (most recent first)
  eventsData.sort((a, b) => {
    // Parse first date from each event (format: dd/mm/yyyy)
    const parseDate = (dates) => {
      if (!dates || !dates.length) return new Date(0);
      const [day, month, year] = dates[0].split("/");
      return new Date(year, month - 1, day);
    };

    const dateA = parseDate(a.meta.dates);
    const dateB = parseDate(b.meta.dates);
    return dateB - dateA;
  });

  const html = await ejs.renderFile(
    path.join(TEMPLATES_DIR, "pages", "index.ejs"),
    {
      events: eventsData,
      formatDisplayNames,
      typeDisplayNames,
      formatDateRange,
      getDisplayName,
      categoryDisplayNames,
      formatLastUpdated,
      siteUrl: SITE_URL,
      pageUrl: `${SITE_URL}/`,
      ogImageUrl: `${SITE_URL}/og/index.png`,
    },
    { async: true },
  );

  await fs.writeFile(path.join(DIST_DIR, "index.html"), html, "utf-8");
  console.log("  -> dist/index.html");
}

/**
 * Generate the 404 error page.
 */
async function generate404Page() {
  console.log("Generating 404 page...");

  const html = await ejs.renderFile(
    path.join(TEMPLATES_DIR, "pages", "404.ejs"),
    {
      currentYear: new Date().getFullYear(),
      siteUrl: SITE_URL,
      pageUrl: `${SITE_URL}/404.html`,
      ogImageUrl: `${SITE_URL}/og/index.png`,
    },
    { async: true },
  );

  await fs.writeFile(path.join(DIST_DIR, "404.html"), html, "utf-8");
  console.log("  -> dist/404.html");
}

/**
 * Generate sitemap.xml and robots.txt.
 */
async function generateSitemapAndRobots(eventsData) {
  console.log("Generating sitemap and robots...");

  if (!RAW_SITE_URL) {
    console.warn(`  ! SITE_URL not set, using ${SITE_URL} for sitemap URLs`);
  }

  const urls = [
    { loc: `${SITE_URL}/`, lastmod: new Date().toISOString() },
    ...eventsData.map((event) => {
      const lastChange =
        event.lockfile?.lastChangeAt || event.lockfile?.generatedAt;
      const lastmod = lastChange ? new Date(lastChange).toISOString() : null;
      return {
        loc: `${SITE_URL}/events/${event.slug}/${event.year}/`,
        lastmod,
      };
    }),
  ];

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => {
      const parts = [`  <url>`, `    <loc>${url.loc}</loc>`];
      if (url.lastmod) {
        parts.push(`    <lastmod>${url.lastmod}</lastmod>`);
      }
      parts.push("  </url>");
      return parts.join("\n");
    }),
    "</urlset>",
    "",
  ].join("\n");

  await fs.writeFile(path.join(DIST_DIR, "sitemap.xml"), sitemap, "utf-8");
  console.log("  -> dist/sitemap.xml");

  const robots = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  await fs.writeFile(path.join(DIST_DIR, "robots.txt"), robots, "utf-8");
  console.log("  -> dist/robots.txt");
}

/**
 * Generate OG index data.
 */
async function generateOgIndexData(eventsData) {
  console.log("Generating OG index data...");

  const latestEvent = eventsData[0];
  const ogIndex = {
    eventCount: eventsData.length,
    latestEventName: latestEvent?.meta?.name || null,
    latestEventYear: latestEvent?.year || null,
  };

  const ogDir = path.join(DIST_DIR, "og-data");
  await fs.mkdir(ogDir, { recursive: true });
  await fs.writeFile(
    path.join(ogDir, "index.json"),
    JSON.stringify(ogIndex, null, 2),
    "utf-8",
  );
  console.log("  -> dist/og-data/index.json");
}

/**
 * Build Tailwind CSS via PostCSS.
 */
async function buildStyles() {
  console.log("Building styles...");

  const css = await fs.readFile(STYLE_ENTRY, "utf-8");
  const result = await postcss(postcssPlugins).process(css, {
    from: STYLE_ENTRY,
    to: STYLE_OUTPUT,
  });

  const warnings = result.warnings();
  if (warnings.length) {
    warnings.forEach((warning) => console.warn(warning.toString()));
  }

  await fs.mkdir(path.dirname(STYLE_OUTPUT), { recursive: true });
  await fs.writeFile(STYLE_OUTPUT, result.css, "utf-8");
  console.log("  -> dist/style/index.css");
}

/**
 * Copy static files to dist.
 */
async function copyStaticFiles() {
  console.log("Copying static files...");

  // Copy static assets into dist root (static/style -> dist/style)
  try {
    const entries = await fs.readdir(STATIC_DIR, { withFileTypes: true });
    for (const entry of entries) {
      const src = path.join(STATIC_DIR, entry.name);
      const dest = path.join(DIST_DIR, entry.name);
      await fs.cp(src, dest, { recursive: entry.isDirectory() });
    }
    if (entries.length) {
      console.log("  -> dist/(static assets)");
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    console.warn("  ! static directory not found, skipping");
  }

  const fallbackAssets = [
    {
      src: path.join(STATIC_DIR, "assets", "favicon.ico"),
      dest: path.join(DIST_DIR, "favicon.ico"),
    },
    {
      src: path.join(STATIC_DIR, "assets", "site.webmanifest"),
      dest: path.join(DIST_DIR, "site.webmanifest"),
    },
  ];

  for (const asset of fallbackAssets) {
    try {
      await fs.copyFile(asset.src, asset.dest);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  // Copy _headers
  const headersPath = path.join(ROOT_DIR, "_headers");
  try {
    await fs.access(headersPath);
    await fs.copyFile(headersPath, path.join(DIST_DIR, "_headers"));
    console.log("  -> dist/_headers");
  } catch {
    console.warn("  ! _headers not found, skipping");
  }
}

/**
 * Main build function.
 */
async function build() {
  console.log("Starting build...\n");
  const startTime = Date.now();

  try {
    // Step 1: Clean dist
    await cleanDist();

    // Step 2: Discover events
    console.log("\nDiscovering events...");
    const events = await discoverEvents(DATA_DIR);
    console.log(`Found ${events.length} event(s)\n`);

    if (events.length === 0) {
      console.warn("No events found. Creating empty index page.");
    }

    // Step 3: Process each event
    console.log("Processing events...");
    const eventsData = [];
    for (const event of events) {
      const data = await processEvent(event);
      eventsData.push(data);
    }

    // Step 4: Generate index page
    console.log("");
    await generateIndexPage(eventsData);

    // Step 5: Generate 404 page
    await generate404Page();

    // Step 6: Generate OG index data
    await generateOgIndexData(eventsData);

    // Step 7: Generate OG images
    await generateOgImages(DIST_DIR, eventsData);

    // Step 8: Generate sitemap and robots
    await generateSitemapAndRobots(eventsData);

    // Step 9: Copy static files
    await copyStaticFiles();

    // Step 10: Build styles
    await buildStyles();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nBuild complete in ${duration}s`);
    console.log(`Output: ${DIST_DIR}`);
  } catch (err) {
    console.error("\nBuild failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run build
build();
