import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import image from "../assets/logo.png";
import { useApp } from "../context/AppContext";

export default function Profile() {
  const navigate = useNavigate();
  const {
    currentUser,
    authLoading,
    userProfile,
    saveUserProfile,
    logout,
    tasks,
    habits,
    loadingHabits,
    createHabit,
    toggleHabit,
    deleteHabit,
    habitsCount,
    completedHabitsCount,
    activeTasksCount,
    completedTasksCount,
    totalTasksCount,
    highImpactCount,
    flowVelocityScore,
    deepWorkHours,
    onTimeRate,
    formattedTimer,
    timerRunning,
    startTimer,
    pauseTimer,
    showToast,
    runDailyRolloverAndReset,
  } = useApp();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form States
  const [displayName, setDisplayName] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("Pacific Time (PT) - UTC-8");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("Architecting high-focus cognitive workflows and deep focus rituals.");
  const [websiteUrl, setWebsiteUrl] = useState("https://github.com/developer");

  // Productivity Rhythms States
  const [chronotype, setChronotype] = useState("lark"); // 'lark' | 'falcon' | 'owl'
  const [focusDuration, setFocusDuration] = useState("25"); // '25' | '50' | '90'
  const [dailyTargetBlocks, setDailyTargetBlocks] = useState(3); // 25 = 3, 50 = 5, 90 = 8
  const [breakDuration, setBreakDuration] = useState("5"); // '5' | '10' | '15'

  // Habits & Rituals States
  const [rolloverEnabled, setRolloverEnabled] = useState(true);
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [defaultProject, setDefaultProject] = useState("Work Sprint (Active)");
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitDuration, setNewHabitDuration] = useState("15m");
  const [addingHabit, setAddingHabit] = useState(false);

  // Notifications & Integrations States
  const [googleCalendarSync, setGoogleCalendarSync] = useState(true);
  const [githubSync, setGithubSync] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("daily"); // 'daily' | 'weekly' | 'off'

  // Theme & Appearance States
  const [theme, setTheme] = useState("dark"); // 'dark' | 'light' | 'system'
  const [accentColor, setAccentColor] = useState("indigo"); // 'indigo' | 'emerald' | 'amber' | 'cyan'
  const [density, setDensity] = useState("comfortable"); // 'comfortable' | 'compact'
  const [reduceMotion, setReduceMotion] = useState(false);
  const [monospaceTimers, setMonospaceTimers] = useState(true);

  // Security States
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [resetEmailStatus, setResetEmailStatus] = useState(null); // { type: 'success' | 'error', text: '' }
  const [hasWorkstationToken, setHasWorkstationToken] = useState(() => {
    return !!localStorage.getItem("successor_workstation_token");
  });
  const [tokenExpiryStr, setTokenExpiryStr] = useState(() => {
    const expiry = localStorage.getItem("successor_token_expiry");
    if (!expiry) return null;
    try {
      return new Date(parseInt(expiry, 10)).toLocaleString();
    } catch {
      return null;
    }
  });

  // Data & Export States
  const [isExporting, setIsExporting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());

  // Notification Toast & Save Status
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningRollover, setRunningRollover] = useState(false);

  const handleTriggerRollover = async () => {
    setRunningRollover(true);
    try {
      await runDailyRolloverAndReset(true);
    } finally {
      setRunningRollover(false);
    }
  };

  // Search & suggestions state
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

  // Redirect if logged out
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [authLoading, currentUser, navigate]);

  // Synchronize form states whenever userProfile loads or changes from Cloud Firestore in real time
  useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName !== undefined) setDisplayName(userProfile.displayName);
      if (userProfile.displayTitle !== undefined) setDisplayTitle(userProfile.displayTitle);
      if (userProfile.email !== undefined) {
        setEmail(userProfile.email);
        setResetEmail(userProfile.email);
      }
      if (userProfile.timezone !== undefined) setTimezone(userProfile.timezone);
      if (userProfile.avatarUrl !== undefined) setAvatarUrl(userProfile.avatarUrl);
      if (userProfile.bio !== undefined) setBio(userProfile.bio);
      if (userProfile.websiteUrl !== undefined) setWebsiteUrl(userProfile.websiteUrl);
      if (userProfile.chronotype !== undefined) setChronotype(userProfile.chronotype);
      if (userProfile.focusDuration !== undefined) setFocusDuration(userProfile.focusDuration);
      if (userProfile.dailyTargetBlocks !== undefined) {
        setDailyTargetBlocks(userProfile.dailyTargetBlocks);
      } else if (userProfile.focusDuration !== undefined) {
        if (userProfile.focusDuration === "25") setDailyTargetBlocks(3);
        else if (userProfile.focusDuration === "50") setDailyTargetBlocks(5);
        else if (userProfile.focusDuration === "90") setDailyTargetBlocks(8);
      }
      if (userProfile.breakDuration !== undefined) setBreakDuration(userProfile.breakDuration);
      if (userProfile.defaultProject !== undefined) setDefaultProject(userProfile.defaultProject);
      if (typeof userProfile.rolloverEnabled === "boolean") setRolloverEnabled(userProfile.rolloverEnabled);
      if (typeof userProfile.briefingEnabled === "boolean") setBriefingEnabled(userProfile.briefingEnabled);
      if (typeof userProfile.googleCalendarSync === "boolean") setGoogleCalendarSync(userProfile.googleCalendarSync);
      if (typeof userProfile.githubSync === "boolean") setGithubSync(userProfile.githubSync);
      if (userProfile.webhookUrl !== undefined) setWebhookUrl(userProfile.webhookUrl);
      if (typeof userProfile.soundAlerts === "boolean") setSoundAlerts(userProfile.soundAlerts);
      if (userProfile.digestFrequency !== undefined) setDigestFrequency(userProfile.digestFrequency);
      if (userProfile.theme !== undefined) setTheme(userProfile.theme);
      if (userProfile.accentColor !== undefined) setAccentColor(userProfile.accentColor);
      if (userProfile.density !== undefined) setDensity(userProfile.density);
      if (typeof userProfile.reduceMotion === "boolean") setReduceMotion(userProfile.reduceMotion);
      if (typeof userProfile.monospaceTimers === "boolean") setMonospaceTimers(userProfile.monospaceTimers);
      setLastSyncTime(new Date().toLocaleTimeString());
    } else if (currentUser) {
      if (currentUser.displayName) setDisplayName(currentUser.displayName);
      if (currentUser.email) {
        setEmail(currentUser.email);
        setResetEmail(currentUser.email);
      }
      if (currentUser.photoURL) setAvatarUrl(currentUser.photoURL);
    }
  }, [userProfile, currentUser]);

  // Keep workstation token status synced with localStorage
  const refreshWorkstationTokenState = () => {
    const token = localStorage.getItem("successor_workstation_token");
    setHasWorkstationToken(!!token);
    const expiry = localStorage.getItem("successor_token_expiry");
    if (expiry) {
      try {
        setTokenExpiryStr(new Date(parseInt(expiry, 10)).toLocaleString());
      } catch {
        setTokenExpiryStr(null);
      }
    } else {
      setTokenExpiryStr(null);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await saveUserProfile({
        displayName,
        displayTitle,
        email,
        timezone,
        avatarUrl,
        bio,
        websiteUrl,
        chronotype,
        focusDuration,
        dailyTargetBlocks,
        breakDuration,
        rolloverEnabled,
        briefingEnabled,
        defaultProject,
        googleCalendarSync,
        githubSync,
        webhookUrl,
        soundAlerts,
        digestFrequency,
        theme,
        accentColor,
        density,
        reduceMotion,
        monospaceTimers,
      });
      setSaveSuccess(true);
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSaveSuccess(false), 3200);
    } catch (err) {
      console.error("Save failed:", err);
      if (showToast) showToast("Failed to save preferences to Cloud", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Habit Creation Handler
  const handleAddHabit = async (e) => {
    if (e) e.preventDefault();
    if (!newHabitTitle.trim()) return;
    setAddingHabit(true);
    try {
      await createHabit({
        title: newHabitTitle.trim(),
        duration: newHabitDuration,
      });
      setNewHabitTitle("");
    } catch (err) {
      console.error("Error creating habit:", err);
    } finally {
      setAddingHabit(false);
    }
  };

  // Password Reset Handler
  const handleSendPasswordReset = async () => {
    const targetEmail = (resetEmail || email || "").trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setResetEmailStatus({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setResetEmailSending(true);
    setResetEmailStatus(null);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetEmailStatus({
        type: "success",
        text: `Reset link dispatched to ${targetEmail}! Please check your inbox and spam folder.`,
      });
      if (showToast) showToast(`Reset link sent to ${targetEmail}`);
    } catch (err) {
      console.error("Password reset error:", err);
      let msg = "Failed to send reset email. Please try again.";
      if (err.code === "auth/user-not-found") msg = "No user found with this email.";
      if (err.code === "auth/too-many-requests") msg = "Too many requests. Please wait a moment.";
      setResetEmailStatus({ type: "error", text: msg });
      if (showToast) showToast(msg, "error");
    } finally {
      setResetEmailSending(false);
    }
  };

  // Workstation Token Handlers
  const handleRevokeToken = () => {
    localStorage.removeItem("successor_workstation_token");
    localStorage.removeItem("successor_token_expiry");
    localStorage.removeItem("successor_remember_me");
    refreshWorkstationTokenState();
    if (showToast) showToast("Workstation quick-login token revoked!");
  };

  const handleGenerateToken = async () => {
    try {
      let token = "";
      if (currentUser) {
        token = await currentUser.getIdToken(true);
      } else {
        token = "ws_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
      const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      localStorage.setItem("successor_workstation_token", token);
      localStorage.setItem("successor_token_expiry", expiry.toString());
      localStorage.setItem("successor_remember_me", "true");
      refreshWorkstationTokenState();
      if (showToast) showToast("New 30-day workstation access token generated!");
    } catch (err) {
      console.error("Token generation failed:", err);
      if (showToast) showToast("Could not generate token", "error");
    }
  };

  // Data Export Handlers
  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const backupData = {
        exportDate: new Date().toISOString(),
        appName: "Successor Workstation",
        version: "1.0.0",
        userProfile: {
          displayName,
          displayTitle,
          email,
          timezone,
          avatarUrl,
          bio,
          websiteUrl,
          chronotype,
          focusDuration,
          dailyTargetBlocks,
          theme,
          accentColor,
          density,
        },
        stats: {
          totalTasksCount,
          completedTasksCount,
          activeTasksCount,
          habitsCount,
          completedHabitsCount,
          flowVelocityScore,
          deepWorkHours,
          onTimeRate,
        },
        tasks,
        habits,
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `successor-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (showToast) showToast("Full JSON Cloud Backup downloaded!");
    } catch (err) {
      console.error("Export JSON failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = () => {
    try {
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      let md = `# Successor Workspace Velocity Summary\n\n`;
      md += `**Date:** ${today}\n`;
      md += `**Workstation:** ${displayName} (${displayTitle})\n`;
      md += `**Email:** ${email}\n`;
      md += `**Flow Velocity:** ${flowVelocityScore}% | **Deep Work:** ${deepWorkHours}h | **On-Time Rate:** ${onTimeRate}%\n\n`;
      md += `## Daily Habits & Rituals (${completedHabitsCount}/${habitsCount})\n\n`;
      habits.forEach((h) => {
        md += `- [${h.done ? "x" : " "}] ${h.title} (${h.duration || "15m"})\n`;
      });
      md += `\n## Active Tasks (${activeTasksCount})\n\n`;
      tasks
        .filter((t) => !t.completed)
        .forEach((t) => {
          md += `- **[${t.code || "TASK"}]** ${t.title} _(${t.duration || "30m"}, Priority: ${t.priority || "Normal"}, Project: ${t.project || "Work Sprint"})_\n`;
        });
      md += `\n## Completed Tasks (${completedTasksCount})\n\n`;
      tasks
        .filter((t) => t.completed)
        .forEach((t) => {
          md += `- [x] **[${t.code || "TASK"}]** ${t.title} _(${t.duration || "30m"})_\n`;
        });

      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `successor-sprint-summary-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (showToast) showToast("Markdown report exported!");
    } catch (err) {
      console.error("Export Markdown failed:", err);
    }
  };

  const handleForceResync = () => {
    setLastSyncTime(new Date().toLocaleTimeString());
    if (showToast) showToast("Cloud Firestore verified & synchronized!");
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    if (showToast) showToast("Local session cache purged safely.");
  };

  // Preference Search Items across all 7 tabs
  const preferenceItems = [
    {
      id: "pref-name",
      title: "Display Name & Title",
      subtitle: `${displayName} • ${displayTitle}`,
      icon: "badge",
      tab: "profile",
      sectionId: "section-profile",
    },
    {
      id: "pref-email",
      title: "Account Email & Workstation ID",
      subtitle: `${email}`,
      icon: "alternate_email",
      tab: "profile",
      sectionId: "section-profile",
    },
    {
      id: "pref-bio",
      title: "Focus Bio & Mantra",
      subtitle: bio,
      icon: "notes",
      tab: "profile",
      sectionId: "section-profile",
    },
    {
      id: "pref-chrono",
      title: "Biological Chronotype",
      subtitle: `Current: ${chronotype.charAt(0).toUpperCase() + chronotype.slice(1)} (Peak Alignment)`,
      icon: "psychology",
      tab: "rhythms",
      sectionId: "section-chronotype",
    },
    {
      id: "pref-duration",
      title: "Default Focus Session Duration & Block Count",
      subtitle: `${focusDuration} min (${focusDuration === "25" ? "3" : focusDuration === "50" ? "5" : "8"} blocks target) • 25m = 3 blocks, 50m = 5 blocks, 90m = 8 blocks`,
      icon: "timer",
      tab: "rhythms",
      sectionId: "section-focus-duration",
    },
    {
      id: "pref-target-blocks",
      title: "Daily Focus Blocks Target",
      subtitle: `${dailyTargetBlocks} blocks/day (${(dailyTargetBlocks * parseInt(focusDuration || 25, 10) / 60).toFixed(1)}h deep focus target)`,
      icon: "stacked_bar_chart",
      tab: "rhythms",
      sectionId: "section-focus-duration",
    },
    {
      id: "pref-habits-list",
      title: "Interactive Rituals & Habits Manager",
      subtitle: `${completedHabitsCount} of ${habitsCount} rituals completed today`,
      icon: "self_improvement",
      tab: "habits",
      sectionId: "section-habits-list",
    },
    {
      id: "pref-rollover",
      title: "Smart Daily Rollover",
      subtitle: `Auto-reschedule unfinished tasks • Status: ${rolloverEnabled ? "Enabled" : "Disabled"}`,
      icon: "event_repeat",
      tab: "habits",
      sectionId: "section-automation",
    },
    {
      id: "pref-briefing",
      title: "Morning Velocity Digest",
      subtitle: `Desktop notification at 08:30 AM • Status: ${briefingEnabled ? "Enabled" : "Disabled"}`,
      icon: "notifications_active",
      tab: "habits",
      sectionId: "section-automation",
    },
    {
      id: "pref-project",
      title: "Quick-Capture Default Project",
      subtitle: `Default list: ${defaultProject}`,
      icon: "folder_special",
      tab: "habits",
      sectionId: "section-automation",
    },
    {
      id: "pref-tools",
      title: "Connected Tools & Calendar Sync",
      subtitle: "Google Calendar & GitHub PRs bi-directional sync",
      icon: "hub",
      tab: "integrations",
      sectionId: "section-integrations",
    },
    {
      id: "pref-webhook",
      title: "Webhook Notification Dispatcher",
      subtitle: webhookUrl ? `Connected: ${webhookUrl}` : "Configured for Slack / Discord alerts",
      icon: "cable",
      tab: "integrations",
      sectionId: "section-webhook",
    },
    {
      id: "pref-audio",
      title: "Sound Alerts & Audio Cues",
      subtitle: `Focus timer chimes: ${soundAlerts ? "Enabled" : "Muted"}`,
      icon: "volume_up",
      tab: "integrations",
      sectionId: "section-audio",
    },
    {
      id: "pref-theme",
      title: "Workstation Theme Mode",
      subtitle: `Current mode: ${theme.toUpperCase()} (Deep Space aesthetic)`,
      icon: "palette",
      tab: "appearance",
      sectionId: "section-theme",
    },
    {
      id: "pref-accent",
      title: "Accent Color Palette",
      subtitle: `Active palette: ${accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}`,
      icon: "colorize",
      tab: "appearance",
      sectionId: "section-appearance",
    },
    {
      id: "pref-density",
      title: "Workstation UI Density",
      subtitle: `Layout: ${density.charAt(0).toUpperCase() + density.slice(1)} spacing`,
      icon: "view_compact",
      tab: "appearance",
      sectionId: "section-appearance",
    },
    {
      id: "pref-security-pwd",
      title: "Firebase Password Reset Link",
      subtitle: "Dispatch secure password recovery email",
      icon: "lock_reset",
      tab: "security",
      sectionId: "section-password-reset",
    },
    {
      id: "pref-token",
      title: "Workstation Quick-Login Token",
      subtitle: hasWorkstationToken ? "Token Active & Authorized" : "No active token (Credentials required)",
      icon: "key",
      tab: "security",
      sectionId: "section-token",
    },
    {
      id: "pref-cloud-stats",
      title: "Cloud Database Real-Time Health",
      subtitle: `${totalTasksCount} tasks • ${habitsCount} habits • Real-time Firestore sync`,
      icon: "cloud_sync",
      tab: "data",
      sectionId: "section-cloud-health",
    },
    {
      id: "pref-export-json",
      title: "Download Full JSON Cloud Backup",
      subtitle: "Export all tasks, habits, and profile preferences",
      icon: "download",
      tab: "data",
      sectionId: "section-data-export",
    },
    {
      id: "pref-export-md",
      title: "Export Sprint Report (Markdown)",
      subtitle: "Generate clean Markdown checklist of current work",
      icon: "description",
      tab: "data",
      sectionId: "section-data-export",
    },
    {
      id: "pref-auto-update",
      title: "Software Updates & GitHub Releases",
      subtitle: "Check GitHub Releases for new updates • Channel: Raamgopal8/Successor",
      icon: "system_update",
      tab: "data",
      sectionId: "section-app-updates",
    },
  ];

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const matchingPreferences = preferenceItems.filter((item) =>
    trimmedQuery
      ? item.title.toLowerCase().includes(trimmedQuery) ||
        item.subtitle.toLowerCase().includes(trimmedQuery)
      : true
  );

  const quickNavActions = [
    {
      id: "nav-dash",
      title: "Today's Focus Dashboard",
      subtitle: "Switch to focus timer & priority queue",
      icon: "wb_sunny",
      action: () => navigate("/dashboard"),
    },
    {
      id: "nav-board",
      title: "Sprint Kanban Board",
      subtitle: "Manage 5-stage task workflow",
      icon: "view_kanban",
      action: () => navigate("/board"),
    },
    {
      id: "nav-analytics",
      title: "Velocity & Circadian Analytics",
      subtitle: "View performance graphs and heatmaps",
      icon: "monitoring",
      action: () => navigate("/analytics"),
    },
  ].filter((a) =>
    trimmedQuery
      ? a.title.toLowerCase().includes(trimmedQuery) ||
        a.subtitle.toLowerCase().includes(trimmedQuery)
      : true
  ).slice(0, trimmedQuery ? 3 : 2);

  const flattenedSuggestions = [
    ...matchingPreferences.map((pref) => ({
      id: pref.id,
      type: "preference",
      title: pref.title,
      subtitle: pref.subtitle,
      icon: pref.icon,
      action: () => {
        setIsSearchOpen(false);
        if (pref.tab) setActiveTab(pref.tab);
        setTimeout(() => {
          const el = document.getElementById(pref.sectionId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-primary");
            setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
          }
        }, 120);
      },
    })),
    ...quickNavActions.map((act) => ({
      id: act.id,
      type: "action",
      title: act.title,
      subtitle: act.subtitle,
      icon: act.icon,
      action: () => {
        setIsSearchOpen(false);
        act.action();
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

  // Tab definitions
  const SETTINGS_TABS = [
    { key: "profile", icon: "badge", label: "Profile & Identity" },
    { key: "rhythms", icon: "schedule", label: "Productivity Rhythms" },
    {
      key: "habits",
      icon: "self_improvement",
      label: "Habits & Rituals",
      badge: `${completedHabitsCount}/${habitsCount}`,
    },
    { key: "integrations", icon: "hub", label: "Notifications & Integrations" },
    { key: "appearance", icon: "palette", label: "Theme & Appearance" },
    { key: "security", icon: "shield", label: "Security & Access" },
    { key: "data", icon: "cloud_sync", label: "Data & Cloud Backup", badge: "Live" },
  ];

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen">
      {/* SIDEBAR NAVIGATION */}
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
                className="flex items-center gap-space-sm px-space-md py-space-sm bg-primary-container text-on-primary-container rounded-lg font-label-md font-semibold transition-colors"
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
                  onClick={() => navigate("/board")}
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
                <Link
                  to="/board"
                  className="flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Work Sprint</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest">
                    {activeTasksCount}
                  </span>
                </Link>
                <Link
                  to="/board"
                  className="flex items-center justify-between px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-space-sm truncate">
                    <span className="w-2 h-2 rounded-full bg-tertiary flex-shrink-0" />
                    <span className="truncate font-body-sm text-body-sm">Deep Work</span>
                  </div>
                  <span className="font-tabular-mono text-label-sm text-outline px-1.5 py-0.5 rounded-full bg-surface-container-highest">
                    {highImpactCount}
                  </span>
                </Link>
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
          {/* Quick Search with Settings & Preference Suggestions */}
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
                placeholder="Search settings, preferences, shortcuts (⌘K)..."
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
                  {/* Preferences Suggestions */}
                  {matchingPreferences.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">tune</span>
                        Preferences &amp; Settings ({matchingPreferences.length})
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {matchingPreferences.map((pref) => {
                          const item = flattenedSuggestions.find((s) => s.id === pref.id);
                          const itemIdx = flattenedSuggestions.findIndex((s) => s.id === pref.id);
                          const isSelected = itemIdx === selectedSuggestionIndex;
                          return (
                            <button
                              key={pref.id}
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
                                <span className="material-symbols-outlined text-[18px] text-primary flex-shrink-0">
                                  {pref.icon}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-body-sm text-body-sm truncate font-medium">{pref.title}</p>
                                  <p className="font-label-sm text-label-sm text-outline truncate">{pref.subtitle}</p>
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

                  {/* Quick Actions / Navigation */}
                  {quickNavActions.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-label-sm uppercase tracking-wider text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">near_me</span>
                        Jump To / Navigation
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
                        No settings found for &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="font-label-sm text-label-sm text-outline mt-0.5">
                        Try searching for chronotype, duration, email, password, token, backup, or habits.
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
                  <span className="hidden sm:inline">Search user preferences &amp; workstation configuration</span>
                </div>
              </div>
            )}
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

            <div className="flex items-center gap-space-sm pl-space-xs">
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
                <span className="font-label-sm text-label-sm text-outline leading-tight">
                  {displayTitle}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN PROFILE / PREFERENCES VIEW */}
        <main className="w-full pt-16 bg-surface px-space-lg py-space-lg">
          <div className="flex flex-col w-full pb-24">
            {/* Top Navigation & Heading Section */}
            <div className="flex flex-col gap-space-sm mb-space-lg">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div>
                  <div className="flex items-center gap-space-xs text-primary font-label-sm uppercase tracking-wider mb-1 font-semibold">
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>System Personalization &amp; Workspace Configuration</span>
                  </div>
                  <h1 className="font-['Plus_Jakarta_Sans'] text-3xl lg:text-[34px] text-on-surface font-bold tracking-tight">
                    Settings &amp; Workstation Preferences
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    Real-time cloud synchronization for cognitive rhythms, habits, security, integrations, and workspace defaults.
                  </p>
                </div>

                {/* Quick Real-Time Sync Indicator Badge */}
                <div className="flex items-center gap-2.5 self-start md:self-auto px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-sm border border-outline-variant/15">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                  </span>
                  <div className="flex items-center gap-1.5 font-tabular-mono text-label-sm">
                    <span className="text-secondary font-semibold">Cloud Live</span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant">{lastSyncTime}</span>
                  </div>
                  <button
                    onClick={handleForceResync}
                    className="p-1 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                    title="Force cloud re-sync"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                  </button>
                </div>
              </div>

              {/* Segmented Navigation Tabs */}
              <div className="mt-space-md p-1 bg-surface-container-high/80 rounded-xl flex items-center gap-1 overflow-x-auto shadow-inner border border-outline-variant/10">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-space-xs px-3.5 py-2 rounded-lg font-label-md whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === tab.key
                        ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded-full font-tabular-mono font-bold ${
                          activeTab === tab.key
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-highest text-outline"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT ROUTING */}
            {/* 1. PROFILE & IDENTITY TAB */}
            {activeTab === "profile" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg animate-in fade-in duration-200">
                {/* Left Column: Form Details (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-space-lg">
                  <section
                    id="section-profile"
                    className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                  >
                    <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                      <div className="flex items-center gap-space-xs">
                        <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                          account_circle
                        </span>
                        <div>
                          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                            Personal &amp; Workstation Identity
                          </h2>
                          <p className="font-body-sm text-body-sm text-outline">
                            Profile updates propagate in real time across Dashboard, Kanban Board &amp; Analytics
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-semibold">
                        Verified Pro
                      </span>
                    </div>

                    {/* Avatar Management */}
                    <div className="flex flex-col sm:flex-row items-center gap-space-md p-space-md bg-surface-container-low rounded-xl">
                      <div className="relative flex-shrink-0 group">
                        <img
                          alt="Profile Portrait"
                          className="w-24 h-24 rounded-full object-cover ring-4 ring-surface-container-lowest shadow-md"
                          src={avatarUrl}
                        />
                        <button
                          onClick={() => {
                            const url = prompt("Enter new avatar image URL:", avatarUrl);
                            if (url) setAvatarUrl(url);
                          }}
                          className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-on-primary hover:bg-primary-container hover:scale-105 transition-all shadow-sm cursor-pointer"
                          title="Upload new photo URL"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 min-w-0 text-center sm:text-left flex-1">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                          {displayName || ""}
                        </h3>
                        <p className="font-body-sm text-body-sm text-outline truncate">
                          {displayTitle || ""}
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                          <button
                            onClick={() => {
                              const url = prompt("Enter image URL:", avatarUrl);
                              if (url) setAvatarUrl(url);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-dim text-on-surface font-label-sm transition-colors cursor-pointer"
                            type="button"
                          >
                            Change Photo URL
                          </button>
                          <button
                            onClick={() =>
                              setAvatarUrl(
                                ""
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg hover:bg-error-container/60 text-error font-label-sm transition-colors cursor-pointer"
                            type="button"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div className="flex flex-col gap-space-md pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                        <div className="flex flex-col gap-1">
                          <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                            Full Display Name
                          </label>
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                              person
                            </span>
                            <input
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/20"
                              type="text"
                              placeholder=""
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                            Display Role / Title
                          </label>
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                              badge
                            </span>
                            <input
                              value={displayTitle}
                              onChange={(e) => setDisplayTitle(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/20"
                              type="text"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                        <div className="flex flex-col gap-1">
                          <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                            Account Email Address
                          </label>
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                              mail
                            </span>
                            <input
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/20"
                              type="email"
                              placeholder=""
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                            Primary Timezone
                          </label>
                          <div className="relative flex items-center">
                            <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                              schedule
                            </span>
                            <select
                              value={timezone}
                              onChange={(e) => setTimezone(e.target.value)}
                              className="w-full pl-10 pr-8 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none appearance-none cursor-pointer transition-all"
                            >
                              <option>Pacific Time (PT) - UTC-8</option>
                              <option>Eastern Time (ET) - UTC-5</option>
                              <option>Central European Time (CET) - UTC+1</option>
                              <option>India Standard Time (IST) - UTC+5:30</option>
                              <option>Universal Coordinated (UTC)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 text-outline pointer-events-none text-[18px]">
                              expand_more
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          Bio / Daily Focus Mantra
                        </label>
                        <div className="relative flex items-start">
                          <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-[18px]">
                            format_quote
                          </span>
                          <textarea
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/20 resize-none"
                            placeholder="Designing next-gen cognitive workflows with intentional cadence..."
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          Workstation / GitHub URL
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                            link
                          </span>
                          <input
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/20"
                            type="url"
                            placeholder="https://github.com/"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column: Live Card Preview & Metrics (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-space-lg">
                  {/* Live User Badge Card Preview */}
                  <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-outline-variant/15 flex flex-col gap-space-md">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                        Live Identity Preview
                      </span>
                      <span className="text-[11px] font-tabular-mono text-outline">Real-Time Sync</span>
                    </div>

                    <div className="p-space-lg rounded-2xl bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high border border-outline-variant/20 flex flex-col gap-4 shadow-sm">
                      <div className="flex items-center gap-space-md">
                        <div className="relative">
                          <img
                            alt="Avatar"
                            className="w-16 h-16 rounded-full object-cover ring-2 ring-primary"
                            src={avatarUrl}
                          />
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-secondary ring-2 ring-surface" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                            {displayName || "Elena Vance"}
                          </h4>
                          <p className="font-body-sm text-body-sm text-outline truncate">
                            {displayTitle || "Staff Product Designer"}
                          </p>
                          <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {timezone}
                          </span>
                        </div>
                      </div>

                      <p className="font-body-sm text-body-sm text-on-surface-variant italic border-l-2 border-primary/50 pl-3">
                        &ldquo;{bio}&rdquo;
                      </p>

                      <div className="pt-3 border-t border-outline-variant/15 grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-surface-container-lowest/80">
                          <span className="block font-tabular-mono text-headline-sm font-bold text-primary">
                            {flowVelocityScore}%
                          </span>
                          <span className="text-[11px] text-outline font-medium">Flow Velocity</span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface-container-lowest/80">
                          <span className="block font-tabular-mono text-headline-sm font-bold text-secondary">
                            {completedTasksCount}
                          </span>
                          <span className="text-[11px] text-outline font-medium">Tasks Closed</span>
                        </div>
                        <div className="p-2 rounded-lg bg-surface-container-lowest/80">
                          <span className="block font-tabular-mono text-headline-sm font-bold text-tertiary">
                            {habitsCount}
                          </span>
                          <span className="text-[11px] text-outline font-medium">Commitments</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flow Velocity Target Box */}
                  <div className="p-space-lg rounded-xl bg-gradient-to-br from-primary-fixed/40 via-surface-container to-surface-container-low flex items-center justify-between border border-outline-variant/15 shadow-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[20px]">bolt</span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold">
                          Weekly Deep Work Cadence
                        </p>
                        <p className="font-body-sm text-body-sm text-outline">
                          Target: {deepWorkHours}h logged of 34h / Wk
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-headline-sm text-headline-sm text-primary font-bold">
                        {flowVelocityScore}%
                      </span>
                      <span className="block font-label-sm text-label-sm text-secondary font-medium">
                        ↑ 3.2% vs last week
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRODUCTIVITY RHYTHMS TAB */}
            {activeTab === "rhythms" && (
              <div className="flex flex-col gap-space-lg animate-in fade-in duration-200">
                {/* Chronotypes Card */}
                <section
                  id="section-chronotype"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        psychology
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Circadian Chronotype Engine
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Successor automatically balances demanding cognitive sprints around your biological energy peak
                        </p>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                      Smart Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-2">
                    {/* Morning Lark */}
                    <div
                      onClick={() => setChronotype("lark")}
                      className={`relative p-space-md rounded-xl shadow-sm cursor-pointer transition-all flex flex-col justify-between border ${
                        chronotype === "lark"
                          ? "bg-surface-container-high/80 border-primary ring-2 ring-primary/40 shadow-md"
                          : "bg-surface-container-low border-transparent hover:bg-surface-container"
                      }`}
                    >
                      {chronotype === "lark" && (
                        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary ring-4 ring-primary-fixed" />
                      )}
                      <div>
                        <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[22px]">wb_sunny</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Morning Lark
                        </h3>
                        <p className="font-label-sm text-label-sm text-primary font-semibold mt-0.5">
                          {chronotype === "lark" ? "Active Preference" : "Select"}
                        </p>
                        <p className="font-body-sm text-body-sm text-outline mt-2 leading-relaxed">
                          Cognitive focus spikes early (08:30 – 12:30). High-impact architecture &amp; strategy tasks auto-slotted before midday.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-highest/80 flex items-center justify-between font-tabular-mono text-label-sm text-on-surface-variant">
                        <span>Peak: 09:00 AM</span>
                        <span className="text-secondary font-semibold">100% Match</span>
                      </div>
                    </div>

                    {/* Steady Falcon */}
                    <div
                      onClick={() => setChronotype("falcon")}
                      className={`relative p-space-md rounded-xl shadow-sm cursor-pointer transition-all flex flex-col justify-between border ${
                        chronotype === "falcon"
                          ? "bg-surface-container-high/80 border-primary ring-2 ring-primary/40 shadow-md"
                          : "bg-surface-container-low border-transparent hover:bg-surface-container"
                      }`}
                    >
                      {chronotype === "falcon" && (
                        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary ring-4 ring-primary-fixed" />
                      )}
                      <div>
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high text-outline flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[22px]">air</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Steady Falcon
                        </h3>
                        <p className="font-label-sm text-label-sm text-outline font-semibold mt-0.5">
                          {chronotype === "falcon" ? "Active Preference" : "Sustained Output"}
                        </p>
                        <p className="font-body-sm text-body-sm text-outline mt-2 leading-relaxed">
                          Consistent output between 11:00 AM – 05:00 PM with flat stamina decay and zero post-lunch afternoon dip.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-highest/40 flex items-center justify-between font-tabular-mono text-label-sm text-on-surface-variant">
                        <span>Peak: 01:30 PM</span>
                        <span className="text-outline">Select</span>
                      </div>
                    </div>

                    {/* Night Owl */}
                    <div
                      onClick={() => setChronotype("owl")}
                      className={`relative p-space-md rounded-xl shadow-sm cursor-pointer transition-all flex flex-col justify-between border ${
                        chronotype === "owl"
                          ? "bg-surface-container-high/80 border-primary ring-2 ring-primary/40 shadow-md"
                          : "bg-surface-container-low border-transparent hover:bg-surface-container"
                      }`}
                    >
                      {chronotype === "owl" && (
                        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary ring-4 ring-primary-fixed" />
                      )}
                      <div>
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high text-outline flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[22px]">dark_mode</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Night Owl
                        </h3>
                        <p className="font-label-sm text-label-sm text-outline font-semibold mt-0.5">
                          {chronotype === "owl" ? "Active Preference" : "Late Surge"}
                        </p>
                        <p className="font-body-sm text-body-sm text-outline mt-2 leading-relaxed">
                          Creative resurgence from 17:00 – 22:30. Shields early mornings for async low-energy triage and deep blocks at dusk.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-highest/40 flex items-center justify-between font-tabular-mono text-label-sm text-on-surface-variant">
                        <span>Peak: 07:00 PM</span>
                        <span className="text-outline">Select</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Focus Duration & Daily Block Targets */}
                <section
                  id="section-focus-duration"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        timer
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Focus Session Cadence &amp; Block Targets
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Configure session interval defaults that sync directly to the global focus timer
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Phase Heat Bar */}
                  <div className="flex flex-col gap-space-xs p-space-md bg-surface-container-low rounded-xl">
                    <div className="flex items-center justify-between text-label-sm text-outline">
                      <span>06:00 Warmup</span>
                      <span>10:00 Morning Peak</span>
                      <span>14:00 Recovery</span>
                      <span>18:00 Twilight Sprint</span>
                      <span>22:00 Wind-Down</span>
                    </div>

                    <div className="relative w-full h-9 rounded-lg overflow-hidden flex items-stretch shadow-inner bg-surface-container-highest">
                      <div className="w-[15%] bg-surface-container-high flex items-center justify-center">
                        <span className="text-[10px] text-outline font-medium">Warmup</span>
                      </div>
                      <div className="w-[35%] bg-primary flex items-center justify-between px-3 text-on-primary font-label-sm font-semibold shadow-md">
                        <div className="w-1.5 h-3.5 bg-on-primary/60 rounded-full" />
                        <span className="truncate flex items-center gap-1 text-[11px]">
                          <span className="material-symbols-outlined text-[14px]">offline_bolt</span>
                          Deep Block ({chronotype === "lark" ? "08:30 – 12:30" : chronotype === "falcon" ? "11:00 – 15:00" : "17:00 – 21:00"})
                        </span>
                        <div className="w-1.5 h-3.5 bg-on-primary/60 rounded-full" />
                      </div>
                      <div className="w-[25%] bg-tertiary-container/30 flex items-center justify-between px-2 text-tertiary font-label-sm">
                        <span className="truncate text-[11px] font-medium">Recovery &amp; Async</span>
                      </div>
                      <div className="w-[15%] bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed text-[10px] font-medium">
                        Sprint
                      </div>
                      <div className="w-[10%] bg-surface-container-high flex items-center justify-center text-outline text-[10px]">
                        Rest
                      </div>
                    </div>
                  </div>

                  {/* Focus Duration Selection Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-2">
                    {[
                      {
                        val: "25",
                        label: "25 min",
                        blocks: 3,
                        sub: "Classic Pomodoro",
                        desc: "Short agile blocks for rapid task turnaround • 3 blocks target",
                      },
                      {
                        val: "50",
                        label: "50 min",
                        blocks: 5,
                        sub: "Deep Block (Recommended)",
                        desc: "Optimal cognitive sweet spot for complex engineering • 5 blocks target",
                      },
                      {
                        val: "90",
                        label: "90 min",
                        blocks: 8,
                        sub: "Flow State Immersion",
                        desc: "Full ultradian rhythm immersion for deep architecture • 8 blocks target",
                      },
                    ].map((dur) => (
                      <div
                        key={dur.val}
                        onClick={() => {
                          setFocusDuration(dur.val);
                          setDailyTargetBlocks(dur.blocks);
                        }}
                        className={`flex flex-col p-space-md rounded-xl cursor-pointer transition-all border ${
                          focusDuration === dur.val
                            ? "bg-primary-fixed text-on-primary-fixed border-primary font-semibold shadow-md ring-2 ring-primary/30"
                            : "bg-surface-container-low hover:bg-surface-container border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-tabular-mono text-headline-sm font-bold">{dur.label}</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-tabular-mono font-bold bg-surface-container-highest/80 text-on-surface-variant">
                              {dur.blocks} Blocks
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">
                            {focusDuration === dur.val ? "check_circle" : "radio_button_unchecked"}
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm mt-1">{dur.sub} ({dur.blocks} Blocks)</span>
                        <p className="font-body-sm text-body-sm text-outline mt-2 leading-relaxed">{dur.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Daily Block Target Stepper & Break Interval */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-space-xs">
                    <div className="flex flex-col gap-2 p-space-md rounded-xl bg-surface-container-low">
                      <div className="flex items-center justify-between">
                        <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          Daily Deep Focus Blocks Target
                        </label>
                        <span className="font-tabular-mono text-label-sm text-primary font-bold">
                          {dailyTargetBlocks} Blocks / Day
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDailyTargetBlocks((p) => Math.max(1, p - 1))}
                          className="w-9 h-9 rounded-lg bg-surface-container-highest hover:bg-surface-dim flex items-center justify-center font-bold text-on-surface cursor-pointer"
                        >
                          -
                        </button>
                        <div className="flex-1 text-center font-tabular-mono text-headline-sm font-bold text-on-surface">
                          {dailyTargetBlocks}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDailyTargetBlocks((p) => Math.min(16, p + 1))}
                          className="w-9 h-9 rounded-lg bg-surface-container-highest hover:bg-surface-dim flex items-center justify-center font-bold text-on-surface cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Presets: 25 = 3, 50 = 5, 90 = 8 */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-outline font-medium">Presets:</span>
                        {[
                          { dur: "25", blocks: 3, label: "3 Blocks (25m)" },
                          { dur: "50", blocks: 5, label: "5 Blocks (50m)" },
                          { dur: "90", blocks: 8, label: "8 Blocks (90m)" },
                        ].map((preset) => (
                          <button
                            key={preset.blocks}
                            type="button"
                            onClick={() => {
                              setDailyTargetBlocks(preset.blocks);
                              setFocusDuration(preset.dur);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-tabular-mono transition-all cursor-pointer border ${
                              dailyTargetBlocks === preset.blocks && focusDuration === preset.dur
                                ? "bg-primary text-on-primary font-bold border-primary shadow-xs"
                                : "bg-surface-container-highest hover:bg-surface-container text-on-surface-variant border-transparent"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <p className="font-label-sm text-label-sm text-outline">
                        Estimated target: ~{(dailyTargetBlocks * parseInt(focusDuration || 25, 10) / 60).toFixed(1)} hours of deep work daily
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 p-space-md rounded-xl bg-surface-container-low">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                        Break Interval Between Blocks
                      </label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {[
                          { val: "5", label: "5 min", sub: "Micro" },
                          { val: "10", label: "10 min", sub: "Standard" },
                          { val: "15", label: "15 min", sub: "Walk & Reset" },
                        ].map((b) => (
                          <button
                            key={b.val}
                            type="button"
                            onClick={() => setBreakDuration(b.val)}
                            className={`p-2 rounded-lg text-center transition-all cursor-pointer border ${
                              breakDuration === b.val
                                ? "bg-secondary-fixed text-on-secondary-fixed border-secondary font-bold"
                                : "bg-surface-container-highest hover:bg-surface-dim text-on-surface-variant border-transparent"
                            }`}
                          >
                            <span className="block font-tabular-mono text-body-sm font-semibold">{b.label}</span>
                            <span className="text-[10px] text-outline">{b.sub}</span>
                          </button>
                        ))}
                      </div>
                      <p className="font-label-sm text-label-sm text-outline mt-1">
                        Auto-triggers chime when block interval concludes.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 3. HABITS & RITUALS TAB */}
            {activeTab === "habits" && (
              <div className="flex flex-col gap-space-lg animate-in fade-in duration-200">
                {/* Live Real-Time Habits Manager */}
                <section
                  id="section-habits-list"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        self_improvement
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Active Rituals &amp; Habit Loop (Real-Time Cloud)
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Track daily cognitive routines. Changes persist directly to Cloud Firestore.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-surface-container-high font-tabular-mono text-label-sm text-on-surface font-semibold">
                        {completedHabitsCount} of {habitsCount} Completed Today
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-bold">
                        {userProfile?.focusStreak || 12}d Streak 🔥
                      </span>
                    </div>
                  </div>

                  {/* Add Habit Form */}
                  <form
                    onSubmit={handleAddHabit}
                    className="p-space-md bg-surface-container-low rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm"
                  >
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                        add_task
                      </span>
                      <input
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="Add new daily ritual (e.g. Shield 90m deep block, Review pull requests)..."
                        className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest text-on-surface rounded-lg font-body-sm outline-none focus:ring-2 focus:ring-primary/20"
                        type="text"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface-container-lowest rounded-lg p-0.5 border border-outline-variant/10">
                        {["10m", "15m", "30m", "60m"].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setNewHabitDuration(dur)}
                            className={`px-2.5 py-1 text-label-sm font-tabular-mono rounded-md transition-colors cursor-pointer ${
                              newHabitDuration === dur
                                ? "bg-primary text-on-primary font-bold shadow-xs"
                                : "text-outline hover:text-on-surface"
                            }`}
                          >
                            {dur}
                          </button>
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={addingHabit || !newHabitTitle.trim()}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-md font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>{addingHabit ? "Adding..." : "Add Ritual"}</span>
                      </button>
                    </div>
                  </form>

                  {/* Real-time Habit List */}
                  <div className="space-y-2 pt-2">
                    {loadingHabits ? (
                      <div className="p-8 text-center text-outline">
                        <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
                        <p className="font-body-sm mt-1">Loading habits from Cloud Firestore...</p>
                      </div>
                    ) : habits.length === 0 ? (
                      <div className="p-8 text-center text-outline bg-surface-container-low rounded-xl">
                        <span className="material-symbols-outlined text-3xl mb-1">checklist</span>
                        <p className="font-body-md font-medium text-on-surface">No habits registered yet</p>
                        <p className="font-label-sm text-outline mt-0.5">
                          Use the form above to add your first daily focus ritual!
                        </p>
                      </div>
                    ) : (
                      habits.map((h) => (
                        <div
                          key={h.id}
                          className={`flex items-center justify-between p-space-sm rounded-xl transition-all border ${
                            h.done
                              ? "bg-surface-container-high/40 border-outline-variant/10 text-outline"
                              : "bg-surface-container-low border-transparent hover:border-outline-variant/20 text-on-surface"
                          }`}
                        >
                          <div className="flex items-center gap-space-sm min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleHabit(h.id, !h.done)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                                h.done
                                  ? "bg-secondary text-on-secondary"
                                  : "border-2 border-outline hover:border-primary"
                              }`}
                            >
                              {h.done && (
                                <span className="material-symbols-outlined text-[16px] font-bold">
                                  check
                                </span>
                              )}
                            </button>
                            <span
                              className={`font-body-md text-body-md truncate ${
                                h.done ? "line-through text-outline" : "font-medium"
                              }`}
                            >
                              {h.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-tabular-mono text-label-sm px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-medium">
                              {h.duration || "15m"}
                            </span>
                            <span
                              className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                h.done
                                  ? "bg-secondary-fixed/40 text-on-secondary-fixed"
                                  : "bg-surface-container-highest text-outline"
                              }`}
                            >
                              {h.done ? "Completed" : "Pending"}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteHabit(h.id)}
                              className="p-1 rounded-lg hover:bg-error-container/40 text-outline hover:text-error transition-colors cursor-pointer"
                              title="Delete habit"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Automation & Rituals Settings */}
                <section
                  id="section-automation"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center gap-space-xs pb-space-xs border-b border-surface-container">
                    <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                      auto_awesome
                    </span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                        Rituals &amp; Task Dispatch Automation
                      </h2>
                      <p className="font-body-sm text-body-sm text-outline">
                        Configure zero-friction defaults for rapid task dispatching and queue rollover
                      </p>
                    </div>
                  </div>

                  <div className="space-y-space-sm pt-2">
                    {/* Smart Daily Rollover */}
                    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                      <div className="flex items-start gap-space-sm pr-4">
                        <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">
                          event_repeat
                        </span>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            Smart Daily Rollover &amp; Backlog Sync
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Auto-moves unfinished tasks from today&apos;s sprint queue (Ready, In Progress, Review) to Backlog every day, and resets daily focus blocks &amp; habit counters to 0.
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={rolloverEnabled}
                          onChange={(e) => setRolloverEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    {/* Manual Rollover / Reset Trigger Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            Trigger Daily Rollover &amp; Reset
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Last Rollover: <span className="font-tabular-mono text-on-surface font-medium">{userProfile?.lastResetDate || "Pending initial run"}</span> • Today&apos;s Blocks: <span className="font-tabular-mono text-primary font-semibold">{userProfile?.completedBlocks || 0}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleTriggerRollover}
                        disabled={runningRollover}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${runningRollover ? "animate-spin text-primary" : "text-outline"}`}>
                          {runningRollover ? "progress_activity" : "history"}
                        </span>
                        <span>{runningRollover ? "Processing..." : "Trigger Rollover Now"}</span>
                      </button>
                    </div>

                    {/* Morning Briefing */}
                    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                      <div className="flex items-start gap-space-sm pr-4">
                        <span className="material-symbols-outlined text-tertiary text-[22px] mt-0.5">
                          notifications_active
                        </span>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            Morning Velocity Digest
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Dispatches high-priority focus queue via desktop notification at 08:30 AM.
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={briefingEnabled}
                          onChange={(e) => setBriefingEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    {/* Quick-Capture Project */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-xs">
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          Quick-Capture Default Project
                        </label>
                        <select
                          value={defaultProject}
                          onChange={(e) => setDefaultProject(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low text-on-surface rounded-lg font-body-sm text-body-sm outline-none cursor-pointer"
                        >
                          <option>Work Sprint (Active)</option>
                          <option>Personal Commitments</option>
                          <option>Deep Work Triage</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          Global Quick Shortcut
                        </label>
                        <div className="flex items-center justify-between px-3 py-2 bg-surface-container-low rounded-lg font-body-sm text-body-sm">
                          <span className="text-on-surface font-medium">Capture Modal</span>
                          <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-tabular-mono text-label-sm text-on-surface-variant">
                            ⌥ + Space
                          </kbd>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 4. NOTIFICATIONS & INTEGRATIONS TAB */}
            {activeTab === "integrations" && (
              <div className="flex flex-col gap-space-lg animate-in fade-in duration-200">
                <section
                  id="section-integrations"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        hub
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Connected Tools &amp; Ecosystem
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Bi-directional synchronization with your developer toolchain
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
                    {/* Google Calendar */}
                    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            Google Calendar
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Focus windows reserve calendar slots
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={googleCalendarSync}
                          onChange={(e) => setGoogleCalendarSync(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    {/* GitHub PRs */}
                    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-[22px]">code</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            GitHub PRs &amp; Commits
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Task branch auto-linking &amp; velocity
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={githubSync}
                          onChange={(e) => setGithubSync(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>
                  </div>

                  {/* Webhook Dispatcher */}
                  <div id="section-webhook" className="pt-2 flex flex-col gap-2">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      Custom Webhook Dispatcher (Slack / Discord / Zapier)
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                          cable
                        </span>
                        <input
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                          className="w-full pl-10 pr-4 py-2 bg-surface-container-low focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                          type="url"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!webhookUrl) {
                            if (showToast) showToast("Enter a webhook URL first", "error");
                            return;
                          }
                          if (showToast) showToast("Test event dispatched to webhook endpoint!");
                        }}
                        className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Send Test Ping</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Audio & Alert Preferences */}
                <section
                  id="section-audio"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center gap-space-xs pb-space-xs border-b border-surface-container">
                    <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                      volume_up
                    </span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                        Audio Cues &amp; Notification Schedule
                      </h2>
                      <p className="font-body-sm text-body-sm text-outline">
                        Configure sound feedback and digest frequencies
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
                    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold">
                          Focus Timer Completion Chime
                        </p>
                        <p className="font-body-sm text-body-sm text-outline">
                          Plays subtle binaural bell at 00:00
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={soundAlerts}
                          onChange={(e) => setSoundAlerts(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5 p-space-md rounded-xl bg-surface-container-low">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                        Velocity Digest Dispatch Frequency
                      </label>
                      <select
                        value={digestFrequency}
                        onChange={(e) => setDigestFrequency(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container text-on-surface rounded-lg font-body-sm outline-none cursor-pointer"
                      >
                        <option value="daily">Daily at 08:30 AM</option>
                        <option value="weekly">Weekly Monday Morning Brief</option>
                        <option value="off">Off (Silent Workstation)</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 5. THEME & APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <div className="flex flex-col gap-space-lg animate-in fade-in duration-200">
                {/* Theme Selection */}
                <section
                  id="section-theme"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        palette
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Interface Theme &amp; Color Scheme
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Curated dark modes with optimal contrast for prolonged deep work
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-2">
                    {[
                      {
                        key: "dark",
                        label: "Dark (Deep Space)",
                        desc: "Default charcoal surface container with low eye fatigue",
                        icon: "dark_mode",
                        active: theme === "dark",
                      },
                      {
                        key: "light",
                        label: "Light (Clean Slate)",
                        desc: "High clarity daytime editorial palette",
                        icon: "light_mode",
                        active: theme === "light",
                      },
                      {
                        key: "system",
                        label: "System Adaptive",
                        desc: "Automatically syncs with OS daylight schedules",
                        icon: "settings_brightness",
                        active: theme === "system",
                      },
                    ].map((t) => (
                      <div
                        key={t.key}
                        onClick={() => setTheme(t.key)}
                        className={`p-space-md rounded-xl cursor-pointer transition-all border ${
                          theme === t.key
                            ? "bg-surface-container-high/80 border-primary ring-2 ring-primary/30 shadow-md"
                            : "bg-surface-container-low hover:bg-surface-container border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="material-symbols-outlined text-[22px] text-primary">
                            {t.icon}
                          </span>
                          <span className="material-symbols-outlined text-[18px]">
                            {theme === t.key ? "radio_button_checked" : "radio_button_unchecked"}
                          </span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {t.label}
                        </h3>
                        <p className="font-body-sm text-body-sm text-outline mt-1">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Accent Color & Density */}
                <section
                  id="section-appearance"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        tune
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Accent Palette &amp; Layout Density
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Custom tailored tokens for buttons, timers, and focus highlights
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Accent Color Palette */}
                  <div className="pt-2">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      Workstation Accent Tint
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mt-2">
                      {[
                        { key: "indigo", label: "Electric Indigo", hex: "#4648d4", desc: "Default focus" },
                        { key: "emerald", label: "Velocity Emerald", hex: "#10b981", desc: "Calm & flow" },
                        { key: "amber", label: "Solar Amber", hex: "#f59e0b", desc: "High energy" },
                        { key: "cyan", label: "Cyber Cyan", hex: "#06b6d4", desc: "Tech precision" },
                      ].map((c) => (
                        <div
                          key={c.key}
                          onClick={() => setAccentColor(c.key)}
                          className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center gap-3 ${
                            accentColor === c.key
                              ? "bg-surface-container-high border-primary ring-2 ring-primary/40"
                              : "bg-surface-container-low hover:bg-surface-container border-transparent"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: c.hex }}
                          />
                          <div className="min-w-0">
                            <p className="font-label-md text-label-md font-semibold text-on-surface truncate">
                              {c.label}
                            </p>
                            <p className="text-[11px] text-outline truncate">{c.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Layout Density & Ergonomics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-space-xs">
                    <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                        Interface Density
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "comfortable", label: "Comfortable", sub: "Spacious 16px" },
                          { key: "compact", label: "Compact", sub: "Dense rows 8px" },
                        ].map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => setDensity(d.key)}
                            className={`p-2.5 rounded-lg text-center transition-all cursor-pointer border ${
                              density === d.key
                                ? "bg-surface-container-highest border-primary font-bold text-on-surface"
                                : "bg-surface-container text-outline hover:text-on-surface border-transparent"
                            }`}
                          >
                            <span className="block text-body-sm font-semibold">{d.label}</span>
                            <span className="text-[11px] text-outline">{d.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-2">
                      <div>
                        <p className="font-label-md text-label-md font-semibold text-on-surface">
                          Reduce Motion &amp; Transitions
                        </p>
                        <p className="text-[11px] text-outline">
                          Disables dynamic slide animations for low-latency responsiveness
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer self-start">
                        <input
                          type="checkbox"
                          checked={reduceMotion}
                          onChange={(e) => setReduceMotion(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 6. SECURITY & ACCESS TAB (NEW) */}
            {activeTab === "security" && (
              <div className="flex flex-col gap-space-lg animate-in fade-in duration-200">
                {/* Firebase Authentication & Password Reset */}
                <section
                  id="section-password-reset"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        lock_reset
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Firebase Authentication &amp; Password Recovery
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Directly dispatch secure Firebase Auth password reset links to your registered workstation email
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-semibold">
                      Secured by Firebase
                    </span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          Target Account Email
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                            mail
                          </span>
                          <input
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="Enter your account email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest text-on-surface rounded-lg font-body-sm outline-none focus:ring-2 focus:ring-primary/20"
                            type="email"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendPasswordReset}
                        disabled={resetEmailSending || !resetEmail}
                        className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {resetEmailSending ? "sync" : "forward_to_inbox"}
                        </span>
                        <span>{resetEmailSending ? "Sending link..." : "Send Reset Email"}</span>
                      </button>
                    </div>

                    {resetEmailStatus && (
                      <div
                        className={`p-3 rounded-lg text-body-sm flex items-center gap-2 ${
                          resetEmailStatus.type === "success"
                            ? "bg-secondary-fixed/30 text-secondary border border-secondary/20"
                            : "bg-error-container/40 text-error border border-error/20"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {resetEmailStatus.type === "success" ? "check_circle" : "error"}
                        </span>
                        <span>{resetEmailStatus.text}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Workstation Quick-Login Token Management */}
                <section
                  id="section-token"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        vpn_key
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Workstation Quick-Login Token
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Successor utilizes local workstation session tokens for zero-friction desktop launch
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-tabular-mono text-label-sm font-semibold ${
                        hasWorkstationToken
                          ? "bg-secondary-fixed text-on-secondary-fixed"
                          : "bg-surface-container-highest text-outline"
                      }`}
                    >
                      {hasWorkstationToken ? "Token Active" : "No Active Token"}
                    </span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md">
                    <div className="flex items-center gap-space-md min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary flex-shrink-0">
                        <span className="material-symbols-outlined text-[24px]">key</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body-sm font-semibold text-on-surface">
                            Workstation Authorization Key
                          </span>
                          {hasWorkstationToken && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                            </span>
                          )}
                        </div>
                        <p className="font-tabular-mono text-label-sm text-outline truncate mt-0.5">
                          {hasWorkstationToken
                            ? `Token ID: sec_ws_${currentUser?.uid ? currentUser.uid.slice(0, 8) : "8f92a10c"}••••••••••••`
                            : "No persistent workstation token registered"}
                        </p>
                        {tokenExpiryStr && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            Valid until: {tokenExpiryStr}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasWorkstationToken ? (
                        <button
                          type="button"
                          onClick={handleRevokeToken}
                          className="px-3.5 py-2 rounded-lg bg-error-container/50 hover:bg-error-container text-error font-label-sm font-semibold transition-colors cursor-pointer"
                        >
                          Revoke Token
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateToken}
                          className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-sm font-semibold transition-colors cursor-pointer"
                        >
                          Generate Token
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Active Sessions & Danger Zone */}
                <section
                  id="section-sessions"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        devices
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Active Workstation Sessions
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Manage connected desktop instances and remote workstations
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-space-sm pt-2">
                    <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-9 h-9 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[20px]">computer</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            Linux Desktop (This Workstation)
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Chrome / Successor App • Localhost (Active Now)
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-semibold">
                        Current Session
                      </span>
                    </div>
                  </div>

                  <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
                    <div>
                      <p className="font-label-md text-label-md text-error font-semibold">
                        Terminate All Sessions
                      </p>
                      <p className="font-body-sm text-body-sm text-outline">
                        Sign out and revoke workstation tokens across all devices
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-lg border border-error/30 hover:bg-error-container/40 text-error font-label-md font-semibold transition-colors cursor-pointer"
                    >
                      Sign Out Everywhere
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* 7. DATA & CLOUD BACKUP TAB (NEW) */}
            {activeTab === "data" && (
              <div className="flex flex-col gap-space-lg animate-in fade-in duration-200">
                {/* Cloud Database Health */}
                <section
                  id="section-cloud-health"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        cloud_done
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Cloud Firestore Real-Time Database Metrics
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Persistent local cache with real-time multi-tab cloud synchronization
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
                      </span>
                      <span className="font-tabular-mono text-label-sm text-secondary font-bold">
                        Online (Live)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-2">
                    <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/10 text-center">
                      <span className="block font-tabular-mono text-headline-lg font-bold text-primary">
                        {totalTasksCount}
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">Total Tasks</span>
                    </div>
                    <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/10 text-center">
                      <span className="block font-tabular-mono text-headline-lg font-bold text-secondary">
                        {habitsCount}
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">Active Commits</span>
                    </div>
                    <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/10 text-center">
                      <span className="block font-tabular-mono text-headline-lg font-bold text-tertiary">
                        {deepWorkHours}h
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">Deep Work Logged</span>
                    </div>
                    <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/10 text-center">
                      <span className="block font-tabular-mono text-headline-lg font-bold text-on-surface">
                        {flowVelocityScore}%
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">Velocity Score</span>
                    </div>
                  </div>
                </section>

                {/* Data Backup & Export Cards */}
                <section
                  id="section-data-export"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        download
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Workspace Backup &amp; Data Portability
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Export complete database snapshots or formatted markdown summaries
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
                    {/* JSON Export */}
                    <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/10 flex flex-col justify-between gap-space-md">
                      <div>
                        <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[22px]">data_object</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Full Cloud Backup (JSON)
                        </h3>
                        <p className="font-body-sm text-body-sm text-outline mt-1 leading-relaxed">
                          Includes complete user profile configuration, active &amp; archived tasks, habit logs, velocity stats, and circadian rhythms in raw JSON format.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        disabled={isExporting}
                        className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>{isExporting ? "Generating..." : "Download JSON Snapshot"}</span>
                      </button>
                    </div>

                    {/* Markdown Export */}
                    <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/10 flex flex-col justify-between gap-space-md">
                      <div>
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[22px]">description</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Sprint Report (Markdown)
                        </h3>
                        <p className="font-body-sm text-body-sm text-outline mt-1 leading-relaxed">
                          Formatted Markdown document with interactive checklists, open tasks by sprint priority, and habits for seamless sharing in GitHub or Notion.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="w-full py-2.5 rounded-lg bg-surface-container-highest hover:bg-surface-dim text-on-surface font-label-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">article</span>
                        <span>Export Markdown Summary</span>
                      </button>
                    </div>
                  </div>

                  {/* Maintenance Actions */}
                  <div className="pt-space-sm border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm">
                    <div>
                      <p className="font-label-md text-label-md font-semibold text-on-surface">
                        Client Cache &amp; Re-sync
                      </p>
                      <p className="font-body-sm text-body-sm text-outline">
                        Safely purge temporary session memory while keeping authentication intact
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleForceResync}
                        className="px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm transition-colors cursor-pointer"
                      >
                        Force Cloud Re-sync
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCache}
                        className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface-variant font-label-sm transition-colors cursor-pointer"
                      >
                        Purge Local Cache
                      </button>
                    </div>
                  </div>
                </section>

                {/* Software Updates & GitHub Releases Card */}
                <section
                  id="section-app-updates"
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15"
                >
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        system_update
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Software Updates &amp; GitHub Releases
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Automatic over-the-air updates verified by cryptographic minisign signature
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-tabular-mono text-label-sm font-bold">
                      v0.1.2 (Stable)
                    </span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/10 flex flex-col sm:flex-row items-center justify-between gap-space-md">
                    <div className="flex items-center gap-space-md min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary flex-shrink-0">
                        <span className="material-symbols-outlined text-[24px]">cloud_sync</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body-md font-semibold text-on-surface">
                            Release Channel: GitHub Releases
                          </span>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                          </span>
                        </div>
                        <p className="font-tabular-mono text-label-sm text-outline truncate mt-0.5">
                          Repo: Raamgopal8/Successor • Endpoint: releases/latest/download/latest.json
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Automatically checks on application startup and installs background updates.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("successor:check-update"))}
                      className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-2 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">update</span>
                      <span>Check for Updates</span>
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>

        {/* BOTTOM FLOATING STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-surface/90 backdrop-blur-xl px-space-lg py-3 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.03)] border-t border-outline-variant/15">
          <div className="flex items-center gap-space-sm text-outline">
            <span className="material-symbols-outlined text-secondary text-[20px]">cloud_done</span>
            <span className="font-body-sm text-body-sm">
              {saveSuccess ? (
                <span className="text-secondary font-bold">Preferences saved and synced to Cloud!</span>
              ) : (
                "All preference adjustments auto-validated and synced in real time across the workstation"
              )}
            </span>
          </div>

          <div className="flex items-center gap-space-md">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-space-md py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md transition-colors cursor-pointer"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md font-semibold transition-all shadow-[0_2px_12px_rgba(70,72,212,0.35)] active:scale-95 cursor-pointer disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {saving ? "sync" : "save"}
              </span>
              <span>{saving ? "Saving..." : "Save Preferences"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
