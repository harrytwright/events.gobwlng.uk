#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { startServer } from "./serve.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const WATCH_TARGETS = [
  "build",
  "data",
  "static",
  "templates",
  "postcss.config.mjs",
];

let buildInProgress = false;
let buildQueued = false;
let debounceTimer = null;
const watchers = [];

function shouldIgnore(filename) {
  if (!filename) return false;
  return filename.endsWith("meta-lock.json") || filename.startsWith(".");
}

function runBuild() {
  if (buildInProgress) {
    buildQueued = true;
    return;
  }

  buildInProgress = true;
  const child = spawn("node", [path.join(ROOT_DIR, "build", "build.js")], {
    stdio: "inherit",
  });

  child.on("close", (code) => {
    buildInProgress = false;
    if (code === 0) {
      triggerReload();
    } else {
      console.warn("Build failed; not reloading.");
    }
    if (buildQueued) {
      buildQueued = false;
      runBuild();
    }
  });
}

function scheduleBuild() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runBuild, 200);
}

function watchPath(targetPath) {
  const stats = fs.statSync(targetPath);
  const watcher = fs.watch(
    targetPath,
    { recursive: stats.isDirectory() },
    (_eventType, filename) => {
      if (shouldIgnore(filename)) return;
      scheduleBuild();
    },
  );
  watchers.push(watcher);
}

const { triggerReload } = startServer({ port: PORT, liveReload: true });

WATCH_TARGETS.forEach((target) => {
  const resolved = path.join(ROOT_DIR, target);
  try {
    watchPath(resolved);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
});

runBuild();

process.on("SIGINT", () => {
  watchers.forEach((watcher) => watcher.close());
  process.exit(0);
});
