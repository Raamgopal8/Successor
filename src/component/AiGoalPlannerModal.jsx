import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  generate90DayWorkplan,
  analyzeLongTermGoal,
  generateWeeklyTasks,
  rescheduleMissedTasks,
  restructureComplexGoal,
} from "../services/aiGoalService";

const PLANNER_MODES = [
  {
    id: "goal_workplan",
    label: "Goal Workplan Planner",
    icon: "calendar_month",
    badge: "90-Day & Weekly",
    description: "Generate structured 90-day daily roadmaps or 7-day weekly focus tasks directly for your task board.",
  },
  {
    id: "reschedule_missed",
    label: "Reschedule Pending Tasks",
    icon: "schedule_send",
    badge: "0ms Native",
    description: "Detect pending & overdue tasks and redistribute them without overloading capacity.",
  },
  {
    id: "restructure_complex",
    label: "Goal Alignment",
    icon: "tune",
    badge: "Realignment",
    description: "Adjust milestones and daily focus when your schedule, priorities, or focus shifts.",
  },
];

const GOAL_TYPE_OPTIONS = [
  { id: "Personal Goal", label: "Personal Goal", icon: "favorite", color: "text-rose-400" },
  { id: "Career Goal", label: "Career Goal", icon: "work", color: "text-blue-400" },
  { id: "Long Term", label: "Long Term Goal", icon: "flag", color: "text-amber-400" },
  { id: "Goal", label: "Core Goal", icon: "track_changes", color: "text-primary" },
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

  const [activeMode, setActiveMode] = useState("goal_workplan");
  const [planHorizon, setPlanHorizon] = useState("90_day"); // "90_day" | "7_day"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form inputs
  const [goalInput, setGoalInput] = useState("");
  const [goalType, setGoalType] = useState("Personal Goal");
  const [dailyCommitment, setDailyCommitment] = useState("1 hour / day");
  const [timeframe, setTimeframe] = useState("Next 4 Weeks");
  const [weeklyPhase, setWeeklyPhase] = useState("Building Consistency & Daily Progress");
  const [restructureReason, setRestructureReason] = useState("Schedule changes and focusing on primary priorities");

  // Output results
  const [ninetyDayPlanResult, setNinetyDayPlanResult] = useState(null);
  const [ninetyDayProgress, setNinetyDayProgress] = useState(null);
  const [selectedNinetyDayIndices, setSelectedNinetyDayIndices] = useState(new Set());
  const [activeMonthTab, setActiveMonthTab] = useState(0); // 0 = All 90, 1 = Month 1, 2 = Month 2, 3 = Month 3
  const [activeWeekFilter, setActiveWeekFilter] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");

  const [analysisResult, setAnalysisResult] = useState(null);
  const [generatedWeeklyTasks, setGeneratedWeeklyTasks] = useState([]);
  const [selectedWeeklyIndices, setSelectedWeeklyIndices] = useState(new Set());
  const [rescheduleResult, setRescheduleResult] = useState(null);
  const [restructureResult, setRestructureResult] = useState(null);

  const [isCommitting, setIsCommitting] = useState(false);

  // Resolve API key & Model from userProfile
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

      if (status === "pending" && isOverdue) return true;
      if (isOverdue) return true;
      if (isRolledOver) return true;
      if (status === "backlog" || status === "pending") return true;
      return false;
    });
  }, [tasks, todayDateStr]);

  const handleRunAi = async () => {
    if (activeMode !== "reschedule_missed" && !activeKey) {
      setError(`No API key stored for ${aiProvider.toUpperCase()}. Please configure your API key in Settings > AI & Intelligence.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeMode === "goal_workplan" || activeMode === "ninety_day_plan" || activeMode === "weekly_generation") {
        const isWeekly = activeMode === "weekly_generation" || (activeMode === "goal_workplan" && planHorizon === "7_day");

        if (!isWeekly) {
          // 90-Day Full Workplan
          if (!goalInput.trim()) {
            setError("Please describe the 90-day goal you want to achieve.");
            setLoading(false);
            return;
          }

          setNinetyDayProgress({ stage: 1, totalStages: 3, percent: 10, message: "Initializing 90-day goal architecture..." });

          const result = await generate90DayWorkplan({
            goal: goalInput.trim(),
            goalType,
            dailyCommitment,
            userContext: {
              displayName,
              displayTitle,
              chronotype: userProfile?.chronotype,
            },
            credentials,
            onProgress: (prog) => {
              setNinetyDayProgress(prog);
            },
          });

          if (Array.isArray(result?.tasks) && result.tasks.length > 0) {
            setNinetyDayPlanResult(result);
            setSelectedNinetyDayIndices(new Set(result.tasks.map((_, i) => i)));
            showToast(`✨ Generated full 90-day workplan (${result.tasks.length} daily steps)!`, "success");
          } else {
            setError("Failed to synthesize 90-day workplan tasks.");
          }
        } else {
          // 7-Day Weekly Focus Tasks
          const goal = goalInput.trim() || userProfile?.defaultProject || "Active Goal Progress";
          const res = await generateWeeklyTasks({
            goal,
            phase: weeklyPhase,
            activeTasks: tasks,
            credentials,
          });

          if (Array.isArray(res?.tasks)) {
            setGeneratedWeeklyTasks(res.tasks);
            setSelectedWeeklyIndices(new Set(res.tasks.map((_, i) => i)));
            showToast(`Synthesized ${res.tasks.length} weekly tasks!`, "success");
          } else {
            setError("Failed to parse task array from AI response.");
          }
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
            ? `⚡ Slotted ${res.totalRescheduled} tasks without overloading capacity!`
            : "Task rescheduling remediation generated!",
          "success"
        );
      } else if (activeMode === "restructure_complex") {
        const goal = goalInput.trim() || "Active Goal Roadmaps";
        const res = await restructureComplexGoal({
          goal,
          currentTasks: tasks,
          changeReason: restructureReason,
          credentials,
        });
        setRestructureResult(res);
        showToast("Goal realignment plan generated!", "success");
      }
    } catch (err) {
      console.error("AI Goal Planner Execution Error:", err);
      setError(err.message || "Failed to execute AI Goal operation.");
    } finally {
      setLoading(false);
      setNinetyDayProgress(null);
    }
  };

  // Commit 90-Day Tasks to Task Board
  const handleCommitNinetyDayPlan = async (placementStrategy = "smart") => {
    if (!ninetyDayPlanResult?.tasks || ninetyDayPlanResult.tasks.length === 0) return;
    const toCommit = ninetyDayPlanResult.tasks.filter((_, idx) => selectedNinetyDayIndices.has(idx));

    if (toCommit.length === 0) {
      setError("Please select at least one day's task to import into your workspace.");
      return;
    }

    setIsCommitting(true);
    try {
      const preparedTasks = toCommit.map((t) => {
        // Smart Strategy: Day 1 (or offset 0) is "ready" for Today, future days go to "backlog" with scheduled calendar dates
        let status = "backlog";
        let dateValue = t.date || "Backlog";

        if (placementStrategy === "smart") {
          if (t.dayOffset === 0) {
            status = "ready";
            dateValue = "Today";
          } else {
            status = "backlog";
            dateValue = t.date;
          }
        } else if (placementStrategy === "today_all") {
          status = "ready";
          dateValue = "Today";
        } else if (placementStrategy === "backlog_all") {
          status = "backlog";
          dateValue = t.date;
        }

        return {
          title: t.title,
          description: t.description || `Part of 90-Day Goal: ${ninetyDayPlanResult.goal} (${t.stageTitle || "Stage"}).`,
          category: t.category || goalType || "Goal",
          priority: t.priority || "P2 Strategic",
          duration: t.duration || "45 min",
          effort: t.effort || "⚡⚡ Med",
          tags: Array.isArray(t.tags) && t.tags.length > 0 ? t.tags : ["#90DayGoal", `#${(t.category || "Goal").replace(/\s+/g, "")}`],
          status,
          date: dateValue,
          assignedDate: status === "ready" ? todayDateStr : t.date,
          dayOffset: t.dayOffset,
          dayNumber: t.dayNumber,
          isHighlight: !!t.isHighlight,
          subtasks: Array.isArray(t.subtasks)
            ? t.subtasks.map((st, i) => ({
                id: `st-90-${Date.now()}-${t.dayNumber}-${i}`,
                title: st.title || st,
                duration: st.duration || "15m",
                completed: false,
              }))
            : "0/1",
        };
      });

      await createMultipleTasks(preparedTasks);
      setNinetyDayPlanResult(null);
      showToast(`🎯 Injected ${preparedTasks.length} daily tasks into your Task Board!`, "success");
      onClose();
    } catch (err) {
      console.error("Failed to commit 90-day tasks to database:", err);
      setError("Failed to save tasks to database: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Commit Weekly Generated Tasks
  const handleCommitWeeklyTasks = async () => {
    if (generatedWeeklyTasks.length === 0) return;
    const toCommit = generatedWeeklyTasks.filter((_, idx) => selectedWeeklyIndices.has(idx));
    if (toCommit.length === 0) {
      setError("Please select at least one task to import into your workspace.");
      return;
    }

    setIsCommitting(true);
    try {
      await createMultipleTasks(
        toCommit.map((t) => ({
          title: t.title,
          description: t.description || `Generated for ${t.day || "Day"}.`,
          category: t.category || "Goal",
          priority: t.priority || "P1 Urgent & High Impact",
          duration: t.duration || "30 min",
          effort: t.effort || "⚡⚡ Med",
          tags: t.tags || ["#Goal"],
          status: t.dayOffset === 0 ? "ready" : "ready",
          date: t.dayOffset === 0 ? "Today" : t.day || "Goal Focus",
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
      setGeneratedWeeklyTasks([]);
      onClose();
    } catch (err) {
      console.error("Failed to commit weekly tasks:", err);
      setError("Failed to save tasks: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Apply Rescheduled Tasks updates
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
        Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
        await updateTask(item.originalTaskId, updates);
        count++;
      }
      showToast(`Updated & rescheduled ${count} tasks on your board!`, "success");
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
          description: t.description || "Created via Goal Alignment.",
          category: t.category || "Goal",
          priority: t.priority || "P1 Urgent & High Impact",
          duration: t.duration || "45 min",
          effort: t.effort || "⚡⚡ Med",
          status: t.status || "ready",
          date: t.status === "backlog" ? "Backlog" : "Today",
        }))
      );
      setRestructureResult(null);
      onClose();
    } catch (err) {
      setError("Failed to commit new tasks: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Filtered 90-day tasks based on Month tab, Week, and search
  const filteredNinetyDayTasks = useMemo(() => {
    if (!ninetyDayPlanResult?.tasks) return [];
    return ninetyDayPlanResult.tasks.filter((t, idx) => {
      // Month tab filter: 0 = All 90, 1 = Month 1, 2 = Month 2, 3 = Month 3, 4 = Week 1 (Days 1–7)
      if (activeMonthTab === 1 && t.monthStage !== 1) return false;
      if (activeMonthTab === 2 && t.monthStage !== 2) return false;
      if (activeMonthTab === 3 && t.monthStage !== 3) return false;
      if (activeMonthTab === 4 && t.dayNumber > 7) return false;

      // Week filter
      if (activeWeekFilter !== "all") {
        const weekNum = Math.ceil(t.dayNumber / 7);
        if (weekNum !== Number(activeWeekFilter)) return false;
      }

      // Search query
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesCategory = t.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCategory) return false;
      }

      return true;
    });
  }, [ninetyDayPlanResult, activeMonthTab, activeWeekFilter, taskSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">flag</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-headline-sm font-bold text-on-surface leading-tight">
                  AI Goal Planner &amp; Workplan Generator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-fixed text-on-secondary-fixed">
                  90-Day &amp; Weekly
                </span>
              </div>
              <p className="text-body-sm text-outline text-[12px] flex items-center gap-1.5 mt-0.5">
                <span>Active AI:</span>
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

        {/* 3 CORE NAVIGATION TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 bg-surface-container-low border-b border-outline-variant/15 p-1.5 gap-1 shrink-0">
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

          {/* MODE 1: UNIFIED GOAL WORKPLAN PLANNER (90-DAY ROADMAP & 7-DAY FOCUS) */}
          {(activeMode === "goal_workplan" || activeMode === "ninety_day_plan" || activeMode === "weekly_generation") && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3.5 border border-outline-variant/10">
                {/* Horizon Scope Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/10">
                  <div>
                    <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">
                      Planning Horizon & Scope
                    </span>
                    <span className="text-body-sm font-semibold text-on-surface">
                      {planHorizon === "90_day" ? "90-Day Comprehensive Roadmap" : "7-Day Tactical Schedule"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-lg border border-outline-variant/15 w-fit">
                    <button
                      type="button"
                      onClick={() => setPlanHorizon("90_day")}
                      className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        planHorizon === "90_day"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-outline hover:text-on-surface hover:bg-surface-container-high/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                      <span>90-Day Roadmap (Flagship)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanHorizon("7_day")}
                      className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        planHorizon === "7_day"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-outline hover:text-on-surface hover:bg-surface-container-high/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">date_range</span>
                      <span>7-Day Focus</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      {planHorizon === "90_day" ? "What is your 90-Day Goal?" : "What is your Weekly Focus Goal?"}
                    </label>
                    <input
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder={
                        planHorizon === "90_day"
                          ? "e.g. Master conversational Spanish, Run a 10K, or Build my Career Portfolio"
                          : "e.g. Daily workout habit and 3 healthy meals routine"
                      }
                      className="w-full px-3.5 py-2.5 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      Goal Category
                    </label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none cursor-pointer"
                    >
                      {GOAL_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    {planHorizon === "90_day" ? (
                      <>
                        <label className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">
                          Daily Time Commitment
                        </label>
                        <select
                          value={dailyCommitment}
                          onChange={(e) => setDailyCommitment(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none cursor-pointer"
                        >
                          <option value="30-45 min / day">30–45 min / day (Light &amp; Steady)</option>
                          <option value="1 hour / day">1 hour / day (Recommended Balance)</option>
                          <option value="1.5-2 hours / day">1.5–2 hours / day (Deep Immersion)</option>
                          <option value="2+ hours / day">2+ hours / day (Intensive Acceleration)</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">
                          Focus Phase
                        </label>
                        <select
                          value={weeklyPhase}
                          onChange={(e) => setWeeklyPhase(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none cursor-pointer"
                        >
                          <option value="Building Consistency & Daily Progress">Building Consistency &amp; Daily Progress</option>
                          <option value="Core Focus & Acceleration">Core Focus &amp; Acceleration</option>
                          <option value="Review, Completion & Habit Formation">Review, Completion &amp; Habit Formation</option>
                        </select>
                      </>
                    )}
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleRunAi}
                      disabled={loading || !goalInput.trim()}
                      className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                        {loading ? "sync" : "auto_awesome"}
                      </span>
                      <span>
                        {loading
                          ? planHorizon === "90_day"
                            ? "Generating 90-Day Plan..."
                            : "Generating Weekly Plan..."
                          : planHorizon === "90_day"
                          ? "Generate Full 90-Day Daily Workplan"
                          : "Generate 7-Day Daily Tasks"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Progressive Generation Status Bar */}
                {loading && ninetyDayProgress && (
                  <div className="pt-2 border-t border-outline-variant/10 space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                        <span>{ninetyDayProgress.message || "Generating day-by-day roadmap..."}</span>
                      </span>
                      <span className="font-mono text-outline font-bold">{ninetyDayProgress.percent || 30}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(5, ninetyDayProgress.percent || 20)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Result Switcher if both 90-day and 7-day outputs exist */}
              {ninetyDayPlanResult && generatedWeeklyTasks.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-outline-variant/10">
                  <span className="text-[12px] font-semibold text-on-surface px-2">Generated Results Available:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPlanHorizon("90_day")}
                      className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        planHorizon === "90_day"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-outline hover:text-on-surface hover:bg-surface-container-high/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>90-Day Workplan ({ninetyDayPlanResult.tasks.length} Days)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanHorizon("7_day")}
                      className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        planHorizon === "7_day"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-outline hover:text-on-surface hover:bg-surface-container-high/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">date_range</span>
                      <span>Weekly Tasks ({generatedWeeklyTasks.length})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 90-Day Workplan Results & Task Board Injection */}
              {ninetyDayPlanResult && Array.isArray(ninetyDayPlanResult.tasks) && (planHorizon === "90_day" || generatedWeeklyTasks.length === 0) && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/25 shadow-sm space-y-4">
                  {/* Top Bar: Summary & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {ninetyDayPlanResult.goalType || "Goal"}
                        </span>
                        <span className="text-[12px] text-outline">
                          {ninetyDayPlanResult.tasks.length} Daily Steps Generated (Starting {ninetyDayPlanResult.startDate})
                        </span>
                      </div>
                      <h3 className="text-headline-sm font-bold text-on-surface mt-0.5">
                        {ninetyDayPlanResult.goal}
                      </h3>
                    </div>

                    {/* Feed to Board Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCommitNinetyDayPlan("smart")}
                        disabled={isCommitting || selectedNinetyDayIndices.size === 0}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-sm font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        title="Day 1 goes to Ready for Today; Days 2-90 go to Backlog with assigned dates."
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCommitting ? "sync" : "input"}
                        </span>
                        <span>
                          {isCommitting ? "Feeding to Board..." : `Feed ${selectedNinetyDayIndices.size} Days to Board (Smart)`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCommitNinetyDayPlan("backlog_all")}
                        disabled={isCommitting || selectedNinetyDayIndices.size === 0}
                        className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                        <span>All to Backlog</span>
                      </button>
                    </div>
                  </div>

                  {/* Horizon Tabs & Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
                    {/* Horizon Months */}
                    <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setActiveMonthTab(0)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                          activeMonthTab === 0
                            ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        All 90 Days ({ninetyDayPlanResult.tasks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMonthTab(1)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                          activeMonthTab === 1
                            ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        Month 1 (Days 1–30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMonthTab(2)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                          activeMonthTab === 2
                            ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        Month 2 (Days 31–60)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMonthTab(3)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                          activeMonthTab === 3
                            ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        Month 3 (Days 61–90)
                      </button>
                    </div>

                    {/* Filter controls */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search daily tasks..."
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        className="px-2.5 py-1 text-[12px] bg-surface-container-low text-on-surface rounded-lg border border-outline-variant/15 outline-none w-36"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (selectedNinetyDayIndices.size === ninetyDayPlanResult.tasks.length) {
                            setSelectedNinetyDayIndices(new Set());
                          } else {
                            setSelectedNinetyDayIndices(new Set(ninetyDayPlanResult.tasks.map((_, i) => i)));
                          }
                        }}
                        className="text-[12px] text-outline hover:text-on-surface transition-colors cursor-pointer"
                      >
                        {selectedNinetyDayIndices.size === ninetyDayPlanResult.tasks.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                  </div>

                  {/* Day Tasks Matrix */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredNinetyDayTasks.map((task) => {
                      const originalIdx = task.dayNumber - 1;
                      const isChecked = selectedNinetyDayIndices.has(originalIdx);

                      return (
                        <div
                          key={task.dayNumber}
                          onClick={() => {
                            const next = new Set(selectedNinetyDayIndices);
                            if (next.has(originalIdx)) next.delete(originalIdx);
                            else next.add(originalIdx);
                            setSelectedNinetyDayIndices(next);
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
                            className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                Day {task.dayNumber}
                              </span>
                              <span className="text-[11px] font-mono text-outline">
                                {task.date} ({task.dayName})
                              </span>
                              <span className="text-[11px] font-semibold text-secondary">
                                • {task.category}
                              </span>
                              <span className="text-[11px] font-tabular-mono text-outline">
                                • {task.duration}
                              </span>
                              {task.isHighlight && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                  <span className="material-symbols-outlined text-[11px]">star</span>
                                  Milestone Day
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

                            {/* Subtask checklist */}
                            {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-outline-variant/10">
                                {task.subtasks.map((st, si) => (
                                  <span
                                    key={si}
                                    className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-outline font-mono flex items-center gap-1"
                                  >
                                    <span>↳ {st.title || st}</span>
                                    {st.duration && <span className="text-primary font-bold">({st.duration})</span>}
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

              {/* Weekly Tasks List (7-Day Focus) */}
              {generatedWeeklyTasks.length > 0 && (planHorizon === "7_day" || !ninetyDayPlanResult) && (
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/10">
                    <div>
                      <h3 className="font-headline-sm text-body-md font-bold text-on-surface">
                        Generated Weekly Tasks ({generatedWeeklyTasks.length})
                      </h3>
                      <p className="text-[12px] text-outline">
                        Select tasks to inject directly into your Task Board
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedWeeklyIndices.size === generatedWeeklyTasks.length) {
                            setSelectedWeeklyIndices(new Set());
                          } else {
                            setSelectedWeeklyIndices(new Set(generatedWeeklyTasks.map((_, i) => i)));
                          }
                        }}
                        className="text-[12px] text-outline hover:text-on-surface transition-colors cursor-pointer"
                      >
                        {selectedWeeklyIndices.size === generatedWeeklyTasks.length ? "Deselect All" : "Select All"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCommitWeeklyTasks}
                        disabled={isCommitting || selectedWeeklyIndices.size === 0}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-sm font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCommitting ? "sync" : "input"}
                        </span>
                        <span>
                          {isCommitting ? "Feeding to Board..." : `Inject ${selectedWeeklyIndices.size} Tasks to Board`}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {generatedWeeklyTasks.map((task, idx) => {
                      const isChecked = selectedWeeklyIndices.has(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const next = new Set(selectedWeeklyIndices);
                            if (next.has(idx)) next.delete(idx);
                            else next.add(idx);
                            setSelectedWeeklyIndices(next);
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
                              <span className="text-[11px] font-semibold text-secondary">
                                {task.category || "Goal"}
                              </span>
                              <span className="text-[11px] font-tabular-mono text-outline">
                                • {task.duration || "30 min"}
                              </span>
                            </div>
                            <h4 className="font-semibold text-body-md text-on-surface leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[12px] text-on-surface-variant line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
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

          {/* MODE 3: RESCHEDULE PENDING TASKS */}
          {activeMode === "reschedule_missed" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-outline-variant/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-label-md font-semibold text-on-surface">
                        Task Rescheduling &amp; Capacity Redistribution
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        ⚡ 0ms Native
                      </span>
                    </div>
                    <p className="text-[12px] text-outline mt-0.5">
                      {missedOrBacklogTasks.length} uncompleted tasks detected needing schedule redistribution
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
                    <span>{loading ? "Rebalancing..." : "Reschedule Tasks"}</span>
                  </button>
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
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-surface-container text-center text-outline text-[13px]">
                    🎉 Excellent progress! No overdue or pending tasks detected.
                  </div>
                )}
              </div>

              {/* Reschedule Diagnostic & Action Plan */}
              {rescheduleResult && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
                    <div>
                      <h4 className="font-headline-sm text-body-md font-bold text-on-surface">
                        {rescheduleResult.totalRescheduled} Tasks Slotted into Daily Capacity Windows
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
                      <span>{isCommitting ? "Applying..." : "Apply to Task Board"}</span>
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
                          className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                            <span className="font-semibold text-primary">
                              &rarr; {item.recommendedDay} ({item.newDuration || "30m"})
                            </span>
                            <span className="text-outline">{item.newPriority}</span>
                          </div>
                          <h5 className="font-semibold text-body-md text-on-surface">{item.newTitle}</h5>
                          <p className="text-[12px] text-outline leading-snug">{item.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE 4: GOAL REALIGNMENT */}
          {activeMode === "restructure_complex" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-3 border border-outline-variant/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      Goal to Adjust
                    </label>
                    <input
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="e.g. Marathon Training Schedule"
                      className="w-full px-3.5 py-2 bg-surface-container-lowest text-on-surface rounded-lg text-body-sm border border-outline-variant/15 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md font-semibold text-on-surface mb-1">
                      Reason for Realignment
                    </label>
                    <input
                      type="text"
                      value={restructureReason}
                      onChange={(e) => setRestructureReason(e.target.value)}
                      placeholder="e.g. Shifting from intense pace to steady sustainable daily focus"
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
                      {loading ? "sync" : "tune"}
                    </span>
                    <span>{loading ? "Re-aligning..." : "Re-align Goal Milestones"}</span>
                  </button>
                </div>
              </div>

              {/* Restructure Output */}
              {restructureResult && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
                    <div>
                      <h4 className="font-headline-sm text-body-md font-bold text-on-surface">
                        Goal Realignment Plan
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
                            : `Inject ${restructureResult.newTasksToInject.length} Steps to Board`}
                        </span>
                      </button>
                    )}
                  </div>

                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {restructureResult.restructuringStrategy}
                  </p>

                  {Array.isArray(restructureResult.newTasksToInject) && (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-outline">
                        Fresh Action Steps
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {restructureResult.newTasksToInject.map((t, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10"
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-primary">{t.category || "Goal"}</span>
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
            <span>All tasks automatically sync &amp; maintain progress in Cloud Firestore</span>
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
