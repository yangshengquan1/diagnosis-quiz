import test from "node:test";
import assert from "node:assert/strict";
import {
  contentTypeFor,
  resolveRequestPath
} from "../scripts/serve.mjs";

test("resolveRequestPath maps root requests to index.html", () => {
  assert.equal(resolveRequestPath("/"), "index.html");
  assert.equal(resolveRequestPath("/index.html"), "index.html");
});

test("resolveRequestPath strips query strings and blocks path traversal", () => {
  assert.equal(resolveRequestPath("/src/app.js?v=1"), "src/app.js");
  assert.throws(() => resolveRequestPath("/../secret.txt"), /Invalid path/);
});

test("contentTypeFor returns expected MIME types for site files", () => {
  assert.equal(contentTypeFor("index.html"), "text/html; charset=utf-8");
  assert.equal(contentTypeFor("styles.css"), "text/css; charset=utf-8");
  assert.equal(contentTypeFor("src/app.js"), "text/javascript; charset=utf-8");
  assert.equal(contentTypeFor("manifest.webmanifest"), "application/manifest+json; charset=utf-8");
  assert.equal(contentTypeFor("assets/icon.svg"), "image/svg+xml");
});
