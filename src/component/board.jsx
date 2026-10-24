import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import image from "../assets/logo.png";
import { useApp } from "../context/AppContext";
import LabelCustomizerModal from "./LabelCustomizerModal";
import QuickCaptureModal from "./QuickCaptureModal";
import ZenFocusDeck from "./ZenFocusDeck";
import ShortcutsHelpModal from "./ShortcutsHelpModal";
import RolloverDiagnosticBanner from "./RolloverDiagnosticBanner";
import OverloadGuardMeter from "./OverloadGuardMeter";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

const COLUMNS = [
  { id: "backlog", title: "Backlog", dotColor: "bg-outline", countBg: "bg-surface-container-highest" },
  { id: "ready", title: "Ready for Today", dotColor: "bg-primary", countBg: "bg-primary text-on-primary", isPrimary: true },
  { id: "in_progress", title: "In Progress", dotColor: "bg-tertiary animate-pulse", countBg: "bg-surface-container-highest" },
  { id: "review", title: "Review", dotColor: "bg-secondary-fixed-dim", countBg: "bg-surface-container-highest" },
  { id: "completed", title: "Completed", dotColor: "bg-secondary", countBg: "bg-secondary-fixed text-on-secondary-fixed" },
];

export default function Board() {
  const navigate = useNavigate();
  const {
    currentUser,
    authLoading,
    displayName,
    displayTitle,
    avatarUrl,
    logout,
    tasks,
    moveTaskStatus,
    createTask,
    updateTask,
    taskLabels,
    getLabelStyle,
    habitsCount,
    activeTasksCount,
    highImpactCount,
    flowVelocityScore,
    formattedTimer,
    timerRunning,
    startTimer,
    pauseTimer,
    toggleDailyHighlight,
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showInspector, setShowInspector] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showLabelCustomizer, setShowLabelCustomizer] = useState(false);
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

  // New Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("ready");
  const [newTaskCategory, setNewTaskCategory] = useState("Work Sprint");
  const [newTaskPriority, setNewTaskPriority] = useState("P1 Urgent & High Impact");

  // Phase 1: Quick Capture, Zen Deck, and Shortcuts Help States
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showZenDeck, setShowZenDeck] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Redirect if logged out
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [authLoading, currentUser, navigate]);

  // Selected Task reference
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0] || null;

  // Power user keyboard shortcuts (C, X, Space, 1-3, F, ?)
  useKeyboardShortcuts({
    onQuickCapture: () => setShowQuickCapture(true),
    onToggleZen: () => setShowZenDeck((prev) => !prev),
    onToggleTimer: () => {
      if (timerRunning) pauseTimer();
      else startTimer();
    },
    onToggleActiveTask: () => {
      if (selectedTask) {
        updateTask(selectedTask.id, {
          completed: !selectedTask.completed,
          status: !selectedTask.completed ? "completed" : "ready",
        });
      }
    },
    onSetPriority: (newPriority) => {
      if (selectedTask) {
        updateTask(selectedTask.id, { priority: newPriority });
      }
    },
    onShowShortcuts: () => setShowShortcutsHelp(true),
    disabled:
      showQuickCapture ||
      showZenDeck ||
      showShortcutsHelp ||
      showAddModal ||
      showLabelCustomizer ||
      isSearchOpen,
  });

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    await moveTaskStatus(taskId, targetStatus);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const chosenPriority = newTaskPriority || (newTaskStatus === "ready" ? "P1 Urgent & High Impact" : "P2 Strategic");
    const chosenCategory = newTaskCategory || "Work Sprint";

    const created = await createTask({
      title: newTaskTitle.trim(),
      description: "Added directly from Sprint Board.",
      status: newTaskStatus || "ready",
      category: chosenCategory,
      effort: chosenPriority?.includes("P1") || chosenPriority?.includes("Urgent") ? "⚡⚡⚡ Deep" : "⚡⚡ Med",
      priority: chosenPriority,
      assignee: displayName?.slice(0, 2).toUpperCase() || "YOU",
    });

    if (created?.id) {
      setSelectedTaskId(created.id);
    }
    setNewTaskTitle("");
    setShowAddModal(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Extract all unique tags across tasks
  const allAvailableTags = Array.from(
    new Set(
      tasks
        .flatMap((t) => t.tags || [t.category ? `#${t.category.replace(/\s+/g, "")}` : null])
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    )
  );

  const displayTags =
    allAvailableTags.length > 0
      ? allAvailableTags
      : ["#WorkSprint", "#Frontend", "#DeepWork", "#Backlog", "#Urgent"];

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
            t.category?.toLowerCase().includes(trimmedQuery) ||
            t.priority?.toLowerCase().includes(trimmedQuery) ||
            t.status?.toLowerCase().includes(trimmedQuery)
        )
        .slice(0, 5)
    : tasks.slice(0, 3);

  // 3. Column Suggestions
  const matchingColumns = COLUMNS.filter((c) =>
    trimmedQuery ? c.title.toLowerCase().includes(trimmedQuery) : true
  );

  // 4. Quick Nav Actions
  const quickNavActions = [
    {
      id: "nav-dash",
      title: "Today's Focus Dashboard",
      subtitle: "Switch to focus timer & priority queue",
      icon: "wb_sunny",
      action: () => navigate("/dashboard"),
    },
    {
      id: "nav-analytics",
      title: "Flow Velocity & Analytics",
      subtitle: "View circadian rhythm and trends",
      icon: "monitoring",
      action: () => navigate("/analytics"),
    },
    {
      id: "nav-profile",
      title: "Profile & Preferences",
      subtitle: "Workstation settings & chronotype",
      icon: "tune",
      action: () => navigate("/profile"),
    },
    {
      id: "act-new-kanban",
      title: "Add Kanban Task",
      subtitle: "Create a task in Backlog or Ready",
      icon: "add_task",
      action: () => setShowAddModal(true),
    },
  ].filter((a) =>
    trimmedQuery
      ? a.title.toLowerCase().includes(trimmedQuery) ||
        a.subtitle.toLowerCase().includes(trimmedQuery)
      : true
  ).slice(0, trimmedQuery ? 3 : 2);

  // Flatten suggestions for keyboard navigation (ArrowUp, ArrowDown, Enter)
  const flattenedSuggestions = [
    ...matchingTags.map((tag) => ({
      id: `tag-${tag}`,
      type: "tag",
      title: tag,
      subtitle: "Filter board by keyword tag",
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
      subtitle: `${t.priority || "Task"} • Column: ${
        COLUMNS.find((c) => c.id === t.status)?.title || t.status || "Ready"
      }`,
      icon: t.completed ? "task_alt" : "view_kanban",
      action: () => {
        setSearchQuery(t.title);
        setSelectedTaskId(t.id);
        setShowInspector(true);
        setIsSearchOpen(false);
      },
    })),
    ...matchingColumns.map((col) => ({
      id: `col-${col.id}`,
      type: "column",
      title: `${col.title} Column`,
      subtitle: `Jump to ${col.title} stage`,
      icon: "view_column",
      action: () => {
        setSearchQuery("");
        setIsSearchOpen(false);
        const el = document.getElementById(`column-${col.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (trimmedQuery) {
      const matchTitle = t.title?.toLowerCase().includes(trimmedQuery);
      const matchTag =
        t.category?.toLowerCase().includes(trimmedQuery) ||
        (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(trimmedQuery)));
      const matchCode = t.code?.toLowerCase().includes(trimmedQuery);
      const matchPriority = t.priority?.toLowerCase().includes(trimmedQuery);
      const matchEffort = t.effort?.toLowerCase().includes(trimmedQuery);
      if (!matchTitle && !matchTag && !matchCode && !matchPriority && !matchEffort) return false;
    }
    if (activeFilter === "mine" && t.assignee !== displayName?.slice(0, 2).toUpperCase() && t.assignee !== "YOU") {
      return false;
    }
    if (activeFilter === "p1p2" && !t.priority?.includes("P1") && !t.priority?.includes("P2")) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen">
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-16 px-space-lg flex items-center gap-space-sm">
            <img alt="Successor Logo" className="h-8 w-auto object-contain" src={image} />
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
              Successor
            </span>
          </div>
         
          <div className="flex-1 overflow-y-auto px-space-sm space-y-space-md">
            <nav className="space-y-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">wb_sunny</span>
                <span className="font-body-md text-body-md">Today's Focus</span>
              </Link>
              <Link
                to="/board"
                className="flex items-center gap-space-sm px-space-md py-space-sm bg-primary-container text-on-primary-container rounded-lg font-label-md transition-colors font-semibold"
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

            <div className="pt-space-xs">
              <div className="flex items-center justify-between px-space-md pb-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Projects &amp; Lists
                </span>
                <button
                  onClick={() => {
                    setNewTaskStatus("ready");
                    setShowAddModal(true);
                  }}
                  className="text-outline hover:text-on-surface transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>
              <div className="space-y-0.5">
                <Link
                  to="/dashboard"
                  className="flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Personal Commits</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest">
                    {habitsCount}
                  </span>
                </Link>
                <div className="flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer">
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Work Sprint</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest">
                    {activeTasksCount}
                  </span>
                </div>
                <div className="flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer">
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-tertiary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Deep Work</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest">
                    {highImpactCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-space-sm bg-surface-container-low border-t border-surface-container/60">
          <div className="flex items-center gap-space-sm p-space-xs rounded-xl bg-surface-container-high/60">
            <div className="p-2 rounded-lg bg-surface-container text-primary">
              <span className="material-symbols-outlined text-[18px]">offline_bolt</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label-sm text-label-sm text-on-surface truncate">Flow Velocity</p>
              <p className="font-tabular-mono text-label-sm text-secondary font-semibold">
                {flowVelocityScore}% Score
              </p>
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
                                  {task.completed ? "task_alt" : "view_kanban"}
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
                                    {task.priority || "Task"} • Column: {COLUMNS.find((c) => c.id === task.status)?.title || "Ready"}
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

                  {/* Kanban Columns */}
                  {matchingColumns.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">view_column</span>
                        Kanban Columns
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {matchingColumns.map((col) => {
                          const item = flattenedSuggestions.find((s) => s.id === `col-${col.id}`);
                          const itemIdx = flattenedSuggestions.findIndex((s) => s.id === `col-${col.id}`);
                          const isSelected = itemIdx === selectedSuggestionIndex;
                          return (
                            <button
                              key={col.id}
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
                                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} flex-shrink-0`} />
                                <span className="font-body-sm text-body-sm font-medium truncate">{col.title}</span>
                              </div>
                              <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container font-medium text-outline">
                                Jump to column
                              </span>
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
                        Try searching for tasks, keyword tags (#Frontend), or columns.
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
                  <span className="hidden sm:inline">Search across Kanban cards &amp; tags</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-space-md">
            {/* Quick Capture Pill (C) */}
            <button
              onClick={() => setShowQuickCapture(true)}
              title="Quick Capture with Natural Language (Press C)"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-label-sm font-semibold transition-all cursor-pointer border border-primary/20 shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px]">bolt</span>
              <span>Quick Add</span>
              <kbd className="px-1.5 py-0.2 rounded bg-primary/20 text-[10px] font-mono text-primary font-bold">C</kbd>
            </button>

            {/* Zen Deck Pill (F) */}
            <button
              onClick={() => setShowZenDeck(true)}
              title="Full-screen Zen Focus Deck (Press F)"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-sm font-medium transition-all cursor-pointer border border-outline-variant/20 shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[17px] text-tertiary">self_improvement</span>
              <span>Zen Deck</span>
              <kbd className="px-1.5 py-0.2 rounded bg-surface-container-highest text-[10px] font-mono text-outline">F</kbd>
            </button>

            {/* Live Shared Focus Session Pill */}
            <div className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
              <span className="material-symbols-outlined text-tertiary text-[18px]">timer</span>
              <span className="font-tabular-mono text-body-sm font-semibold">{formattedTimer}</span>
              <span className="font-label-sm text-label-sm text-outline">Focus Session</span>
              <button
                onClick={() => (timerRunning ? pauseTimer() : startTimer())}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
                type="button"
                title={timerRunning ? "Pause timer (Space)" : "Start timer (Space)"}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {timerRunning ? "pause" : "play_arrow"}
                </span>
              </button>
            </div>

            {/* Shortcuts Help Button (?) */}
            <button
              onClick={() => setShowShortcutsHelp(true)}
              title="Keyboard Shortcuts Cheatsheet (Press ?)"
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">keyboard</span>
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-full text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>

            <Link to="/profile" className="flex items-center gap-space-sm pl-space-xs group cursor-pointer">
              <div className="relative flex-shrink-0">
                <img
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all"
                  src={avatarUrl}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary-fixed ring-2 ring-surface" />
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">
                  {displayName}
                </span>
                <span className="font-label-sm text-label-sm text-outline leading-tight">
                  {displayTitle}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* MAIN BOARD WORKSPACE */}
        <main className="w-full pt-16 bg-surface px-space-lg py-space-lg">
          <div className="flex flex-col w-full">
            {/* Top Workspace Context & Sub-navigation */}
            <div className="flex flex-col gap-space-md mb-space-lg">
              {/* Breadcrumb & Sprint Title Row */}
              <div className="flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/10 flex-shrink-0" />
                    <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                      Sprint 24: Core Platform Experience
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-tabular-mono text-label-sm">
                      {tasks.length} Tasks
                    </span>
                  </div>
                </div>

                {/* Action Utilities */}
                <div className="flex items-center gap-space-sm">
                  <button
                    onClick={() => setShowQuickCapture(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-medium shadow-sm transition-all cursor-pointer border border-outline-variant/20"
                    type="button"
                    title="Quick natural language task capture (C)"
                  >
                    <span className="material-symbols-outlined text-[18px] text-amber-500">bolt</span>
                    <span>Quick NLP Add</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-[10px] font-mono text-outline">C</kbd>
                  </button>
                  <button
                    onClick={() => setShowLabelCustomizer(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-medium shadow-sm transition-all cursor-pointer border border-outline-variant/20"
                    type="button"
                    title="Customize Priorities and Category Labels"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">palette</span>
                    <span>Labels &amp; Priorities</span>
                  </button>
                  <button
                    onClick={() => setShowInspector(!showInspector)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-medium shadow-sm transition-all cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-outline">
                      {showInspector ? "dock_to_right" : "vertical_split"}
                    </span>
                    <span>{showInspector ? "Hide Inspector" : "Show Inspector"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setNewTaskStatus("ready");
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-md transition-all cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Add Task</span>
                  </button>
                </div>
              </div>

              {/* View Switcher & Dynamic Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-low p-2.5 rounded-xl shadow-sm">
                <div className="flex items-center bg-surface-container-high/60 p-1 rounded-lg">
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-lowest text-on-surface shadow-sm font-label-md text-label-md font-semibold"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">view_kanban</span>
                    <span>Kanban Board</span>
                  </button>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                    <span>List / Timeline</span>
                  </Link>
                </div>

                {/* Filter Badges */}
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-0">
                  <button
                    onClick={() => setActiveFilter(activeFilter === "mine" ? "all" : "mine")}
                    className={`flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full text-label-sm cursor-pointer transition-all ${
                      activeFilter === "mine"
                        ? "bg-primary-fixed text-on-primary-fixed ring-1 ring-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span>My Tasks ({displayName?.split(" ")[0] || "You"})</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter(activeFilter === "p1p2" ? "all" : "p1p2")}
                    className={`flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full text-label-sm cursor-pointer transition-all ${
                      activeFilter === "p1p2"
                        ? "bg-tertiary-fixed text-on-tertiary-fixed ring-1 ring-tertiary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span>Priority: P1 &amp; P2</span>
                  </button>
                  {activeFilter !== "all" && (
                    <button
                      onClick={() => setActiveFilter("all")}
                      className="text-label-sm text-outline hover:text-on-surface underline ml-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Search query filter indicator */}
            {searchQuery.trim() && (
              <div className="flex items-center justify-between px-space-md py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-on-surface mb-space-md">
                <div className="flex items-center gap-2 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-primary text-[18px]">search</span>
                  <span>
                    Filtering board by:{" "}
                    <strong className="text-primary font-semibold">&ldquo;{searchQuery}&rdquo;</strong>{" "}
                    <span className="text-outline">
                      ({filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"} visible across columns)
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

            {/* Daily Workload Capacity Warning: Overload Guard */}
            <OverloadGuardMeter className="mb-space-md" />

            {/* KANBAN COLUMNS + INSPECTOR DRAWER SPLIT */}
            <div className="flex gap-space-lg items-start w-full min-h-[calc(100vh-230px)] overflow-x-auto pb-6">
              {/* 5 Column Canvas */}
              <div className="flex gap-space-md flex-1 min-w-[1040px] items-start">
                {COLUMNS.map((col) => {
                  const colTasks = filteredTasks.filter((t) => t.status === col.id);
                  return (
                    <div
                      id={`column-${col.id}`}
                      key={col.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className={`flex flex-col w-72 flex-shrink-0 rounded-2xl p-space-sm shadow-sm min-h-[500px] transition-colors ${
                        col.isPrimary ? "bg-primary-fixed/20" : "bg-surface-container-low/70"
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                          <h2 className="font-headline-sm text-[15px] font-bold text-on-surface">
                            {col.title}
                          </h2>
                          <span
                            className={`px-2 py-0.5 rounded-full font-tabular-mono text-label-sm font-semibold ${col.countBg}`}
                          >
                            {colTasks.length}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setNewTaskStatus(col.id);
                            setShowAddModal(true);
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
                          type="button"
                          title={`Add task to ${col.title}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>

                      {/* Card Stream */}
                      <div className="flex flex-col gap-space-sm flex-1">
                        {colTasks.map((task) => {
                          const isSelected = selectedTask?.id === task.id;
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setShowInspector(true);
                              }}
                              className={`group bg-surface-container-lowest p-space-sm rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden border ${
                                isSelected
                                  ? "ring-2 ring-primary border-primary shadow-md"
                                  : "border-outline-variant/15"
                              }`}
                            >
                              {isSelected && <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />}

                              <div className="flex items-start justify-between gap-1 mb-2 mt-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="material-symbols-outlined text-outline/40 group-hover:text-outline text-[16px] cursor-grab">
                                    drag_indicator
                                  </span>
                                  {task.category && (() => {
                                    const cStyle = getLabelStyle(task.category);
                                    return (
                                      <span className={`px-2 py-0.5 rounded-md font-label-sm text-[10px] uppercase tracking-wider font-semibold border ${cStyle.bg} ${cStyle.border}`}>
                                        {task.category}
                                      </span>
                                    );
                                  })()}
                                  {task.priority && (() => {
                                    const pStyle = getLabelStyle(task.priority);
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-label-sm text-[10px] font-bold border ${pStyle.bg} ${pStyle.border}`}>
                                        <span className={`w-1 h-1 rounded-full ${pStyle.dot}`} />
                                        {task.priority}
                                      </span>
                                    );
                                  })()}
                                  {task.isHighlight && (
                                    <span
                                      title="Today's Primary Highlight (Anchor Task)"
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-label-sm text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400"
                                    >
                                      <span className="material-symbols-outlined text-[11px] fill-1 text-amber-500">star</span>
                                      Highlight
                                    </span>
                                  )}
                                  {(task.rolledOverAt || task.rolloverDate) && (
                                    <span
                                      title="Task was not completed within the assigned day and rolled over to backlog"
                                      className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-label-sm text-[10px] uppercase tracking-wider font-semibold flex items-center gap-0.5"
                                    >
                                      <span className="material-symbols-outlined text-[11px]">history</span>
                                      Rolled Over
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDailyHighlight(task.id);
                                    }}
                                    className={`p-1 rounded hover:bg-surface-container-high transition-colors cursor-pointer ${
                                      task.isHighlight ? "text-amber-500" : "text-outline/40 hover:text-amber-500"
                                    }`}
                                    title={task.isHighlight ? "Remove Primary Highlight" : "Designate as Today's Primary Highlight"}
                                  >
                                    <span className={`material-symbols-outlined text-[15px] ${task.isHighlight ? "fill-1" : ""}`}>
                                      {task.isHighlight ? "star" : "star_outline"}
                                    </span>
                                  </button>
                                  <span className="px-1.5 py-0.5 rounded text-[11px] font-tabular-mono text-outline font-medium flex-shrink-0">
                                    {task.effort || "⚡ Med"}
                                  </span>
                                </div>
                              </div>

                              <h3
                                className={`font-body-md text-body-md font-semibold mb-1.5 leading-snug ${
                                  task.status === "completed"
                                    ? "line-through text-outline"
                                    : "text-on-surface"
                                }`}
                              >
                                {task.title}
                              </h3>

                              {task.description && (
                                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-3">
                                  {task.description}
                                </p>
                              )}

                              {/* Card Footer Bar */}
                              <div className="flex items-center justify-between pt-2 bg-surface-container-low/40 -mx-3 -mb-3 px-3 py-2 rounded-b-xl">
                                <div className="flex items-center gap-2 text-outline font-label-sm text-label-sm">
                                  <span className="font-tabular-mono text-[11px] text-primary font-semibold">
                                    {task.code || `FF-${task.id.slice(0, 4)}`}
                                  </span>
                                  {task.duration && (
                                    <span className="text-[11px] text-outline">
                                      • {task.duration}
                                    </span>
                                  )}
                                </div>

                                <div className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[10px] flex items-center justify-center font-bold">
                                  {task.assignee || displayName?.slice(0, 2).toUpperCase() || "YOU"}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {colTasks.length === 0 && (
                          <div className="p-4 rounded-xl border border-dashed border-outline-variant/30 text-center text-outline text-label-sm">
                            Drop tasks here
                          </div>
                        )}

                        {/* Add Task placeholder */}
                        <button
                          onClick={() => {
                            setNewTaskStatus(col.id);
                            setShowAddModal(true);
                          }}
                          className="mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-outline-variant text-outline hover:text-on-surface hover:bg-surface-container-low font-label-sm text-label-sm transition-all cursor-pointer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          <span>Add task</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DOCKED TASK INSPECTOR DRAWER (Right Side) */}
              {showInspector && selectedTask && (
                <aside className="w-[430px] flex-shrink-0 bg-surface-container-lowest rounded-2xl shadow-xl flex flex-col p-space-lg self-stretch sticky top-0 border border-outline-variant/20 max-h-[calc(100vh-140px)] overflow-y-auto">
                  <div className="flex items-center justify-between pb-space-md border-b border-outline-variant/15">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-tabular-mono text-label-sm font-bold">
                        {selectedTask.code}
                      </span>
                      <span className="text-outline text-label-sm">•</span>
                      <span className="text-on-surface-variant font-label-sm text-label-sm">
                        Sprint Workspace
                      </span>
                    </div>
                    <button
                      onClick={() => setShowInspector(false)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  {/* Task Header & Title */}
                  <div className="pt-space-md space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedTask.priority && (() => {
                        const pStyle = getLabelStyle(selectedTask.priority);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold border ${pStyle.bg} ${pStyle.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                            {selectedTask.priority}
                          </span>
                        );
                      })()}
                      {selectedTask.category && (() => {
                        const cStyle = getLabelStyle(selectedTask.category);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-medium border ${cStyle.bg} ${cStyle.border}`}>
                            {selectedTask.category}
                          </span>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => toggleDailyHighlight(selectedTask.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold border transition-all cursor-pointer ${
                          selectedTask.isHighlight
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                            : "bg-surface-container hover:bg-amber-500/10 border-outline-variant/30 text-outline hover:text-amber-500"
                        }`}
                        title={selectedTask.isHighlight ? "Remove Primary Highlight" : "Designate as Today's Primary Highlight"}
                      >
                        <span className={`material-symbols-outlined text-[13px] ${selectedTask.isHighlight ? "fill-1 text-amber-500" : ""}`}>
                          {selectedTask.isHighlight ? "star" : "star_outline"}
                        </span>
                        <span>{selectedTask.isHighlight ? "Primary Highlight" : "Make Highlight"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLabelCustomizer(true)}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                        title="Customize Priorities and Category Labels"
                      >
                        <span className="material-symbols-outlined text-[13px]">palette</span>
                        <span>Customize</span>
                      </button>
                    </div>

                    <RolloverDiagnosticBanner task={selectedTask} className="my-2.5" />

                    <h2 className="text-headline-sm font-bold text-on-surface leading-snug">
                      {selectedTask.title}
                    </h2>

                    <p className="text-body-sm text-on-surface-variant leading-relaxed">
                      {selectedTask.description || "No description provided."}
                    </p>
                  </div>

                  {/* Quick Priority & Category selectors */}
                  <div className="grid grid-cols-2 gap-2.5 mt-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/15">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-outline font-semibold uppercase tracking-wider">Priority</span>
                        <button
                          type="button"
                          onClick={() => setShowLabelCustomizer(true)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Edit
                        </button>
                      </div>
                      <select
                        value={selectedTask.priority || ""}
                        onChange={(e) => updateTask(selectedTask.id, { priority: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-label-sm outline-none cursor-pointer border border-outline-variant/20 truncate"
                      >
                        {taskLabels.filter((l) => l.type === "priority").map((l) => (
                          <option key={l.id} value={l.name}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-outline font-semibold uppercase tracking-wider">Category</span>
                        <button
                          type="button"
                          onClick={() => setShowLabelCustomizer(true)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Edit
                        </button>
                      </div>
                      <select
                        value={selectedTask.category || ""}
                        onChange={(e) => updateTask(selectedTask.id, { category: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-label-sm outline-none cursor-pointer border border-outline-variant/20 truncate"
                      >
                        {taskLabels.filter((l) => l.type === "category").map((l) => (
                          <option key={l.id} value={l.name}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Properties Grid */}
                  <div className="grid grid-cols-2 gap-3 py-space-md border-y border-outline-variant/15 my-space-md text-body-sm">
                    <div>
                      <span className="text-label-sm text-outline block">Status</span>
                      <span className="font-semibold text-primary capitalize">
                        {selectedTask.status?.replace("_", " ") || "Ready"}
                      </span>
                    </div>
                    <div>
                      <span className="text-label-sm text-outline block">Assignee</span>
                      <span className="font-semibold text-on-surface">
                        {selectedTask.assignee || displayName}
                      </span>
                    </div>
                    <div>
                      <span className="text-label-sm text-outline block">Cognitive Effort</span>
                      <span className="font-semibold text-on-surface">
                        {selectedTask.effort || "⚡⚡ Med"}
                      </span>
                    </div>
                    <div>
                      <span className="text-label-sm text-outline block">Duration</span>
                      <span className="font-semibold text-secondary">
                        {selectedTask.duration || "30 min"}
                      </span>
                    </div>
                  </div>

                  {/* Quick Column Relocate */}
                  <div className="space-y-2 mb-4">
                    <span className="text-label-sm text-outline block">Move Column</span>
                    <div className="flex flex-wrap gap-1.5">
                      {COLUMNS.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => moveTaskStatus(selectedTask.id, col.id)}
                          className={`px-2.5 py-1 rounded-lg text-label-sm cursor-pointer transition-colors ${
                            selectedTask.status === col.id
                              ? "bg-primary text-on-primary font-bold shadow-sm"
                              : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {col.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="pt-space-md space-y-2 border-t border-outline-variant/15">
                    <span className="text-label-md font-semibold block">Activity Stream</span>
                    <div className="flex items-center gap-2 text-label-sm text-outline p-2.5 rounded-lg bg-surface-container-low">
                      <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
                      <span>Real-time cloud synchronized with Today's Focus</span>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ADD TASK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl p-6 space-y-4 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm font-bold text-on-surface">Add Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
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
                  placeholder="e.g. Implement drag & drop reordering"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Initial Column
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="ready">Ready for Today</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

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
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                  >
                    {taskLabels.filter((l) => l.type === "priority").map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                >
                  {taskLabels.filter((l) => l.type === "category").map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-label-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container cursor-pointer"
                >
                  Create Task
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
    </div>
  );
}
