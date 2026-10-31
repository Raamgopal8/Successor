import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  analyzeLongTermGoal,
  generateWeeklyTasks,
  rescheduleMissedTasks,
  restructureComplexGoal,
} from "../services/aiGoalService";

const PLANNER_MODES = [
  {
    id: "goal_analysis",
    label: "Long-Term Goal Analysis",
    icon: "psychology_alt",
    badge: "Strategy",
    description: "Analyze high-level objectives, evaluate feasibility, milestone phases, and risk bottlenecks.",
  },
  {
    id: "weekly_generation",
    label: "Weekly Task Generator",
    icon: "date_range",
    badge: "Sprint Feed",
    description: "Synthesize 7-day atomic workloads with durations, priorities, tags & feed directly to Firestore.",
  },
  {
    id: "reschedule_missed",
    label: "Reschedule Missed Tasks",
    icon: "schedule_send",
    badge: "Remediation",
    description: "Diagnose stalled & rolled-over backlog tasks and redistribute them without overloading capacity.",
  },
  {
    id: "restructure_complex",
    label: "Goal Restructuring",
    icon: "account_tree",
    badge: "Pivot Engine",
    description: "Refactor complex goals when scope shifts or velocity drops; prune and inject high-impact tasks.",
  },
];

export default function AiGoalPlannerModal({ isOpen, onClose }) {
  const {
    userProfile,
    tasks,
    createMultipleTasks,
    updateTask,
    showToast,
    displayName,
    displayTitle,
  } = useApp();

  const [activeMode, setActiveMode] = useState("weekly_generation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form inputs
  const [goalInput, setGoalInput] = useState("");
  const [timeframe, setTimeframe] = useState("Next 4 Weeks");
  const [sprintPhase, setSprintPhase] = useState("Execution & Core Velocity");
  const [restructureReason, setRestructureReason] = useState("Scope creep and unblocking delayed deliverables");

  // Output results
  const [analysisResult, setAnalysisResult] = useState(null);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [rescheduleResult, setRescheduleResult] = useState(null);
  const [restructureResult, setRestructureResult] = useState(null);

  // Selection states for generated tasks to commit
  const [selectedTaskIndices, setSelectedTaskIndices] = useState(new Set());
  const [isCommitting, setIsCommitting] = useState(false);

  // Resolve API key & Model from userProfile (supports custom-userdefined configs)
  const activeCustomConfig = Array.isArray(userProfile?.customAiConfigs)
    ? userProfile.customAiConfigs.find((c) => c.isActive) || userProfile.customAiConfigs[0]
    : null;

  const aiProvider = activeCustomConfig?.providerType || userProfile?.aiProvider || "gemini";
  const aiModel = activeCustomConfig?.model || userProfile?.aiModel || "gemini-3.8-flash";
  const aiEndpoint = activeCustomConfig?.endpoint || userProfile?.aiEndpoint || "";
  const aiApiKeys = userProfile?.aiApiKeys || {};
  const activeKey = activeCustomConfig?.apiKey || userProfile?.aiApiKey || aiApiKeys[aiProvider] || "";

  const credentials = {
    provider: aiProvider,
    model: aiModel,
    apiKey: activeKey,
    endpoint: aiEndpoint,
  };

  // Detect Missed Tasks: status == "pending" and due_date < current_date (plus backlog & rolled-over tasks)
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const missedOrBacklogTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.completed || t.status === "completed") return false;
      const status = (t.status || "pending").toLowerCase();
      const due = t.due_date || t.dueDate || (t.date && t.date.match(/^\d{4}-\d{2}-\d{2}$/) ? t.date : null);
      const isOverdue = due && due < todayDateStr;
      const isRolledOver = Boolean(t.rolledOverAt || (t.rolloverCount && t.rolloverCount > 0));

      // 1. Detect Missed Tasks: status == "pending" and due_date < current_date
      if (status === "pending" && isOverdue) return true;
      if (isOverdue) return true;
      if (isRolledOver) return true;
      if (status === "backlog" || status === "pending") return true;
      return false;
    });
  }, [tasks, todayDateStr]);

  const handleRunAi = async () => {
    // Rust Algorithmic Rebalancing executes natively without requiring an LLM API key
    if (activeMode !== "reschedule_missed" && !activeKey) {
      setError(`No API key stored for ${aiProvider.toUpperCase()}. Please configure your API key in Settings > AI & Intelligence.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeMode === "goal_analysis") {
        if (!goalInput.trim()) {
          setError("Please describe your long-term goal to analyze.");
          setLoading(false);
          return;
        }

        const res = await analyzeLongTermGoal({
          goal: goalInput.trim(),
          timeframe,
          userContext: {
            displayName,
            displayTitle,
            chronotype: userProfile?.chronotype,
            dailyTargetBlocks: userProfile?.dailyTargetBlocks,
          },
          credentials,
        });
        setAnalysisResult(res);
        showToast("Goal analysis generated successfully!", "success");
      } else if (activeMode === "weekly_generation") {
        const goal = goalInput.trim() || userProfile?.defaultProject || "Q4 Product & Velocity Sprints";
        const res = await generateWeeklyTasks({
          goal,
          phase: sprintPhase,
          activeTasks: tasks,
          credentials,
        });

        if (Array.isArray(res?.tasks)) {
          setGeneratedTasks(res.tasks);
          // Default select all tasks
          setSelectedTaskIndices(new Set(res.tasks.map((_, i) => i)));
          showToast(`Synthesized ${res.tasks.length} weekly tasks!`, "success");
        } else {
          setError("Failed to parse task array from AI response.");
        }
      } else if (activeMode === "reschedule_missed") {
        if (missedOrBacklogTasks.length === 0) {
          setError("No overdue, pending, or backlog tasks found to rebalance.");
          setLoading(false);
          return;
        }

        const res = await rescheduleMissedTasks({
          missedTasks: missedOrBacklogTasks,
          currentCapacityHours: userProfile?.dailyCapacityHours || 4.0,
          credentials,
          currentDate: todayDateStr,
        });
        setRescheduleResult(res);
        showToast(
          res.engine === "rust_algorithmic_rebalancing"
            ? `⚡ Rust Algorithmic Rebalancer slotted ${res.totalRescheduled} tasks!`
            : "Task rescheduling remediation generated!",
          "success"
        );
      } else if (activeMode === "restructure_complex") {
        const goal = goalInput.trim() || "Active Workstation Roadmap";
        const res = await restructureComplexGoal({
          goal,
          currentTasks: tasks,
          changeReason: restructureReason,
          credentials,
        });
        setRestructureResult(res);
        showToast("Goal restructure plan generated!", "success");
      }
    } catch (err) {
      console.error("AI Goal Planner Execution Error:", err);
      setError(err.message || "Failed to execute AI Goal operation.");
    } finally {
      setLoading(false);
    }
  };

  // Commit selected weekly generated tasks directly to Firestore
  const handleCommitWeeklyTasks = async () => {
    if (generatedTasks.length === 0) return;
    const toCommit = generatedTasks.filter((_, idx) => selectedTaskIndices.has(idx));
    if (toCommit.length === 0) {
      setError("Please select at least one task to import into your workspace.");
      return;
    }

    setIsCommitting(true);
    try {
      await createMultipleTasks(
        toCommit.map((t) => ({
          title: t.title,
          description: t.description || `Generated for ${t.day || "Sprint"}.`,
          category: t.category || "Work Sprint",
          priority: t.priority || "P1 Urgent & High Impact",
          duration: t.duration || "30 min",
          effort: t.effort || "⚡⚡ Med",
          tags: t.tags || ["#AISprint"],
          status: t.dayOffset === 0 ? "ready" : "ready",
          date: t.dayOffset === 0 ? "Today" : t.day || "Sprint",
          isHighlight: !!t.isHighlight,
          subtasks: Array.isArray(t.subtasks)
            ? t.subtasks.map((st, i) => ({
                id: `st-${Date.now()}-${i}`,
                title: st.title || st,
                duration: st.duration || "15m",
                completed: false,
              }))
            : "0/1",
        }))
      );
      setGeneratedTasks([]);
      onClose();
    } catch (err) {
      console.error("Failed to commit tasks to database:", err);
      setError("Failed to save tasks to database: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Apply Rescheduled Tasks updates to existing Firestore documents
  const handleApplyRescheduledTasks = async () => {
    if (!rescheduleResult?.rescheduledTasks) return;
    setIsCommitting(true);
    try {
      let count = 0;
      for (const item of rescheduleResult.rescheduledTasks) {
        if (!item.originalTaskId) continue;
        const updates = {
          title: item.newTitle || undefined,
          priority: item.newPriority || undefined,
          duration: item.newDuration || undefined,
          status: item.recommendedDay === "Backlog" ? "backlog" : "ready",
          date: item.recommendedDay === "Today" ? "Today" : item.recommendedDay,
          rolloverDiagnosticDismissed: true,
          subtasks: Array.isArray(item.subtasks)
            ? item.subtasks.map((st, i) => ({
                id: `st-resched-${Date.now()}-${i}`,
                title: st.title,
                duration: st.duration || "15m",
                completed: false,
              }))
            : undefined,
        };
        // Clean undefined
        Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
        await updateTask(item.originalTaskId, updates);
        count++;
      }
      showToast(`Updated & rescheduled ${count} tasks in Cloud Firestore!`, "success");
      setRescheduleResult(null);
      onClose();
    } catch (err) {
      console.error("Apply reschedule failed:", err);
      setError("Failed to apply rescheduled tasks: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Commit Injected Restructure Tasks
  const handleCommitRestructureTasks = async () => {
    if (!restructureResult?.newTasksToInject) return;
    setIsCommitting(true);
    try {
      await createMultipleTasks(
        restructureResult.newTasksToInject.map((t) => ({
          title: t.title,
          description: t.description || "Created via Goal Restructuring.",
          category: t.category || "Work Sprint",
          priority: t.priority || "P1 Urgent & High Impact",
          duration: t.duration || "45 min",
          effort: t.effort || "⚡⚡⚡ Deep",
          status: t.status || "ready",
          date: t.status === "backlog" ? "Backlog" : "Today",
        }))
      );
      setRestructureResult(null);
      onClose();
    } catch (err) {
      setError("Failed to commit new restructured tasks: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">psychology_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-headline-sm font-bold text-on-surface leading-tight">
                  AI Goal Planner &amp; Task Generator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-fixed text-on-secondary-fixed">
                  Flagship AI
                </span>
              </div>
              <p className="text-body-sm text-outline text-[12px] flex items-center gap-1.5 mt-0.5">
                <span>Active Engine:</span>
                <strong className="text-primary font-semibold uppercase">{activeCustomConfig?.name || aiProvider}</strong>
                <span>•</span>
                <span className="font-tabular-mono text-on-surface-variant font-medium">{aiModel}</span>
                {activeKey ? (
                  <span className="inline-flex items-center gap-0.5 text-secondary text-[11px] font-medium ml-1">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    Key Active
                  </span>
                ) : (
                  <Link
                    to="/profile"
                    onClick={onClose}
                    className="inline-flex items-center gap-0.5 text-error hover:underline text-[11px] font-semibold ml-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    Configure Key in Settings
                  </Link>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 4 CORE CAPABILITIES NAVIGATION TABS */}
        <div className="grid grid-cols-2 md:grid-cols-4 bg-surface-container-low border-b border-outline-variant/15 p-1.5 gap-1 shrink-0">
          {PLANNER_MODES.map((m) => {
            const isActive = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveMode(m.id);
                  setError(null);
                }}
                className={`p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "bg-surface-container-lowest text-primary shadow-sm border border-primary/20 ring-1 ring-primary/20"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`material-symbols-outlined text-[19px] ${
                      isActive ? "text-primary" : "text-outline"
                    }`}
                  >
                    {m.icon}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isActive ? "bg-primary/10 text-primary" : "bg-surface-container-highest text-outline"
                    }`}
                  >
                    {m.badge}
                  </span>
                </div>
                <div>
                  <h4 className="font-label-md text-label-md font-semibold truncate leading-tight">
                    {m.label}
                  </h4>
                  <p className="text-[11px] text-outline line-clamp-1 mt-0.5">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/30 text-error text-body-sm flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <div className="flex-1 text-[13px] leading-relaxed">
                <span>{error}</span>
                {!activeKey && (
                  <div className="mt-1">
                    <Link
                      to="/profile"
                      onClick={onClose}
                      className="text-primary hover:underline font-semibold"
                    >
                      Go to Settings &gt; AI &amp; Intelligence to store your API key &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 1: LONG TERM GOAL ANALYSIS */}
          {activeMode === "goal_analysis" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-outline-variant/10">
                <label className="block text-label-md font-semibold text-on-surface">
                  High-Level Objective or North-Star Goal
                </label>
                <textarea
                  rows={3}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="e.g. Build and launch a cross-platform desktop task management app with AI integration within 8 weeks..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none focus:ring-2 focus:ring-primary/20"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">
                      Time Horizon
                    </label>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none cursor-pointer"
                    >
                      <option value="Next 2 to 4 Weeks">Next 2 to 4 Weeks (Sprint Pace)</option>
                      <option value="Quarterly (8 to 12 Weeks)">Quarterly (8 to 12 Weeks)</option>
                      <option value="Multi-Month Epic (6 Months)">Multi-Month Epic (6 Months)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleRunAi}
                      disabled={loading || !goalInput.trim()}
                      className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                        {loading ? "sync" : "neurology"}
                      </span>
                      <span>{loading ? "Analyzing Architecture..." : "Analyze Long-Term Goal"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Analysis Output Result Card */}
              {analysisResult && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-outline-variant/10">
                    <div>
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                        Decomposition Blueprint
                      </span>
                      <h3 className="text-headline-sm font-bold text-on-surface">
                        {analysisResult.goalTitle || "Strategic Goal Breakdown"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 font-tabular-mono">
                      <div className="px-3 py-1 rounded-full bg-secondary-fixed/40 text-secondary text-label-sm font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>Feasibility: {analysisResult.feasibilityScore || 85}%</span>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-label-sm font-medium">
                        ⏱️ ~{analysisResult.recommendedCadenceHours || 15}h / week
                      </div>
                    </div>
                  </div>

                  {analysisResult.summary && (
                    <p className="text-body-sm text-on-surface-variant leading-relaxed">
                      {analysisResult.summary}
                    </p>
                  )}

                  {/* Strategic Phases */}
                  {Array.isArray(analysisResult.strategicPhases) && (
                    <div className="space-y-2">
                      <h4 className="text-label-sm font-bold uppercase tracking-wider text-outline">
                        Execution Phases &amp; Milestones
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {analysisResult.strategicPhases.map((phase, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex flex-col justify-between"
                          >
                            <div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                Phase {phase.phaseIndex || idx + 1} • {phase.durationWeeks || 2}w
                              </span>
                              <h5 className="font-semibold text-body-md text-on-surface mt-1.5 leading-snug">
                                {phase.title}
                              </h5>
                              <p className="text-[12px] text-outline mt-1 leading-snug">{phase.objective}</p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-outline-variant/10 text-[11px] text-secondary font-medium">
                              🎯 {phase.keyDeliverable}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seed Sprints Direct Import */}
                  {Array.isArray(analysisResult.recommendedInitialSprints) && (
                    <div className="pt-2 border-t border-outline-variant/10">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-label-sm font-bold uppercase tracking-wider text-outline">
                          Recommended Kickoff Sprints
                        </h4>
                        <button
                          type="button"
                          onClick={async () => {
                            setIsCommitting(true);
                            try {
                              await createMultipleTasks(
                                analysisResult.recommendedInitialSprints.map((s) => ({
                                  title: s.title,
                                  category: s.category || "Deep Work",
                                  priority: s.priority || "P1 Urgent & High Impact",
                                  duration: s.estimatedDuration || "45 min",
                                  effort: s.effort || "⚡⚡⚡ Deep",
                                  status: "ready",
                                  date: "Today",
                                }))
                              );
                              onClose();
                            } catch (e) {
                              setError(e.message);
                            } finally {
                              setIsCommitting(false);
                            }
                          }}
                          disabled={isCommitting}
                          className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-sm font-semibold text-[12px] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">input</span>
                          <span>Import Sprints to Today</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysisResult.recommendedInitialSprints.map((s, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/10 flex items-center justify-between text-body-sm"
                          >
                            <span className="font-medium text-on-surface truncate pr-2">{s.title}</span>
                            <span className="text-[11px] font-tabular-mono text-outline shrink-0">
                              {s.estimatedDuration || "45m"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE 2: WEEKLY TASK GENERATION */}
          {activeMode === "weekly_generation" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-outline-variant/10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      Sprint Target / Focus Goal
                    </label>
                    <input
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="e.g. Successor v0.1.3 Platform Polishing & Keyboard Shortcuts"
                      className="w-full px-3.5 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      Current Sprint Phase
                    </label>
                    <select
                      value={sprintPhase}
                      onChange={(e) => setSprintPhase(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none cursor-pointer"
                    >
                      <option value="Architecture & Planning">Architecture &amp; Planning</option>
                      <option value="Execution & Core Velocity">Execution &amp; Core Velocity</option>
                      <option value="Testing, Hardening & Ship">Testing, Hardening &amp; Ship</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRunAi}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                      {loading ? "sync" : "auto_awesome"}
                    </span>
                    <span>{loading ? "Synthesizing Sprint Plan..." : "Generate 7-Day Sprint Workload"}</span>
                  </button>
                </div>
              </div>

              {/* Generated Weekly Tasks List */}
              {generatedTasks.length > 0 && (
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/10">
                    <div>
                      <h3 className="font-headline-sm text-body-md font-bold text-on-surface">
                        Generated Weekly Tasks ({generatedTasks.length})
                      </h3>
                      <p className="text-[12px] text-outline">
                        Select tasks to commit and inject directly into your Cloud Firestore database
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedTaskIndices.size === generatedTasks.length) {
                            setSelectedTaskIndices(new Set());
                          } else {
                            setSelectedTaskIndices(new Set(generatedTasks.map((_, i) => i)));
                          }
                        }}
                        className="text-[12px] text-outline hover:text-on-surface transition-colors cursor-pointer"
                      >
                        {selectedTaskIndices.size === generatedTasks.length ? "Deselect All" : "Select All"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCommitWeeklyTasks}
                        disabled={isCommitting || selectedTaskIndices.size === 0}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-sm font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCommitting ? "sync" : "cloud_upload"}
                        </span>
                        <span>
                          {isCommitting ? "Feeding to DB..." : `Inject ${selectedTaskIndices.size} Tasks to DB`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Task list with checkboxes */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {generatedTasks.map((task, idx) => {
                      const isChecked = selectedTaskIndices.has(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const next = new Set(selectedTaskIndices);
                            if (next.has(idx)) next.delete(idx);
                            else next.add(idx);
                            setSelectedTaskIndices(next);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isChecked
                              ? "bg-surface-container-high/60 border-primary/30 ring-1 ring-primary/20"
                              : "bg-surface-container-low border-outline-variant/10 opacity-70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                {task.day || "Day"}
                              </span>
                              <span className="text-[11px] font-semibold text-outline">
                                {task.category}
                              </span>
                              <span className="text-[11px] font-tabular-mono text-secondary">
                                • {task.duration || "30 min"}
                              </span>
                              {task.isHighlight && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                  <span className="material-symbols-outlined text-[11px] fill-1">star</span>
                                  Highlight
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-body-md text-on-surface leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[12px] text-on-surface-variant line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}

                            {/* Subtask preview */}
                            {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-outline-variant/10">
                                {task.subtasks.map((st, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-outline font-tabular-mono"
                                  >
                                    ↳ {st.title || st} ({st.duration || "15m"})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: RESCHEDULE MISSED TASKS (Rust Algorithmic Rebalancing) */}
          {activeMode === "reschedule_missed" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-outline-variant/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-label-md font-semibold text-on-surface">
                        Handling Missed Tasks: Rust Algorithmic Rebalancing
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        ⚡ Rust Native (0ms)
                      </span>
                    </div>
                    <p className="text-[12px] text-outline mt-0.5">
                      {missedOrBacklogTasks.length} uncompleted tasks detected (status == &quot;pending&quot; &amp; due date overdue, or backlog rollover)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAi}
                    disabled={loading || missedOrBacklogTasks.length === 0}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shrink-0"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>
                      {loading ? "sync" : "tune"}
                    </span>
                    <span>{loading ? "Rebalancing..." : "Run Rust Algorithmic Rebalancing"}</span>
                  </button>
                </div>

                {/* Algorithmic Formula Indicator */}
                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant font-mono">
                  <span>
                    Priority Score = (Urgency &times; 0.5) + (Dependency Count &times; 0.3) + (Age in Days &times; 0.2)
                  </span>
                  <span className="text-outline font-sans text-[11px]">
                    4.0h/day capacity slots &bull; Topological DAG order &bull; LLM fallback only for &gt;90m tasks
                  </span>
                </div>

                {missedOrBacklogTasks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {missedOrBacklogTasks.map((t) => (
                      <span
                        key={t.id}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant text-[12px] font-medium border border-outline-variant/15 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[14px] text-amber-500">
                          pending_actions
                        </span>
                        <span>{t.title}</span>
                        {(t.due_date || t.dueDate || t.date) && (
                          <span className="text-[10px] text-outline font-mono">
                            due {t.due_date || t.dueDate || t.date}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-surface-container text-center text-outline text-[13px]">
                    🎉 Excellent velocity! No overdue or missed pending tasks detected.
                  </div>
                )}
              </div>

              {/* Reschedule Diagnostic & Action Plan */}
              {rescheduleResult && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                          Rust Rebalance Plan
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rescheduleResult.overloadRiskLevel === "Critical"
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            : rescheduleResult.overloadRiskLevel === "Medium"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}>
                          Risk: {rescheduleResult.overloadRiskLevel || "Low"}
                        </span>
                        {rescheduleResult.tasksNeedingLlmSubdivision > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">psychology</span>
                            <span>{rescheduleResult.tasksNeedingLlmSubdivision} LLM Subdivided</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-headline-sm text-body-md font-bold text-on-surface mt-0.5">
                        {rescheduleResult.totalRescheduled} Tasks Slotted into Working Time Windows
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyRescheduledTasks}
                      disabled={isCommitting}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isCommitting ? "sync" : "done_all"}
                      </span>
                      <span>{isCommitting ? "Applying..." : "Apply Rescheduling to Database"}</span>
                    </button>
                  </div>

                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {rescheduleResult.diagnosticSummary}
                  </p>

                  {Array.isArray(rescheduleResult.rescheduledTasks) && (
                    <div className="space-y-2.5">
                      {rescheduleResult.rescheduledTasks.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 space-y-2 transition-all hover:border-primary/25"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-secondary-fixed/40 text-secondary">
                                {item.action?.replace(/_/g, " ")}
                              </span>
                              {item.priorityScore !== undefined && (
                                <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                                  item.priorityScore >= 6.5
                                    ? "bg-rose-500/15 text-rose-400"
                                    : item.priorityScore >= 4.0
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-blue-500/15 text-blue-400"
                                }`}>
                                  Score: {item.priorityScore}
                                </span>
                              )}
                              {item.requiresLlmSubdivision && (
                                <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-medium flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[12px]">call_split</span>
                                  <span>15m Sprints</span>
                                </span>
                              )}
                            </div>

                            <span className="font-tabular-mono text-primary font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              <span>&rarr; {item.recommendedDay} {item.scheduledSlotStart ? `@ ${item.scheduledSlotStart}` : ""} ({item.newDuration || "30m"})</span>
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-semibold text-body-md text-on-surface">{item.newTitle}</h5>
                            <span className="text-[11px] text-outline font-mono shrink-0">
                              Urgency: {item.urgencyWeight || "-"} &bull; Deps: {item.dependencyCount ?? 0} &bull; Age: {item.ageDays ?? 1}d
                            </span>
                          </div>

                          <p className="text-[12px] text-outline leading-snug">{item.reasoning}</p>

                          {/* 15-minute Atomic Sprints Decomposed via LLM fallback */}
                          {Array.isArray(item.subtasks) && item.subtasks.length > 0 && (
                            <div className="pt-2 border-t border-outline-variant/10">
                              <div className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px] text-purple-400">psychology</span>
                                <span>Atomic 15-Minute Sprints:</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {item.subtasks.map((st, si) => (
                                  <span
                                    key={si}
                                    className="px-2 py-0.5 rounded bg-surface-container-high text-[11px] text-on-surface-variant font-mono flex items-center gap-1 border border-outline-variant/15"
                                  >
                                    <span>↳ {st.title}</span>
                                    <span className="text-primary font-bold">({st.duration || "15m"})</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE 4: RESTRUCTURE COMPLEX GOAL */}
          {activeMode === "restructure_complex" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-outline-variant/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      Complex Project / Roadmap to Pivot
                    </label>
                    <input
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="e.g. Core Successor Platform Refactoring"
                      className="w-full px-3.5 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      Trigger / Restructuring Reason
                    </label>
                    <input
                      type="text"
                      value={restructureReason}
                      onChange={(e) => setRestructureReason(e.target.value)}
                      placeholder="e.g. Scope shift toward real-time AI & rapid keyboard workflows"
                      className="w-full px-3.5 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRunAi}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                      {loading ? "sync" : "account_tree"}
                    </span>
                    <span>{loading ? "Restructuring Architecture..." : "Generate Restructuring Architecture"}</span>
                  </button>
                </div>
              </div>

              {/* Restructure Output */}
              {restructureResult && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
                    <div>
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                        Scope Adjustment: {restructureResult.scopeDelta}
                      </span>
                      <h4 className="font-headline-sm text-body-md font-bold text-on-surface">
                        Restructured Goal Plan
                      </h4>
                    </div>

                    {restructureResult.newTasksToInject?.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCommitRestructureTasks}
                        disabled={isCommitting}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCommitting ? "sync" : "add_task"}
                        </span>
                        <span>
                          {isCommitting
                            ? "Injecting..."
                            : `Inject ${restructureResult.newTasksToInject.length} New Tasks to DB`}
                        </span>
                      </button>
                    )}
                  </div>

                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {restructureResult.restructuringStrategy}
                  </p>

                  {/* Tasks to Inject */}
                  {Array.isArray(restructureResult.newTasksToInject) && (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-outline">
                        High-Impact Injections
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {restructureResult.newTasksToInject.map((t, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10"
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-primary">{t.category}</span>
                              <span className="font-tabular-mono text-outline">{t.duration}</span>
                            </div>
                            <h6 className="font-semibold text-body-sm text-on-surface leading-snug">
                              {t.title}
                            </h6>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-surface-container flex items-center justify-between bg-surface-container-low text-[12px] text-outline shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">database</span>
            <span>All tasks automatically sync &amp; maintain user interaction logs in Cloud Firestore</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
