import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";

export default function MorningPlanningModal({ isOpen, onClose, initialStep = 1 }) {
  const {
    tasks,
    updateTask,
    parseDurationHours,
    userProfile,
    saveUserProfile,
    setDailyHighlightsAndLockPlan,
    showToast,
    getLocalDateString,
  } = useApp();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState([]);
  const [dailyCap, setDailyCap] = useState(userProfile?.dailyCapacityHours || 5.0);

  // Sync initial highlights from userProfile or tasks
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep || 1);
      const existing = (userProfile?.dailyHighlightTaskIds || [])
        .concat(tasks.filter((t) => t.isHighlight).map((t) => t.id));
      const unique = Array.from(new Set(existing));
      setSelectedHighlightIds(unique);
      if (userProfile?.dailyCapacityHours) {
        setDailyCap(userProfile.dailyCapacityHours);
      }
    }
  }, [isOpen, initialStep, userProfile?.dailyHighlightTaskIds, userProfile?.dailyCapacityHours, tasks]);

  if (!isOpen) return null;

  // Toggle single or multi-task highlight
  const handleToggleHighlight = (taskId) => {
    setSelectedHighlightIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Yesterday's completed tasks
  const yesterdayCompletedTasks = tasks.filter((t) => {
    if (!t.completed) return false;
    const completedDate = t.completedDate || (t.completedAt ? getLocalDateString(new Date(t.completedAt.seconds ? t.completedAt.seconds * 1000 : t.completedAt)) : null);
    return completedDate === yesterdayStr;
  });

  // Recent completed tasks fallback if none logged yesterday
  const displayWins = yesterdayCompletedTasks.length > 0 ? yesterdayCompletedTasks : tasks.filter((t) => t.completed).slice(0, 4);

  // Rolled-over / backlog tasks
  const backlogTasks = tasks.filter(
    (t) => !t.completed && (t.status === "backlog" || t.date === "Backlog" || t.rolledOverAt || t.rolloverDate)
  );

  // Active tasks for today
  const activeTodayTasks = tasks.filter(
    (t) => !t.completed && t.status !== "backlog" && t.status !== "completed"
  );

  const totalPlannedHours = activeTodayTasks.reduce(
    (sum, t) => sum + parseDurationHours(t.duration),
    0
  );

  const isOverCapacity = totalPlannedHours > dailyCap;

  // 1-Click toggle pull into today / backlog
  const handleToggleBacklog = async (task) => {
    const isNowToday = task.status === "backlog" || task.date === "Backlog";
    await updateTask(task.id, {
      status: isNowToday ? "ready" : "backlog",
      date: isNowToday ? "Today" : "Backlog",
    });
  };

  // Complete Morning Planning Ritual & Lock In Cloud Firestore
  const handleCompletePlanning = async () => {
    const finalHighlights = selectedHighlightIds.length > 0
      ? selectedHighlightIds
      : activeTodayTasks[0]
      ? [activeTodayTasks[0].id]
      : [];

    await setDailyHighlightsAndLockPlan(finalHighlights, dailyCap);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with Step Tracker */}
        <div className="p-5 border-b border-outline-variant/15 bg-surface-container/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">wb_sunny</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Morning Planning Ritual
                </h3>
                <p className="font-label-sm text-label-sm text-outline">
                  An intentional 2-minute kickoff to set boundaries, celebrate wins, and anchor your day.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: "Celebrate Wins" },
              { num: 2, label: "Backlog Triage" },
              { num: 3, label: "Workload Cap" },
              { num: 4, label: "Lock In Agenda" },
            ].map((s) => (
              <div
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                  currentStep === s.num
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : currentStep > s.num
                    ? "bg-secondary-container text-on-secondary-container font-medium"
                    : "bg-surface-container text-outline"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-surface/30 flex items-center justify-center text-[11px] font-mono">
                  {currentStep > s.num ? "✓" : s.num}
                </span>
                <span className="text-[11px] truncate hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body: Guided Steps */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: CELEBRATE YESTERDAY'S WINS */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-secondary-container/20 border border-secondary/30 flex items-start gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <h4 className="font-headline-sm text-[16px] text-on-surface font-bold">
                    Celebrate Yesterday&apos;s Accomplishments
                  </h4>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    Recognizing progress triggers dopamine and primes your brain for high focus.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-label-sm uppercase tracking-wider text-outline font-semibold">
                  Completed Work ({displayWins.length} items logged):
                </span>
                {displayWins.length === 0 ? (
                  <div className="p-6 text-center text-outline bg-surface-container-low rounded-xl">
                    <p className="font-body-sm">Fresh start today! No previous completions logged yet.</p>
                  </div>
                ) : (
                  displayWins.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/15 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          check_circle
                        </span>
                        <span className="font-body-sm font-medium text-on-surface truncate">
                          {t.title}
                        </span>
                      </div>
                      <span className="font-tabular-mono text-[11px] text-outline">
                        {t.duration || "30m"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW BACKLOG & ROLLED-OVER TASKS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-tertiary-container/20 border border-tertiary/30 flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-[24px] mt-0.5">
                  history
                </span>
                <div>
                  <h4 className="font-headline-sm text-[16px] text-on-surface font-bold">
                    Review Rolled-Over Backlog Tasks
                  </h4>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    Select only what is truly essential for today. Leave non-critical items safely in Backlog.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm uppercase tracking-wider text-outline font-semibold">
                    Backlog Queue ({backlogTasks.length})
                  </span>
                  <span className="font-tabular-mono text-[11px] text-outline">
                    Today&apos;s Active Planned: {totalPlannedHours.toFixed(1)}h
                  </span>
                </div>

                {backlogTasks.length === 0 ? (
                  <div className="p-6 text-center text-outline bg-surface-container-low rounded-xl">
                    <p className="font-body-sm">Zero backlog debt! Your board is completely clean.</p>
                  </div>
                ) : (
                  backlogTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-body-sm font-medium text-on-surface truncate">
                          {t.title}
                        </p>
                        <span className="text-[11px] font-tabular-mono text-outline">
                          {t.priority || "Normal"} &bull; {t.duration || "30m"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleBacklog(t)}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        <span>Pull into Today</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: WORKLOAD CAPACITY CAP */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-headline-sm text-[16px] text-on-surface font-bold">
                      Set Today&apos;s Workload Capacity Cap
                    </h4>
                    <p className="text-body-sm text-outline mt-0.5">
                      Humans cannot sustain more than 4–6 hours of true deep cognitive focus per day without burnout.
                    </p>
                  </div>
                  <span className="font-headline-sm text-2xl font-bold font-tabular-mono text-primary">
                    {dailyCap} hrs
                  </span>
                </div>

                {/* Capacity Selector Pills */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {[4.0, 4.5, 5.0, 5.5, 6.0].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setDailyCap(cap)}
                      className={`px-3 py-1.5 rounded-lg font-tabular-mono text-label-sm transition-all cursor-pointer ${
                        dailyCap === cap
                          ? "bg-primary text-on-primary font-bold shadow-xs"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                      }`}
                    >
                      {cap}h Max
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Planned Hours vs Cap */}
              <div className={`p-4 rounded-xl border ${
                isOverCapacity
                  ? "bg-error-container/20 border-error/30 text-on-surface"
                  : "bg-secondary-container/20 border-secondary/30 text-on-surface"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-label-sm uppercase tracking-wider font-bold">
                    Today&apos;s Commitment
                  </span>
                  <span className="font-tabular-mono font-bold text-label-md">
                    {totalPlannedHours.toFixed(1)}h / {dailyCap}h
                  </span>
                </div>

                <div className="w-full bg-surface-container-highest rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOverCapacity ? "bg-error" : "bg-secondary"
                    }`}
                    style={{ width: `${Math.min(100, (totalPlannedHours / dailyCap) * 100)}%` }}
                  />
                </div>

                {isOverCapacity && (
                  <p className="text-[12px] text-error font-semibold mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">warning</span>
                    <span>
                      Overbooked by {(totalPlannedHours - dailyCap).toFixed(1)} hours! Deselect tasks or move P3 items to Backlog to prevent overcommitting.
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: LOCK IN TODAY'S FOCUS AGENDA */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-primary-container/25 border border-primary/30 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <span className="material-symbols-outlined text-[20px]">stars</span>
                    <span className="font-label-sm uppercase tracking-wider font-bold">
                      Designate Today&apos;s Primary Highlight(s)
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface">
                    Pick 1 or more <strong>non-negotiable anchor tasks</strong> that guarantee a successful day. Locking in sets your focus agenda and syncs preferences directly to Cloud Firestore.
                  </p>
                </div>
                <div className="shrink-0 px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 font-label-sm font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  <span>{selectedHighlightIds.length} Designated</span>
                </div>
              </div>

              {activeTodayTasks.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline-variant/15 text-outline">
                  <span className="material-symbols-outlined text-[32px] block mb-2 text-outline/60">task</span>
                  <p className="text-body-sm">No active tasks scheduled for today yet. Add tasks or pull from Backlog in Step 2.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeTodayTasks.map((t) => {
                    const isSelected = selectedHighlightIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleHighlight(t.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? "bg-primary/10 border-primary text-on-surface shadow-xs font-medium"
                            : "bg-surface-container-low hover:bg-surface-container border-outline-variant/15 text-on-surface"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-primary text-on-primary"
                                : "border border-outline-variant text-transparent group-hover:border-primary"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isSelected ? "check" : "check_box_outline_blank"}
                            </span>
                          </button>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`material-symbols-outlined text-[18px] ${isSelected ? "text-amber-500 fill-1" : "text-outline/40"}`}>
                              star
                            </span>
                            <span className={`text-body-sm truncate ${isSelected ? "font-bold text-primary" : ""}`}>
                              {t.title}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {t.priority && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-surface-container-high text-on-surface-variant uppercase">
                              {t.priority}
                            </span>
                          )}
                          <span className={`text-[11px] font-tabular-mono ${isSelected ? "text-primary font-semibold" : "text-outline"}`}>
                            {t.duration || "30m"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-outline-variant/15 flex items-center justify-between bg-surface-container/30">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-5 py-2 rounded-lg bg-primary text-on-primary font-label-md font-semibold hover:bg-primary-container transition-all cursor-pointer shadow-sm flex items-center gap-1"
            >
              <span>Next Step</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompletePlanning}
              className="px-6 py-2 rounded-lg bg-primary text-on-primary font-label-md font-bold hover:bg-primary-container transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              <span>Lock In Today&apos;s Focus Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
