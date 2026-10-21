/**
 * Tauri IPC Rust Bridge Utility
 * Seamlessly connects React UI to the Tauri Rust native backend,
 * with graceful browser fallbacks when running as a web app.
 */

export const isTauri = () => {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
};

/**
 * Fetch native host system information
 */
export async function getNativeSystemInfo() {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("get_system_info");
    } catch (err) {
      console.warn("Tauri get_system_info invocation failed:", err);
    }
  }

  return {
    os: navigator.userAgent.includes("Win")
      ? "windows"
      : navigator.userAgent.includes("Mac")
      ? "macos"
      : "linux",
    arch: "x86_64",
    app_name: "Successor Web/Desktop",
    app_version: "0.1.0",
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Log a completed focus session to desktop persistence
 */
export async function logNativeFocusSession(session) {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("log_focus_session", { session });
    } catch (err) {
      console.warn("Tauri log_focus_session failed:", err);
    }
  }
  return "Logged in session memory";
}

/**
 * Export executive report to user's native desktop or download directory
 */
export async function exportNativeReport(filename, content, format = "markdown") {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("export_desktop_report", {
        report: { filename, content, format },
      });
    } catch (err) {
      console.warn("Tauri export_desktop_report failed:", err);
    }
  }

  // Web fallback: triggers a browser download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    file_path: filename,
    message: `Report ${filename} downloaded via browser.`,
  };
}

/**
 * Native circadian peak query
 */
export async function getCircadianPeak(chronotype) {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("get_circadian_peak", { chronotype });
    } catch (err) {
      console.warn("Tauri get_circadian_peak failed:", err);
    }
  }

  const [start, end, label] =
    chronotype === "owl"
      ? [17.0, 22.5, "5:00 PM – 10:30 PM (Evening Surge)"]
      : chronotype === "falcon"
      ? [11.0, 16.5, "11:00 AM – 4:30 PM (Midday Cadence)"]
      : [8.5, 12.5, "8:30 AM – 12:30 PM (Morning Lark Peak)"];

  return {
    chronotype,
    peak_start_hour: start,
    peak_end_hour: end,
    window_label: label,
    optimal_block_minutes: 50,
  };
}
