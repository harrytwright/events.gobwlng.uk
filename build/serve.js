#!/usr/bin/env node

import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PORT = Number(process.env.PORT) || 3000;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(cleanPath).replace(/^[/\\]+/, "");
  return path.join(DIST_DIR, normalized);
}

async function fileExists(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath);
  res.writeHead(statusCode, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
  });
  const data = await fs.readFile(filePath);
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  let targetPath = resolvePath(req.url);
  let stat = await fileExists(targetPath);

  if (stat && stat.isDirectory()) {
    targetPath = path.join(targetPath, "index.html");
    stat = await fileExists(targetPath);
  }

  if (!stat) {
    const notFoundPath = path.join(DIST_DIR, "404.html");
    const notFoundStat = await fileExists(notFoundPath);
    if (notFoundStat) {
      await serveFile(res, notFoundPath, 404);
      return;
    }
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  await serveFile(res, targetPath);
});

server.listen(PORT, () => {
  console.log(`Serving dist at http://localhost:${PORT}`);
});
