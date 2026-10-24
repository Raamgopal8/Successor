import React from "react";
import { useApp } from "../context/AppContext";

/**
 * Smart Task Rollover Insights Diagnostic Banner
 * Displayed when a task has rolled over multiple days (e.g. 2+ times or after daily rollover)
 * Provides actionable AI recommendations: 15-minute subtask auto-breakdown or delegation.
 */
export default function RolloverDiagnosticBanner({ task, className = "" }) {
  const { autoBreakdownTask, updateTask } = useApp();

  if (!task) return null;

  const rolloverCount = task.rolloverCount || (task.rolledOverAt || task.rolloverDate ? 2 : 0);
  if (rolloverCount < 2 || task.rolloverDiagnosticDismissed) {
    return null;
  }

  const handleDismiss = (e) => {
    e.stopPropagation();
    updateTask(task.id, { rolloverDiagnosticDismissed: true });
  };

  const handleBreakdown = (e) => {
    e.stopPropagation();
    autoBreakdownTask(task.id);
  };

  const handleDelegateOrBacklog = (e) => {
    e.stopPropagation();
    updateTask(task.id, {
      status: "backlog",
      date: "Backlog",
      rolloverDiagnosticDismissed: true,
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-xl p-3 bg-tertiary-container/25 border border-tertiary/30 text-on-surface shadow-xs transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-tertiary/20 text-tertiary flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">psychology</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                AI Diagnostic &bull; Task Rollover
              </span>
              <span className="px-1.5 py-0.2 rounded bg-tertiary/20 text-tertiary font-tabular-mono text-[10px] font-bold">
                Rolled over {rolloverCount}x
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface mt-1 leading-snug">
              This task has rolled over <strong>{rolloverCount} times</strong>. Unfinished tasks usually cause cognitive fatigue. Break it into smaller 15-minute subtasks or delegate.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-outline hover:text-on-surface p-1 rounded-md hover:bg-surface-container transition-colors cursor-pointer"
          title="Dismiss recommendation"
        >
          <span className="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>

      {/* Actionable AI Solutions */}
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-tertiary/20 flex-wrap">
        <button
          type="button"
          onClick={handleBreakdown}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-semibold hover:bg-primary-container transition-all cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-[15px]">splitscreen</span>
          <span>Auto-Breakdown (3x 15m)</span>
        </button>

        <button
          type="button"
          onClick={handleDelegateOrBacklog}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant text-label-sm font-medium transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">low_priority</span>
          <span>Move to Backlog / Delegate</span>
        </button>
      </div>
    </div>
  );
}
