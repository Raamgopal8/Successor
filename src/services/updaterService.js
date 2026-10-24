/**
 * Successor Desktop Auto-Update Service
 * Integrates with @tauri-apps/plugin-updater and @tauri-apps/plugin-process
 * Checks GitHub Releases (Raamgopal8/Successor) for signed releases.
 */

export const isTauriApp = () => {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
};

export const getCurrentAppVersion = () => {
  return "0.1.2";
};

let cachedUpdate = null;

/**
 * Check for new releases on GitHub
 * @returns {Promise<{ hasUpdate: boolean, update?: any, error?: string }>}
 */
export async function checkForAppUpdate() {
  if (!isTauriApp()) {
    return {
      hasUpdate: false,
      isWeb: true,
      message: "Running in web mode. Auto-updater is active in the native desktop app.",
    };
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (update && update.available) {
      cachedUpdate = update;
      return {
        hasUpdate: true,
        update,
        currentVersion: update.currentVersion || getCurrentAppVersion(),
        version: update.version,
        date: update.date,
        body: update.body || "A new version of Successor is ready to install.",
      };
    }

    cachedUpdate = null;
    return {
      hasUpdate: false,
      currentVersion: getCurrentAppVersion(),
      message: "Successor is up to date.",
    };
  } catch (error) {
    console.warn("Auto-update check failed:", error);
    return {
      hasUpdate: false,
      error: error?.message || String(error),
      currentVersion: getCurrentAppVersion(),
    };
  }
}

/**
 * Download and install the update with real-time chunk progress
 * @param {Function} onProgress ({ downloaded, contentLength, percent })
 */
export async function installAppUpdate(onProgress) {
  if (!isTauriApp()) {
    throw new Error("Updates can only be installed in the desktop app.");
  }

  const update = cachedUpdate;
  if (!update) {
    // Attempt to re-check
    const { check } = await import("@tauri-apps/plugin-updater");
    const fresh = await check();
    if (!fresh || !fresh.available) {
      throw new Error("No update found to install.");
    }
    return runDownload(fresh, onProgress);
  }

  return runDownload(update, onProgress);
}

async function runDownload(update, onProgress) {
  let downloaded = 0;
  let contentLength = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        contentLength = event.data?.contentLength || 0;
        if (onProgress) {
          onProgress({ downloaded: 0, contentLength, percent: 0, stage: "started" });
        }
        break;
      case "Progress":
        downloaded += event.data?.chunkLength || 0;
        const percent = contentLength > 0 ? Math.min(100, Math.round((downloaded / contentLength) * 100)) : 50;
        if (onProgress) {
          onProgress({ downloaded, contentLength, percent, stage: "downloading" });
        }
        break;
      case "Finished":
        if (onProgress) {
          onProgress({ downloaded, contentLength, percent: 100, stage: "finished" });
        }
        break;
      default:
        break;
    }
  });

  return true;
}

/**
 * Restart the desktop application to apply downloaded updates
 */
export async function relaunchApp() {
  if (!isTauriApp()) return;
  try {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (err) {
    console.error("Relaunch failed:", err);
    window.location.reload();
  }
}
