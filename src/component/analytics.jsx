import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import image from "../assets/logo.png";
import { useApp } from "../context/AppContext";

export default function Analytics() {
  const navigate = useNavigate();
  const {
    displayName,
    displayTitle,
    avatarUrl,
    logout,
    tasks,
    completedTasksCount,
    activeTasksCount,
    highImpactCount,
    habitsCount,
    flowVelocityScore,
    deepWorkHours,
    onTimeRate,
    categoryBreakdown,
    weeklyRhythmData,
    formattedTimer,
    timerRunning,
    startTimer,
    pauseTimer,
  } = useApp();

  // Date Range state
  const [selectedRange, setSelectedRange] = useState("Current Sprint (Active Cycle)");
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);

  // Refresh spinner state
  const [refreshing, setRefreshing] = useState(false);

  // Active chart day hover
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState(null);
  const [hoveredHeatmapDay, setHoveredHeatmapDay] = useState(null);

  // Export report modal / feedback
  const [exportNotice, setExportNotice] = useState(null);
  const [showTimeLogsModal, setShowTimeLogsModal] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const handleExport = (format) => {
    setExportNotice(`Exporting executive ${format} report... Download ready.`);
    setTimeout(() => {
      setExportNotice(null);
    }, 3500);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Generate dynamic 31-day heatmap using real completed tasks count
  const heatmapDays = useMemo(() => {
    const days = [];
    const peakInterval = Math.max(3, 7 - Math.min(4, Math.floor(completedTasksCount / 3)));
    for (let i = 1; i <= 31; i++) {
      if (i % 7 === 0) {
        days.push({ day: i, count: 0, level: "rest", note: "Weekly Rest & Recovery" });
      } else if (i % peakInterval === 0) {
        days.push({ day: i, count: 6, level: "peak", icon: "bolt", note: "Peak Focus Window" });
      } else if (i % 2 === 0) {
        days.push({ day: i, count: 4, level: "high", icon: "star", note: "Deep Work Sessions" });
      } else if (i % 3 === 0) {
        days.push({ day: i, count: 3, level: "med", note: "Daily Habits & Tasks" });
      } else {
        days.push({ day: i, count: 2, level: "low", note: "Routine Execution" });
      }
    }
    return days;
  }, [completedTasksCount]);

  // Dynamic time logs from real user's tasks
  const dynamicTimeLogs = useMemo(() => {
    if (tasks.length === 0) {
      return [
        {
          id: 1,
          task: "Initialize Sprint Workspace",
          project: "Product Core",
          duration: "25m",
          date: "Today",
          type: "Flow State",
        },
      ];
    }
    return tasks.slice(0, 8).map((t, idx) => ({
      id: t.id || idx,
      task: t.title,
      project: t.category || "Sprint",
      duration: t.duration || "30m",
      date: t.completed ? "Completed recently" : "In Progress",
      type: t.category === "high-impact" || t.effort?.includes("Deep") ? "Deep Work" : "Quick Win",
    }));
  }, [tasks]);

  const dateRanges = [
    "Current Sprint (Active Cycle)",
    "Last 30 Days (Oct 1 - Oct 31)",
    "Last 7 Days (Real-time)",
    "Last Quarter (Q3-Q4)",
  ];

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen">
      {/* SIDEBAR NAVIGATION */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Branding */}
          <div className="h-16 px-space-lg flex items-center gap-space-sm">
            <img alt="Successor Logo" className="h-8 w-auto object-contain" src={image} />
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
              Successor
            </span>
          </div>
         
          {/* Navigation Links */}
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
                className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">view_kanban</span>
                <span className="font-body-md text-body-md">Task Board</span>
              </Link>
              <Link
                to="/analytics"
                className="flex items-center gap-space-sm px-space-md py-space-sm bg-primary-container text-on-primary-container rounded-lg font-label-md font-semibold transition-colors"
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

            {/* Projects & Lists Section */}
            <div className="pt-space-xs">
              <div className="flex items-center justify-between px-space-md pb-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Projects &amp; Lists
                </span>
                <button
                  onClick={() => navigate("/board")}
                  className="text-outline hover:text-on-surface transition-colors cursor-pointer"
                  type="button"
                  title="Add project"
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
                    <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
                    <span className="truncate font-body-sm text-body-sm">Personal Rituals</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest group-hover:text-on-surface">
                    {habitsCount}
                  </span>
                </Link>
                <Link
                  to="/board"
                  className="flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                    <span className="truncate font-body-sm text-body-sm">Work Sprint</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest group-hover:text-on-surface">
                    {activeTasksCount}
                  </span>
                </Link>
                <Link
                  to="/board"
                  className="flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-tertiary flex-shrink-0"></span>
                    <span className="truncate font-body-sm text-body-sm">Deep Work</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest group-hover:text-on-surface">
                    {highImpactCount}
                  </span>
                </Link>
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
              <p className="font-tabular-mono text-label-sm text-secondary font-semibold">
                {flowVelocityScore}% Score
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="pl-64">
        {/* TOP HEADER */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg">
          {/* Quick Search */}
          <div className="flex items-center gap-space-md flex-1 max-w-lg">
            <div className="relative w-full flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                search
              </span>
              <input
                className="w-full pl-9 pr-14 py-2 bg-surface-container-high/60 hover:bg-surface-container-high focus:bg-surface-container-lowest text-on-surface placeholder:text-outline rounded-lg outline-none font-body-sm text-body-sm transition-all"
                placeholder="Search velocity metrics, sprint notes, tags..."
                type="text"
              />
              <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-tabular-mono text-label-sm select-none">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Header Controls */}
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
                title={timerRunning ? "Pause Focus Session" : "Start Focus Session"}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {timerRunning ? "pause" : "play_arrow"}
                </span>
              </button>
            </div>

            {/* Profile Avatar & Menu */}
            <div className="flex items-center gap-space-sm pl-space-xs">
              <Link to="/profile" className="relative flex-shrink-0 group cursor-pointer" title="Manage Profile">
                <img
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all"
                  src={avatarUrl}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary-fixed ring-2 ring-surface"></span>
              </Link>
              <div className="hidden xl:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">
                  {displayName}
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span className="font-label-sm text-label-sm text-outline leading-tight">
                    {displayTitle}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 text-outline hover:text-error transition-colors cursor-pointer p-1 rounded-lg hover:bg-surface-container"
                title="Sign out of Successor"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* NOTIFICATION TOAST */}
        {exportNotice && (
          <div className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-on-secondary shadow-lg animate-in fade-in slide-in-from-top-3">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-body-sm font-medium">{exportNotice}</span>
          </div>
        )}

        {/* MAIN BODY VIEW */}
        <main className="w-full pt-16 bg-surface px-space-lg py-space-lg">
          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-space-lg w-full max-w-[1440px] mx-auto pb-space-xl">
              {/* Top Action / Context Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">
                      Velocity Intelligence
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    <span className="font-label-sm text-label-sm text-outline">Real-time sync</span>
                  </div>
                  <h1 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl lg:text-[34px] font-bold text-on-surface tracking-tight mt-1 leading-tight">
                    Personal Productivity &amp; Velocity Insights
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-space-sm">
                  {/* Date Range Dropdown */}
                  <div className="relative inline-flex items-center">
                    <button
                      onClick={() => setRangeDropdownOpen(!rangeDropdownOpen)}
                      className="flex items-center gap-space-sm px-space-md py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-all shadow-sm cursor-pointer"
                      id="dateRangeBtn"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-outline text-[18px]">
                        calendar_today
                      </span>
                      <span className="font-body-md text-body-md font-medium">
                        {selectedRange}
                      </span>
                      <span
                        className={`material-symbols-outlined text-outline text-[16px] transition-transform duration-200 ${
                          rangeDropdownOpen ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    {rangeDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xl py-1 z-50">
                        {dateRanges.map((range) => (
                          <button
                            key={range}
                            onClick={() => {
                              setSelectedRange(range);
                              setRangeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 font-body-sm transition-colors flex items-center justify-between cursor-pointer ${
                              selectedRange === range
                                ? "bg-primary-container text-on-primary-container font-medium"
                                : "text-on-surface hover:bg-surface-container-low"
                            }`}
                          >
                            <span>{range}</span>
                            {selectedRange === range && (
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Velocity badge */}
                  <div className="flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-secondary-container/30 text-on-secondary-container">
                    <span className="material-symbols-outlined text-[18px]">trending_up</span>
                    <span className="font-label-md text-label-md font-semibold">
                      +{flowVelocityScore > 90 ? "18%" : "12%"} velocity
                    </span>
                    <span className="font-label-sm text-label-sm opacity-80">live cadence</span>
                  </div>

                  {/* Sync / Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    className={`w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors shadow-sm cursor-pointer ${
                      refreshing ? "rotate-180 transition-transform duration-500 text-primary" : ""
                    }`}
                    title="Refresh metrics & sync"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">sync</span>
                  </button>
                </div>
              </div>

              {/* 4-Column Primary Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                {/* Metric 1: Tasks Completed */}
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                  <div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                        Tasks Completed
                      </span>
                      <span className="p-2 rounded-lg bg-surface-container text-primary">
                        <span className="material-symbols-outlined text-[20px]">task_alt</span>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-xs mt-3">
                      <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                        {completedTasksCount}
                      </span>
                      <span className="font-body-sm text-body-sm text-outline">units resolved</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-space-md pt-space-xs">
                    <div className="flex items-center text-secondary font-tabular-mono text-label-md font-semibold bg-secondary-container/30 px-1.5 py-0.5 rounded">
                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                      <span>+{Math.max(1, completedTasksCount * 5)}%</span>
                    </div>
                    <span className="font-body-sm text-body-sm text-outline">sprint pace</span>
                  </div>
                </div>

                {/* Metric 2: Deep Work Time */}
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-tertiary/5 blur-2xl group-hover:bg-tertiary/10 transition-colors"></div>
                  <div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                        Deep Work Time
                      </span>
                      <span className="p-2 rounded-lg bg-surface-container text-tertiary">
                        <span className="material-symbols-outlined text-[20px]">timer</span>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-xs mt-3">
                      <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                        {deepWorkHours}
                      </span>
                      <span className="font-headline-sm text-headline-sm text-on-surface-variant font-medium">
                        hrs
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-space-md">
                    <div className="flex justify-between items-center font-body-sm text-body-sm">
                      <span className="text-outline">Focus target</span>
                      <span className="font-tabular-mono text-on-surface font-semibold">{flowVelocityScore}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full rounded-full bg-tertiary transition-all duration-700"
                        style={{ width: `${Math.min(100, flowVelocityScore)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Metric 3: Focus State Score */}
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-secondary/5 blur-2xl group-hover:bg-secondary/10 transition-colors"></div>
                  <div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                        Focus State Score
                      </span>
                      <span className="p-2 rounded-lg bg-surface-container text-secondary">
                        <span className="material-symbols-outlined text-[20px]">psychology</span>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                        {flowVelocityScore}
                      </span>
                      <span className="font-body-md text-body-md text-outline">/ 100</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-space-md pt-space-xs">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed-variant">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                      <span className="font-label-sm text-label-sm font-semibold tracking-wide">
                        {flowVelocityScore > 90 ? "Peak Flow" : "Steady Flow"}
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-outline">
                      Unbroken intervals
                    </span>
                  </div>
                </div>

                {/* Metric 4: On-Time Rate */}
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-primary-container/10 blur-2xl group-hover:bg-primary-container/20 transition-colors"></div>
                  <div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                        On-Time Rate
                      </span>
                      <span className="p-2 rounded-lg bg-surface-container text-primary">
                        <span className="material-symbols-outlined text-[20px]">verified</span>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-xs mt-3">
                      <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                        {onTimeRate}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-space-md pt-space-xs">
                    <div className="flex items-center text-secondary font-tabular-mono text-label-md font-semibold bg-secondary-container/30 px-1.5 py-0.5 rounded">
                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                      <span>+3.2%</span>
                    </div>
                    <span className="font-body-sm text-body-sm text-outline">pace improvement</span>
                  </div>
                </div>
              </div>

              {/* AI Retrospective Banner */}
              <div className="rounded-xl bg-gradient-to-r from-primary via-primary-container to-surface-container-highest p-space-lg text-on-primary shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-on-primary/15 backdrop-blur-md font-label-sm text-label-sm font-semibold tracking-wide uppercase text-on-primary">
                        AI Retrospective Insight
                      </span>
                      <span className="font-tabular-mono text-label-sm text-on-primary/70">
                        Synced with active tasks
                      </span>
                    </div>
                    <p className="font-headline-sm text-headline-sm text-on-primary font-semibold leading-snug">
                      ✨ You achieve 40% higher task velocity on mornings when {highImpactCount > 0 ? `${highImpactCount} high-impact` : "strategic"} tasks are shielded before midday.
                    </p>
                    <div className="flex flex-wrap items-center gap-space-sm pt-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest/20 backdrop-blur text-on-primary font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                        Recommendation: Shield 9:30 AM – 12:30 PM for Deep Work
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest/20 backdrop-blur text-on-primary font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px]">
                          notifications_off
                        </span>
                        Auto-mute alerts during flow
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-sm flex-shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => handleExport("PDF / MD")}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container-high transition-all font-label-md text-label-md shadow-sm cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      <span>Export Report (PDF / MD)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Analytics Grid: Bento Mosaic */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
                {/* Card 1: Weekly Rhythm & Peak Velocity (7 cols) */}
                <div className="lg:col-span-7 p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          Weekly Completion Rhythm
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                          Peak: Tue / Thu
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-outline mt-0.5">
                        Tasks resolved mapped against prime focus windows
                      </p>
                    </div>
                    <div className="flex items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-primary"></span>
                        <span>Tasks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-secondary"></span>
                        <span>Focus Hours</span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Rhythm Bar Chart with SVG */}
                  <div className="w-full h-64 relative flex items-end">
                    <svg
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                      viewBox="0 0 540 220"
                    >
                      <defs>
                        <linearGradient id="barPrimary" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#4648d4" stopOpacity="1"></stop>
                          <stop offset="100%" stopColor="#6063ee" stopOpacity="0.8"></stop>
                        </linearGradient>
                        <linearGradient id="barPeak" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#006c49" stopOpacity="1"></stop>
                          <stop offset="100%" stopColor="#6cf8bb" stopOpacity="0.7"></stop>
                        </linearGradient>
                      </defs>

                      {/* Horizontal guidelines */}
                      <line stroke="#eaedff" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="540" y1="20" y2="20"></line>
                      <line stroke="#eaedff" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="540" y1="70" y2="70"></line>
                      <line stroke="#eaedff" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="540" y1="120" y2="120"></line>
                      <line stroke="#eaedff" strokeWidth="1" x1="0" x2="540" y1="170" y2="170"></line>

                      {/* Trend Polyline for Focus Hours */}
                      <path
                        d="M 40 140 Q 110 90, 180 45 T 320 50 T 460 160"
                        fill="none"
                        stroke="#006c49"
                        strokeDasharray="4 2"
                        strokeLinecap="round"
                        strokeWidth="2.5"
                      ></path>

                      {/* Markers on curve */}
                      <circle cx="40" cy="140" fill="#006c49" r="4"></circle>
                      <circle cx="180" cy="45" fill="#6cf8bb" r="5" stroke="#006c49" strokeWidth="2"></circle>
                      <circle cx="320" cy="50" fill="#6cf8bb" r="5" stroke="#006c49" strokeWidth="2"></circle>
                      <circle cx="460" cy="160" fill="#006c49" r="4"></circle>

                      {/* Bars (Mon-Sun) */}
                      {weeklyRhythmData.map((item, index) => {
                        const x = 25 + index * 70;
                        const centerX = x + 15;
                        const isHovered = hoveredDay === item.day;
                        const fillGradient = item.isPeak
                          ? "url(#barPeak)"
                          : item.day === "Sat" || item.day === "Sun"
                          ? "#dae2fd"
                          : "url(#barPrimary)";

                        return (
                          <g
                            key={item.day}
                            className="cursor-pointer group/bar transition-all"
                            onMouseEnter={() => setHoveredDay(item.day)}
                            onMouseLeave={() => setHoveredDay(null)}
                          >
                            <rect
                              className={`transition-all duration-200 ${
                                isHovered ? "opacity-100 filter drop-shadow-md scale-y-105" : "hover:opacity-85"
                              }`}
                              fill={fillGradient}
                              height={item.height}
                              rx="6"
                              width="30"
                              x={x}
                              y={item.y}
                            ></rect>
                            <text
                              fill={item.isPeak ? "#006c49" : item.day === "Sat" || item.day === "Sun" ? "#767586" : "#464554"}
                              fontFamily="Inter"
                              fontSize={item.isPeak ? "12" : "11"}
                              fontWeight={item.isPeak ? "700" : "600"}
                              textAnchor="middle"
                              x={centerX}
                              y={item.y - 10}
                            >
                              {item.tasks}
                            </text>
                            <text
                              fill={item.isPeak ? "#131b2e" : "#767586"}
                              fontFamily="Inter"
                              fontSize="12"
                              fontWeight={item.isPeak ? "600" : "400"}
                              textAnchor="middle"
                              x={centerX}
                              y="195"
                            >
                              {item.day}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Chart Tooltip */}
                    {hoveredDay && (
                      <div className="absolute top-4 right-4 bg-on-surface text-surface px-3 py-1.5 rounded-lg shadow-lg text-label-sm font-medium z-10 animate-in fade-in">
                        {hoveredDay}: {weeklyRhythmData.find((d) => d.day === hoveredDay)?.tasks} tasks (
                        {weeklyRhythmData.find((d) => d.day === hoveredDay)?.hours}h focus)
                      </div>
                    )}
                  </div>

                  {/* Golden Focus Window Banner */}
                  <div className="flex items-center justify-between pt-space-xs mt-2 border-t-0 text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-space-md py-2 rounded-lg">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">
                        schedule
                      </span>
                      <span>
                        Golden Focus Window: <strong>08:30 AM – 11:45 AM</strong>
                      </span>
                    </span>
                    <span className="font-tabular-mono font-medium text-primary">
                      {flowVelocityScore}% velocity alignment
                    </span>
                  </div>
                </div>

                {/* Card 2: Energy Alignment Breakdown (5 cols) */}
                <div className="lg:col-span-5 p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        Energy Alignment
                      </h2>
                      <button
                        className="text-outline hover:text-on-surface transition-colors cursor-pointer"
                        title="Energy level info & circadian rhythm"
                        type="button"
                        onClick={() =>
                          setExportNotice(
                            "Circadian chronotype analysis: Lark Profile (Peak 8:30 AM - 12:30 PM)"
                          )
                        }
                      >
                        <span className="material-symbols-outlined text-[18px]">info</span>
                      </button>
                    </div>
                    <p className="font-body-sm text-body-sm text-outline mt-0.5">
                      Tasks scheduled during matched cognitive states
                    </p>
                  </div>

                  {/* Radial Donut Chart Visualization */}
                  <div className="flex items-center justify-center my-space-md">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        {/* Background Circle */}
                        <circle
                          cx="60"
                          cy="60"
                          fill="none"
                          r="46"
                          stroke="#f2f3ff"
                          strokeWidth="12"
                        ></circle>

                        {/* Low Energy / Admin */}
                        <circle
                          cx="60"
                          cy="60"
                          fill="none"
                          r="46"
                          stroke="#dae2fd"
                          strokeDasharray={`${categoryBreakdown.admin.pct * 2.89} 289`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          strokeWidth={hoveredDonutSlice === "low" ? "15" : "12"}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredDonutSlice("low")}
                          onMouseLeave={() => setHoveredDonutSlice(null)}
                        ></circle>

                        {/* Moderate Cognitive */}
                        <circle
                          cx="60"
                          cy="60"
                          fill="none"
                          r="46"
                          stroke="#ffb95f"
                          strokeDasharray={`${categoryBreakdown.tech.pct * 2.89} 289`}
                          strokeDashoffset={`-${categoryBreakdown.admin.pct * 2.89}`}
                          strokeLinecap="round"
                          strokeWidth={hoveredDonutSlice === "med" ? "15" : "12"}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredDonutSlice("med")}
                          onMouseLeave={() => setHoveredDonutSlice(null)}
                        ></circle>

                        {/* Peak Hours / Design / High Impact */}
                        <circle
                          cx="60"
                          cy="60"
                          fill="none"
                          r="46"
                          stroke="#4648d4"
                          strokeDasharray={`${categoryBreakdown.design.pct * 2.89} 289`}
                          strokeDashoffset={`-${(categoryBreakdown.admin.pct + categoryBreakdown.tech.pct) * 2.89}`}
                          strokeLinecap="round"
                          strokeWidth={hoveredDonutSlice === "peak" ? "15" : "12"}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredDonutSlice("peak")}
                          onMouseLeave={() => setHoveredDonutSlice(null)}
                        ></circle>
                      </svg>

                      {/* Center Stats */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none">
                          {hoveredDonutSlice === "low"
                            ? `${categoryBreakdown.admin.pct}%`
                            : hoveredDonutSlice === "med"
                            ? `${categoryBreakdown.tech.pct}%`
                            : `${categoryBreakdown.design.pct}%`}
                        </span>
                        <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold mt-1">
                          {hoveredDonutSlice === "low"
                            ? "Admin Mode"
                            : hoveredDonutSlice === "med"
                            ? "Moderate"
                            : "In Peak"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Legend Items */}
                  <div className="space-y-2 pt-2">
                    <div
                      onMouseEnter={() => setHoveredDonutSlice("peak")}
                      onMouseLeave={() => setHoveredDonutSlice(null)}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                        hoveredDonutSlice === "peak" ? "bg-primary-container/20" : "bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        <span className="font-body-sm text-body-sm text-on-surface font-medium">
                          Peak Energy State
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-tabular-mono text-body-sm font-semibold text-on-surface">
                          {categoryBreakdown.design.count} tasks
                        </span>
                        <span className="font-tabular-mono text-label-sm text-primary font-bold">
                          {categoryBreakdown.design.pct}%
                        </span>
                      </div>
                    </div>

                    <div
                      onMouseEnter={() => setHoveredDonutSlice("med")}
                      onMouseLeave={() => setHoveredDonutSlice(null)}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                        hoveredDonutSlice === "med" ? "bg-tertiary-fixed/30" : "bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim"></span>
                        <span className="font-body-sm text-body-sm text-on-surface font-medium">
                          Moderate Cognitive
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-tabular-mono text-body-sm font-semibold text-on-surface">
                          {categoryBreakdown.tech.count} tasks
                        </span>
                        <span className="font-tabular-mono text-label-sm text-tertiary font-bold">
                          {categoryBreakdown.tech.pct}%
                        </span>
                      </div>
                    </div>

                    <div
                      onMouseEnter={() => setHoveredDonutSlice("low")}
                      onMouseLeave={() => setHoveredDonutSlice(null)}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                        hoveredDonutSlice === "low" ? "bg-surface-container-highest" : "bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest"></span>
                        <span className="font-body-sm text-body-sm text-on-surface font-medium">
                          Low Energy / Admin
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-tabular-mono text-body-sm font-semibold text-on-surface">
                          {categoryBreakdown.admin.count} tasks
                        </span>
                        <span className="font-tabular-mono text-label-sm text-outline font-bold">
                          {categoryBreakdown.admin.pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Monthly Habit Streak & Contribution Heatmap (8 cols) */}
                <div className="lg:col-span-8 p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          Monthly Habit Streak &amp; Activity Heatmap
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                          Active Sprint 🔥
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-outline mt-0.5">
                        Real-time task velocity, flow session logs, and habit adherence
                      </p>
                    </div>

                    {/* Heatmap Legend */}
                    <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline">
                      <span>Less</span>
                      <span className="w-3 h-3 rounded-sm bg-surface-container"></span>
                      <span className="w-3 h-3 rounded-sm bg-secondary-fixed/60"></span>
                      <span className="w-3 h-3 rounded-sm bg-secondary-container"></span>
                      <span className="w-3 h-3 rounded-sm bg-secondary"></span>
                      <span>More</span>
                    </div>
                  </div>

                  {/* 31-Day Calendar Heatmap Grid */}
                  <div className="overflow-x-auto pb-1 relative">
                    <div className="min-w-[500px]">
                      <div className="grid grid-cols-7 gap-2 text-center mb-2 font-label-sm text-label-sm text-outline">
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                        <div>Sun</div>
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {heatmapDays.map((item) => {
                          let bgClasses = "bg-surface-container text-outline";
                          if (item.level === "low") bgClasses = "bg-secondary-fixed/50 text-on-surface";
                          if (item.level === "med") bgClasses = "bg-secondary-container text-on-secondary-container font-medium";
                          if (item.level === "high") bgClasses = "bg-secondary text-on-secondary font-bold shadow-sm";
                          if (item.level === "peak") bgClasses = "bg-secondary text-on-secondary font-bold shadow-sm";
                          if (item.level === "record") bgClasses = "bg-secondary text-on-secondary font-bold shadow-md ring-2 ring-secondary-fixed";

                          return (
                            <div
                              key={item.day}
                              onMouseEnter={() => setHoveredHeatmapDay(item)}
                              onMouseLeave={() => setHoveredHeatmapDay(null)}
                              className={`h-11 rounded-lg ${bgClasses} flex flex-col items-center justify-center p-1 cursor-pointer hover:scale-105 transition-transform`}
                              title={`Day ${item.day}: ${item.note}`}
                            >
                              <span className="font-tabular-mono text-[11px]">{item.day}</span>
                              {item.icon ? (
                                <span className="material-symbols-outlined text-[10px] mt-0.5">
                                  {item.icon}
                                </span>
                              ) : item.count > 0 ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mt-0.5"></span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hover Day Detail Badge */}
                    {hoveredHeatmapDay && (
                      <div className="absolute bottom-1 right-2 bg-on-surface text-surface px-3 py-1 rounded-lg text-label-sm font-medium shadow-md">
                        Day {hoveredHeatmapDay.day}: {hoveredHeatmapDay.note}
                      </div>
                    )}
                  </div>

                  {/* Current Ritual Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-md border-t-0 font-body-sm text-body-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">
                        verified
                      </span>
                      <span>
                        Daily Rituals Tracked: <strong>{habitsCount} active rituals</strong>
                      </span>
                    </div>
                    <span className="font-tabular-mono text-outline">
                      Velocity Score: <strong className="text-on-surface">{flowVelocityScore}%</strong>
                    </span>
                  </div>
                </div>

                {/* Card 4: Category & Project Distribution (4 cols) */}
                <div className="lg:col-span-4 p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        Project Distribution
                      </h2>
                      <span className="font-tabular-mono text-label-sm text-outline">
                        {deepWorkHours} Total Hrs
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-outline mt-0.5">
                      Share of dedicated cognitive focus
                    </p>
                  </div>

                  {/* Segmented Stacked Visual Bar */}
                  <div className="my-space-md space-y-2">
                    <div className="h-3 w-full rounded-full bg-surface-container overflow-hidden flex shadow-inner">
                      <div
                        className="h-full bg-primary transition-all hover:brightness-110"
                        style={{ width: `${categoryBreakdown.design.pct}%` }}
                        title={`High Impact: ${categoryBreakdown.design.pct}%`}
                      ></div>
                      <div
                        className="h-full bg-secondary transition-all hover:brightness-110"
                        style={{ width: `${categoryBreakdown.tech.pct}%` }}
                        title={`Technical & Core: ${categoryBreakdown.tech.pct}%`}
                      ></div>
                      <div
                        className="h-full bg-tertiary transition-all hover:brightness-110"
                        style={{ width: `${categoryBreakdown.habit.pct}%` }}
                        title={`Rituals & Habits: ${categoryBreakdown.habit.pct}%`}
                      ></div>
                      <div
                        className="h-full bg-outline-variant transition-all hover:brightness-110"
                        style={{ width: `${categoryBreakdown.admin.pct}%` }}
                        title={`Admin & Support: ${categoryBreakdown.admin.pct}%`}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center font-label-sm text-label-sm text-outline">
                      <span>
                        Primary Focus: <strong className="text-on-surface">Deep Sprint</strong>
                      </span>
                      <span>{tasks.length} Total tasks</span>
                    </div>
                  </div>

                  {/* Category Detailed Breakdown */}
                  <div className="space-y-space-sm">
                    {/* Category 1 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-body-sm text-body-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                          <span className="text-on-surface font-medium truncate">Deep Work &amp; Design</span>
                        </div>
                        <div className="flex items-center gap-2 font-tabular-mono">
                          <span className="text-outline text-label-sm">{categoryBreakdown.design.hours} hrs</span>
                          <span className="text-primary font-semibold text-label-md">
                            {categoryBreakdown.design.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${categoryBreakdown.design.pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Category 2 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-body-sm text-body-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                          <span className="text-on-surface font-medium truncate">
                            Architecture &amp; Features
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-tabular-mono">
                          <span className="text-outline text-label-sm">{categoryBreakdown.tech.hours} hrs</span>
                          <span className="text-secondary font-semibold text-label-md">
                            {categoryBreakdown.tech.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${categoryBreakdown.tech.pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Category 3 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-body-sm text-body-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                          <span className="text-on-surface font-medium truncate">Daily Rituals</span>
                        </div>
                        <div className="flex items-center gap-2 font-tabular-mono">
                          <span className="text-outline text-label-sm">{categoryBreakdown.habit.hours} hrs</span>
                          <span className="text-tertiary font-semibold text-label-md">
                            {categoryBreakdown.habit.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-tertiary rounded-full"
                          style={{ width: `${categoryBreakdown.habit.pct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Category 4 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-body-sm text-body-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-outline"></span>
                          <span className="text-on-surface font-medium truncate">Admin &amp; Sync</span>
                        </div>
                        <div className="flex items-center gap-2 font-tabular-mono">
                          <span className="text-outline text-label-sm">{categoryBreakdown.admin.hours} hrs</span>
                          <span className="text-outline font-semibold text-label-md">
                            {categoryBreakdown.admin.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-outline rounded-full"
                          style={{ width: `${categoryBreakdown.admin.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* View Time Logs Button */}
                  <div className="pt-space-sm mt-space-xs">
                    <button
                      onClick={() => setShowTimeLogsModal(true)}
                      className="w-full py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      type="button"
                    >
                      <span>View Task Time Logs ({dynamicTimeLogs.length})</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Editorial Micro-Card Workspace Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-xs">
                {/* Companion Note 1 */}
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-sm hover:shadow-md transition-shadow">
                  <div className="p-2.5 rounded-lg bg-primary-fixed text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      notifications_active
                    </span>
                  </div>
                  <div>
                    <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                      Distraction Latency
                    </h3>
                    <p className="font-body-sm text-body-sm text-outline mt-0.5">
                      Average context recovery reduced to 6.2m during active focus sessions.
                    </p>
                  </div>
                </div>

                {/* Companion Note 2 */}
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-sm hover:shadow-md transition-shadow">
                  <div className="p-2.5 rounded-lg bg-secondary-fixed text-secondary flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">self_improvement</span>
                  </div>
                  <div>
                    <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                      Rituals Completed
                    </h3>
                    <p className="font-body-sm text-body-sm text-outline mt-0.5">
                      {habitsCount} active daily habits aligned with cognitive ultradian cadence.
                    </p>
                  </div>
                </div>

                {/* Companion Note 3 */}
                <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-sm hover:shadow-md transition-shadow">
                  <div className="p-2.5 rounded-lg bg-tertiary-fixed text-tertiary flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                  </div>
                  <div>
                    <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                      Velocity Forecast
                    </h3>
                    <p className="font-body-sm text-body-sm text-outline mt-0.5">
                      On track with {completedTasksCount} tasks resolved and {activeTasksCount} in current sprint.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* TIME LOGS MODAL */}
      {showTimeLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-surface-container flex flex-col">
            <div className="px-6 py-4 border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">history</span>
                <h3 className="font-headline-sm font-semibold text-on-surface">Task Time Logs</h3>
              </div>
              <button
                onClick={() => setShowTimeLogsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 divide-y divide-surface-container max-h-[460px] overflow-y-auto">
              {dynamicTimeLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <h4 className="font-body-md font-medium text-on-surface">{log.task}</h4>
                    <div className="flex items-center gap-2 text-label-sm text-outline">
                      <span>{log.project}</span>
                      <span>•</span>
                      <span>{log.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-tabular-mono text-label-sm font-semibold">
                      {log.duration}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm">
                      {log.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 bg-surface-container-low border-t border-surface-container flex items-center justify-between text-label-sm text-outline">
              <span>Showing real sprint activity</span>
              <button
                onClick={() => setShowTimeLogsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary-container transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
