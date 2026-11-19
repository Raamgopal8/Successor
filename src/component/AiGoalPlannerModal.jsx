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
import { fetchRoadmapPlan, isTauri } from "../utils/tauriBridge";

const PLANNER_MODES = [
  {
    id: "goal_workplan",
    label: "Goal Workplan",
    icon: "calendar_month",
    badge: "90-Day & Weekly",
    description: "Generate structured 90-day daily roadmaps or 7-day tactical focus tasks.",
  },
  {
    id: "reschedule_missed",
    label: "Reschedule Pending",
    icon: "schedule_send",
    badge: "0ms Native",
    description: "Detect pending & overdue tasks and redistribute them without overloading capacity.",
  },
  {
    id: "restructure_complex",
    label: "Goal Alignment",
    icon: "tune",
    badge: "Realignment",
    description: "Adjust milestones and daily focus when schedule or priorities shift.",
  },
  {
    id: "roadmap_plan",
    label: "Roadmap Plan",
    icon: "map",
    badge: "RAG + Live Data",
    description: "Fetch real roadmaps from roadmap.sh & top sources. Split into daily tasks over N days.",
    desktopOnly: true,
  },
];

const GOAL_TYPE_OPTIONS = [
  { id: "Personal Goal", label: "Personal Goal", icon: "favorite", color: "text-rose-400" },
  { id: "Career Goal", label: "Career Goal", icon: "work", color: "text-blue-400" },
  { id: "Long Term", label: "Long Term Goal", icon: "flag", color: "text-amber-400" },
  { id: "Goal", label: "Core Goal", icon: "track_changes", color: "text-primary" },
];

const cleanTopicTitle = (title) => {
  if (!title) return "";
  return title.replace(/^Day\s+\d+:\s*/i, "").trim();
};

const formatResourceUrl = (url) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {
    return url.replace("https://", "").replace("http://", "");
  }
};

