/* Ledger Cleaner server.
 *
 * Deliberately zero-dependency: nothing to npm install, nothing to break on
 * deploy, and it runs on any Node 18+ with `node server.js`.
 *
 * It does two things:
 *   1. serves the app out of ./public
 *   2. keeps a small key/value store so two computers share one setup
 *
 * Only settings live here (rules, categories, account names, opening
 * balances). Statement files are never uploaded or stored.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
/* Works whether index.html sits in ./public or beside this file. */
const PUBLIC_DIR = process.env.PUBLIC_DIR
  || (fs.existsSync(path.join(__dirname, "public")) ? path.join(__dirname, "public") : __dirname);
const USER = process.env.APP_USER || "me";
const PASS = process.env.APP_PASSWORD || "";
const MAX_BODY = 2 * 1024 * 1024; // settings are a few KB; this is generous

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------- storage ---------- */
function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

/* Write to a temp file then rename, so a crash mid-write can't leave a
   half-written settings file behind. */
function writeStore(obj) {
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, DATA_FILE);
}

/* ---------- auth ---------- */
function constantTimeEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function authorized(req) {
  if (!PASS) return true; // no password configured: local development
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep === -1) return false;
  return (
    constantTimeEqual(decoded.slice(0, sep), USER) &&
    constantTimeEqual(decoded.slice(sep + 1), PASS)
  );
}

/* ---------- helpers ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

function sendJson(res, code, body) {
  const text = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": MIME[".json"], "Content-Length": Buffer.byteLength(text) });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const target = path.join(PUBLIC_DIR, rel);
  /* Never let a crafted path climb out of ./public */
  if (!target.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  /* Render's health check must not need credentials. */
  if (pathname === "/healthz") return sendJson(res, 200, { ok: true });

  if (!authorized(req)) {
    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="Ledger Cleaner", charset="UTF-8"',
      "Content-Type": "text/plain",
    });
    res.end("Authentication required");
    return;
  }

  if (pathname === "/api/kv" && req.method === "GET") {
    return sendJson(res, 200, readStore());
  }

  if (pathname.startsWith("/api/kv/") && req.method === "PUT") {
    const key = pathname.slice("/api/kv/".length);
    if (!key) return sendJson(res, 400, { error: "missing key" });
    try {
      const parsed = JSON.parse(await readBody(req));
      if (typeof parsed.value !== "string") return sendJson(res, 400, { error: "value must be a string" });
      const store = readStore();
      store[key] = parsed.value;
      writeStore(store);
      return sendJson(res, 200, { key, saved: true });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  if (pathname.startsWith("/api/kv/") && req.method === "DELETE") {
    const key = pathname.slice("/api/kv/".length);
    const store = readStore();
    delete store[key];
    writeStore(store);
    return sendJson(res, 200, { key, deleted: true });
  }

  if (pathname.startsWith("/api/")) return sendJson(res, 404, { error: "no such endpoint" });

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Ledger Cleaner listening on port ${PORT}`);
  console.log(`  settings file: ${DATA_FILE}`);
  if (!PASS) {
    console.warn("  WARNING: APP_PASSWORD is not set, so anyone with the URL can read and change your settings.");
  }
});
