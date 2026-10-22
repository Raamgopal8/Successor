import React, { useState, useEffect } from "react";
import {
  checkForAppUpdate,
  installAppUpdate,
  relaunchApp,
  isTauriApp,
  getCurrentAppVersion,
} from "../services/updaterService";

export default function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("idle"); // 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest'
  const [progress, setProgress] = useState({ downloaded: 0, contentLength: 0, percent: 0 });
  const [errorMessage, setErrorMessage] = useState("");

  const currentVersion = getCurrentAppVersion();

  // Run update check
  const runCheck = async (manual = false) => {
    if (!isTauriApp() && !manual) return;
    setChecking(true);
    setStatus("checking");
    setErrorMessage("");

    try {
      const res = await checkForAppUpdate();
      if (res.hasUpdate) {
        setUpdateInfo(res);
        setStatus("available");
        setIsOpen(true);
      } else if (manual) {
        if (res.isWeb) {
          setUpdateInfo({ version: currentVersion, body: res.message });
          setStatus("latest");
          setIsOpen(true);
        } else {
          setUpdateInfo({ version: currentVersion, body: "You are running the latest version of Successor." });
          setStatus("latest");
          setIsOpen(true);
        }
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.warn("Update check error:", err);
      if (manual) {
        setStatus("error");
        setErrorMessage(err?.message || "Failed to check for updates");
        setIsOpen(true);
      } else {
        setStatus("idle");
      }
    } finally {
      setChecking(false);
    }
  };

  // Background auto-check on startup after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      runCheck(false);
    }, 2500);

    // Global listener for manual checks triggered from settings or menu
    const handleManualTrigger = () => runCheck(true);
    window.addEventListener("successor:check-update", handleManualTrigger);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("successor:check-update", handleManualTrigger);
    };
  }, []);

  const handleInstall = async () => {
    setStatus("downloading");
    setProgress({ downloaded: 0, contentLength: 0, percent: 0 });
    setErrorMessage("");

    try {
      await installAppUpdate((p) => {
        setProgress(p);
      });
      setStatus("ready");
    } catch (err) {
      console.error("Installation error:", err);
      setStatus("error");
      setErrorMessage(err?.message || "Failed to download and install update");
    }
  };

  const handleRelaunch = async () => {
    await relaunchApp();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl p-space-lg flex flex-col gap-4 text-on-surface">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                {status === "ready"
                  ? "check_circle"
                  : status === "downloading"
                  ? "downloading"
                  : status === "latest"
                  ? "verified"
                  : status === "error"
                  ? "error"
                  : "system_update"}
              </span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {status === "ready"
                  ? "Update Ready"
                  : status === "downloading"
                  ? "Downloading Update"
                  : status === "latest"
                  ? "Up to Date"
                  : status === "error"
                  ? "Update Status"
                  : "New Update Available"}
              </h3>
              <p className="font-label-sm text-label-sm text-outline">
                Successor • Current v{currentVersion}
              </p>
            </div>
          </div>
          {status !== "downloading" && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Content based on status */}
        {status === "available" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-primary/20">
              <div>
                <span className="text-label-sm uppercase font-semibold text-primary">New Release</span>
                <p className="font-tabular-mono text-headline-sm font-bold text-on-surface">
                  v{updateInfo?.version || "New"}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-bold">
                Ready to Install
              </span>
            </div>

            {updateInfo?.body && (
              <div className="p-3 rounded-xl bg-surface-container-low max-h-36 overflow-y-auto text-body-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed border border-outline-variant/10">
                <span className="font-semibold text-on-surface block mb-1">Release Highlights:</span>
                {updateInfo.body}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container font-label-md transition-colors cursor-pointer text-center"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Update Now</span>
              </button>
            </div>
          </div>
        )}

        {status === "downloading" && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface font-medium">Downloading package...</span>
              <span className="font-tabular-mono font-bold text-primary">
                {progress.percent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <p className="font-tabular-mono text-label-sm text-outline text-right">
              {progress.contentLength > 0
                ? `${(progress.downloaded / (1024 * 1024)).toFixed(1)} MB / ${(
                    progress.contentLength /
                    (1024 * 1024)
                  ).toFixed(1)} MB`
                : "Fetching update assets from GitHub..."}
            </p>
          </div>
        )}

        {status === "ready" && (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl bg-secondary-fixed/20 border border-secondary/30 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-3xl">task_alt</span>
              <p className="font-body-md font-bold text-on-surface">
                Update successfully installed!
              </p>
              <p className="font-body-sm text-on-surface-variant">
                Restart Successor now to launch the latest release.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRelaunch}
              className="w-full py-2.5 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-label-md font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span>Restart Application Now</span>
            </button>
          </div>
        )}

        {status === "latest" && (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 text-center flex flex-col items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-3xl">verified</span>
              <p className="font-body-md font-bold text-on-surface">
                You're on the latest version
              </p>
              <p className="font-body-sm text-outline">
                Successor v{currentVersion} is up to date with GitHub Releases.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/30 text-error flex items-start gap-2.5 text-body-sm">
              <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">warning</span>
              <div>
                <p className="font-semibold">Unable to check or install update</p>
                <p className="text-outline text-label-sm mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container font-label-md transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => runCheck(true)}
                className="flex-1 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md font-semibold transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