export default function AiGoalPlannerModal({ isOpen, onClose }) {
  const {
    userProfile,
    tasks,
    createMultipleTasks,
    updateTask,
    saveUserProfile,
    showToast,
    displayName,
    displayTitle,
  } = useApp();

  const [activeMode, setActiveMode] = useState("goal_workplan");
  const [planHorizon, setPlanHorizon] = useState("90_day"); // "90_day" | "7_day"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Gemini API key state & inline configuration
  const [customGeminiKey, setCustomGeminiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Form inputs
  const [goalInput, setGoalInput] = useState("");
  const [goalType, setGoalType] = useState("Personal Goal");
  const [dailyCommitment, setDailyCommitment] = useState("1 hour / day");
  const [weeklyPhase, setWeeklyPhase] = useState("Building Consistency & Daily Progress");
  const [restructureReason, setRestructureReason] = useState("Schedule changes and focusing on primary priorities");

  // Output results
  const [ninetyDayPlanResult, setNinetyDayPlanResult] = useState(null);
  const [ninetyDayProgress, setNinetyDayProgress] = useState(null);
  const [selectedNinetyDayIndices, setSelectedNinetyDayIndices] = useState(new Set());
  const [activeMonthTab, setActiveMonthTab] = useState(0); // 0 = All 90, 1 = Month 1, 2 = Month 2, 3 = Month 3
  const [activeWeekFilter, setActiveWeekFilter] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");

  const [generatedWeeklyTasks, setGeneratedWeeklyTasks] = useState([]);
  const [selectedWeeklyIndices, setSelectedWeeklyIndices] = useState(new Set());
  const [rescheduleResult, setRescheduleResult] = useState(null);
  const [restructureResult, setRestructureResult] = useState(null);

  // Roadmap Plan state
  const [roadmapNDays, setRoadmapNDays] = useState(90);
  const [roadmapCustomDays, setRoadmapCustomDays] = useState("");
  const [roadmapResult, setRoadmapResult] = useState(null);
  const [roadmapExpandedWeeks, setRoadmapExpandedWeeks] = useState(new Set([1]));
  const [roadmapSelectedDays, setRoadmapSelectedDays] = useState(new Set());
  const [roadmapStatus, setRoadmapStatus] = useState(""); // fetch status message

  const [isCommitting, setIsCommitting] = useState(false);

  // Resolve API key & Model from userProfile or fallback to project key
  const activeCustomConfig = Array.isArray(userProfile?.customAiConfigs)
    ? userProfile.customAiConfigs.find((c) => c.isActive) || userProfile.customAiConfigs[0]
    : null;

  const aiProvider = activeCustomConfig?.providerType || userProfile?.aiProvider || "gemini";
  const aiModel = activeCustomConfig?.model || userProfile?.aiModel || "gemini-4-hydrogen";
  const aiEndpoint = activeCustomConfig?.endpoint || userProfile?.aiEndpoint || "";
  const aiApiKeys = userProfile?.aiApiKeys || {};
  const activeKey =
    customGeminiKey ||
    activeCustomConfig?.apiKey ||
    userProfile?.aiApiKey ||
    aiApiKeys[aiProvider] ||
    aiApiKeys["gemini"] ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "";
  const hasAiKey = Boolean(activeKey && activeKey.trim());

  const credentials = {
    provider: "gemini",
    model: aiModel || "gemini-4-hydrogen",
    apiKey: activeKey,
    endpoint: aiEndpoint,
  };

  const handleSaveGeminiKey = async (keyToSave) => {
    const clean = (keyToSave || customGeminiKey).trim();
    if (!clean) return;
    setSavingKey(true);
    try {
      if (typeof saveUserProfile === "function") {
        await saveUserProfile({
          aiApiKey: clean,
          aiApiKeys: {
            ...(userProfile?.aiApiKeys || {}),
            gemini: clean,
          },
        });
      }
      setCustomGeminiKey(clean);
      setShowKeyInput(false);
      setError(null);
      showToast("Gemini API key saved! Ready to generate.", "success");
    } catch (err) {
      console.error("Failed to save API key:", err);
      setCustomGeminiKey(clean);
      setShowKeyInput(false);
      setError(null);
      showToast("Key applied for this session.", "info");
    } finally {
      setSavingKey(false);
    }
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
    setLoading(true);
    setError(null);

    try {
      if (activeMode === "goal_workplan" || activeMode === "ninety_day_plan" || activeMode === "weekly_generation") {
        const isWeekly = activeMode === "weekly_generation" || (activeMode === "goal_workplan" && planHorizon === "7_day");

        if (!isWeekly) {
          // 90-Day Plan via Gemini 4 AI Logic
          if (!goalInput.trim()) {
            setError("Please describe the 90-day goal you want to achieve.");
            setLoading(false);
            return;
          }

          setNinetyDayProgress({
            stage: 1,
            totalStages: 3,
            percent: 15,
            message: "Connecting to Firebase AI Logic (Gemini 3.8)...",
          });

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
            showToast(`✨ Generated AI 90-day roadmap with Gemini 3.8 (${result.tasks.length} steps)!`, "success");
          } else {
            setError("Failed to synthesize 90-day workplan tasks with Gemini 3.8.");
          }
        } else {
          // 7-Day Weekly Focus Tasks via Gemini 4 AI Logic
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
            showToast(`Synthesized ${res.tasks.length} weekly tasks with Gemini 3.8!`, "success");
          } else {
            setError("Failed to parse task array from Gemini 3.8 response.");
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
      setError(err.message || "Failed to execute Goal operation.");
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
          status: "ready",
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

  // Run RAG-based Roadmap Plan
  const handleRunRoadmapPlan = async () => {
    if (!goalInput.trim()) {
      setError("Please describe the skill or career goal you want a roadmap for (e.g. 'Learn Rust', 'Frontend Developer', 'DevOps').");
      return;
    }

    const nDays = roadmapCustomDays ? parseInt(roadmapCustomDays, 10) : roadmapNDays;
    if (isNaN(nDays) || nDays < 7 || nDays > 365) {
      setError("Please specify a valid duration between 7 and 365 days.");
      return;
    }

    setLoading(true);
    setError(null);
    setRoadmapStatus("Fetching authoritative roadmap and structuring RAG context...");

    try {
      const res = await fetchRoadmapPlan(
        goalInput.trim(),
        nDays,
        "", // auto-resolve ID from goal keyword
        activeKey || "",
        aiModel || "gemini-3.8-flash"
      );

      if (res?.days && res.days.length > 0) {
        setRoadmapResult(res);
        setRoadmapSelectedDays(new Set(res.days.map((d) => d.day)));
        setRoadmapExpandedWeeks(new Set([1, 2]));
        showToast(
          `🗺️ Generated ${res.days.length}-day roadmap from ${res.roadmap_id} (${res.total_topics} topics analyzed)!`,
          "success"
        );
      } else {
        setError(res?.error || "Failed to generate roadmap plan.");
      }
    } catch (err) {
      console.error("Roadmap generation failed:", err);
      setError(err?.message || "Failed to fetch and synthesize roadmap.");
    } finally {
      setLoading(false);
      setRoadmapStatus("");
    }
  };

  // Commit Roadmap Plan Tasks
  const handleCommitRoadmapTasks = async () => {
    if (!roadmapResult?.days || roadmapResult.days.length === 0) return;
    const selectedDaysList = roadmapResult.days.filter((d) => roadmapSelectedDays.has(d.day));

    if (selectedDaysList.length === 0) {
      setError("Please select at least one day from the roadmap to import into your workspace.");
      return;
    }

    setIsCommitting(true);
    try {
      const startDate = new Date();
      const preparedTasks = selectedDaysList.map((dayPlan) => {
        const offset = dayPlan.day - 1;
        const taskDate = new Date(startDate);
        taskDate.setDate(startDate.getDate() + offset);
        const dateStr = taskDate.toISOString().split("T")[0];
        const isToday = offset === 0;

        return {
          title: dayPlan.title,
          description: `Roadmap: ${roadmapResult.roadmap_id.toUpperCase()} (Source: ${roadmapResult.roadmap_source})\n\nMilestone: ${dayPlan.milestone || "Weekly milestone"}\nResources:\n${(dayPlan.resources || []).join("\n")}`,
          category: "Career Goal",
          priority: offset < 7 ? "P1 Urgent & High Impact" : "P2 Strategic",
          duration: "60 min",
          effort: "⚡⚡ Med",
          tags: ["#Roadmap", `#${roadmapResult.roadmap_id.replace(/[^a-zA-Z0-9]/g, "")}`, `#Day${dayPlan.day}`],
          status: isToday ? "ready" : "backlog",
          date: isToday ? "Today" : dateStr,
          assignedDate: isToday ? todayDateStr : dateStr,
          dayOffset: offset,
          dayNumber: dayPlan.day,
          isHighlight: !!dayPlan.milestone,
          subtasks: (dayPlan.tasks || []).map((tText, i) => ({
            id: `st-roadmap-${Date.now()}-${dayPlan.day}-${i}`,
            title: tText,
            duration: "20m",
            completed: false,
          })),
        };
      });

      await createMultipleTasks(preparedTasks);
      setRoadmapResult(null);
      showToast(`🎯 Injected ${preparedTasks.length} daily roadmap tasks into your Task Board!`, "success");
      onClose();
    } catch (err) {
      console.error("Failed to commit roadmap tasks:", err);
      setError("Failed to save tasks to database: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  // Group roadmap days by week
  const roadmapWeeks = useMemo(() => {
    if (!roadmapResult?.days) return [];
    const weeksMap = new Map();
    for (const d of roadmapResult.days) {
      if (!weeksMap.has(d.week)) {
        weeksMap.set(d.week, []);
      }
      weeksMap.get(d.week).push(d);
    }
    return Array.from(weeksMap.entries()).map(([weekNum, days]) => ({
      weekNum,
      days,
      milestone: days.find((d) => d.milestone)?.milestone || null,
    }));
  }, [roadmapResult]);

  const toggleRoadmapWeek = (weekNum) => {
    setRoadmapExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const toggleRoadmapDaySelection = (dayNum) => {
    setRoadmapSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum);
      else next.add(dayNum);
      return next;
    });
  };

  const selectAllRoadmapDays = () => {
    if (!roadmapResult?.days) return;
    if (roadmapSelectedDays.size === roadmapResult.days.length) {
      setRoadmapSelectedDays(new Set());
    } else {
      setRoadmapSelectedDays(new Set(roadmapResult.days.map((d) => d.day)));
    }
  };

  // Filtered 90-day tasks based on Month tab, Week, and search
  const filteredNinetyDayTasks = useMemo(() => {
    if (!ninetyDayPlanResult?.tasks) return [];
    return ninetyDayPlanResult.tasks.filter((t) => {
      if (activeMonthTab === 1 && t.monthStage !== 1) return false;
      if (activeMonthTab === 2 && t.monthStage !== 2) return false;
      if (activeMonthTab === 3 && t.monthStage !== 3) return false;

      if (activeWeekFilter !== "all") {
        const weekNum = Math.ceil(t.dayNumber / 7);
        if (weekNum !== Number(activeWeekFilter)) return false;
      }

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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-5 md:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-6 py-4 border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-title-md sm:text-title-lg font-bold text-on-surface leading-tight truncate">
                  Goal Planner &amp; Strategic Roadmap
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  AI + RAG Live Data
                </span>
              </div>
              <p className="text-[12px] text-outline flex items-center gap-1.5 mt-0.5 truncate">
                <span>Studio</span>
                <span>•</span>
                <span className="truncate">Turn ambitious long-term goals into daily achievable steps</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            {/* AI ENGINE BADGE */}
            <div className="flex items-center gap-2 bg-surface-container border border-outline-variant/25 rounded-xl px-3 py-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="material-symbols-outlined text-[15px] text-primary">psychology</span>
              <span className="text-xs font-semibold text-on-surface">Gemini 4 Hydrogen</span>
              <button
                type="button"
                onClick={() => setShowKeyInput((prev) => !prev)}
                className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors"
                title="Change or enter Gemini API key"
              >
                {activeKey ? "Key Active" : "Add Key"}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-outline-variant/20"
              title="Close modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className={`grid grid-cols-1 ${isTauri() ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"} bg-surface-container-low border-b border-outline-variant/15 p-2 gap-2 shrink-0`}>
          {PLANNER_MODES.filter((m) => !m.desktopOnly || isTauri()).map((m) => {
            const isActive = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveMode(m.id);
                  setError(null);
                }}
                className={`p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between h-full min-h-[72px] ${
                  isActive
                    ? "bg-surface-container-lowest text-primary shadow-sm border border-primary/25 ring-1 ring-primary/20"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isActive ? "text-primary" : "text-outline"
                      }`}
                    >
                      {m.icon}
                    </span>
                    <h4 className="text-label-lg font-bold leading-tight truncate">
                      {m.label}
                    </h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isActive ? "bg-primary/15 text-primary" : "bg-surface-container-highest text-outline"
                    }`}
                  >
                    {m.badge}
                  </span>
                </div>
                <p className="text-[11px] text-outline line-clamp-1 leading-snug">{m.description}</p>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* API KEY CONFIGURATION / 403 ERROR CARD */}
          {(error || showKeyInput) && (
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
              error
                ? "bg-error-container/20 border-error/30 text-on-surface"
                : "bg-surface-container-low border-primary/25 text-on-surface shadow-xs"
            }`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 ${error ? "text-error" : "text-primary"}`}>
                  {error ? "error" : "key"}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-sm ${error ? "text-error" : "text-on-surface"}`}>
                    {error
                      ? error.includes("403")
                        ? "Gemini API Access Error: 403 Forbidden"
                        : "AI Operation Error"
                      : "Configure Gemini API Key"}
                  </h4>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed mt-1">
                    {error || "Connect your personal Google Gemini API key for high-speed, personalized goal synthesis."}
                  </p>
                </div>
                {showKeyInput && !error && (
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(false)}
                    className="text-outline hover:text-on-surface p-1 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              {/* Resolution options & inline key paste */}
              <div className="pt-2 border-t border-outline-variant/15 space-y-3">
                <div className="bg-surface-container p-3.5 rounded-xl border border-outline-variant/20 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                      <span>Recommended: Free Google AI Studio Key</span>
                    </span>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Get Free Key (1-Click)</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-outline leading-relaxed">
                    By default, Firebase web keys are restricted to Firebase Auth &amp; Firestore. To run Gemini 4, paste a free key from Google AI Studio:
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <input
                      type="password"
                      placeholder="Paste your Gemini API key (AIzaSy...)"
                      value={customGeminiKey}
                      onChange={(e) => setCustomGeminiKey(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/30 outline-none focus:border-primary font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveGeminiKey(customGeminiKey)}
                      disabled={savingKey || !customGeminiKey.trim()}
                      className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                      <span>{savingKey ? "Saving..." : "Save Key & Retry"}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-outline pt-0.5">
                    Or if you prefer using the Firebase project key: enable the <a href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=successor-9f9c0" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">Generative Language API in Google Cloud Console &rarr;</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 1: UNIFIED GOAL WORKPLAN PLANNER */}
          {(activeMode === "goal_workplan" || activeMode === "ninety_day_plan" || activeMode === "weekly_generation") && (
            <div className="space-y-5">
              <div className="bg-surface-container-low p-5 rounded-2xl space-y-4 border border-outline-variant/15">
                
                {/* Horizon Scope Toggle & Engine Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
                  <div>
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Planning Scope &amp; Horizon
                    </span>
                    <span className="text-body-md font-bold text-on-surface">
                      {planHorizon === "90_day" ? "90-Day Comprehensive Daily Roadmap" : "7-Day Tactical Schedule"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-xl border border-outline-variant/15">
                    <button
                      type="button"
                      onClick={() => setPlanHorizon("90_day")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        planHorizon === "90_day"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-outline hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                      <span>90-Day Roadmap (Flagship)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanHorizon("7_day")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        planHorizon === "7_day"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-outline hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">date_range</span>
                      <span>7-Day Focus</span>
                    </button>
                  </div>
                </div>

                {/* Goal Input & Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="block text-label-md font-bold text-on-surface mb-1.5">
                      {planHorizon === "90_day" ? "What 90-Day Goal do you want to accomplish?" : "What is your Weekly Goal?"}
                    </label>
                    <input
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder={
                        planHorizon === "90_day"
                          ? "e.g. Master conversational Spanish, Launch SaaS MVP, or Run a 10K Marathon"
                          : "e.g. Build core authentication module and finalize database schemas"
                      }
                      className="w-full h-11 px-4 bg-surface-container-lowest text-on-surface rounded-xl text-body-sm border border-outline-variant/20 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-outline font-medium mr-1">Popular goals:</span>
                      {[
                        "Master Rust in 90 Days",
                        "Build & Launch SaaS MVP",
                        "Run a 10K Marathon",
                        "Pass AWS Cloud Certification",
                        "Learn Conversational Spanish",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setGoalInput(preset)}
                          className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer border border-outline-variant/15"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-label-md font-bold text-on-surface mb-1.5">
                      Goal Category
                    </label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value)}
                      className="w-full h-11 px-3.5 bg-surface-container-lowest text-on-surface rounded-xl text-body-sm border border-outline-variant/20 outline-none cursor-pointer focus:border-primary transition-all"
                    >
                      {GOAL_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cadence & Commitment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 items-end">
                  <div>
                    {planHorizon === "90_day" ? (
                      <>
                        <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-1.5">
                          Daily Time Commitment
                        </label>
                        <select
                          value={dailyCommitment}
                          onChange={(e) => setDailyCommitment(e.target.value)}
                          className="w-full h-11 px-3.5 bg-surface-container-lowest text-on-surface rounded-xl text-body-sm border border-outline-variant/20 outline-none cursor-pointer focus:border-primary transition-all"
                        >
                          <option value="30-45 min / day">30–45 min / day (Light &amp; Steady)</option>
                          <option value="1 hour / day">1 hour / day (Recommended Balance)</option>
                          <option value="1.5-2 hours / day">1.5–2 hours / day (Deep Immersion)</option>
                          <option value="2+ hours / day">2+ hours / day (Intensive Acceleration)</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-1.5">
                          Focus Phase
                        </label>
                        <select
                          value={weeklyPhase}
                          onChange={(e) => setWeeklyPhase(e.target.value)}
                          className="w-full h-11 px-3.5 bg-surface-container-lowest text-on-surface rounded-xl text-body-sm border border-outline-variant/20 outline-none cursor-pointer focus:border-primary transition-all"
                        >
                          <option value="Building Consistency & Daily Progress">Building Consistency &amp; Daily Progress</option>
                          <option value="Core Focus & Acceleration">Core Focus &amp; Acceleration</option>
                          <option value="Review, Completion & Habit Formation">Review, Completion &amp; Habit Formation</option>
                        </select>
                      </>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleRunAi}
                      disabled={loading || !goalInput.trim()}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                        {loading ? "sync" : "auto_awesome"}
                      </span>
                      <span>
                        {loading
                          ? planHorizon === "90_day"
                            ? "Synthesizing 90-Day Roadmap with Gemini 3.8-flash..."
                            : "Generating Weekly Plan with Gemini 3.8-flash..."
                          : planHorizon === "90_day"
                          ? "Generate 90-Day Plan with Gemini 3.8-flash"
                          : "Generate 7-Day Tasks with Gemini 3.8-flash"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {loading && ninetyDayProgress && (
                  <div className="pt-2 border-t border-outline-variant/15 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] animate-spin">refresh</span>
                        <span>{ninetyDayProgress.message || "Generating day-by-day roadmap..."}</span>
                      </span>
                      <span className="font-mono text-outline font-bold">{ninetyDayProgress.percent || 30}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(8, ninetyDayProgress.percent || 20)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 90-Day Workplan Results & Task Board Injection */}
              {ninetyDayPlanResult && Array.isArray(ninetyDayPlanResult.tasks) && (planHorizon === "90_day" || generatedWeeklyTasks.length === 0) && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/25 shadow-sm space-y-4">
                  {/* Top Bar: Summary & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {ninetyDayPlanResult.goalType || "Goal"}
                        </span>
                        <span className="text-xs text-outline">
                          {ninetyDayPlanResult.tasks.length} Daily Steps Generated (Starting {ninetyDayPlanResult.startDate})
                        </span>
                      </div>
                      <h3 className="text-title-lg font-bold text-on-surface mt-1">
                        {ninetyDayPlanResult.goal}
                      </h3>
                    </div>

                    {/* Feed to Board Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCommitNinetyDayPlan("smart")}
                        disabled={isCommitting || selectedNinetyDayIndices.size === 0}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
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
                        className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                        <span>All to Backlog</span>
                      </button>
                    </div>
                  </div>

                  {/* Horizon Tabs & Search Filter */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setActiveMonthTab(0)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeMonthTab === 3
                            ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                            : "text-outline hover:text-on-surface"
                        }`}
                      >
                        Month 3 (Days 61–90)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search daily tasks..."
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-surface-container-low text-on-surface rounded-xl border border-outline-variant/15 outline-none focus:border-primary w-40"
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
                        className="text-xs text-outline hover:text-on-surface font-semibold transition-colors cursor-pointer"
                      >
                        {selectedNinetyDayIndices.size === ninetyDayPlanResult.tasks.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                  </div>

                  {/* Day Tasks Matrix */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
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
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                                  <span className="material-symbols-outlined text-[12px]">star</span>
                                  Milestone Day
                                </span>
                              )}
                            </div>

                            <h4 className="font-semibold text-sm text-on-surface leading-snug">
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}

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
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/15">
                    <div>
                      <h3 className="text-title-md font-bold text-on-surface">
                        Generated Weekly Tasks ({generatedWeeklyTasks.length})
                      </h3>
                      <p className="text-xs text-outline">
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
                        className="text-xs text-outline hover:text-on-surface font-semibold transition-colors cursor-pointer"
                      >
                        {selectedWeeklyIndices.size === generatedWeeklyTasks.length ? "Deselect All" : "Select All"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCommitWeeklyTasks}
                        disabled={isCommitting || selectedWeeklyIndices.size === 0}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCommitting ? "sync" : "input"}
                        </span>
                        <span>
                          {isCommitting ? "Feeding to Board..." : `Inject ${selectedWeeklyIndices.size} Tasks`}
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
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
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
                              <span className="text-xs font-semibold text-secondary">
                                {task.category || "Goal"}
                              </span>
                              <span className="text-xs font-tabular-mono text-outline">
                                • {task.duration || "30 min"}
                              </span>
                            </div>
                            <h4 className="font-semibold text-sm text-on-surface leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
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

          {/* MODE 2: RESCHEDULE PENDING TASKS */}
          {activeMode === "reschedule_missed" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-5 rounded-2xl space-y-3.5 border border-outline-variant/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-title-md font-bold text-on-surface">
                        Task Rescheduling &amp; Capacity Redistribution
                      </h3>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0">
                        ⚡ 0ms Native
                      </span>
                    </div>
                    <p className="text-xs text-outline mt-0.5">
                      {missedOrBacklogTasks.length} uncompleted tasks detected needing schedule redistribution
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAi}
                    disabled={loading || missedOrBacklogTasks.length === 0}
                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shrink-0 self-end sm:self-center"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>
                      {loading ? "sync" : "tune"}
                    </span>
                    <span>{loading ? "Rebalancing..." : "Reschedule Tasks"}</span>
                  </button>
                </div>

                {missedOrBacklogTasks.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {missedOrBacklogTasks.map((t) => (
                      <span
                        key={t.id}
                        className="px-3 py-1 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-medium border border-outline-variant/15 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[14px] text-amber-500">
                          pending_actions
                        </span>
                        <span className="truncate max-w-[240px]">{t.title}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-container text-center text-outline text-xs">
                    🎉 Excellent progress! No overdue or pending tasks detected.
                  </div>
                )}
              </div>

              {/* Reschedule Diagnostic & Action Plan */}
              {rescheduleResult && (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
                    <div>
                      <h4 className="text-title-md font-bold text-on-surface">
                        {rescheduleResult.totalRescheduled} Tasks Slotted into Daily Capacity Windows
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyRescheduledTasks}
                      disabled={isCommitting}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm self-end sm:self-center"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isCommitting ? "sync" : "done_all"}
                      </span>
                      <span>{isCommitting ? "Applying..." : "Apply to Task Board"}</span>
                    </button>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {rescheduleResult.diagnosticSummary}
                  </p>

                  {Array.isArray(rescheduleResult.rescheduledTasks) && (
                    <div className="space-y-2.5">
                      {rescheduleResult.rescheduledTasks.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                            <span className="font-semibold text-primary">
                              &rarr; {item.recommendedDay} ({item.newDuration || "30m"})
                            </span>
                            <span className="text-outline">{item.newPriority}</span>
                          </div>
                          <h5 className="font-semibold text-sm text-on-surface">{item.newTitle}</h5>
                          <p className="text-xs text-outline leading-snug">{item.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE 3: GOAL REALIGNMENT */}
          {activeMode === "restructure_complex" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-5 rounded-2xl space-y-3.5 border border-outline-variant/15">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-label-md font-bold text-on-surface mb-1.5">
                      Goal to Adjust
                    </label>
                    <input
                      type="text"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="e.g. Marathon Training Schedule"
                      className="w-full h-11 px-4 bg-surface-container-lowest text-on-surface rounded-xl text-body-sm border border-outline-variant/20 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-label-md font-bold text-on-surface mb-1.5">
                      Reason for Realignment
                    </label>
                    <input
                      type="text"
                      value={restructureReason}
                      onChange={(e) => setRestructureReason(e.target.value)}
                      placeholder="e.g. Shifting from intense pace to steady sustainable daily focus"
                      className="w-full h-11 px-4 bg-surface-container-lowest text-on-surface rounded-xl text-body-sm border border-outline-variant/20 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-outline flex items-center gap-1.5 self-start sm:self-center">
                    <span className="material-symbols-outlined text-[15px] text-primary">info</span>
                    <span>Adapts existing trajectories without losing your completed milestones.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAi}
                    disabled={loading}
                    className="w-full sm:w-auto h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
                    <div>
                      <h4 className="text-title-md font-bold text-on-surface">
                        Goal Realignment Plan
                      </h4>
                    </div>

                    {restructureResult.newTasksToInject?.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCommitRestructureTasks}
                        disabled={isCommitting}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm self-end sm:self-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCommitting ? "sync" : "add_task"}
                        </span>
                        <span>
                          {isCommitting
                            ? "Injecting..."
                            : `Inject ${restructureResult.newTasksToInject.length} Steps`}
                        </span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {restructureResult.restructuringStrategy}
                  </p>

                  {Array.isArray(restructureResult.newTasksToInject) && (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-outline">
                        Action Steps
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {restructureResult.newTasksToInject.map((t, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-primary">{t.category || "Goal"}</span>
                              <span className="font-tabular-mono text-outline">{t.duration}</span>
                            </div>
                            <h6 className="font-semibold text-xs text-on-surface leading-snug">
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

          {/* MODE 4: RAG-BASED ROADMAP ENGINE */}
          {activeMode === "roadmap_plan" && (
            <div className="space-y-5">
              {/* INPUT PANEL */}
              <div className="bg-surface-container-low p-5 rounded-2xl space-y-4 border border-outline-variant/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
                  <div>
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      RAG Roadmap Engine (Rust + Live Sources)
                    </span>
                    <span className="text-body-md font-bold text-on-surface">
                      Curriculum-Grounded Daily Task Roadmaps
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-lowest rounded-xl border border-outline-variant/15 text-xs text-outline font-medium self-start sm:self-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Sources: roadmap.sh, The Odin Project, FreeCodeCamp</span>
                  </div>
                </div>

                {/* Goal Input & Suggestion Chips */}
                <div>
                  <label className="block text-label-md font-bold text-on-surface mb-1.5">
                    What skill, career, or technology roadmap do you want to conquer?
                  </label>
                  <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="e.g. Learn Rust, Frontend Developer, DevOps Engineer, Full Stack, Python, Kubernetes"
                    className="w-full h-11 px-4 bg-surface-container-lowest text-on-surface rounded-xl text-body-sm border border-outline-variant/20 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-[11px] text-outline font-medium mr-1">Popular roadmaps:</span>
                    {[
                      "Learn Rust",
                      "Frontend Developer",
                      "Backend Developer",
                      "DevOps Engineer",
                      "Full Stack",
                      "Python for AI",
                      "Docker & Kubernetes",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setGoalInput(suggestion)}
                        className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer border border-outline-variant/15"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizon Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
                    Roadmap Duration &amp; Daily Chunking
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { days: 30, label: "30 Days", desc: "Sprint (4 wks)" },
                      { days: 60, label: "60 Days", desc: "Immersion (8 wks)" },
                      { days: 90, label: "90 Days", desc: "Quarter Roadmap" },
                      { days: 180, label: "180 Days", desc: "Mastery (6 mos)" },
                    ].map((opt) => {
                      const isSelected = roadmapNDays === opt.days && !roadmapCustomDays;
                      return (
                        <button
                          key={opt.days}
                          type="button"
                          onClick={() => {
                            setRoadmapNDays(opt.days);
                            setRoadmapCustomDays("");
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer h-[68px] flex flex-col justify-between ${
                            isSelected
                              ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/20"
                              : "bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/50"
                          }`}
                        >
                          <span className="block text-xs font-bold leading-tight">{opt.label}</span>
                          <span className="text-[10px] text-outline">{opt.desc}</span>
                        </button>
                      );
                    })}

                    {/* Custom days input */}
                    <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col justify-between h-[68px]">
                      <span className="text-[10px] text-outline font-bold uppercase leading-none">Custom Days</span>
                      <input
                        type="number"
                        min="7"
                        max="365"
                        placeholder="7–365 days"
                        value={roadmapCustomDays}
                        onChange={(e) => setRoadmapCustomDays(e.target.value)}
                        className="w-full bg-surface-container px-2 py-1 rounded-lg text-xs text-on-surface outline-none border border-outline-variant/30 focus:border-primary font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Run Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant/10">
                  <div className="text-[11px] text-outline flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                    <span>Cached locally for 24h to support offline study.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunRoadmapPlan}
                    disabled={loading || !goalInput.trim()}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                      {loading ? "sync" : "travel_explore"}
                    </span>
                    <span>
                      {loading
                        ? roadmapStatus || "Scraping & Synthesizing Roadmap..."
                        : `Fetch Roadmap & Plan ${roadmapCustomDays || roadmapNDays} Days`}
                    </span>
                  </button>
                </div>
              </div>

              {/* ROADMAP RESULTS TIMELINE */}
              {roadmapResult && (
                <div className="space-y-4">
                  {/* Results Header Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-primary/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary flex items-center gap-1 border border-primary/20">
                          <span className="material-symbols-outlined text-[14px]">map</span>
                          <span>roadmap.sh/{roadmapResult.roadmap_id}</span>
                        </span>
                        <span className="text-xs text-outline font-medium">
                          • {roadmapResult.total_topics} Topics Extracted
                        </span>
                        {roadmapResult.is_cached && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/20">
                            Offline Cache
                          </span>
                        )}
                      </div>
                      <h4 className="text-title-sm sm:text-title-md font-bold text-on-surface truncate">
                        {roadmapResult.days.length}-Day Structured Trajectory for "{goalInput}"
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={selectAllRoadmapDays}
                        className="px-3 py-2 rounded-xl border border-outline-variant/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        {roadmapSelectedDays.size === roadmapResult.days.length ? "Deselect All" : "Select All"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCommitRoadmapTasks}
                        disabled={isCommitting || roadmapSelectedDays.size === 0}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCommitting ? "sync" : "playlist_add_check"}
                        </span>
                        <span>
                          {isCommitting
                            ? "Importing..."
                            : `Import ${roadmapSelectedDays.size} Tasks`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Week-by-Week Accordion */}
                  <div className="space-y-3">
                    {roadmapWeeks.map(({ weekNum, days, milestone }) => {
                      const isExpanded = roadmapExpandedWeeks.has(weekNum);
                      const selectedCount = days.filter((d) => roadmapSelectedDays.has(d.day)).length;

                      return (
                        <div
                          key={weekNum}
                          className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden transition-all shadow-xs"
                        >
                          {/* Week Header */}
                          <div
                            onClick={() => toggleRoadmapWeek(weekNum)}
                            className="p-3.5 sm:p-4 bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="material-symbols-outlined text-outline text-[18px] shrink-0">
                                {isExpanded ? "expand_more" : "chevron_right"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-bold text-on-surface truncate">
                                    Week {weekNum}: {cleanTopicTitle(days[0]?.title) || "Core Focus"}
                                  </h5>
                                  <span className="text-[11px] font-bold text-outline shrink-0">
                                    ({selectedCount}/{days.length} days selected)
                                  </span>
                                </div>
                                {milestone && (
                                  <p className="text-[11px] text-primary font-medium line-clamp-1 mt-0.5">
                                    🎯 {milestone}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="text-[11px] font-semibold text-outline shrink-0">
                              Days {days[0]?.day} - {days[days.length - 1]?.day}
                            </span>
                          </div>

                          {/* Week Days List */}
                          {isExpanded && (
                            <div className="p-3.5 space-y-3 divide-y divide-outline-variant/10">
                              {days.map((dayPlan) => {
                                const isSelected = roadmapSelectedDays.has(dayPlan.day);
                                return (
                                  <div
                                    key={dayPlan.day}
                                    className={`pt-3 first:pt-0 flex items-start gap-3 transition-opacity ${
                                      isSelected ? "opacity-100" : "opacity-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleRoadmapDaySelection(dayPlan.day)}
                                      className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer shrink-0"
                                    />

                                    <div className="flex-1 min-w-0 space-y-1.5">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h6 className="text-xs font-bold text-on-surface flex items-center gap-1.5 flex-wrap">
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                                            Day {dayPlan.day}
                                          </span>
                                          <span className="truncate">{cleanTopicTitle(dayPlan.title)}</span>
                                        </h6>
                                      </div>

                                      {/* Subtasks */}
                                      {Array.isArray(dayPlan.tasks) && dayPlan.tasks.length > 0 && (
                                        <ul className="space-y-1 pl-1">
                                          {dayPlan.tasks.map((taskText, tIdx) => (
                                            <li
                                              key={tIdx}
                                              className="text-[11px] text-on-surface-variant flex items-start gap-2 leading-relaxed"
                                            >
                                              <span className="text-primary mt-0.5 shrink-0">•</span>
                                              <span>{taskText}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}

                                      {/* Resources */}
                                      {Array.isArray(dayPlan.resources) && dayPlan.resources.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                          {dayPlan.resources.map((url, rIdx) => (
                                            <a
                                              key={rIdx}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline bg-primary/10 hover:bg-primary/15 px-2.5 py-0.5 rounded-lg border border-primary/15 transition-colors"
                                            >
                                              <span className="material-symbols-outlined text-[12px]">link</span>
                                              <span className="truncate max-w-[200px]">
                                                {formatResourceUrl(url)}
                                              </span>
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-surface-container flex items-center justify-between bg-surface-container-low text-xs text-outline shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">cloud_done</span>
            <span>All generated tasks sync in real-time to your Cloud Firestore workspace</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
