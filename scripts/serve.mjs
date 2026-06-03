import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

export function resolveRequestPath(requestUrl = "/") {
  const [pathname] = requestUrl.split("?");
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const relativePath = normalizedPath.replace(/^\/+/, "");

  if (relativePath.includes("..")) {
    throw new Error("Invalid path");
  }

  return relativePath;
}

export function contentTypeFor(filePath) {
  return MIME_TYPES.get(path.extname(filePath)) || "application/octet-stream";
}

async function handleRequest(request, response) {
  try {
    const relativePath = resolveRequestPath(request.url || "/");
    const fullPath = path.join(ROOT_DIR, relativePath);
    const body = await readFile(fullPath);

    response.writeHead(200, {
      "Content-Type": contentTypeFor(relativePath),
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch (error) {
    const statusCode = error.message === "Invalid path" ? 400 : 404;

    response.writeHead(statusCode, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end(statusCode === 400 ? "Bad Request" : "Not Found");
  }
}

export function startPreviewServer(port = DEFAULT_PORT) {
  const server = http.createServer(handleRequest);

  server.listen(port, () => {
    console.log(`Diagnosis quiz preview running at http://127.0.0.1:${port}`);
  });

  return server;
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  startPreviewServer();
}
