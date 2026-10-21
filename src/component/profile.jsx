import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    habitsCount,
    activeTasksCount,
    highImpactCount,
    flowVelocityScore,
    formattedTimer,
    timerRunning,
    startTimer,
    pauseTimer,
  } = useApp();

  // Profile Form States
  const [displayName, setDisplayName] = useState("Elena Vance");
  const [displayTitle, setDisplayTitle] = useState("Staff Product Designer");
  const [email, setEmail] = useState("elena.vance@flow.design");
  const [timezone, setTimezone] = useState("Pacific Time (PT) - UTC-8");
  const [avatarUrl, setAvatarUrl] = useState(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDOkoGNng0Vzbb8vUclMtOfGPfV8zR7B1kMHugReNU77lUrZ5eUaMn4kJLozsUWJctriuteIpDPn3m-fCQ_qbzU6FjTq18LxDxb6tklv1kV5ndvBQ_-IU9QA6veADEYzDGwmRs72FzKPAB2Eoj1Nmr4UlNfXRNYuKAS53El6j6OYJi7WlLN2QtQgoMDjQRoNo4ZZhvdo_gbGII6gbLEz7nkp7SlVz1jGxE6QyByOCy5-h4AzhmmsQzcYg"
  );

  // Preference States
  const [activeTab, setActiveTab] = useState("profile");
  const [chronotype, setChronotype] = useState("lark"); // 'lark' | 'falcon' | 'owl'
  const [focusDuration, setFocusDuration] = useState("25"); // '25' | '50' | '90'
  const [rolloverEnabled, setRolloverEnabled] = useState(true);
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [defaultProject, setDefaultProject] = useState("Work Sprint (Active)");

  // Notification Toast
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Redirect if logged out
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [authLoading, currentUser, navigate]);

  // Synchronize form states whenever userProfile loads or changes
  useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName) setDisplayName(userProfile.displayName);
      if (userProfile.displayTitle) setDisplayTitle(userProfile.displayTitle);
      if (userProfile.email) setEmail(userProfile.email);
      if (userProfile.timezone) setTimezone(userProfile.timezone);
      if (userProfile.avatarUrl) setAvatarUrl(userProfile.avatarUrl);
      if (userProfile.chronotype) setChronotype(userProfile.chronotype);
      if (userProfile.focusDuration) setFocusDuration(userProfile.focusDuration);
      if (userProfile.defaultProject) setDefaultProject(userProfile.defaultProject);
      if (typeof userProfile.rolloverEnabled === "boolean") setRolloverEnabled(userProfile.rolloverEnabled);
      if (typeof userProfile.briefingEnabled === "boolean") setBriefingEnabled(userProfile.briefingEnabled);
    } else if (currentUser) {
      if (currentUser.displayName) setDisplayName(currentUser.displayName);
      if (currentUser.email) setEmail(currentUser.email);
      if (currentUser.photoURL) setAvatarUrl(currentUser.photoURL);
    }
  }, [userProfile, currentUser]);

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
        chronotype,
        focusDuration,
        rolloverEnabled,
        briefingEnabled,
        defaultProject,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

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
                    <span className="truncate font-body-sm text-body-sm">Personal Rituals</span>
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
          <div className="flex items-center gap-space-md flex-1 max-w-lg">
            <div className="relative w-full flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                search
              </span>
              <input
                className="w-full pl-9 pr-14 py-2 bg-surface-container-high/60 hover:bg-surface-container-high focus:bg-surface-container-lowest text-on-surface placeholder:text-outline rounded-lg outline-none font-body-sm text-body-sm transition-all"
                placeholder="Search settings, preferences..."
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
                    <span>System Personalization</span>
                  </div>
                  <h1 className="font-['Plus_Jakarta_Sans'] text-3xl lg:text-[34px] text-on-surface font-bold tracking-tight">
                    Personalization &amp; Account Settings
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    Tailor your cognitive velocity, chronotype rhythms, and workflow defaults across all pages.
                  </p>
                </div>

                {/* Quick Sync Indicator Badge */}
                <div className="flex items-center gap-2 self-start md:self-auto px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                  </span>
                  <span className="font-tabular-mono text-label-sm text-on-surface-variant font-medium">
                    Cloud Firestore: Synced
                  </span>
                </div>
              </div>

              {/* Segmented Navigation Tabs */}
              <div className="mt-space-md p-1 bg-surface-container-high/80 rounded-xl flex items-center gap-1 overflow-x-auto shadow-inner">
                {[
                  { key: "profile", icon: "badge", label: "Profile & Identity" },
                  { key: "rhythms", icon: "schedule", label: "Productivity Rhythms" },
                  { key: "habits", icon: "self_improvement", label: "Habits & Rituals" },
                  { key: "integrations", icon: "hub", label: "Notifications & Integrations" },
                  { key: "appearance", icon: "palette", label: "Theme & Appearance" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-label-md whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === tab.key
                        ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              {/* LEFT COLUMN: Profile Details & Connected Tools (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-space-lg">
                {/* Profile Information Card */}
                <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15">
                  <div className="flex items-center justify-between pb-space-xs">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        account_circle
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Profile Details
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Updates propagate in real time across Dashboard, Board &amp; Analytics
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-semibold">
                      Verified Pro
                    </span>
                  </div>

                  {/* Avatar Management */}
                  <div className="flex items-center gap-space-md p-space-md bg-surface-container-low rounded-xl">
                    <div className="relative flex-shrink-0 group">
                      <img
                        alt="Profile Portrait"
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-surface-container-lowest shadow-md"
                        src={avatarUrl}
                      />
                      <button
                        onClick={() => {
                          const url = prompt("Enter new avatar image URL:", avatarUrl);
                          if (url) setAvatarUrl(url);
                        }}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-on-primary hover:bg-primary-container hover:scale-105 transition-all shadow-sm cursor-pointer"
                        title="Upload new photo"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                        {displayName}
                      </h3>
                      <p className="font-body-sm text-body-sm text-outline truncate">
                        {displayTitle} • Core Systems
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => {
                            const url = prompt("Enter image URL:", avatarUrl);
                            if (url) setAvatarUrl(url);
                          }}
                          className="px-3 py-1 rounded-lg bg-surface-container-highest hover:bg-surface-dim text-on-surface font-label-sm transition-colors cursor-pointer"
                          type="button"
                        >
                          Change Avatar
                        </button>
                        <button
                          onClick={() =>
                            setAvatarUrl(
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                            )
                          }
                          className="px-2.5 py-1 rounded-lg hover:bg-error-container/60 text-error font-label-sm transition-colors cursor-pointer"
                          type="button"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="flex flex-col gap-space-md">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                        Full Name
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                          person
                        </span>
                        <input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all"
                          type="text"
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
                          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all"
                          type="text"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                          mail
                        </span>
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low hover:bg-surface-container focus:bg-surface-container-lowest text-on-surface rounded-lg font-body-md text-body-md outline-none transition-all"
                          type="email"
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

                  {/* Velocity Box */}
                  <div className="mt-space-xs p-space-md rounded-xl bg-gradient-to-br from-primary-fixed/40 via-surface-container to-surface-container-low flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[20px]">bolt</span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold">
                          Current Flow Score
                        </p>
                        <p className="font-body-sm text-body-sm text-outline">Target: 34h Deep Work / Wk</p>
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
                </section>

                {/* Connected Tools & Integrations */}
                <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        sync_saved_locally
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Connected Tools
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Ecosystem bi-directional synchronization
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-space-sm">
                    <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-9 h-9 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            Google Calendar
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Focus windows syncing
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-semibold">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-9 h-9 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-[20px]">code</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            GitHub PRs
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Task branch auto-linking
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-sm font-semibold">
                        Linked
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: Chronotypes, Peak Hours & Defaults (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-space-lg">
                {/* Chronotypes Card */}
                <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        psychology
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Energy Chronotype
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Successor schedules complex work around your biological peak
                        </p>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                      Smart Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
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
                        <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary-fixed" />
                      )}
                      <div>
                        <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[20px]">wb_sunny</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Morning Lark
                        </h3>
                        <p className="font-label-sm text-label-sm text-primary font-semibold mt-0.5">
                          {chronotype === "lark" ? "Active Preference" : "Select"}
                        </p>
                        <p className="font-body-sm text-body-sm text-outline mt-2 leading-relaxed">
                          Cognitive focus spikes early (8:30 – 12:30). High-impact strategy tasks auto-slotted before midday.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-highest/80 flex items-center justify-between font-tabular-mono text-label-sm text-on-surface-variant">
                        <span>Peak: 9:00 AM</span>
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
                        <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary-fixed" />
                      )}
                      <div>
                        <div className="w-9 h-9 rounded-lg bg-surface-container-high text-outline flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[20px]">air</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Steady Falcon
                        </h3>
                        <p className="font-label-sm text-label-sm text-outline font-semibold mt-0.5">
                          {chronotype === "falcon" ? "Active Preference" : "Sustained Output"}
                        </p>
                        <p className="font-body-sm text-body-sm text-outline mt-2 leading-relaxed">
                          Consistent output between 11:00 AM – 5:00 PM with flat stamina decay and zero post-lunch dip.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-highest/40 flex items-center justify-between font-tabular-mono text-label-sm text-on-surface-variant">
                        <span>Peak: 1:30 PM</span>
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
                        <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary-fixed" />
                      )}
                      <div>
                        <div className="w-9 h-9 rounded-lg bg-surface-container-high text-outline flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                        </div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Night Owl
                        </h3>
                        <p className="font-label-sm text-label-sm text-outline font-semibold mt-0.5">
                          {chronotype === "owl" ? "Active Preference" : "Late Surge"}
                        </p>
                        <p className="font-body-sm text-body-sm text-outline mt-2 leading-relaxed">
                          Creative resurgence from 17:00 – 22:30. Shields early mornings for async low-energy triage.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-container-highest/40 flex items-center justify-between font-tabular-mono text-label-sm text-on-surface-variant">
                        <span>Peak: 7:00 PM</span>
                        <span className="text-outline">Select</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Productivity Rhythms & Duration */}
                <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                        equalizer
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                          Weekly Rhythm &amp; Focus Windows
                        </h2>
                        <p className="font-body-sm text-body-sm text-outline">
                          Fine-tune your cognitive blocks across diurnal energy phases
                        </p>
                      </div>
                    </div>
                    <span className="font-tabular-mono text-body-sm font-semibold text-secondary">
                      Optimal Cadence
                    </span>
                  </div>

                  {/* Multi-Phase Heat Bar */}
                  <div className="flex flex-col gap-space-xs p-space-md bg-surface-container-low rounded-xl">
                    <div className="flex items-center justify-between text-label-sm text-outline">
                      <span>06:00 Early</span>
                      <span>10:00 Morning Peak</span>
                      <span>14:00 Afternoon Drip</span>
                      <span>18:00 Twilight</span>
                      <span>22:00 Wind-Down</span>
                    </div>

                    <div className="relative w-full h-8 rounded-lg overflow-hidden flex items-stretch shadow-inner bg-surface-container-highest">
                      <div className="w-[15%] bg-surface-container-high flex items-center justify-center">
                        <span className="text-[10px] text-outline font-medium">Warmup</span>
                      </div>
                      <div className="w-[35%] bg-primary flex items-center justify-between px-3 text-on-primary font-label-sm font-semibold shadow-md">
                        <div className="w-1.5 h-3.5 bg-on-primary/60 rounded-full" />
                        <span className="truncate flex items-center gap-1 text-[11px]">
                          <span className="material-symbols-outlined text-[14px]">offline_bolt</span>
                          Deep Focus (09:00 – 12:30)
                        </span>
                        <div className="w-1.5 h-3.5 bg-on-primary/60 rounded-full" />
                      </div>
                      <div className="w-[25%] bg-tertiary-container/30 flex items-center justify-between px-2 text-tertiary font-label-sm">
                        <span className="truncate text-[11px] font-medium">
                          Recovery (12:30 – 15:30)
                        </span>
                      </div>
                      <div className="w-[15%] bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed text-[10px] font-medium">
                        Sprint
                      </div>
                      <div className="w-[10%] bg-surface-container-high flex items-center justify-center text-outline text-[10px]">
                        Rest
                      </div>
                    </div>
                  </div>

                  {/* Default Focus Duration Selector */}
                  <div className="flex flex-col gap-2 pt-space-xs">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      Default Focus Session Duration
                    </label>
                    <div className="grid grid-cols-3 gap-space-sm">
                      {[
                        { val: "25", label: "25 min", sub: "Classic Pomodoro" },
                        { val: "50", label: "50 min", sub: "Deep Block (Recommended)" },
                        { val: "90", label: "90 min", sub: "Flow State Immersion" },
                      ].map((dur) => (
                        <div
                          key={dur.val}
                          onClick={() => setFocusDuration(dur.val)}
                          className={`flex flex-col items-center justify-center p-space-sm rounded-lg cursor-pointer transition-colors text-center border ${
                            focusDuration === dur.val
                              ? "bg-primary-fixed text-on-primary-fixed border-primary font-semibold shadow-sm"
                              : "bg-surface-container-low hover:bg-surface-container border-transparent"
                          }`}
                        >
                          <span className="font-tabular-mono text-body-lg font-bold">
                            {dur.label}
                          </span>
                          <span className="font-label-sm text-label-sm text-outline">
                            {dur.sub}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Automation & Rituals */}
                <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col gap-space-md border border-outline-variant/15">
                  <div className="flex items-center gap-space-xs">
                    <span className="p-2 rounded-lg bg-surface-container-high text-primary material-symbols-outlined text-[20px]">
                      auto_awesome
                    </span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                        Rituals &amp; Task Automation
                      </h2>
                      <p className="font-body-sm text-body-sm text-outline">
                        Configure zero-friction defaults for rapid task dispatching
                      </p>
                    </div>
                  </div>

                  <div className="space-y-space-sm">
                    {/* Smart Daily Rollover */}
                    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                      <div className="flex items-start gap-space-sm pr-4">
                        <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">
                          event_repeat
                        </span>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface font-semibold">
                            Smart Daily Rollover
                          </p>
                          <p className="font-body-sm text-body-sm text-outline">
                            Auto-reschedule unfinished low &amp; medium priority tasks to tomorrow’s morning queue.
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
                          <option>Personal Rituals</option>
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
            </div>
          </div>
        </main>

        {/* BOTTOM FLOATING STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-surface/90 backdrop-blur-xl px-space-lg py-3 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.03)] border-t border-outline-variant/15">
          <div className="flex items-center gap-space-sm text-outline">
            <span className="material-symbols-outlined text-secondary text-[20px]">cloud_done</span>
            <span className="font-body-sm text-body-sm">
              {saveSuccess ? (
                <span className="text-secondary font-bold">Preferences saved to Cloud!</span>
              ) : (
                "All changes auto-validated and synced in real time across the app"
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
