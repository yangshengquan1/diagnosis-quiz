export function buildInstallState({ hasPrompt, isStandalone, isOnline }) {
  if (isStandalone) {
    return {
      canInstall: false,
      isInstalled: true,
      isOnline,
      label: "已安装到设备"
    };
  }

  if (!isOnline) {
    return {
      canInstall: false,
      isInstalled: false,
      isOnline: false,
      label: "离线模式"
    };
  }

  if (hasPrompt) {
    return {
      canInstall: true,
      isInstalled: false,
      isOnline: true,
      label: "可安装到主屏幕"
    };
  }

  return {
    canInstall: false,
    isInstalled: false,
    isOnline: true,
    label: "已联网"
  };
}

export function shouldShowInstallButton(installState) {
  return installState.canInstall && !installState.isInstalled;
}

export function serviceWorkerScriptUrl(moduleUrl) {
  return new URL("../service-worker.js", moduleUrl).toString();
}
