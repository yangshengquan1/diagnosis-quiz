import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInstallState,
  serviceWorkerScriptUrl,
  shouldShowInstallButton
} from "../src/pwa.js";

test("buildInstallState returns an installed state when running standalone", () => {
  assert.deepEqual(
    buildInstallState({ hasPrompt: true, isStandalone: true, isOnline: true }),
    { canInstall: false, isInstalled: true, isOnline: true, label: "已安装到设备" }
  );
});

test("buildInstallState exposes install action when prompt is available", () => {
  assert.deepEqual(
    buildInstallState({ hasPrompt: true, isStandalone: false, isOnline: true }),
    { canInstall: true, isInstalled: false, isOnline: true, label: "可安装到主屏幕" }
  );

  assert.equal(
    shouldShowInstallButton({ canInstall: true, isInstalled: false, isOnline: true }),
    true
  );
});

test("buildInstallState reports offline mode", () => {
  assert.deepEqual(
    buildInstallState({ hasPrompt: false, isStandalone: false, isOnline: false }),
    { canInstall: false, isInstalled: false, isOnline: false, label: "离线模式" }
  );
});

test("serviceWorkerScriptUrl points to the root service worker from src/app.js", () => {
  const url = serviceWorkerScriptUrl("https://example.com/src/app.js");

  assert.equal(url, "https://example.com/service-worker.js");
});
