import React, { useState } from "react";
import { useApp } from "../context/AppContext";

/**
 * Daily Workload Capacity Warning ("Overload Guard")
 * Displays a visual budget meter comparing planned active hours vs. target capacity.
 * Warns against cognitive fatigue and overcommitting, with 1-click auto-trim to Backlog.
 */
export default function OverloadGuardMeter({ className = "" }) {
  const { tasks, parseDurationHours, updateTask, userProfile, saveUserProfile, showToast } = useApp();
  const [showAdjustCap, setShowAdjustCap] = useState(false);

  // Target capacity (default 5.0 hours if not customized)
  const targetCapacityHours = userProfile?.dailyCapacityHours || 5.0;

  // Active tasks planned for today (not completed and not in backlog)
  const activeTodayTasks = tasks.filter(
    (t) => !t.completed && t.status !== "backlog" && t.status !== "completed"
  );

  const plannedHours = activeTodayTasks.reduce(
    (sum, t) => sum + parseDurationHours(t.duration),
    0
  );

  const overbookedHours = Math.max(0, plannedHours - targetCapacityHours);
  const isOverbooked = overbookedHours >= 0.25;
  const isNearCapacity = !isOverbooked && plannedHours >= targetCapacityHours * 0.85;

  const percentage = Math.min(100, Math.round((plannedHours / targetCapacityHours) * 100));

  const formatHoursAndMins = (decHours) => {
    const h = Math.floor(decHours);
    const m = Math.round((decHours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  // 1-Click Auto-Trim Overload:
  // Moves lowest priority tasks (P3, P4, or lowest impact) into Backlog until planned hours fit within target capacity
  const handleAutoTrim = async () => {
    let currentHours = plannedHours;
    // Sort tasks: lowest priority first (P4, P3, then P2)
    const sorted = [...activeTodayTasks].sort((a, b) => {
      const pScore = (t) => {
        const p = (t.priority || "").toLowerCase();
        if (p.includes("p4") || p.includes("low")) return 1;
        if (p.includes("p3") || p.includes("maintenance")) return 2;
        if (p.includes("p2") || p.includes("strategic")) return 3;
        return 4; // P1
      };
      return pScore(a) - pScore(b);
    });

    let trimmedCount = 0;
    for (const task of sorted) {
      if (currentHours <= targetCapacityHours) break;
      await updateTask(task.id, {
        status: "backlog",
        date: "Backlog",
      });
      currentHours -= parseDurationHours(task.duration);
      trimmedCount++;
    }

    if (trimmedCount > 0) {
      showToast(`⚡ Workload balanced! Moved ${trimmedCount} non-critical tasks to Backlog.`, "success");
    } else {
      showToast("Workload is already within your planned capacity.", "info");
    }
  };

  const handleSetCapacity = async (hours) => {
    if (saveUserProfile) {
      await saveUserProfile({ dailyCapacityHours: hours });
    }
    setShowAdjustCap(false);
  };

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        isOverbooked
          ? "bg-error-container/20 border-error/30 text-on-surface shadow-xs"
          : isNearCapacity
          ? "bg-tertiary-container/20 border-tertiary/30 text-on-surface"
          : "bg-surface-container-low border-outline-variant/15 text-on-surface"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isOverbooked
                ? "bg-error/15 text-error"
                : isNearCapacity
                ? "bg-tertiary/15 text-tertiary"
                : "bg-secondary/15 text-secondary"
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">
              {isOverbooked ? "warning" : isNearCapacity ? "hourglass_top" : "shield"}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label-sm uppercase tracking-wider text-[11px] font-bold">
                Daily Workload Overload Guard
              </span>
              <span
                className={`px-2 py-0.2 rounded-full font-tabular-mono text-[11px] font-bold ${
                  isOverbooked
                    ? "bg-error text-on-error animate-pulse"
                    : isNearCapacity
                    ? "bg-tertiary/20 text-tertiary"
                    : "bg-secondary/20 text-secondary"
                }`}
              >
                {isOverbooked
                  ? `⚠️ Overbooked by ${formatHoursAndMins(overbookedHours)}`
                  : isNearCapacity
                  ? "At Peak Capacity"
                  : "Sustainable Load"}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 font-tabular-mono text-body-sm">
              <span className="font-semibold text-on-surface">
                Planned: {formatHoursAndMins(plannedHours)}
              </span>
              <span className="text-outline">/</span>
              <span className="text-outline font-medium">
                Target Cap: {formatHoursAndMins(targetCapacityHours)}
              </span>
              <span className="text-outline text-[12px]">({percentage}%)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
          {isOverbooked && (
            <button
              type="button"
              onClick={handleAutoTrim}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error hover:bg-error/90 text-on-error text-label-sm font-semibold transition-all cursor-pointer shadow-xs"
              title="Automatically move low-priority P3/P4 tasks to Backlog until capacity fits"
            >
              <span className="material-symbols-outlined text-[15px]">balance</span>
              <span>Trim Overload</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAdjustCap(!showAdjustCap)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-label-sm font-medium transition-all cursor-pointer border border-outline-variant/20"
            title="Adjust daily maximum capacity target"
          >
            <span className="material-symbols-outlined text-[15px] text-outline">tune</span>
            <span>Cap: {targetCapacityHours}h</span>
          </button>
        </div>
      </div>

      {/* Capacity Quick Selector Dropdown */}
      {showAdjustCap && (
        <div className="mt-2.5 pt-2.5 border-t border-outline-variant/15 flex items-center gap-1.5 flex-wrap animate-in fade-in duration-150">
          <span className="text-[11px] text-outline font-medium mr-1">Daily Cap:</span>
          {[4.0, 4.5, 5.0, 5.5, 6.0, 7.0].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleSetCapacity(h)}
              className={`px-2.5 py-1 rounded-md text-label-sm font-tabular-mono transition-all cursor-pointer ${
                targetCapacityHours === h
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {h}h
            </button>
          ))}
          <span className="text-[11px] text-outline ml-2">
            (Recommended: 5h focus maximum for deep sustained focus without burnout)
          </span>
        </div>
      )}

      {/* Progress Bar Meter */}
      <div className="mt-2.5 w-full bg-surface-container-highest/80 rounded-full h-2 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isOverbooked
              ? "bg-error"
              : isNearCapacity
              ? "bg-tertiary"
              : "bg-secondary"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
