// Static server for the exported site:  npm run build && npm start
// Mirrors public/_headers (Cloudflare) so local serving behaves like production:
// security headers everywhere, long cache for hashed assets, and a REAL 404 for
// missing files — the SPA fallback applies only to page-like (extensionless) paths,
// never to missing JS/CSS/images (returning index.html with 200 for those masks
// broken deploys and poisons debugging / service-worker updates).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("out");
const port = Number(process.env.PORT || 3000);
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".webmanifest":"application/manifest+json", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".svg":"image/svg+xml", ".ico":"image/x-icon", ".woff":"font/woff", ".woff2":"font/woff2", ".txt":"text/plain; charset=utf-8" };
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(self)",
};
function cacheControl(p) {
  if (p.startsWith("/_next/static/")) return "public, max-age=31536000, immutable";
  if (p.startsWith("/images/")) return "public, max-age=2592000, stale-while-revalidate=86400";
  if (p === "/sw.js") return "no-cache";
  if (p === "/manifest.webmanifest" || p === "/offline.html") return "public, max-age=3600";
  return null;
}
function sendFile(res, f, urlPath, status = 200) {
  const headers = { "Content-Type": types[path.extname(f)] || "application/octet-stream", ...securityHeaders };
  const cc = cacheControl(urlPath);
  if (cc) headers["Cache-Control"] = cc;
  res.writeHead(status, headers);
  fs.createReadStream(f).pipe(res);
}
http.createServer((req, res) => {
  const urlPath = new URL(req.url, "http://x").pathname;
  let p = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  let f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403, securityHeaders); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (fs.existsSync(f)) return sendFile(res, f, urlPath);
  // Missing path: a file extension means a real asset is missing -> honest 404.
  // Extensionless paths are SPA page routes -> fall back to the app shell.
  if (path.extname(p)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders });
    return res.end("404 Not Found");
  }
  return sendFile(res, path.join(root, "index.html"), urlPath);
}).listen(port, () => console.log(`http://localhost:${port}`));
