import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import image from "../assets/logo.png";
import { useApp } from "../context/AppContext";

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
    deleteHabit,
    habitsCount,
    activeTasksCount,
    highImpactCount,
    flowVelocityScore,
    timerSeconds,
    timerRunning,
    formattedTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerSeconds,
  } = useApp();

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
  const [newTaskCategory, setNewTaskCategory] = useState("high-impact");
  const [newTaskDuration, setNewTaskDuration] = useState("30 min");

  // Edit task modal state
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskCategory, setEditTaskCategory] = useState("high-impact");
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

  // Auth gatekeeper
  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  // Task Actions
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await createTask({
      title: newTaskTitle.trim(),
      description: "Added to priority workspace queue.",
      category: newTaskCategory,
      priority:
        newTaskCategory === "high-impact"
          ? "P1 Urgent & High Impact"
          : newTaskCategory === "quick-wins"
            ? "P2 Strategic"
            : "P3 Maintenance",
      duration: newTaskDuration,
      effort: newTaskCategory === "high-impact" ? "⚡⚡⚡ Deep Focus" : "⚡ Light Effort",
      tags: ["#Task"],
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
    setEditTaskCategory(task.category || "high-impact");
    setEditTaskDuration(task.duration || "30 min");
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;

    const updatedPriority =
      editTaskCategory === "high-impact"
        ? "P1 Urgent & High Impact"
        : editTaskCategory === "quick-wins"
          ? "P2 Strategic"
          : "P3 Maintenance";

    const updatedEffort =
      editTaskCategory === "high-impact" ? "⚡⚡⚡ Deep Focus" : "⚡ Light Effort";

    const updatedFields = {
      title: editTaskTitle.trim(),
      description: editTaskDescription.trim(),
      category: editTaskCategory,
      priority: updatedPriority,
      duration: editTaskDuration.trim() || "30 min",
      effort: updatedEffort,
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

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "all") return true;
    return t.category === activeFilter;
  });

  const completedCount = tasks.filter((t) => t.completed).length;

  // Daily Rhythm Timeline Blocks
  const TIMELINE_BLOCKS = [
    {
      id: "prep",
      title: "Morning Prep",
      subtitle: "Habits & Planning",
      start: 8.5,  // 08:30 AM
      end: 9.5,    // 09:30 AM
      timeLabel: "08:30 – 09:30",
      width: "w-[15%]",
    },
    {
      id: "deep-work",
      title:
        tasks.find((t) => !t.completed && (t.category === "high-impact" || t.effort?.includes("Deep")))?.title ||
        tasks.find((t) => !t.completed)?.title ||
        "Deep Work Sprint - 01",
      subtitle: "Deep Focus (P1)",
      start: 9.5,  // 09:30 AM
      end: 12.5,   // 12:30 PM
      timeLabel: "09:30 – 12:30",
      width: "w-[38%]",
    },
    {
      id: "lunch",
      title: "Lunch & Recharge",
      subtitle: "Recovery",
      start: 12.5, // 12:30 PM
      end: 13.5,   // 01:30 PM
      timeLabel: "12:30 – 01:30",
      width: "w-[15%]",
    },
    {
      id: "collab",
      title:
        tasks.find((t) => !t.completed && t.category === "quick-wins")?.title ||
        "Deep Work Sprint - 02",
      subtitle: "Strategic Alignment",
      start: 13.5, // 01:30 PM
      end: 15.5,   // 03:30 PM
      timeLabel: "01:30 – 03:30",
      width: "w-[16%]",
    },
    {
      id: "wrap",
      title: "Wrap-up",
      subtitle: "Triage & Reflection",
      start: 15.5, // 03:30 PM
      end: 17.5,   // 05:30 PM
      timeLabel: "03:30 – 05:30",
      width: "w-[16%]",
    },
  ];

  const activeTimelineBlock = TIMELINE_BLOCKS.find(
    (b) => nowDecimal >= b.start && nowDecimal < b.end
  );

  const timelineProgressPercent =
    nowDecimal < 8.5
      ? 0
      : nowDecimal > 17.5
      ? 100
      : ((nowDecimal - 8.5) / (17.5 - 8.5)) * 100;

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const firstName = displayName.split(" ")[0];

  // Chronotype schedule mapping
  const chronotype = userProfile?.chronotype || "lark";

  const CHRONO_CONFIG = {
    lark: {
      name: "Morning Lark",
      peakStart: 8.5,
      peakEnd: 12.5,
      windowLabel: "8:30 AM – 12:30 PM",
      energyProfile: { peak: "High ⚡", offPeak: "Steady ⚡" },
    },
    falcon: {
      name: "Steady Falcon",
      peakStart: 11.0,
      peakEnd: 16.5,
      windowLabel: "11:00 AM – 4:30 PM",
      energyProfile: { peak: "High ⚡", offPeak: "Steady ⚡" },
    },
    owl: {
      name: "Night Owl",
      peakStart: 17.0,
      peakEnd: 22.5,
      windowLabel: "5:00 PM – 10:30 PM",
      energyProfile: { peak: "Surge ⚡", offPeak: "Calm 🌙" },
    },
  };

  const activeChrono = CHRONO_CONFIG[chronotype] || CHRONO_CONFIG.lark;
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
    userProfile?.completedBlocks ??
    (completedCount > 0 ? Math.min(completedCount, targetBlocks) : 0);
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
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Projects &amp; Lists
                </span>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="text-outline hover:text-on-surface transition-colors cursor-pointer"
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
                    <span className="truncate font-body-sm text-body-sm">Personal Rituals</span>
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
          {/* Search bar */}
          <div className="flex items-center gap-space-md flex-1 max-w-lg">
            <div className="relative w-full flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                search
              </span>
              <input
                className="w-full pl-9 pr-14 py-2 bg-surface-container-high/60 hover:bg-surface-container-high focus:bg-surface-container-lowest text-on-surface placeholder:text-outline rounded-lg outline-none font-body-sm text-body-sm transition-all"
                placeholder="Search tasks, tags, or jump to..."
                type="text"
              />
              <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-tabular-mono text-label-sm select-none">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Header Widget */}
          <div className="flex items-center gap-space-md">
            {/* Global Synchronized Focus Session Widget */}
            <div className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
              <span className="material-symbols-outlined text-tertiary text-[18px]">timer</span>
              <span className="font-tabular-mono text-body-sm font-semibold">
                {formattedTimer}
              </span>
              <span className="font-label-sm text-label-sm text-outline">Focus Session</span>
              <button
                onClick={() => (timerRunning ? pauseTimer() : startTimer())}
                className={`ml-1 w-5 h-5 flex items-center justify-center rounded-full text-on-primary transition-colors cursor-pointer ${
                  timerRunning ? "bg-secondary" : "bg-primary"
                }`}
                type="button"
                title={timerRunning ? "Pause Timer" : "Start Timer"}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {timerRunning ? "pause" : "play_arrow"}
                </span>
              </button>
            </div>

            {/* Notification bell */}
            <div className="relative">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </button>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
            </div>

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
                    <div className="flex items-center gap-space-xs">
                      {isFlowPeakActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                          Flow Peak Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                          {nowDecimal < activeChrono.peakStart ? "Cadence Priming" : "Async Cadence"}
                        </span>
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
                          Circadian peak scheduled for{" "}
                          <span className="font-tabular-mono font-semibold text-primary">
                            {activeChrono.windowLabel}
                          </span>
                          . {tasks.length} tasks scheduled with instant dynamic sync.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center gap-space-xs">
                    <button
                      onClick={() => setShowNewTaskModal(true)}
                      className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all shadow-sm cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px] text-tertiary">
                        add_task
                      </span>
                      <span>Plan Next Block</span>
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
                        {completedCount} <span className="text-outline font-normal">of {tasks.length} ({completionRate}%)</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-primary-fixed/60 flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">nest_clock_farsight_analog</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm text-outline block truncate">Pomodoro Blocks</span>
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

                {/* PRIORITY TASK QUEUE */}
                <section className="flex flex-col gap-y-space-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                    <div>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Smart Priority Queue
                      </h2>
                      <p className="font-body-sm text-body-sm text-outline">
                        Organized dynamically by cognitive load &amp; deadline urgency
                      </p>
                    </div>

                    {/* Segmented Filter */}
                    <div className="inline-flex p-1 rounded-lg bg-surface-container-high gap-0.5 select-none self-start sm:self-auto">
                      {[
                        { key: "all", label: `All (${tasks.length})` },
                        { key: "high-impact", label: "High Impact" },
                        { key: "quick-wins", label: "Quick Wins" },
                        { key: "habits", label: "Personal" },
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
                  </div>

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
                        <p className="font-headline-sm font-semibold text-on-surface">No tasks in this view</p>
                        <p className="font-body-sm text-outline mt-1">
                          Click "Plan Next Block" or create a new task to get started.
                        </p>
                      </div>
                    ) : (
                      filteredTasks.map((t) => (
                        <div
                          key={t.id}
                          className={`group relative p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col gap-y-space-sm border border-outline-variant/10 ${
                            t.completed ? "opacity-75" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-space-sm">
                            <div className="flex items-start gap-space-sm min-w-0">
                              {/* Interactive Checkbox */}
                              <button
                                onClick={() => toggleTaskCompletion(t.id)}
                                className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
                                  t.completed
                                    ? "bg-secondary text-on-secondary"
                                    : "bg-surface-container-lowest text-transparent hover:bg-primary/10 border border-outline-variant"
                                }`}
                                type="button"
                              >
                                <span
                                  className={`material-symbols-outlined text-[16px] ${
                                    t.completed ? "opacity-100" : "opacity-0"
                                  }`}
                                >
                                  check
                                </span>
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-space-xs flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                                      t.category === "high-impact"
                                        ? "bg-error-container text-on-error-container"
                                        : t.category === "quick-wins"
                                          ? "bg-secondary-container text-on-secondary-container"
                                          : "bg-surface-container-high text-on-surface-variant"
                                    }`}
                                  >
                                    {t.priority}
                                  </span>
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
                              </div>
                            </div>

                            {/* Quick action icons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Daily Rhythm Timeline
                        </h2>
                        <span className="font-tabular-mono text-label-sm text-primary px-2 py-0.5 rounded-full bg-primary-container/40 font-semibold border border-primary/20">
                          {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-outline">
                        Synchronized in real-time with your system clock and cognitive cycles
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeTimelineBlock ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary font-tabular-mono text-label-sm font-bold shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>ACTIVE: {activeTimelineBlock.timeLabel}</span>
                        </div>
                      ) : nowDecimal < 8.5 ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-tabular-mono text-label-sm font-semibold">
                          <span className="w-2 h-2 rounded-full bg-outline" />
                          <span>STARTS AT 08:30 AM</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-tabular-mono text-label-sm font-semibold">
                          <span className="w-2 h-2 rounded-full bg-secondary" />
                          <span>EVENING RECHARGE</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Timeline Bar */}
                  <div className="space-y-space-xs">
                    <div className="grid grid-cols-5 text-center font-tabular-mono text-label-sm text-outline px-1">
                      <div>08:30 AM</div>
                      <div>09:30 AM</div>
                      <div>12:30 PM</div>
                      <div>01:30 PM</div>
                      <div>05:30 PM</div>
                    </div>

                    <div className="relative h-16 w-full rounded-xl bg-surface-container overflow-hidden flex items-stretch p-1 gap-1.5 shadow-inner">
                      {/* Real-time Indicator Line */}
                      {nowDecimal >= 8.5 && nowDecimal <= 17.5 && (
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
                        onClick={resetTimer}
                        className="p-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                        title="Reset Session"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                      </button>
                    </div>
                  </div>

                  {/* Soundscape pill group */}
                  <div className="space-y-space-xs pt-space-xs">
                    <label className="font-label-sm text-label-sm text-outline block">
                      AMBIENT SOUNDSCAPE
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-surface-container">
                      {[
                        { id: "rain", label: "🌧️ Lo-Fi Rain" },
                        { id: "noise", label: "📻 White Noise" },
                        { id: "forest", label: "🌲 Forest" },
                      ].map((snd) => (
                        <button
                          key={snd.id}
                          onClick={() => setActiveSound(snd.id)}
                          className={`py-1.5 px-2 rounded-md font-label-sm text-label-sm text-center transition-all cursor-pointer ${
                            activeSound === snd.id
                              ? "bg-surface-container-lowest text-primary font-semibold shadow-xs"
                              : "text-on-surface-variant hover:text-on-surface"
                          }`}
                          type="button"
                        >
                          {snd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* HABITS WIDGET */}
                <section className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-y-space-md border border-outline-variant/10">
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
                            <span
                              className={`font-body-sm text-body-sm truncate ${
                                h.done ? "line-through text-outline" : "text-on-surface"
                              }`}
                            >
                              {h.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="font-tabular-mono text-label-sm text-outline">
                              {h.duration} · {h.done ? "Done" : "Pending"}
                            </span>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Priority / Tier
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none"
                  >
                    <option value="high-impact">High Impact (P1)</option>
                    <option value="quick-wins">Quick Wins (P2)</option>
                    <option value="habits">Personal / Habit (P3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Estimated Time
                  </label>
                  <input
                    type="text"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(e.target.value)}
                    placeholder="e.g. 45 min"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none"
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Priority / Tier
                  </label>
                  <select
                    value={editTaskCategory}
                    onChange={(e) => setEditTaskCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none cursor-pointer"
                  >
                    <option value="high-impact">High Impact (P1)</option>
                    <option value="quick-wins">Quick Wins (P2)</option>
                    <option value="habits">Personal / Habit (P3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Estimated Time
                  </label>
                  <input
                    type="text"
                    value={editTaskDuration}
                    onChange={(e) => setEditTaskDuration(e.target.value)}
                    placeholder="e.g. 45 min"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface outline-none"
                  />
                </div>
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
    </div>
  );
}