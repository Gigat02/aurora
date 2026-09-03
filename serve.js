#!/usr/bin/env node
/* Server statico minimo, zero dipendenze.
   Uso:  node serve.js  [porta]      →  http://localhost:5173  */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2] || process.env.PORT || 5173);
const ROOT = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(ROOT, url === "/" ? "index.html" : url);

  // niente path traversal
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(file, (err, st) => {
    if (err || st.isDirectory()) file = path.join(ROOT, "index.html");
    fs.readFile(file, (err2, buf) => {
      if (err2) { res.writeHead(404).end("Not found"); return; }
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache"
      });
      res.end(buf);
    });
  });
}).listen(PORT, () => {
  console.log("\n  Aurora è in ascolto su  →  http://localhost:" + PORT + "\n");
});
