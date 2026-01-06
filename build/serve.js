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
const LIVE_RELOAD_PATH = "/__livereload";

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
  const isHtml = ext === ".html";
  res.writeHead(statusCode, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
  });
  const data = await fs.readFile(filePath, isHtml ? "utf-8" : undefined);
  res.end(data);
}

function injectLiveReload(html) {
  const snippet = `
    <script>
      (() => {
        const source = new EventSource("${LIVE_RELOAD_PATH}");
        source.onmessage = () => window.location.reload();
      })();
    </script>
  `;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${snippet}</body>`);
  }
  return `${html}\n${snippet}`;
}

export function startServer({ port = PORT, liveReload = false } = {}) {
  const clients = new Set();

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    if (liveReload && req.url === LIVE_RELOAD_PATH) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
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
        const html = await fs.readFile(notFoundPath, "utf-8");
        const body = liveReload ? injectLiveReload(html) : html;
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(body);
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = path.extname(targetPath);
    const isHtml = ext === ".html";
    if (liveReload && isHtml) {
      const html = await fs.readFile(targetPath, "utf-8");
      const body = injectLiveReload(html);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(body);
      return;
    }

    await serveFile(res, targetPath);
  });

  server.listen(port, () => {
    console.log(`Serving dist at http://localhost:${port}`);
  });

  const triggerReload = () => {
    for (const client of clients) {
      client.write("data: reload\n\n");
    }
  };

  return { server, triggerReload };
}

if (process.argv[1] === __filename) {
  startServer();
}
