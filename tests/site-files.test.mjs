import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CACHE_NAME,
  isNetworkFirstRequest,
  shouldCacheNetworkResponse
} from "../service-worker.js";

test("manifest declares installable app metadata", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8")
  );

  assert.equal(manifest.name, "执业医题眼诊断练习");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.icons.length >= 2, true);
});

test("service worker uses network-first for app shell resources", () => {
  assert.equal(CACHE_NAME, "diagnosis-quiz-v3");
  assert.equal(isNetworkFirstRequest("https://example.com/"), true);
  assert.equal(isNetworkFirstRequest("https://example.com/index.html"), true);
  assert.equal(isNetworkFirstRequest("https://example.com/src/app.js"), true);
  assert.equal(isNetworkFirstRequest("https://example.com/data/questions.js"), true);
  assert.equal(isNetworkFirstRequest("https://example.com/assets/icon.svg"), false);
  assert.equal(shouldCacheNetworkResponse({ status: 200, type: "basic" }), true);
  assert.equal(shouldCacheNetworkResponse({ status: 500, type: "basic" }), false);
  assert.equal(shouldCacheNetworkResponse({ status: 200, type: "opaque" }), false);
});

test("readme documents desktop and pages verification together", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /GitHub Pages/);
  assert.match(readme, /桌面端/);
  assert.match(readme, /本地测试/);
  assert.match(readme, /线上生效/);
});
