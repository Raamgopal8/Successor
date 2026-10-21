import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import image from "../assets/logo.png";
import { useApp } from "../context/AppContext";

const COLUMNS = [
  { id: "backlog", title: "Backlog", dotColor: "bg-outline", countBg: "bg-surface-container-highest" },
  { id: "ready", title: "Ready for Today", dotColor: "bg-primary", countBg: "bg-primary text-on-primary", isPrimary: true },
  { id: "in_progress", title: "In Progress", dotColor: "bg-tertiary animate-pulse", countBg: "bg-surface-container-highest" },
  { id: "review", title: "Review & QA", dotColor: "bg-secondary-fixed-dim", countBg: "bg-surface-container-highest" },
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
    habitsCount,
    activeTasksCount,
    highImpactCount,
    flowVelocityScore,
    formattedTimer,
    timerRunning,
    startTimer,
    pauseTimer,
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showInspector, setShowInspector] = useState(false);

  // New Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("ready");
  const [newTaskCategory, setNewTaskCategory] = useState("Frontend");

  // Redirect if logged out
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [authLoading, currentUser, navigate]);

  // Selected Task reference
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0] || null;

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

    const created = await createTask({
      title: newTaskTitle.trim(),
      description: "Added directly from Sprint Board.",
      status: newTaskStatus || "ready",
      category: newTaskCategory || "Work Sprint",
      effort: newTaskStatus === "ready" ? "⚡⚡⚡ Deep" : "⚡⚡ Med",
      priority: newTaskStatus === "ready" ? "P1 Urgent" : "P2 Med",
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

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchTag = t.category?.toLowerCase().includes(q);
      const matchCode = t.code?.toLowerCase().includes(q);
      if (!matchTitle && !matchTag && !matchCode) return false;
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
                    <span className="truncate font-body-sm text-body-sm">Personal Rituals</span>
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
          <div className="flex items-center gap-space-md flex-1 max-w-lg">
            <div className="relative w-full flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-14 py-2 bg-surface-container-high/60 hover:bg-surface-container-high focus:bg-surface-container-lowest text-on-surface placeholder:text-outline rounded-lg outline-none font-body-sm text-body-sm transition-all"
                placeholder="Search tasks, tags, or jump to..."
                type="text"
              />
              <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-tabular-mono text-label-sm select-none">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-space-md">
            {/* Live Shared Focus Session Pill */}
            <div className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
              <span className="material-symbols-outlined text-tertiary text-[18px]">timer</span>
              <span className="font-tabular-mono text-body-sm font-semibold">{formattedTimer}</span>
              <span className="font-label-sm text-label-sm text-outline">Focus Session</span>
              <button
                onClick={() => (timerRunning ? pauseTimer() : startTimer())}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
                type="button"
                title={timerRunning ? "Pause timer" : "Start timer"}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {timerRunning ? "pause" : "play_arrow"}
                </span>
              </button>
            </div>

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

            {/* KANBAN COLUMNS + INSPECTOR DRAWER SPLIT */}
            <div className="flex gap-space-lg items-start w-full min-h-[calc(100vh-230px)] overflow-x-auto pb-6">
              {/* 5 Column Canvas */}
              <div className="flex gap-space-md flex-1 min-w-[1040px] items-start">
                {COLUMNS.map((col) => {
                  const colTasks = filteredTasks.filter((t) => t.status === col.id);
                  return (
                    <div
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
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-outline/40 group-hover:text-outline text-[16px] cursor-grab">
                                    drag_indicator
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-surface-container font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
                                    {task.category || "Sprint"}
                                  </span>
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-tabular-mono text-outline font-medium">
                                  {task.effort || "⚡ Med"}
                                </span>
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
                      <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-[11px] font-bold">
                        {selectedTask.priority || "P1 Urgent"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-medium">
                        {selectedTask.category || "General"}
                      </span>
                    </div>

                    <h2 className="text-headline-sm font-bold text-on-surface leading-snug">
                      {selectedTask.title}
                    </h2>

                    <p className="text-body-sm text-on-surface-variant leading-relaxed">
                      {selectedTask.description || "No description provided."}
                    </p>
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
              <h3 className="text-headline-sm font-bold text-on-surface">Add Kanban Task</h3>
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

              <div className="grid grid-cols-2 gap-3">
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
                    <option value="review">Review &amp; QA</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    placeholder="e.g. Frontend"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface outline-none"
                  />
                </div>
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
    </div>
  );
}
