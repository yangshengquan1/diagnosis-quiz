import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("manifest declares installable app metadata", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8")
  );

  assert.equal(manifest.name, "执业医题眼诊断练习");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.icons.length >= 2, true);
});

test("service worker precaches the app shell", async () => {
  const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

  assert.match(source, /const PRECACHE_URLS = \[/);
  assert.match(source, /"\.\/index\.html"/);
  assert.match(source, /"\.\/styles\.css"/);
  assert.match(source, /"\.\/src\/app\.js"/);
  assert.match(source, /"\.\/data\/questions\.js"/);
});
