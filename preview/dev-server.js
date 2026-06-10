#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const root = path.resolve(__dirname, "..");
const previewRoot = path.join(root, "preview");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const clients = new Set();
const { buildDocs } = require("./docs/build-docs");

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  const requested = path.normalize(path.join(root, pathname));
  if (!requested.startsWith(root)) return null;
  return requested;
}

function serveFile(req, res) {
  let filePath = resolveRequestPath(req.url);
  if (!filePath) {
    send(res, 403, "Forbidden", { "content-type": "text/plain; charset=utf-8" });
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mimeTypes.get(ext) || "application/octet-stream"
    });
    res.end(content);
  });
}

function sendChange(filename) {
  const payload = JSON.stringify({ filename, time: Date.now() });
  for (const res of clients) {
    res.write(`event: change\ndata: ${payload}\n\n`);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/__preview/ping") {
    send(res, 200, "ok", {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8"
    });
    return;
  }

  if (req.url === "/__preview/events") {
    res.writeHead(200, {
      "cache-control": "no-store",
      "connection": "keep-alive",
      "content-type": "text/event-stream"
    });
    res.write("event: ready\ndata: {}\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  serveFile(req, res);
});

let debounce = null;
function watchPreviewFiles() {
  fs.watch(previewRoot, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    if (filename.includes(".DS_Store")) return;
    if (!/\.(html|js|css|jpg|jpeg|png|svg|md|json)$/i.test(filename)) return;

    if (/^docs\/markdown\/.+\.md$/i.test(filename)) {
      try {
        buildDocs();
      } catch (error) {
        console.error(error);
      }
    }

    clearTimeout(debounce);
    debounce = setTimeout(() => sendChange(filename), 90);
  });
}

server.listen(port, host, () => {
  watchPreviewFiles();
  console.log(`Preview server running at http://${host}:${port}/preview/index.html`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Try: PORT=4174 HOST=${host} node preview/dev-server.js`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
