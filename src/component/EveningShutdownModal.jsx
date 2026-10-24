import React, { useState } from "react";
import { useApp } from "../context/AppContext";

export default function EveningShutdownModal({ isOpen, onClose, onEnterRechargeMode }) {
  const {
    tasks,
    updateTask,
    habits,
    userProfile,
    saveUserProfile,
    showToast,
    getLocalDateString,
  } = useApp();

  const [currentStep, setCurrentStep] = useState(1);
  const [winsText, setWinsText] = useState("");
  const [frictionText, setFrictionText] = useState("");

  if (!isOpen) return null;

  // Active tasks still pending for today
  const pendingTasks = tasks.filter(
    (t) => !t.completed && t.status !== "backlog" && t.status !== "completed"
  );

  // Tasks completed today
  const completedTodayTasks = tasks.filter((t) => t.completed);
  const completedHabits = habits.filter((h) => h.done);
  const completedBlocks = userProfile?.completedBlocks || 0;

  // 1-Click complete or roll to backlog for pending tasks
  const handleMarkComplete = async (taskId) => {
    await updateTask(taskId, {
      completed: true,
      status: "completed",
    });
  };

  const handleRollToBacklog = async (taskId) => {
    await updateTask(taskId, {
      status: "backlog",
      date: "Backlog",
    });
  };

  // Complete Shutdown & Transition to Evening Recharge Mode
  const handleCompleteShutdown = async () => {
    const todayStr = getLocalDateString(new Date());

    if (saveUserProfile) {
      const existingReflections = userProfile?.dailyReflections || [];
      const newReflection = {
        date: todayStr,
        wins: winsText.trim() || "Consistently showed up and maintained focus.",
        friction: frictionText.trim() || "No major blockers.",
        completedCount: completedTodayTasks.length,
        blocksCount: completedBlocks,
      };

      await saveUserProfile({
        lastEveningShutdownDate: todayStr,
        dailyReflections: [newReflection, ...existingReflections].slice(0, 30),
      });
    }

    showToast("🌙 Workday complete! Evening Recharge mode active. Rest guilt-free.", "success");
    if (onEnterRechargeMode) {
      onEnterRechargeMode();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/15 bg-surface-container/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">nightlight</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Evening Daily Shutdown &amp; Reflection
                </h3>
                <p className="font-label-sm text-label-sm text-outline">
                  Clear today&apos;s mental workspace, log friction points, and transition into guilt-free evening rest.
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
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: "Review & Clear" },
              { num: 2, label: "Log Reflection" },
              { num: 3, label: "Disconnect & Rest" },
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
                <span className="text-[11px] truncate">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: REVIEW ACCOMPLISHMENTS & CLEAR OPEN TASKS */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Daily Summary Stats Pill */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/15 text-center">
                <div>
                  <span className="block font-headline-md text-2xl font-bold font-tabular-mono text-primary">
                    {completedTodayTasks.length}
                  </span>
                  <span className="font-label-sm text-outline text-[11px] uppercase tracking-wider">
                    Tasks Crushed
                  </span>
                </div>
                <div>
                  <span className="block font-headline-md text-2xl font-bold font-tabular-mono text-tertiary">
                    {completedBlocks}
                  </span>
                  <span className="font-label-sm text-outline text-[11px] uppercase tracking-wider">
                    Focus Blocks
                  </span>
                </div>
                <div>
                  <span className="block font-headline-md text-2xl font-bold font-tabular-mono text-secondary">
                    {completedHabits.length}
                  </span>
                  <span className="font-label-sm text-outline text-[11px] uppercase tracking-wider">
                    Rituals Done
                  </span>
                </div>
              </div>

              {/* Pending open tasks check */}
              <div>
                <h4 className="font-label-sm uppercase tracking-wider text-outline font-semibold mb-2">
                  Unfinished Tasks for Today ({pendingTasks.length})
                </h4>
                {pendingTasks.length === 0 ? (
                  <div className="p-4 rounded-xl bg-secondary-container/20 border border-secondary/30 flex items-center gap-2.5 text-secondary">
                    <span className="material-symbols-outlined text-[20px]">task_alt</span>
                    <span className="font-body-sm font-semibold">
                      Inbox Zero achieved! All active tasks for today are completed.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pendingTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-2"
                      >
                        <span className="font-body-sm text-on-surface truncate">{t.title}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMarkComplete(t.id)}
                            className="px-2 py-1 rounded bg-secondary-container hover:bg-secondary text-on-secondary text-label-sm font-semibold transition-all cursor-pointer"
                          >
                            Mark Done
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRollToBacklog(t.id)}
                            className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-label-sm font-medium transition-all cursor-pointer"
                          >
                            To Backlog
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: LOG REFLECTION & FRICTION POINTS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-body-sm text-on-surface leading-relaxed">
                <span className="font-semibold text-purple-400">Cognitive Offloading:</span> Writing down friction points empties short-term memory loops so you don&apos;t ruminate on work during dinner or sleep.
              </div>

              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  1. What went exceptionally well today?
                </label>
                <textarea
                  value={winsText}
                  onChange={(e) => setWinsText(e.target.value)}
                  placeholder="e.g. Cleared PR review early, deep focus block had zero distractions..."
                  rows={3}
                  className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm outline-none border border-outline-variant/20 focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  2. Any blockers or friction points to solve tomorrow?
                </label>
                <textarea
                  value={frictionText}
                  onChange={(e) => setFrictionText(e.target.value)}
                  placeholder="e.g. Got sidetracked by Slack messages at 2 PM; need to shield DND..."
                  rows={3}
                  className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm outline-none border border-outline-variant/20 focus:border-primary resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: DISCONNECT & RECHARGE */}
          {currentStep === 3 && (
            <div className="space-y-5 text-center py-4 animate-in fade-in duration-200">
              <div className="w-20 h-20 rounded-full bg-purple-500/15 text-purple-400 mx-auto flex items-center justify-center ring-8 ring-purple-500/10">
                <span className="material-symbols-outlined text-[44px]">nightlight</span>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="font-headline-md text-2xl font-bold text-on-surface">
                  Your Workday is Complete
                </h4>
                <p className="font-body-md text-on-surface-variant leading-relaxed">
                  All accomplishments are safely logged. Open items are captured. Step away from the screen without guilt and give your mind the restoration it earned.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low max-w-md mx-auto text-label-sm text-outline font-medium">
                Tip: Dim bright screens and allow your melatonin cycle to gently ramp down.
              </div>
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

          {currentStep < 3 ? (
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
              onClick={handleCompleteShutdown}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-label-md font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">bedtime</span>
              <span>Disconnect &amp; Enter Evening Recharge</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
