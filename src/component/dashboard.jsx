import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import image from "../assets/logo.png";
import { useApp } from "../context/AppContext";
import LabelCustomizerModal from "./LabelCustomizerModal";
import QuickCaptureModal from "./QuickCaptureModal";
import ZenFocusDeck from "./ZenFocusDeck";
import ShortcutsHelpModal from "./ShortcutsHelpModal";
import RolloverDiagnosticBanner from "./RolloverDiagnosticBanner";
import HabitManagerModal from "./HabitManagerModal";
import OverloadGuardMeter from "./OverloadGuardMeter";
import MorningPlanningModal from "./MorningPlanningModal";
import EveningShutdownModal from "./EveningShutdownModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

// Project colour palette — cycle through these for new/unknown categories
const PROJECT_PALETTE = [
  { bg: "bg-secondary", label: "Personal Rituals" },
  { bg: "bg-primary", label: "Work Sprint" },
  { bg: "bg-tertiary", label: "Deep Work" },
  { bg: "bg-secondary-fixed-dim", label: "Health & Habits" },
  { bg: "bg-error", label: "Research" },
  { bg: "bg-outline", label: "Admin" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  // Centralized Dynamic Context
  const {
    currentUser,
    userProfile,
    displayName,
    displayTitle,
    avatarUrl,
    saveUserProfile,
    logout,
    tasks,
    loadingTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    habits,
    loadingHabits,
    toggleHabit,
    createHabit,
    updateHabit,
    refillHabitShield,
    deleteHabit,
    autoBreakdownTask,
    habitsCount,
    activeTasksCount,
    highImpactCount,
    flowVelocityScore,
    todayCompletedTasksCount,
    taskLabels,
    getLabelStyle,
    timerSeconds,
    timerRunning,
    formattedTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerSeconds,
    toggleDailyHighlight,
    setDailyHighlightsAndLockPlan,
    dailyHighlightTasks,
  } = useApp();

  // Label Customizer Modal
  const [showLabelCustomizer, setShowLabelCustomizer] = useState(false);

  // Circadian & Timeline Schedule Customizer Modal
  const [showScheduleCustomizer, setShowScheduleCustomizer] = useState(false);
  const [customChronoChoice, setCustomChronoChoice] = useState("lark");
  const [customTargetBlocks, setCustomTargetBlocks] = useState(3);

  // Phase 1 Features: Quick Capture, Zen Deck, and Shortcuts
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showZenDeck, setShowZenDeck] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Phase 2 Features: Auto-Rescheduling Assistant & Habit Streaks Engine
  const [showHabitManagerModal, setShowHabitManagerModal] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);
  const [autoRescheduleActive, setAutoRescheduleActive] = useState(true);

  // Phase 3 Features: Morning Planning, Evening Shutdown & Recharge Mode
  const [showMorningPlanningModal, setShowMorningPlanningModal] = useState(false);
  const [morningPlanningStep, setMorningPlanningStep] = useState(1);
  const [showEveningShutdownModal, setShowEveningShutdownModal] = useState(false);
  const [isRechargeMode, setIsRechargeMode] = useState(false);

  // Helper to open Morning Planning directly at a specific step (e.g. Step 4 to re-designate highlight)
  const handleOpenMorningPlanning = (step = 1) => {
    setMorningPlanningStep(step);
    setShowMorningPlanningModal(true);
  };

  // Filter state: 'all' | 'high-impact' | 'quick-wins' | 'habits' | custom project key
  const [activeFilter, setActiveFilter] = useState("all");

  // Soundscape state
  const [activeSound, setActiveSound] = useState("rain");

  // Habits input state
  const [showNewHabitInput, setShowNewHabitInput] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitDuration, setNewHabitDuration] = useState("15m");

  // New task modal state
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Work Sprint");
  const [newTaskPriority, setNewTaskPriority] = useState("P1 Urgent & High Impact");
  const [newTaskDuration, setNewTaskDuration] = useState("30 min");

  // Edit task modal state
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskCategory, setEditTaskCategory] = useState("Work Sprint");
  const [editTaskPriority, setEditTaskPriority] = useState("P1 Urgent & High Impact");
  const [editTaskDuration, setEditTaskDuration] = useState("30 min");

  // Delete confirmation modal state
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  // New project modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Profile dropdown menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Real-time system clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Search bar & keyword suggestions state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Global ⌘K or Ctrl+K shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Dismiss search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth gatekeeper
  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  // Target task for power-user keyboard shortcuts (X, 1, 2, 3)
  const targetTask =
    tasks.find((t) => t.id === selectedTaskId) ||
    tasks.find((t) => !t.completed) ||
    tasks[0];

  useKeyboardShortcuts({
    onQuickCapture: () => setShowQuickCapture(true),
    onToggleZen: () => setShowZenDeck((prev) => !prev),
    onToggleTimer: () => {
      if (timerRunning) pauseTimer();
      else startTimer();
    },
    onToggleActiveTask: () => {
      if (targetTask) {
        toggleTaskCompletion(targetTask.id);
        setToastMessage(`Toggled: "${targetTask.title}"`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    },
    onSetPriority: (newPriority) => {
      if (targetTask) {
        updateTask(targetTask.id, { priority: newPriority });
        setToastMessage(`Priority set to ${newPriority}`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    },
    onShowShortcuts: () => setShowShortcutsHelp(true),
    disabled:
      showQuickCapture ||
      showZenDeck ||
      showShortcutsHelp ||
      showHabitManagerModal ||
      showMorningPlanningModal ||
      showEveningShutdownModal ||
      showNewTaskModal ||
      showLabelCustomizer ||
      showScheduleCustomizer ||
      Boolean(editingTask) ||
      Boolean(taskToDelete) ||
      showNewProjectModal,
  });

  // Task Actions
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const chosenPriority = newTaskPriority || "P1 Urgent & High Impact";
    const chosenCategory = newTaskCategory || "Work Sprint";

    await createTask({
      title: newTaskTitle.trim(),
      description: "Added to priority workspace queue.",
      category: chosenCategory,
      priority: chosenPriority,
      duration: newTaskDuration,
      effort: chosenPriority?.includes("P1") || chosenPriority?.includes("Urgent") || chosenCategory === "Deep Work"
        ? "⚡⚡⚡ Deep Focus"
        : "⚡ Light Effort",
      tags: [`#${chosenCategory.replace(/\s+/g, "")}`],
      subtasks: "0/1",
      completed: false,
      status: "ready",
    });

    setNewTaskTitle("");
    setShowNewTaskModal(false);
    setToastMessage("Task created successfully");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartEdit = (task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title || "");
    setEditTaskDescription(task.description || "");
    setEditTaskCategory(task.category || "Work Sprint");
    setEditTaskPriority(task.priority || "P1 Urgent & High Impact");
    setEditTaskDuration(task.duration || "30 min");
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;

    const chosenPriority = editTaskPriority || "P1 Urgent & High Impact";
    const chosenCategory = editTaskCategory || "Work Sprint";

    const updatedFields = {
      title: editTaskTitle.trim(),
      description: editTaskDescription.trim(),
      category: chosenCategory,
      priority: chosenPriority,
      duration: editTaskDuration.trim() || "30 min",
      effort: chosenPriority?.includes("P1") || chosenPriority?.includes("Urgent") || chosenCategory === "Deep Work"
        ? "⚡⚡⚡ Deep Focus"
        : "⚡ Light Effort",
    };

    await updateTask(editingTask.id, updatedFields);
    setEditingTask(null);
    setToastMessage("Task updated successfully");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    await deleteTask(taskToDelete.id);
    setTaskToDelete(null);
    setToastMessage("Task deleted successfully");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const categoryKey = newProjectName.trim().toLowerCase().replace(/\s+/g, "-");

    await createTask({
      title: `First task in ${newProjectName.trim()}`,
      description: `Auto-created when you added the "${newProjectName.trim()}" project.`,
      category: categoryKey,
      priority: "P2 Strategic",
      duration: "30 min",
      effort: "⚡ Light Effort",
      tags: [`#${newProjectName.trim().replace(/\s+/g, "")}`],
      subtasks: "0/1",
      completed: false,
      status: "ready",
    });

    setActiveFilter(categoryKey);
    setNewProjectName("");
    setShowNewProjectModal(false);
    setToastMessage(`Project "${newProjectName.trim()}" created`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Habit Actions
  const handleCreateHabit = async (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    await createHabit({
      title: newHabitTitle.trim(),
      duration: newHabitDuration.trim() || "15m",
    });

    setNewHabitTitle("");
    setShowNewHabitInput(false);
  };

  const handleDeleteHabit = async (habitId) => {
    await deleteHabit(habitId);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Clock & Circadian Math
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const nowDecimal = currentHour + currentMinutes / 60;

  // Extract all unique tags across tasks
  const allAvailableTags = Array.from(
    new Set(
      tasks
        .flatMap((t) => t.tags || [])
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    )
  );

  const displayTags =
    allAvailableTags.length > 0
      ? allAvailableTags
      : ["#WorkSprint", "#DeepWork", "#Task", "#Urgent", "#Strategic", "#Research"];

  // Search keyword suggestions derived from available data
  const trimmedQuery = searchQuery.trim().toLowerCase();

  // 1. Tag Suggestions
  const matchingTags = displayTags
    .filter((tag) =>
      trimmedQuery
        ? tag.toLowerCase().includes(trimmedQuery) ||
          tag.replace("#", "").toLowerCase().includes(trimmedQuery)
        : true
    )
    .slice(0, 5);

  // 2. Task Suggestions
  const matchingTasks = trimmedQuery
    ? tasks
        .filter(
          (t) =>
            t.title?.toLowerCase().includes(trimmedQuery) ||
            t.description?.toLowerCase().includes(trimmedQuery) ||
            (Array.isArray(t.tags) &&
              t.tags.some((tag) => tag.toLowerCase().includes(trimmedQuery))) ||
            t.category?.toLowerCase().includes(trimmedQuery) ||
            t.priority?.toLowerCase().includes(trimmedQuery)
        )
        .slice(0, 5)
    : tasks.slice(0, 3);

  // 3. Category / Project Suggestions
  const systemCategories = [
    { key: "high-impact", label: "Work Sprint", desc: "Urgent & High Impact Focus", color: "bg-primary" },
    { key: "quick-wins", label: "Deep Work", desc: "Strategic & Focused Tasks", color: "bg-tertiary" },
    { key: "habits", label: "Personal Rituals", desc: "Daily Habits & Routines", color: "bg-secondary" },
  ];
  const matchingCategories = systemCategories.filter((c) =>
    trimmedQuery
      ? c.label.toLowerCase().includes(trimmedQuery) ||
        c.desc.toLowerCase().includes(trimmedQuery)
      : true
  );

  // 4. Habit Suggestions
  const matchingHabits = habits
    .filter((h) =>
      trimmedQuery ? h.title?.toLowerCase().includes(trimmedQuery) : false
    )
    .slice(0, 3);

  // 5. Quick Actions / Navigation items
  const quickNavActions = [
    {
      id: "nav-board",
      title: "Task Board (Kanban)",
      subtitle: "Jump to 5-stage workflow board",
      icon: "view_kanban",
      action: () => navigate("/board"),
    },
    {
      id: "nav-analytics",
      title: "Analytics & Velocity",
      subtitle: "View circadian rhythms & focus trends",
      icon: "monitoring",
      action: () => navigate("/analytics"),
    },
    {
      id: "nav-profile",
      title: "Profile & Preferences",
      subtitle: "Manage chronotype & workstation settings",
      icon: "tune",
      action: () => navigate("/profile"),
    },
    {
      id: "act-new-task",
      title: "Create New Priority Task",
      subtitle: "Open quick task creation modal",
      icon: "add_task",
      action: () => setShowNewTaskModal(true),
    },
  ]
    .filter((a) =>
      trimmedQuery
        ? a.title.toLowerCase().includes(trimmedQuery) ||
          a.subtitle.toLowerCase().includes(trimmedQuery)
        : true
    )
    .slice(0, trimmedQuery ? 3 : 2);

  // Flatten suggestions for keyboard navigation (ArrowUp, ArrowDown, Enter)
  const flattenedSuggestions = [
    ...matchingTags.map((tag) => ({
      id: `tag-${tag}`,
      type: "tag",
      title: tag,
      subtitle: "Filter tasks by keyword tag",
      icon: "tag",
      action: () => {
        setSearchQuery(tag);
        setIsSearchOpen(false);
      },
    })),
    ...matchingTasks.map((t) => ({
      id: `task-${t.id}`,
      type: "task",
      title: t.title,
      subtitle: `${t.priority || "Task"}${t.duration ? ` • ${t.duration}` : ""}`,
      icon: t.completed ? "task_alt" : "radio_button_unchecked",
      action: () => {
        setSearchQuery(t.title);
        setIsSearchOpen(false);
        setTimeout(() => {
          const el = document.getElementById(`task-card-${t.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-primary");
            setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
          }
        }, 120);
      },
    })),
    ...matchingCategories.map((c) => ({
      id: `cat-${c.key}`,
      type: "category",
      title: c.label,
      subtitle: c.desc,
      icon: "folder_open",
      action: () => {
        setActiveFilter(c.key);
        setSearchQuery("");
        setIsSearchOpen(false);
      },
    })),
    ...matchingHabits.map((h) => ({
      id: `habit-${h.id}`,
      type: "habit",
      title: h.title,
      subtitle: `Daily Habit • ${h.duration || "15m"}`,
      icon: "spa",
      action: () => {
        setIsSearchOpen(false);
        const el = document.getElementById("habits-widget");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
    })),
    ...quickNavActions.map((a) => ({
      id: a.id,
      type: "action",
      title: a.title,
      subtitle: a.subtitle,
      icon: a.icon,
      action: () => {
        setIsSearchOpen(false);
        a.action();
      },
    })),
  ];

  const handleSelectSuggestion = (item) => {
    if (item && item.action) {
      item.action();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flattenedSuggestions.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev < flattenedSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flattenedSuggestions.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : flattenedSuggestions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        flattenedSuggestions.length > 0 &&
        selectedSuggestionIndex >= 0 &&
        selectedSuggestionIndex < flattenedSuggestions.length
      ) {
        handleSelectSuggestion(flattenedSuggestions[selectedSuggestionIndex]);
      } else {
        setIsSearchOpen(false);
      }
    }
  };

  // Filter tasks to show ONLY pending today's and backlog tasks (remove completed and other tasks)
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Exclude completed tasks
      if (t.completed || t.status === "completed") return false;

      // Must be today's task or backlog task
      const isBacklog = t.status === "backlog" || t.date === "Backlog";
      const isToday = !isBacklog;
      return isToday || isBacklog;
    });
  }, [tasks]);

  const pendingTodayTasks = useMemo(() => {
    return pendingTasks.filter((t) => t.status !== "backlog" && t.date !== "Backlog");
  }, [pendingTasks]);

  const pendingBacklogTasks = useMemo(() => {
    return pendingTasks.filter((t) => t.status === "backlog" || t.date === "Backlog");
  }, [pendingTasks]);

  // Filter tasks dynamically by category/scope AND keyword search query
  const filteredTasks = useMemo(() => {
    return pendingTasks.filter((t) => {
      let matchesFilter = true;
      if (activeFilter === "today") {
        matchesFilter = t.status !== "backlog" && t.date !== "Backlog";
      } else if (activeFilter === "backlog") {
        matchesFilter = t.status === "backlog" || t.date === "Backlog";
      } else if (activeFilter === "high-impact") {
        matchesFilter = t.priority?.includes("P1") || t.priority?.includes("High") || t.effort?.includes("High");
      } else if (activeFilter === "quick-wins") {
        matchesFilter = t.duration?.includes("15") || t.duration?.includes("5") || t.effort?.includes("Low");
      } else if (activeFilter === "habits") {
        matchesFilter = t.category === "Health & Habits" || t.category === "Personal" || t.category === "Personal Commitments";
      } else if (activeFilter !== "all") {
        matchesFilter = t.category === activeFilter;
      }

      if (!matchesFilter) return false;
      if (!trimmedQuery) return true;

      return (
        t.title?.toLowerCase().includes(trimmedQuery) ||
        t.description?.toLowerCase().includes(trimmedQuery) ||
        (Array.isArray(t.tags) &&
          t.tags.some((tag) => tag.toLowerCase().includes(trimmedQuery))) ||
        t.category?.toLowerCase().includes(trimmedQuery) ||
        t.priority?.toLowerCase().includes(trimmedQuery) ||
        t.effort?.toLowerCase().includes(trimmedQuery)
      );
    });
  }, [pendingTasks, activeFilter, trimmedQuery]);

  const completedCount = tasks.filter((t) => t.completed).length;

  // Chronotype schedule mapping — reactive to userProfile preference
  const chronotype = (userProfile?.chronotype || "lark").toLowerCase();

  const CHRONO_CONFIG = {
    lark: {
      id: "lark",
      name: "Morning Lark",
      icon: "wb_sunny",
      peakStart: 8.5,
      peakEnd: 12.5,
      windowLabel: "8:30 AM – 12:30 PM",
      timelineStart: 7.5, // 07:30 AM
      timelineEnd: 17.5,  // 05:30 PM
      ticks: ["07:30 AM", "08:30 AM", "12:30 PM", "03:30 PM", "05:30 PM"],
      energyProfile: { peak: "High ⚡", offPeak: "Steady ⚡" },
      blocks: [
        {
          id: "prep",
          title: "Morning Warms",
          subtitle: "Habits & Planning",
          start: 7.5,
          end: 8.5,
          timeLabel: "07:30 – 08:30",
          width: "w-[15%]",
        },
        {
          id: "deep-work",
          defaultTitle: "Deep Work Sprint - 01",
          subtitle: "Deep Focus (Peak ⚡)",
          start: 8.5,
          end: 12.5,
          timeLabel: "08:30 – 12:30",
          width: "w-[38%]",
          isDeep: true,
        },
        {
          id: "lunch",
          title: "Lunch & Recharge",
          subtitle: "Recovery Window",
          start: 12.5,
          end: 13.5,
          timeLabel: "12:30 – 01:30",
          width: "w-[15%]",
        },
        {
          id: "collab",
          defaultTitle: "Deep Work Sprint - 02",
          subtitle: "Strategic Alignment",
          start: 13.5,
          end: 15.5,
          timeLabel: "01:30 – 03:30",
          width: "w-[16%]",
          isCollab: true,
        },
        {
          id: "wrap",
          title: "Daily Wrap-up",
          subtitle: "Triage & Reflection",
          start: 15.5,
          end: 17.5,
          timeLabel: "03:30 – 05:30",
          width: "w-[16%]",
        },
      ],
    },
    falcon: {
      id: "falcon",
      name: "Steady Falcon",
      icon: "flare",
      peakStart: 11.0,
      peakEnd: 15.5,
      windowLabel: "11:00 AM – 3:30 PM",
      timelineStart: 10.0, // 10:00 AM
      timelineEnd: 20.0,  // 08:00 PM
      ticks: ["10:00 AM", "11:00 AM", "03:30 PM", "06:30 PM", "08:00 PM"],
      energyProfile: { peak: "High ⚡", offPeak: "Steady ⚡" },
      blocks: [
        {
          id: "prep",
          title: "Midday Setup",
          subtitle: "Habits & Planning",
          start: 10.0,
          end: 11.0,
          timeLabel: "10:00 – 11:00",
          width: "w-[15%]",
        },
        {
          id: "deep-work",
          defaultTitle: "Deep Focus Cadence",
          subtitle: "Peak Flow (High ⚡)",
          start: 11.0,
          end: 15.5,
          timeLabel: "11:00 – 03:30",
          width: "w-[38%]",
          isDeep: true,
        },
        {
          id: "lunch",
          title: "Recharge & Meal",
          subtitle: "Cognitive Pause",
          start: 15.5,
          end: 16.5,
          timeLabel: "03:30 – 04:30",
          width: "w-[15%]",
        },
        {
          id: "collab",
          defaultTitle: "Strategic Async",
          subtitle: "Team & Comms",
          start: 16.5,
          end: 18.5,
          timeLabel: "04:30 – 06:30",
          width: "w-[16%]",
          isCollab: true,
        },
        {
          id: "wrap",
          title: "Evening Triage",
          subtitle: "Reflection & Close",
          start: 18.5,
          end: 20.0,
          timeLabel: "06:30 – 08:00",
          width: "w-[16%]",
        },
      ],
    },
    owl: {
      id: "owl",
      name: "Night Owl",
      icon: "nightlight",
      peakStart: 17.0,
      peakEnd: 22.0,
      windowLabel: "5:00 PM – 10:00 PM",
      timelineStart: 15.0, // 03:00 PM
      timelineEnd: 24.0,  // 12:00 AM
      ticks: ["03:00 PM", "05:00 PM", "10:00 PM", "11:00 PM", "12:00 AM"],
      energyProfile: { peak: "Surge ⚡", offPeak: "Calm 🌙" },
      blocks: [
        {
          id: "prep",
          title: "Afternoon Warmup",
          subtitle: "Planning & Priming",
          start: 15.0,
          end: 17.0,
          timeLabel: "03:00 – 05:00",
          width: "w-[15%]",
        },
        {
          id: "deep-work",
          defaultTitle: "Night Flow Sprint",
          subtitle: "Golden Window (Surge ⚡)",
          start: 17.0,
          end: 22.0,
          timeLabel: "05:00 – 10:00",
          width: "w-[45%]",
          isDeep: true,
        },
        {
          id: "lunch",
          title: "Late Dinner & Break",
          subtitle: "Mind Refresh",
          start: 22.0,
          end: 22.75,
          timeLabel: "10:00 – 10:45",
          width: "w-[12%]",
        },
        {
          id: "collab",
          defaultTitle: "Deep Work Sprint - 02",
          subtitle: "Creative Deep Focus",
          start: 22.75,
          end: 23.5,
          timeLabel: "10:45 – 11:30",
          width: "w-[14%]",
          isCollab: true,
        },
        {
          id: "wrap",
          title: "Night Wrap-up",
          subtitle: "Log & Wind-down",
          start: 23.5,
          end: 24.0,
          timeLabel: "11:30 – 12:00",
          width: "w-[14%]",
        },
      ],
    },
  };

  const activeChrono = CHRONO_CONFIG[chronotype] || CHRONO_CONFIG.lark;

  // Auto-Rescheduling Assistant Logic:
  // If a focus block runs overtime, the timeline dynamically pushes downstream blocks
  // instead of showing overlapping or broken schedules.
  const baseDeepBlock = activeChrono.blocks.find((b) => b.isDeep) || activeChrono.blocks[0];
  const detectedOvertime =
    timerRunning && nowDecimal > baseDeepBlock.end
      ? Math.min(120, Math.max(0, Math.round((nowDecimal - baseDeepBlock.end) * 60)))
      : 0;

  const effectiveOvertimeMinutes =
    overtimeMinutes > 0
      ? overtimeMinutes
      : autoRescheduleActive && detectedOvertime >= 5
      ? detectedOvertime
      : 0;
  const overtimeHours = effectiveOvertimeMinutes / 60;

  const formatDecimalHour = (dec) => {
    const rawH = Math.floor(dec) % 24;
    const m = Math.round((dec - Math.floor(dec)) * 60);
    const period = rawH >= 12 ? "PM" : "AM";
    const displayH = rawH % 12 === 0 ? 12 : rawH % 12;
    return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
  };

  // Daily Rhythm Timeline Blocks dynamically constructed with Downstream Overtime Ripple
  const TIMELINE_BLOCKS = activeChrono.blocks.map((block, idx) => {
    let title = block.title;
    if (block.isDeep) {
      title =
        tasks.find(
          (t) =>
            !t.completed &&
            (t.category === "high-impact" ||
              t.effort?.includes("Deep") ||
              t.priority?.includes("P1") ||
              t.priority?.includes("Urgent"))
        )?.title ||
        tasks.find((t) => !t.completed)?.title ||
        block.defaultTitle;
    } else if (block.isCollab) {
      title =
        tasks.find(
          (t) =>
            !t.completed &&
            (t.category === "quick-wins" ||
              t.priority?.includes("P2") ||
              t.priority?.includes("Strategic"))
        )?.title || block.defaultTitle;
    }

    // Dynamic Downstream Ripple:
    // If overtime is active, block 0 (focus block) expands by overtimeHours,
    // and every subsequent block (idx > 0) is pushed downstream so schedules never collide!
    let blockStart = block.start;
    let blockEnd = block.end;

    if (effectiveOvertimeMinutes > 0) {
      if (idx === 0) {
        blockEnd = block.end + overtimeHours;
      } else {
        blockStart = block.start + overtimeHours;
        blockEnd = block.end + overtimeHours;
      }
    }

    const dynamicTimeLabel =
      effectiveOvertimeMinutes > 0
        ? `${formatDecimalHour(blockStart)} – ${formatDecimalHour(blockEnd)}`
        : block.timeLabel;

    return {
      ...block,
      title,
      start: blockStart,
      end: blockEnd,
      timeLabel: dynamicTimeLabel,
    };
  });

  const activeTimelineBlock = TIMELINE_BLOCKS.find(
    (b) => nowDecimal >= b.start && nowDecimal < b.end
  );

  const effectiveTimelineEnd = activeChrono.timelineEnd + overtimeHours;

  const timelineProgressPercent =
    nowDecimal < activeChrono.timelineStart
      ? 0
      : nowDecimal > effectiveTimelineEnd
      ? 100
      : ((nowDecimal - activeChrono.timelineStart) /
          (effectiveTimelineEnd - activeChrono.timelineStart)) *
        100;

  const handleUpdateChronotype = async (newChrono) => {
    if (!newChrono) return;
    try {
      if (saveUserProfile) {
        await saveUserProfile({ chronotype: newChrono });
        const name = newChrono === "lark" ? "Morning Lark" : newChrono === "falcon" ? "Steady Falcon" : "Night Owl";
        setToastMessage(`Circadian cadence updated to ${name}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.warn("Could not save chronotype:", err);
    }
  };

  const handleOpenScheduleCustomizer = () => {
    setCustomChronoChoice(chronotype);
    setCustomTargetBlocks(userProfile?.dailyTargetBlocks || 3);
    setShowScheduleCustomizer(true);
  };

  const handleSaveScheduleCustomizer = async (e) => {
    e.preventDefault();
    if (!saveUserProfile) return;
    try {
      await saveUserProfile({
        chronotype: customChronoChoice,
        dailyTargetBlocks: Number(customTargetBlocks) || 3,
      });
      setShowScheduleCustomizer(false);
      setToastMessage("Circadian schedule & target blocks updated!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.warn("Could not save schedule:", err);
    }
  };

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const firstName = displayName.split(" ")[0];
  const isFlowPeakActive =
    nowDecimal >= activeChrono.peakStart && nowDecimal <= activeChrono.peakEnd;

  const dailyEnergy =
    userProfile?.energyLevel ||
    (isFlowPeakActive
      ? activeChrono.energyProfile.peak
      : nowDecimal < activeChrono.peakStart
        ? "Priming ⚡"
        : activeChrono.energyProfile.offPeak);

  const focusStreak =
    userProfile?.focusStreak ??
    userProfile?.streak ??
    (completedCount > 0 ? 1 : 0);

  const targetBlocks = userProfile?.dailyTargetBlocks || 3;
  const completedBlocks =
    typeof userProfile?.completedBlocks === "number"
      ? userProfile.completedBlocks
      : 0;
  const blocksPercent = Math.min(
    100,
    Math.round((completedBlocks / targetBlocks) * 100)
  );

  const completionRate =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen">
      {/* SIDEBAR NAVIGATION */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="h-16 px-space-lg flex items-center gap-space-sm">
            <img
              alt="Successor Logo"
              className="h-8 w-auto object-contain"
              src={image}
            />
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
              Successor
            </span>
          </div>
         
          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-space-sm space-y-space-md">
            <nav className="space-y-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-primary-container text-on-primary-container font-label-md font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">wb_sunny</span>
                <span className="font-body-md text-body-md">Today's Focus</span>
              </Link>
              <Link
                to="/board"
                className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">view_kanban</span>
                <span className="font-body-md text-body-md">Task Board</span>
              </Link>
              <Link
                to="/analytics"
                className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">monitoring</span>
                <span className="font-body-md text-body-md">Analytics &amp; Velocity</span>
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <span className="font-body-md text-body-md">Profile &amp; Preferences</span>
              </Link>
            </nav>

            {/* Projects & Lists — Live from AppContext */}
            <div className="pt-space-xs">
              <div className="flex items-center justify-between px-space-md pb-space-xs">
                <span className="py-2 ml-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Projects &amp; Lists
                </span>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="p-2 m-2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                  title="Add new project"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveFilter(activeFilter === "habits" ? "all" : "habits")}
                  className={`w-full flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer text-left ${
                    activeFilter === "habits" ? "bg-surface-container text-on-surface" : ""
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Personal Commitments</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest group-hover:text-on-surface">
                    {habitsCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter(activeFilter === "high-impact" ? "all" : "high-impact")}
                  className={`w-full flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer text-left ${
                    activeFilter === "high-impact" ? "bg-surface-container text-on-surface" : ""
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Work Sprint</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest group-hover:text-on-surface">
                    {activeTasksCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter(activeFilter === "quick-wins" ? "all" : "quick-wins")}
                  className={`w-full flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer text-left ${
                    activeFilter === "quick-wins" ? "bg-surface-container text-on-surface" : ""
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-tertiary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Deep Work</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest group-hover:text-on-surface">
                    {highImpactCount}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Velocity Meter */}
        <div className="p-space-sm bg-surface-container-low border-t border-surface-container/60">
          <div className="flex items-center gap-space-sm p-space-xs rounded-xl bg-surface-container-high/60">
            <div className="p-2 rounded-lg bg-surface-container text-primary">
              <span className="material-symbols-outlined text-[18px]">offline_bolt</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label-sm text-label-sm text-on-surface truncate">Flow Velocity</p>
              <p className="font-tabular-mono text-label-sm text-secondary font-semibold">{flowVelocityScore}% Score</p>
            </div>
          </div>
        </div>
      </aside>

      {/* TOP HEADER */}
      <div className="pl-64">
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg">
          {/* Search bar with Keyword Suggestions */}
          <div ref={searchContainerRef} className="relative flex items-center gap-space-md flex-1 max-w-lg">
            <div className="relative w-full flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
                search
              </span>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                  setSelectedSuggestionIndex(0);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 pr-14 py-2 bg-surface-container-high/60 hover:bg-surface-container-high focus:bg-surface-container-lowest text-on-surface placeholder:text-outline rounded-lg outline-none font-body-sm text-body-sm transition-all focus:ring-2 focus:ring-primary/20"
                placeholder="Search tasks, tags, or jump to..."
                type="text"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-8 p-1 text-outline hover:text-on-surface transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              ) : null}
              <kbd
                onClick={() => {
                  searchInputRef.current?.focus();
                  setIsSearchOpen(true);
                }}
                className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-tabular-mono text-label-sm select-none cursor-pointer hover:bg-surface-container-high"
                title="Press ⌘K or Ctrl+K to search"
              >
                ⌘K
              </kbd>
            </div>

            {/* Keyword Suggestions Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="max-h-[420px] overflow-y-auto divide-y divide-outline-variant/10">
                  {/* Keyword Tags */}
                  {matchingTags.length > 0 && (
                    <div className="p-3 bg-surface-container/30">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">tag</span>
                          Keyword Tags
                        </span>
                        <span className="text-[11px] text-outline font-tabular-mono">Click to filter</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matchingTags.map((tag) => {
                          const item = flattenedSuggestions.find((s) => s.id === `tag-${tag}`);
                          const itemIdx = flattenedSuggestions.findIndex((s) => s.id === `tag-${tag}`);
                          const isSelected = itemIdx === selectedSuggestionIndex;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(item);
                              }}
                              className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm transition-all cursor-pointer flex items-center gap-1 ${
                                searchQuery === tag || isSelected
                                  ? "bg-primary text-on-primary shadow-xs"
                                  : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              <span className="font-medium">{tag}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matching Tasks */}
                  {matchingTasks.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">task_alt</span>
                        {trimmedQuery ? "Matching Tasks" : "Recent Tasks"}
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {matchingTasks.map((task) => {
                          const item = flattenedSuggestions.find((s) => s.id === `task-${task.id}`);
                          const itemIdx = flattenedSuggestions.findIndex((s) => s.id === `task-${task.id}`);
                          const isSelected = itemIdx === selectedSuggestionIndex;
                          return (
                            <button
                              key={task.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(item);
                              }}
                              onMouseEnter={() => setSelectedSuggestionIndex(itemIdx)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer group ${
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-container text-on-surface"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span
                                  className={`material-symbols-outlined text-[18px] flex-shrink-0 ${
                                    task.completed ? "text-secondary" : isSelected ? "text-primary" : "text-outline"
                                  }`}
                                >
                                  {task.completed ? "task_alt" : "check_box_outline_blank"}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`font-body-sm text-body-sm truncate font-medium ${
                                      task.completed ? "line-through opacity-70" : ""
                                    }`}
                                  >
                                    {task.title}
                                  </p>
                                  <p className="font-label-sm text-label-sm text-outline truncate">
                                    {task.priority || "Task"} {task.duration ? `• ${task.duration}` : ""}
                                  </p>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2">
                                arrow_forward
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Projects & Focus Streams */}
                  {matchingCategories.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">folder</span>
                        Projects &amp; Focus Streams
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {matchingCategories.map((c) => {
                          const item = flattenedSuggestions.find((s) => s.id === `cat-${c.key}`);
                          const itemIdx = flattenedSuggestions.findIndex((s) => s.id === `cat-${c.key}`);
                          const isSelected = itemIdx === selectedSuggestionIndex;
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(item);
                              }}
                              onMouseEnter={() => setSelectedSuggestionIndex(itemIdx)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer group ${
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-container text-on-surface"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full ${c.color} flex-shrink-0`} />
                                <div className="min-w-0">
                                  <p className="font-body-sm text-body-sm font-medium truncate">{c.label}</p>
                                  <p className="font-label-sm text-label-sm text-outline truncate">{c.desc}</p>
                                </div>
                              </div>
                              <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container font-medium text-outline">
                                Filter View
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matching Habits */}
                  {matchingHabits.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">spa</span>
                        Habits
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {matchingHabits.map((h) => {
                          const item = flattenedSuggestions.find((s) => s.id === `habit-${h.id}`);
                          const itemIdx = flattenedSuggestions.findIndex((s) => s.id === `habit-${h.id}`);
                          const isSelected = itemIdx === selectedSuggestionIndex;
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(item);
                              }}
                              onMouseEnter={() => setSelectedSuggestionIndex(itemIdx)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer group ${
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-container text-on-surface"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="material-symbols-outlined text-[18px] text-secondary">spa</span>
                                <span className="font-body-sm text-body-sm font-medium truncate">{h.title}</span>
                              </div>
                              <span className="font-label-sm text-label-sm text-outline">{h.duration || "15m"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions / Navigation */}
                  {quickNavActions.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">near_me</span>
                        Jump To / Actions
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {quickNavActions.map((act) => {
                          const item = flattenedSuggestions.find((s) => s.id === act.id);
                          const itemIdx = flattenedSuggestions.findIndex((s) => s.id === act.id);
                          const isSelected = itemIdx === selectedSuggestionIndex;
                          return (
                            <button
                              key={act.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(item);
                              }}
                              onMouseEnter={() => setSelectedSuggestionIndex(itemIdx)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer group ${
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-container text-on-surface"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="material-symbols-outlined text-[18px] text-tertiary">{act.icon}</span>
                                <div className="min-w-0">
                                  <p className="font-body-sm text-body-sm font-medium truncate">{act.title}</p>
                                  <p className="font-label-sm text-label-sm text-outline truncate">{act.subtitle}</p>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-transform">
                                arrow_forward
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {flattenedSuggestions.length === 0 && (
                    <div className="p-6 text-center text-outline">
                      <span className="material-symbols-outlined text-2xl text-outline mb-1">search_off</span>
                      <p className="font-body-sm text-body-sm text-on-surface font-medium">
                        No results found for &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="font-label-sm text-label-sm text-outline mt-0.5">
                        Try searching for keywords like tasks, tags (#WorkSprint), or projects.
                      </p>
                    </div>
                  )}
                </div>

                {/* Keyboard hint footer */}
                <div className="px-3 py-2 bg-surface-container-high/60 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-outline font-label-sm">
                  <div className="flex items-center gap-3">
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-tabular-mono">
                        ↑↓
                      </kbd>{" "}
                      navigate
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-tabular-mono">
                        ↵
                      </kbd>{" "}
                      select
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-tabular-mono">
                        esc
                      </kbd>{" "}
                      close
                    </span>
                  </div>
                  <span className="hidden sm:inline">Search across tasks, tags &amp; projects</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Header Widget */}
          <div className="flex items-center gap-space-md">
           
            {/* Global Synchronized Focus Session Widget */}
            <div className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
              <span className="material-symbols-outlined text-tertiary text-[18px]">timer</span>
              <span className="font-tabular-mono text-body-sm font-semibold">
                {formattedTimer}
              </span>
              <span className="font-label-sm text-label-sm text-outline hidden sm:inline">Focus Session</span>
              <button
                onClick={() => (timerRunning ? pauseTimer() : startTimer())}
                className={`ml-1 w-5 h-5 flex items-center justify-center rounded-full text-on-primary transition-colors cursor-pointer ${
                  timerRunning ? "bg-secondary" : "bg-primary"
                }`}
                type="button"
                title={timerRunning ? "Pause Timer (Space)" : "Start Timer (Space)"}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {timerRunning ? "pause" : "play_arrow"}
                </span>
              </button>
            </div>

            {/* Keyboard Shortcuts Helper icon */}
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Keyboard Shortcuts (?)"
            >
              <span className="material-symbols-outlined text-[19px]">keyboard</span>
            </button>

            {/* Notification bell */}
            {/* <div className="relative">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </button>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
            </div> */}

            {/* Profile Dropdown */}
            <div className="relative">
              <div
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-space-sm pl-space-xs cursor-pointer select-none"
              >
                <div className="relative flex-shrink-0">
                  <img
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
                    src={avatarUrl}
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary-fixed ring-2 ring-surface" />
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">
                    {displayName}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-label-sm text-label-sm text-outline leading-tight">
                      {displayTitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Menu Popover */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-container-lowest shadow-xl border border-outline-variant/30 py-2 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant/20">
                    <p className="text-body-sm font-semibold truncate text-on-surface">
                      {displayName}
                    </p>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {currentUser?.email || "user@flow.design"}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-4 py-2 text-on-surface text-body-sm hover:bg-surface-container flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    <span>Preferences</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-error text-body-sm hover:bg-error-container/20 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN DASHBOARD CONTENT */}
        <main className="w-full pt-16 bg-surface px-space-lg py-space-lg">
          <div className="flex flex-col w-full gap-y-space-lg">

            {/* HERO & GREETING BANNER */}
            <section className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-sm">
              <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary-fixed-dim/40 blur-3xl" />
              <div className="pointer-events-none absolute right-48 -bottom-20 h-56 w-56 rounded-full bg-secondary-fixed/50 blur-2xl" />

              <div className="relative z-10 flex flex-col gap-y-space-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      {isFlowPeakActive ? (
                        <button
                          type="button"
                          onClick={handleOpenScheduleCustomizer}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                          title="Click to customize Circadian Schedule"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                          <span>Flow Peak Active ({activeChrono.name})</span>
                          <span className="material-symbols-outlined text-[13px]">tune</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenScheduleCustomizer}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider font-semibold cursor-pointer hover:bg-surface-container-highest transition-colors"
                          title="Click to customize Circadian Schedule"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                          <span>{nowDecimal < activeChrono.peakStart ? "Flow Standby" : "Flow Recovery"} ({activeChrono.name})</span>
                          <span className="material-symbols-outlined text-[13px]">tune</span>
                        </button>
                      )}
                      <span className="font-tabular-mono text-label-sm text-outline">
                        {currentTime.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <h1 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl lg:text-[38px] text-on-surface tracking-tight font-extrabold leading-tight">
                      {greeting}, {firstName} 👋
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                      {isFlowPeakActive ? (
                        <>
                          Your peak productivity window is active right now{" "}
                          <span className="font-tabular-mono font-semibold text-primary">
                            ({activeChrono.windowLabel})
                          </span>
                          . {tasks.length} tasks scheduled with instant dynamic sync.
                        </>
                      ) : (
                        <>
                          Flow Peak scheduled for{" "}
                          <span className="font-tabular-mono font-semibold text-primary">
                            {activeChrono.windowLabel}
                          </span>
                          . {tasks.length} tasks scheduled with instant dynamic sync.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <button
                      onClick={() => handleOpenMorningPlanning(1)}
                      className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer border border-amber-500/20"
                      type="button"
                      title="2-minute intentional daily kickoff ritual"
                    >
                      <span className="material-symbols-outlined text-[18px] text-amber-500">wb_sunny</span>
                      <span>Morning Kickoff</span>
                    </button>
                    <button
                      onClick={() => setShowEveningShutdownModal(true)}
                      className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer border border-purple-500/20"
                      type="button"
                      title="End-of-day reflection & guilt-free evening rest transition"
                    >
                      <span className="material-symbols-outlined text-[18px] text-purple-400">nightlight</span>
                      <span>Daily Shutdown</span>
                    </button>
                    <button
                      onClick={() => setShowQuickCapture(true)}
                      className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all shadow-sm cursor-pointer"
                      type="button"
                      title="Quick Capture with Natural Language Parser (Press C)"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">bolt</span>
                      <span>Quick Capture</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-tabular-mono text-[10px]">C</kbd>
                    </button>
                    <button
                      onClick={() => setShowZenDeck(true)}
                      className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all shadow-sm cursor-pointer"
                      type="button"
                      title="Full-screen Zen Mode (Press F)"
                    >
                      <span className="material-symbols-outlined text-[18px] text-tertiary">self_improvement</span>
                      <span>Zen Deck</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-tabular-mono text-[10px]">F</kbd>
                    </button>
                    <button
                      onClick={() => (timerRunning ? pauseTimer() : startTimer())}
                      className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-[0_4px_12px_rgba(70,72,212,0.25)] cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      <span>{timerRunning ? "Pause Flow" : "Enter Flow Mode"}</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-xs">
                  <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-tertiary-fixed/60 flex items-center justify-center text-tertiary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">bolt</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-outline block truncate">Daily Energy</span>
                      <span className="font-tabular-mono text-body-md font-semibold text-on-surface">{dailyEnergy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-error-container/60 flex items-center justify-center text-error flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">local_fire_department</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-outline block truncate">Focus Streak</span>
                      <span className="font-tabular-mono text-body-md font-semibold text-on-surface">{focusStreak} Days 🔥</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-secondary-fixed/50 flex items-center justify-center text-secondary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">task_alt</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-outline block truncate">Tasks Completed</span>
                      <span className="font-tabular-mono text-body-md font-semibold text-on-surface">
                        {todayCompletedTasksCount} <span className="text-outline font-normal">today • {completedCount} total</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-primary-fixed/60 flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">nest_clock_farsight_analog</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-outline block truncate">Today&apos;s Focus Blocks</span>
                      <span className="font-tabular-mono text-body-md font-semibold text-on-surface">
                        {completedBlocks} of {targetBlocks} ({blocksPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* TWO COLUMN WORKSPACE (Main Queue + Right Rail) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

              {/* MAIN QUEUE COLUMN (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-y-space-lg">

                {/* Evening Recharge Mode Banner */}
                {isRechargeMode && (
                  <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 flex items-center justify-between gap-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
                        <span className="material-symbols-outlined text-[20px]">bedtime</span>
                      </div>
                      <div>
                        <h4 className="font-headline-sm text-sm font-bold text-white">
                          Evening Recharge Mode Active 🌙
                        </h4>
                        <p className="text-body-sm text-purple-300/80">
                          Daily shutdown completed. Disconnect without guilt and restore your cognitive energy.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRechargeMode(false)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-label-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      Exit Rest Mode
                    </button>
                  </div>
                )}

                {/* Daily Workload Capacity Warning: Overload Guard */}
                <OverloadGuardMeter />

                {/* TODAY'S PRIMARY HIGHLIGHTS DOCK / LOCK-IN STATUS */}
                <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-surface-container-low to-surface-container-lowest border border-amber-500/30 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-[22px] fill-1">stars</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            Today&apos;s Primary Highlight{dailyHighlightTasks.length > 1 ? "s" : ""}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-label-sm text-[11px] font-bold">
                            {dailyHighlightTasks.length} Non-Negotiable{dailyHighlightTasks.length === 1 ? "" : "s"}
                          </span>
                          {userProfile?.dailyFocusPlanLocked && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-label-sm text-[11px] font-semibold"
                              title="Locked and synced to Cloud Firestore"
                            >
                              <span className="material-symbols-outlined text-[13px]">cloud_done</span>
                              <span>Plan Locked</span>
                            </span>
                          )}
                        </div>
                        <p className="font-body-sm text-body-sm text-outline">
                          Your single or multi-task anchor plan that guarantees a successful day.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenMorningPlanning(4)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-amber-500/15 text-on-surface hover:text-amber-600 dark:hover:text-amber-400 border border-outline-variant/30 hover:border-amber-500/40 font-label-md text-label-md font-semibold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                      title="ReDesignate today's Primary Highlight and lock plan into Firestore"
                    >
                      <span className="material-symbols-outlined text-[18px] text-amber-500">sync</span>
                      <span>ReDesignate Highlight{dailyHighlightTasks.length > 1 ? "s" : ""}</span>
                    </button>
                  </div>

                  {dailyHighlightTasks.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-dashed border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[28px] text-amber-500/60 shrink-0">flag_circle</span>
                        <div>
                          <p className="font-body-md text-on-surface font-medium">No Primary Highlight designated yet for today.</p>
                          <p className="font-body-sm text-outline text-[12px]">Choose 1 or more anchor tasks to lock in your daily focus and sync to Cloud Firestore.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenMorningPlanning(4)}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-stone-900 font-label-md font-bold hover:bg-amber-400 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 whitespace-nowrap self-stretch sm:self-auto justify-center"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_task</span>
                        <span>Designate Highlight</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {dailyHighlightTasks.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                            t.completed
                              ? "bg-surface-container/40 border-outline-variant/20 opacity-80"
                              : "bg-surface-container-lowest border-amber-500/30 shadow-xs hover:border-amber-500/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleTaskCompletion(t.id)}
                                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
                                  t.completed
                                    ? "bg-secondary text-on-secondary"
                                    : "bg-surface-container text-transparent hover:bg-primary/10 border border-outline-variant"
                                }`}
                                title={t.completed ? "Mark incomplete" : "Mark completed"}
                              >
                                <span className={`material-symbols-outlined text-[15px] ${t.completed ? "opacity-100" : "opacity-0"}`}>
                                  check
                                </span>
                              </button>
                              <div className="min-w-0">
                                <span className={`font-body-sm block truncate font-semibold ${t.completed ? "line-through text-outline" : "text-on-surface"}`}>
                                  {t.title}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {t.priority && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-surface-container-high text-on-surface-variant uppercase">
                                      {t.priority}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-tabular-mono text-outline">
                                    {t.duration || "30m"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleDailyHighlight(t.id)}
                              className="p-1 rounded-md text-amber-500 hover:bg-amber-500/15 transition-colors cursor-pointer shrink-0"
                              title="Toggle Primary Highlight status"
                            >
                              <span className="material-symbols-outlined text-[18px] fill-1">star</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10 text-[11px]">
                            <span className="text-outline font-label-sm">
                              {t.completed ? "✅ Completed" : "⚡ In Progress"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                resetTimer();
                                startTimer();
                              }}
                              className="text-primary hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">play_circle</span>
                              <span>Focus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* PRIORITY TASK QUEUE */}
                <section className="flex flex-col gap-y-space-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                    <div>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Smart Priority Queue
                      </h2>
                      <p className="font-body-sm text-body-sm text-outline">
                        Pending Today &amp; Backlog Tasks • Completed tasks archived
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Segmented Filter */}
                      <div className="inline-flex p-1 rounded-lg bg-surface-container-high gap-0.5 select-none self-start sm:self-auto">
                        {[
                          { key: "all", label: `All Pending (${pendingTasks.length})` },
                          { key: "today", label: `Today (${pendingTodayTasks.length})` },
                          { key: "backlog", label: `Backlog (${pendingBacklogTasks.length})` },
                          { key: "high-impact", label: "High Impact" },
                        ].map((f) => (
                          <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-all cursor-pointer ${
                              activeFilter === f.key
                                ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                                : "text-on-surface-variant hover:text-on-surface"
                            }`}
                            type="button"
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* Customize Labels Button */}
                      <button
                        type="button"
                        onClick={() => setShowLabelCustomizer(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all cursor-pointer border border-outline-variant/20 shadow-xs"
                        title="Customize Priorities and Category Labels"
                      >
                        <span className="material-symbols-outlined text-[17px] text-primary">palette</span>
                        <span>Labels &amp; Priorities</span>
                      </button>
                    </div>
                  </div>

                  {/* Search query filter indicator */}
                  {searchQuery.trim() && (
                    <div className="flex items-center justify-between px-space-md py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-on-surface">
                      <div className="flex items-center gap-2 font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[18px]">search</span>
                        <span>
                          Filtering by keyword:{" "}
                          <strong className="text-primary font-semibold">&ldquo;{searchQuery}&rdquo;</strong>{" "}
                          <span className="text-outline">
                            ({filteredTasks.length} {filteredTasks.length === 1 ? "match" : "matches"})
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-label-sm font-label-sm text-primary hover:text-error transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                        Clear filter
                      </button>
                    </div>
                  )}

                  {/* Task Card List */}
                  <div className="space-y-space-sm">
                    {loadingTasks ? (
                      <div className="p-8 text-center text-outline">
                        <span className="material-symbols-outlined text-2xl animate-spin text-primary">
                          progress_activity
                        </span>
                        <p className="font-body-sm text-body-sm mt-2">Syncing tasks across workspaces...</p>
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="p-8 text-center text-outline bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/30">
                        <span className="material-symbols-outlined text-3xl mb-1 text-primary/60">task_alt</span>
                        <p className="font-headline-sm font-semibold text-on-surface">No pending tasks in this view</p>
                        <p className="font-body-sm text-outline mt-1">
                          {searchQuery.trim()
                            ? "No pending tasks match your search keyword. Try clearing the filter or searching for another keyword."
                            : 'All clear! Click "Plan Next Block" or create a new task to get started.'}
                        </p>
                      </div>
                    ) : (
                      filteredTasks.map((t) => (
                        <div
                          id={`task-card-${t.id}`}
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className={`group relative p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col gap-y-space-sm border cursor-pointer ${
                            selectedTaskId === t.id
                              ? "border-primary ring-2 ring-primary/20 shadow-md"
                              : "border-outline-variant/10"
                          } ${
                            t.completed ? "opacity-75" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-space-sm">
                            <div className="flex items-start gap-space-sm min-w-0">
                              {/* Interactive Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCompletion(t.id);
                                }}
                                className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all flex-shrink-0 group/chk ${
                                  t.completed
                                    ? "bg-secondary text-on-secondary"
                                    : "bg-surface-container-lowest text-transparent hover:text-primary hover:bg-primary/10 border border-outline-variant"
                                }`}
                                title="Mark task completed"
                                type="button"
                              >
                                <span
                                  className={`material-symbols-outlined text-[16px] ${
                                    t.completed ? "opacity-100" : "opacity-0 group-hover/chk:opacity-100"
                                  }`}
                                >
                                  check
                                </span>
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-space-xs flex-wrap">
                                  {t.isHighlight && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-label-sm text-[11px] font-bold shadow-xs">
                                      <span className="material-symbols-outlined text-[13px] fill-1 text-amber-500">star</span>
                                      Primary Highlight
                                    </span>
                                  )}
                                  {t.priority && (() => {
                                    const pStyle = getLabelStyle(t.priority);
                                    return (
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold border ${pStyle.bg} ${pStyle.border}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                                        {t.priority}
                                      </span>
                                    );
                                  })()}
                                  {t.category && (() => {
                                    const cStyle = getLabelStyle(t.category);
                                    return (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] font-medium border ${cStyle.bg} ${cStyle.border}`}
                                      >
                                        {t.category}
                                      </span>
                                    );
                                  })()}
                                  {t.duration && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">
                                      <span className="material-symbols-outlined text-[13px] text-tertiary">
                                        schedule
                                      </span>
                                      {t.duration}
                                    </span>
                                  )}
                                  {t.effort && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-medium">
                                      {t.effort}
                                    </span>
                                  )}
                                  {t.status === "backlog" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-label-sm text-label-sm font-medium">
                                      Backlog
                                    </span>
                                  )}
                                  {(t.rolledOverAt || t.rolloverDate) && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-label-sm text-label-sm font-semibold">
                                      <span className="material-symbols-outlined text-[13px]">history</span>
                                      Rolled Over
                                    </span>
                                  )}
                                </div>

                                <h3
                                  className={`font-headline-sm text-headline-sm mt-1.5 leading-snug font-semibold ${
                                    t.completed ? "line-through text-outline" : "text-on-surface"
                                  }`}
                                >
                                  {t.title}
                                </h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">
                                  {t.description}
                                </p>
                                <RolloverDiagnosticBanner task={t} className="mt-2.5" />
                              </div>
                            </div>

                            {/* Quick action icons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDailyHighlight(t.id);
                                }}
                                className={`p-2 rounded-lg transition-all cursor-pointer ${
                                  t.isHighlight
                                    ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border border-amber-500/30"
                                    : "bg-surface-container hover:bg-amber-500/10 text-on-surface-variant hover:text-amber-500"
                                }`}
                                title={t.isHighlight ? "Remove Primary Highlight status" : "Designate as Today's Primary Highlight"}
                                type="button"
                              >
                                <span className={`material-symbols-outlined text-[18px] ${t.isHighlight ? "fill-1" : ""}`}>
                                  {t.isHighlight ? "star" : "star_outline"}
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  resetTimer();
                                  startTimer();
                                }}
                                className="p-2 rounded-lg bg-primary-fixed hover:bg-primary-container text-on-primary-fixed hover:text-on-primary-container transition-colors cursor-pointer"
                                title="Start Focus Block for Task"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                              </button>

                              <button
                                onClick={() => handleStartEdit(t)}
                                className="p-2 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                title="Edit Task"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>

                              <button
                                onClick={() => setTaskToDelete(t)}
                                className="p-2 rounded-lg bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                                title="Delete Task"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Task Footer Meta */}
                          <div className="flex items-center justify-between pt-space-xs">
                            <div className="flex items-center gap-space-sm flex-wrap">
                              {t.tags?.map((tg, i) => (
                                <span
                                  key={i}
                                  className="font-tabular-mono text-label-sm text-primary font-medium bg-primary/10 px-2 py-0.5 rounded"
                                >
                                  {tg}
                                </span>
                              ))}
                              {t.subtasks && (
                                <div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
                                  <span className="material-symbols-outlined text-[15px]">checklist</span>
                                  <span>{t.subtasks}</span>
                                </div>
                              )}
                            </div>

                            {t.completed && (
                              <span className="font-label-sm text-label-sm text-secondary font-semibold px-2 py-1 bg-secondary-container/30 rounded">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* DAILY RHYTHM TIMELINE */}
                <section className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-y-space-md border border-outline-variant/10">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Daily Rhythm Timeline
                        </h2>
                        <span className="font-tabular-mono text-label-sm text-primary px-2 py-0.5 rounded-full bg-primary-container/40 font-semibold border border-primary/20">
                          {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-outline">
                        Synchronized with your <strong className="text-on-surface font-semibold">{activeChrono.name}</strong> circadian rhythm ({activeChrono.windowLabel})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Interactive Chronotype Switcher */}
                      <div className="inline-flex p-1 rounded-lg bg-surface-container-high gap-0.5 select-none">
                        {[
                          { id: "lark", label: "Lark", icon: "wb_sunny", tip: "Morning Lark (08:30 – 12:30)" },
                          { id: "falcon", label: "Falcon", icon: "flare", tip: "Steady Falcon (11:00 – 03:30)" },
                          { id: "owl", label: "Owl", icon: "nightlight", tip: "Night Owl (05:00 – 10:00)" },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleUpdateChronotype(c.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-label-sm font-medium transition-all cursor-pointer ${
                              chronotype === c.id
                                ? "bg-surface-container-lowest text-primary shadow-sm font-bold"
                                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                            }`}
                            title={c.tip}
                          >
                            <span className="material-symbols-outlined text-[14px]">{c.icon}</span>
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Customize Schedule Button */}
                      <button
                        type="button"
                        onClick={handleOpenScheduleCustomizer}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-label-sm font-medium transition-all cursor-pointer border border-outline-variant/20 shadow-xs"
                        title="Customize Circadian Rhythm & Focus Blocks"
                      >
                        <span className="material-symbols-outlined text-[15px] text-primary">tune</span>
                        <span>Customize</span>
                      </button>

                      {/* Live Block Status Badge */}
                      {activeTimelineBlock ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary font-tabular-mono text-label-sm font-bold shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>ACTIVE: {activeTimelineBlock.timeLabel}</span>
                        </div>
                      ) : nowDecimal < activeChrono.timelineStart ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-tabular-mono text-label-sm font-semibold">
                          <span className="w-2 h-2 rounded-full bg-outline" />
                          <span>STARTS AT {activeChrono.ticks[0]}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-tabular-mono text-label-sm font-semibold">
                          <span className="w-2 h-2 rounded-full bg-secondary" />
                          <span>RECHARGE &amp; WIND-DOWN</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto-Rescheduling Assistant Controls & Status */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-amber-500">auto_schedule</span>
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                        Auto-Rescheduling Assistant:
                      </span>
                      {effectiveOvertimeMinutes > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-tabular-mono text-[11px] font-bold border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          +{effectiveOvertimeMinutes}m downstream ripple active &bull; 0 overlaps
                        </span>
                      ) : (
                        <span className="text-[11px] text-outline font-tabular-mono">
                          Downstream blocks auto-adjust dynamically on deep focus overtime
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-outline font-medium mr-0.5">Nudge Overtime:</span>
                      <button
                        type="button"
                        onClick={() => setOvertimeMinutes((prev) => prev + 15)}
                        className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface font-tabular-mono text-[11px] font-semibold transition-all cursor-pointer border border-outline-variant/20 hover:border-primary/30"
                        title="Push deep focus by +15m and cascade downstream"
                      >
                        +15m
                      </button>
                      <button
                        type="button"
                        onClick={() => setOvertimeMinutes((prev) => prev + 30)}
                        className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface font-tabular-mono text-[11px] font-semibold transition-all cursor-pointer border border-outline-variant/20 hover:border-primary/30"
                        title="Push deep focus by +30m and cascade downstream"
                      >
                        +30m
                      </button>
                      {effectiveOvertimeMinutes > 0 && (
                        <button
                          type="button"
                          onClick={() => setOvertimeMinutes(0)}
                          className="px-2 py-1 rounded-md bg-error/10 hover:bg-error/20 text-error font-tabular-mono text-[11px] font-semibold transition-all cursor-pointer border border-error/20"
                          title="Reset schedule to standard chronotype cadence"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Timeline Bar */}
                  <div className="space-y-space-xs">
                    <div className="grid grid-cols-5 text-center font-tabular-mono text-label-sm text-outline px-1">
                      {activeChrono.ticks.map((tick, i) => (
                        <div key={i}>{tick}</div>
                      ))}
                    </div>

                    <div className="relative h-16 w-full rounded-xl bg-surface-container overflow-hidden flex items-stretch p-1 gap-1.5 shadow-inner">
                      {/* Real-time Indicator Line */}
                      {nowDecimal >= activeChrono.timelineStart && nowDecimal <= activeChrono.timelineEnd && (
                        <div
                          className="absolute top-0 bottom-0 z-20 pointer-events-none transition-all duration-1000 ease-linear flex flex-col items-center"
                          style={{ left: `${timelineProgressPercent}%` }}
                        >
                          <div className="w-0.5 h-full bg-error shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                          <div className="w-2 h-2 rounded-full bg-error -mt-1 shadow-md ring-2 ring-surface animate-pulse" />
                        </div>
                      )}

                      {TIMELINE_BLOCKS.map((block) => {
                        const isDone = nowDecimal >= block.end;
                        const isActive = nowDecimal >= block.start && nowDecimal < block.end;

                        return (
                          <div
                            key={block.id}
                            className={`${block.width} rounded-lg flex flex-col justify-center px-2.5 py-1 transition-all relative overflow-hidden select-none ${
                              isActive
                                ? "bg-primary-container text-on-primary-container ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest shadow-md z-10"
                                : isDone
                                ? "bg-surface-container-highest/70 text-on-surface-variant opacity-75"
                                : "bg-surface-container-low text-on-surface-variant/90 border border-outline-variant/15"
                            }`}
                          >
                            <div className="relative z-10 flex items-center justify-between gap-1">
                              <span
                                className={`font-label-md text-[11px] sm:text-label-md font-bold truncate ${
                                  isActive
                                    ? "text-primary font-extrabold"
                                    : isDone
                                    ? "line-through text-outline"
                                    : "text-on-surface"
                                }`}
                              >
                                {block.title}
                              </span>
                              {isActive ? (
                                <span className="flex h-2 w-2 relative flex-shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                </span>
                              ) : isDone ? (
                                <span className="material-symbols-outlined text-[14px] text-secondary flex-shrink-0">
                                  check_circle
                                </span>
                              ) : (
                                <span className="material-symbols-outlined text-[13px] text-outline flex-shrink-0">
                                  schedule
                                </span>
                              )}
                            </div>

                            <div className="relative z-10 flex items-center justify-between text-[9px] sm:text-label-sm font-tabular-mono mt-0.5">
                              <span className={isActive ? "text-on-primary-container font-semibold" : "text-outline"}>
                                {block.timeLabel}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold text-[8px] uppercase tracking-wider ${
                                  isActive
                                    ? "bg-primary text-on-primary"
                                    : isDone
                                    ? "bg-secondary-container text-on-secondary-container"
                                    : "bg-surface-container text-outline"
                                }`}
                              >
                                {isActive ? "Active Now" : isDone ? "Done" : "Upcoming"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

              </div>

              {/* RIGHT RAIL (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-y-space-lg">

                {/* POMODORO ACTIVE SESSION WIDGET */}
                <section className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-y-space-md relative overflow-hidden border border-outline-variant/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Active Session
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-tabular-mono text-label-sm font-semibold">
                      Block {Math.min(completedBlocks, targetBlocks)}/{targetBlocks}
                    </span>
                  </div>

                  {/* Circular Dial */}
                  <div className="flex flex-col items-center justify-center py-space-sm">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          className="text-surface-container"
                          cx="50"
                          cy="50"
                          fill="none"
                          r="42"
                          stroke="currentColor"
                          strokeWidth="7"
                        />
                        <circle
                          className="text-primary transition-all duration-1000 ease-linear"
                          cx="50"
                          cy="50"
                          fill="none"
                          r="42"
                          stroke="currentColor"
                          strokeDasharray="263.89"
                          strokeDashoffset={263.89 * (1 - Math.max(0, timerSeconds) / (25 * 60))}
                          strokeLinecap="round"
                          strokeWidth="7"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tighter font-tabular-mono">
                          {formattedTimer}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                          Remaining
                        </span>
                      </div>
                    </div>

                    <div className="mt-space-sm text-center px-space-md">
                      <span className="font-label-sm text-label-sm text-outline block">TARGETING</span>
                      <p className="font-body-md text-body-md font-semibold text-on-surface truncate max-w-[220px]">
                        {tasks.find((t) => !t.completed)?.title || "Workspace Queue"}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-space-sm mt-space-md">
                      <button
                        onClick={() => setTimerSeconds((s) => s + 5 * 60)}
                        className="p-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                        title="Add 5 Minutes"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">more_time</span>
                      </button>

                      <button
                        onClick={() => (timerRunning ? pauseTimer() : startTimer())}
                        className="w-12 h-12 rounded-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container flex items-center justify-center transition-all shadow-[0_4px_14px_rgba(70,72,212,0.3)] cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[24px]">
                          {timerRunning ? "pause" : "play_arrow"}
                        </span>
                      </button>

                      <button
                        onClick={() => resetTimer()}
                        className="p-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                        title="Reset Session"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* HABITS WIDGET */}
                <section id="habits-widget" className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-y-space-md border border-outline-variant/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[20px]">spa</span>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Daily Habits
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-tabular-mono text-label-sm text-secondary font-semibold">
                        {habits.filter((h) => h.done).length} of {habits.length} done
                      </span>
                      <button
                        onClick={() => setShowHabitManagerModal(true)}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors cursor-pointer flex items-center gap-1 border border-secondary/20"
                        title="Configure Habit Cadence & Streak Shields"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[13px]">shield</span>
                        <span>Shields &amp; Cadence</span>
                      </button>
                      <button
                        onClick={() => setShowNewHabitInput(!showNewHabitInput)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                        title="Add Habit"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>

                  {showNewHabitInput && (
                    <form onSubmit={handleCreateHabit} className="flex items-center gap-2 pt-1 pb-1">
                      <input
                        type="text"
                        placeholder="Habit title (e.g. Read 15 mins)..."
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-body-sm bg-surface-container rounded-lg outline-none text-on-surface placeholder:text-outline border border-outline-variant/30 focus:border-secondary"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="15m"
                        value={newHabitDuration}
                        onChange={(e) => setNewHabitDuration(e.target.value)}
                        className="w-16 px-2 py-1.5 text-body-sm bg-surface-container rounded-lg outline-none text-on-surface placeholder:text-outline border border-outline-variant/30 text-center"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold hover:bg-secondary/90 transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </form>
                  )}

                  <div className="space-y-space-xs">
                    {loadingHabits ? (
                      <div className="p-4 text-center text-outline">
                        <span className="material-symbols-outlined text-xl animate-spin text-secondary">
                          progress_activity
                        </span>
                        <p className="font-label-sm text-label-sm mt-1">Syncing habits...</p>
                      </div>
                    ) : habits.length === 0 ? (
                      <div className="p-4 text-center text-outline font-body-sm text-body-sm">
                        No habits yet. Click + to add your first habit.
                      </div>
                    ) : (
                      habits.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => toggleHabit(h.id)}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-space-sm min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                                h.done
                                  ? "bg-secondary text-on-secondary"
                                  : "border border-outline-variant text-transparent"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[15px]">check</span>
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`font-body-sm text-body-sm truncate ${
                                  h.done ? "line-through text-outline" : "text-on-surface font-medium"
                                }`}
                              >
                                {h.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-tabular-mono text-[11px] text-outline">
                                  {h.duration || "15m"}
                                </span>
                                <span className="text-outline">&bull;</span>
                                <span className="px-1.5 py-0.2 rounded bg-surface-container text-[10px] uppercase font-bold text-on-surface-variant font-tabular-mono">
                                  {h.cadence === "weekdays" ? "Mon-Fri" : h.cadence === "weekly" ? "Weekly" : h.cadence === "custom" ? "3x/Wk" : "Daily"}
                                </span>
                                <span className="text-[11px] font-bold text-amber-500 font-tabular-mono flex items-center gap-0.5">
                                  🔥 {h.streak || 0}d
                                </span>
                                <span
                                  className="text-[11px] font-semibold text-secondary font-tabular-mono flex items-center gap-0.5"
                                  title={`${h.streakShields ?? 2} Streak Shields available (grace days protect against resets)`}
                                >
                                  🛡️ {h.streakShields ?? 2}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHabitManagerModal(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary text-outline transition-all cursor-pointer"
                              title="Configure Cadence & Streak Shields"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">tune</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteHabit(h.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-error text-outline transition-all cursor-pointer"
                              title="Delete Habit"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

              </div>
            </div>

          </div>
        </main>
      </div>

      {/* CREATE TASK MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl p-6 space-y-4 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm font-bold text-on-surface">Create New Task</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Implement Cloud Firestore Cache Sync"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-label-md font-medium text-on-surface">
                      Priority Level
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLabelCustomizer(true)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">palette</span>
                      <span>Customize</span>
                    </button>
                  </div>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                  >
                    {taskLabels.filter((l) => l.type === "priority").map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-label-md font-medium text-on-surface">
                      Category Tag
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLabelCustomizer(true)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">palette</span>
                      <span>Customize</span>
                    </button>
                  </div>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                  >
                    {taskLabels.filter((l) => l.type === "category").map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Estimated Time
                </label>
                <input
                  type="text"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(e.target.value)}
                  placeholder="e.g. 30 min, 45 min, 1h"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl p-6 space-y-4 border border-outline-variant/30 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">edit_note</span>
                <h3 className="text-headline-sm font-bold text-on-surface">Edit Task</h3>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded-lg hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Description
                </label>
                <textarea
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  rows="2"
                  className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none resize-none font-body-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-label-md font-medium text-on-surface">
                      Priority Level
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLabelCustomizer(true)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">palette</span>
                      <span>Customize</span>
                    </button>
                  </div>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                  >
                    {taskLabels.filter((l) => l.type === "priority").map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-label-md font-medium text-on-surface">
                      Category Tag
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLabelCustomizer(true)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">palette</span>
                      <span>Customize</span>
                    </button>
                  </div>
                  <select
                    value={editTaskCategory}
                    onChange={(e) => setEditTaskCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                  >
                    {taskLabels.filter((l) => l.type === "category").map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Estimated Time
                </label>
                <input
                  type="text"
                  value={editTaskDuration}
                  onChange={(e) => setEditTaskDuration(e.target.value)}
                  placeholder="e.g. 30 min, 45 min, 1h"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl p-6 space-y-4 border border-outline-variant/30 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Delete Task</h3>
                <p className="font-body-sm text-outline mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="font-body-md text-on-surface bg-surface-container-low p-3 rounded-lg border border-outline-variant/20 line-clamp-2">
              "{taskToDelete.title}"
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="px-4 py-2 rounded-lg bg-error text-on-error text-label-md font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-on-surface text-surface shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
          <span className="font-body-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl p-6 space-y-4 border border-outline-variant/30 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">create_new_folder</span>
                <h3 className="text-headline-sm font-bold text-on-surface">New Project</h3>
              </div>
              <button
                onClick={() => { setShowNewProjectModal(false); setNewProjectName(""); }}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded-lg hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="font-body-sm text-outline">
              A new project list will appear in the sidebar. A seed task is created automatically so the project is saved to your database.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Product Launch, Research, Side Project"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowNewProjectModal(false); setNewProjectName(""); }}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE & CIRCADIAN CUSTOMIZER MODAL */}
      {showScheduleCustomizer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl p-6 space-y-5 border border-outline-variant/30 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">routine</span>
                <h3 className="text-headline-sm font-bold text-on-surface">Circadian Schedule &amp; Rhythm</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleCustomizer(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveScheduleCustomizer} className="space-y-4">
              {/* Chronotype Selection */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-2">
                  Select Your Circadian Chronotype
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: "lark",
                      name: "Morning Lark",
                      icon: "wb_sunny",
                      peak: "08:30 – 12:30",
                      desc: "Early peak focus",
                      color: "text-amber-500",
                    },
                    {
                      id: "falcon",
                      name: "Steady Falcon",
                      icon: "flare",
                      peak: "11:00 – 03:30",
                      desc: "Midday cadence",
                      color: "text-primary",
                    },
                    {
                      id: "owl",
                      name: "Night Owl",
                      icon: "nightlight",
                      peak: "05:00 – 10:00",
                      desc: "Evening flow surge",
                      color: "text-tertiary",
                    },
                  ].map((c) => {
                    const isSelected = customChronoChoice === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setCustomChronoChoice(c.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs"
                            : "bg-surface-container-low hover:bg-surface-container border-outline-variant/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`material-symbols-outlined text-[20px] ${c.color}`}>{c.icon}</span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-label-md text-label-md font-bold text-on-surface">{c.name}</p>
                          <p className="font-tabular-mono text-[11px] text-primary font-semibold mt-0.5">{c.peak}</p>
                          <p className="text-[11px] text-outline mt-0.5">{c.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Focus Blocks */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-2">
                  Daily Target Focus Blocks
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { blocks: 3, label: "3 Blocks", sub: "Light / Agile" },
                    { blocks: 5, label: "5 Blocks", sub: "Balanced / Flow" },
                    { blocks: 8, label: "8 Blocks", sub: "Intensive / Sprint" },
                  ].map((opt) => (
                    <button
                      key={opt.blocks}
                      type="button"
                      onClick={() => setCustomTargetBlocks(opt.blocks)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        Number(customTargetBlocks) === opt.blocks
                          ? "bg-primary text-on-primary border-primary shadow-xs font-bold"
                          : "bg-surface-container-low hover:bg-surface-container border-outline-variant/20 text-on-surface"
                      }`}
                    >
                      <div className="font-label-md text-label-md font-semibold">{opt.label}</div>
                      <div className={`text-[10px] ${Number(customTargetBlocks) === opt.blocks ? "text-on-primary/80" : "text-outline"}`}>
                        {opt.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview of Timeline Schedule */}
              <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 space-y-1.5">
                <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">
                  Timeline Cadence Preview
                </span>
                <div className="flex items-center gap-1.5 text-body-sm text-on-surface">
                  <span className="font-semibold text-primary">
                    {CHRONO_CONFIG[customChronoChoice]?.name || "Schedule"}:
                  </span>
                  <span className="font-tabular-mono text-outline">
                    {CHRONO_CONFIG[customChronoChoice]?.windowLabel}
                  </span>
                </div>
                <div className="grid grid-cols-5 text-center font-tabular-mono text-[10px] text-outline pt-1">
                  {CHRONO_CONFIG[customChronoChoice]?.ticks.map((t, i) => (
                    <div key={i}>{t}</div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowScheduleCustomizer(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-label-md hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Apply Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LABEL CUSTOMIZER MODAL */}
      <LabelCustomizerModal
        isOpen={showLabelCustomizer}
        onClose={() => setShowLabelCustomizer(false)}
      />

      {/* QUICK CAPTURE MODAL (C) */}
      <QuickCaptureModal
        isOpen={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
        onTaskCreated={(task) => setSelectedTaskId(task.id)}
      />

      {/* ZEN FOCUS DECK (F) */}
      <ZenFocusDeck
        isOpen={showZenDeck}
        onClose={() => setShowZenDeck(false)}
      />

      {/* SHORTCUTS HELP MODAL (?) */}
      <ShortcutsHelpModal
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* RECURRING RITUALS & HABIT STREAKS ENGINE MODAL */}
      <HabitManagerModal
        isOpen={showHabitManagerModal}
        onClose={() => setShowHabitManagerModal(false)}
      />

      {/* MORNING PLANNING RITUAL MODAL */}
      <MorningPlanningModal
        isOpen={showMorningPlanningModal}
        onClose={() => setShowMorningPlanningModal(false)}
        initialStep={morningPlanningStep}
      />

      {/* EVENING DAILY SHUTDOWN & REFLECTION MODAL */}
      <EveningShutdownModal
        isOpen={showEveningShutdownModal}
        onClose={() => setShowEveningShutdownModal(false)}
        onEnterRechargeMode={() => setIsRechargeMode(true)}
      />
    </div>
  );
}