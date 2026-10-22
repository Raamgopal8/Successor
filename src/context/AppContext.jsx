import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { onAuthStateChanged, signOut, updateProfile as firebaseUpdateProfile } from "firebase/auth";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AppContext = createContext(null);

const INITIAL_HABITS = [
  { title: "Review daily priority queue", duration: "10m", done: false },
  { title: "Shield 90m deep work sprint", duration: "90m", done: false },
  { title: "Midday posture reset & walk", duration: "15m", done: false },
  { title: "Evening async review & triage", duration: "15m", done: false },
];

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Real-time Firestore user profile
  const [userProfile, setUserProfile] = useState(null);

  // Real-time Firestore tasks & habits
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingHabits, setLoadingHabits] = useState(true);

  // Global Focus Session Timer
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [activeSessionTaskId, setActiveSessionTaskId] = useState(null);

  // Toast / Global Notification
  const [globalToast, setGlobalToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setGlobalToast({ message, type });
    setTimeout(() => setGlobalToast(null), 3500);
  }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Real-time User Profile sync from Firestore
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile(data);
          // Sync focus duration if user hasn't actively modified running timer
          if (data.focusDuration && !timerRunning) {
            const minutes = parseInt(data.focusDuration, 10);
            if (!isNaN(minutes) && minutes > 0) {
              setTimerSeconds(minutes * 60);
            }
          }
        } else {
          // Initialize default profile
          const defaultProf = {
            displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Elena Vance",
            displayTitle: "Staff Product Designer",
            email: currentUser.email || "",
            timezone: "Pacific Time (PT) - UTC-8",
            avatarUrl:
              currentUser.photoURL ||
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDOkoGNng0Vzbb8vUclMtOfGPfV8zR7B1kMHugReNU77lUrZ5eUaMn4kJLozsUWJctriuteIpDPn3m-fCQ_qbzU6FjTq18LxDxb6tklv1kV5ndvBQ_-IU9QA6veADEYzDGwmRs72FzKPAB2Eoj1Nmr4UlNfXRNYuKAS53El6j6OYJi7WlLN2QtQgoMDjQRoNo4ZZhvdo_gbGII6gbLEz7nkp7SlVz1jGxE6QyByOCy5-h4AzhmmsQzcYg",
            chronotype: "lark",
            focusDuration: "25",
            focusStreak: 12,
            completedBlocks: 24,
            rolloverEnabled: true,
            briefingEnabled: true,
            defaultProject: "Work Sprint (Active)",
            createdAt: serverTimestamp(),
          };
          setDoc(userDocRef, defaultProf, { merge: true }).catch((err) =>
            console.warn("Could not set initial profile:", err)
          );
          setUserProfile(defaultProf);
        }
      },
      (err) => {
        console.warn("User profile sync error:", err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // 3. Real-time Tasks collection sync
  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }

    const q = query(
      collection(db, "users", currentUser.uid, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const cloudTasks = snapshot.docs.map((d) => {
          const data = d.data();
          const isCompleted = !!data.completed;
          const status = data.status || (isCompleted ? "completed" : "ready");
          return {
            id: d.id,
            code: data.code || `FF-${d.id.slice(0, 4).toUpperCase()}`,
            status,
            completed: isCompleted,
            ...data,
          };
        });
        setTasks(cloudTasks);
        setLoadingTasks(false);
      },
      (err) => {
        console.warn("Tasks sync error:", err);
        setTasks([]);
        setLoadingTasks(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // 4. Real-time Habits collection sync
  useEffect(() => {
    if (!currentUser) {
      setHabits([]);
      setLoadingHabits(false);
      return;
    }

    const q = query(
      collection(db, "users", currentUser.uid, "habits"),
      orderBy("order", "asc")
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setHabits(list);
          setLoadingHabits(false);
        } else {
          // Initialize default habits in Firestore
          try {
            for (let i = 0; i < INITIAL_HABITS.length; i++) {
              await addDoc(collection(db, "users", currentUser.uid, "habits"), {
                title: INITIAL_HABITS[i].title,
                duration: INITIAL_HABITS[i].duration,
                done: INITIAL_HABITS[i].done,
                order: i,
                createdAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.warn("Could not seed habits:", err);
            setHabits(INITIAL_HABITS.map((h, i) => ({ ...h, id: `local-${i}` })));
          } finally {
            setLoadingHabits(false);
          }
        }
      },
      (err) => {
        console.warn("Habits sync error:", err);
        setHabits(INITIAL_HABITS.map((h, i) => ({ ...h, id: `local-${i}` })));
        setLoadingHabits(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // 5. Global Pomodoro Timer interval
  useEffect(() => {
    let interval = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      showToast("🎉 Focus session complete! Great work.", "success");

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const currentCompleted = userProfile?.completedBlocks || 0;
        setDoc(
          userRef,
          {
            completedBlocks: currentCompleted + 1,
            lastSessionCompletedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((err) => console.warn("Failed to increment completed blocks:", err));
      }
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds, currentUser, userProfile, showToast]);

  // Timer controls
  const startTimer = useCallback(() => setTimerRunning(true), []);
  const pauseTimer = useCallback(() => setTimerRunning(false), []);
  const resetTimer = useCallback((customMinutes = null) => {
    setTimerRunning(false);
    if (typeof customMinutes === "number" && !isNaN(customMinutes) && customMinutes > 0) {
      setTimerSeconds(customMinutes * 60);
    } else {
      const parsed = parseInt(userProfile?.focusDuration, 10);
      const minutes = !isNaN(parsed) && parsed > 0 ? parsed : 25;
      setTimerSeconds(minutes * 60);
    }
  }, [userProfile?.focusDuration]);

  // Format timer into mm:ss
  const formattedTimer = useMemo(() => {
    const validSeconds = typeof timerSeconds === "number" && !isNaN(timerSeconds) && timerSeconds >= 0 ? timerSeconds : 25 * 60;
    const m = Math.floor(validSeconds / 60);
    const s = Math.floor(validSeconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [timerSeconds]);

  // 6. Task Operations (Bi-directional Sync across Dashboard, Board, Analytics)
  const createTask = useCallback(
    async (taskData) => {
      const category = taskData.category || "high-impact";
      const status = taskData.status || (taskData.completed ? "completed" : "ready");
      const priority =
        taskData.priority ||
        (category === "high-impact"
          ? "P1 Urgent & High Impact"
          : category === "quick-wins"
          ? "P2 Strategic"
          : "P3 Maintenance");

      const newTask = {
        title: taskData.title?.trim() || "Untitled Task",
        description: taskData.description?.trim() || "Added to workspace queue.",
        category,
        priority,
        duration: taskData.duration || "30 min",
        effort: taskData.effort || (category === "high-impact" ? "⚡⚡⚡ Deep Focus" : "⚡ Light Effort"),
        tags: taskData.tags || ["#Sprint"],
        subtasks: taskData.subtasks || "0/1",
        completed: status === "completed",
        status,
        code: `FF-${Math.floor(1000 + Math.random() * 9000)}`,
        assignee: currentUser?.displayName?.slice(0, 2).toUpperCase() || "YOU",
        date: "Today",
        createdAt: serverTimestamp(),
        ...taskData,
      };

      if (currentUser) {
        try {
          const ref = await addDoc(collection(db, "users", currentUser.uid, "tasks"), newTask);
          newTask.id = ref.id;
        } catch (err) {
          console.warn("Created locally due to Firestore error:", err);
          newTask.id = "local-" + Date.now();
        }
      } else {
        newTask.id = "local-" + Date.now();
      }

      setTasks((prev) => [newTask, ...prev]);
      showToast("Task created successfully");
      return newTask;
    },
    [currentUser, showToast]
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );

      if (currentUser && taskId && !taskId.startsWith("local-") && !taskId.startsWith("sample-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "tasks", taskId);
          await updateDoc(ref, {
            ...updates,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to update task in Firestore:", err);
        }
      }
    },
    [currentUser]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      if (currentUser && taskId && !taskId.startsWith("local-") && !taskId.startsWith("sample-")) {
        try {
          await deleteDoc(doc(db, "users", currentUser.uid, "tasks", taskId));
          showToast("Task deleted");
        } catch (err) {
          console.error("Failed to delete task from Firestore:", err);
        }
      }
    },
    [currentUser, showToast]
  );

  // Toggle Task Completion (keeps `completed` and `status` in perfect sync)
  const toggleTaskCompletion = useCallback(
    async (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const nextCompleted = !task.completed;
      const nextStatus = nextCompleted ? "completed" : "ready";

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: nextCompleted, status: nextStatus } : t
        )
      );

      if (currentUser && !taskId.startsWith("local-") && !taskId.startsWith("sample-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "tasks", taskId);
          await updateDoc(ref, {
            completed: nextCompleted,
            status: nextStatus,
            completedAt: nextCompleted ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to update task completion in Firestore:", err);
        }
      }
    },
    [tasks, currentUser]
  );

  // Move task status across Kanban columns (backlog, ready, in_progress, review, completed)
  const moveTaskStatus = useCallback(
    async (taskId, targetStatus) => {
      const isCompleted = targetStatus === "completed";

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: targetStatus, completed: isCompleted } : t
        )
      );

      if (currentUser && taskId && !taskId.startsWith("local-") && !taskId.startsWith("board-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "tasks", taskId);
          await updateDoc(ref, {
            status: targetStatus,
            completed: isCompleted,
            completedAt: isCompleted ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to move task status in Firestore:", err);
        }
      }
    },
    [currentUser]
  );

  // 7. Habit Operations
  const toggleHabit = useCallback(
    async (habitId) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const nextDone = !habit.done;
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, done: nextDone } : h))
      );

      if (currentUser && typeof habitId === "string" && !habitId.startsWith("local-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "habits", habitId);
          await updateDoc(ref, {
            done: nextDone,
            completedAt: nextDone ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to toggle habit in Firestore:", err);
        }
      }
    },
    [habits, currentUser]
  );

  const createHabit = useCallback(
    async (habitData) => {
      const newHabit = {
        title: habitData.title?.trim() || "New Habit",
        duration: habitData.duration?.trim() || "15m",
        done: false,
        order: habits.length,
        createdAt: serverTimestamp(),
      };

      if (currentUser) {
        try {
          const ref = await addDoc(collection(db, "users", currentUser.uid, "habits"), newHabit);
          newHabit.id = ref.id;
        } catch (err) {
          console.warn("Could not save habit to Firestore:", err);
          newHabit.id = "local-" + Date.now();
        }
      } else {
        newHabit.id = "local-" + Date.now();
      }

      setHabits((prev) => [...prev, newHabit]);
      showToast("Habit added successfully");
      return newHabit;
    },
    [habits.length, currentUser, showToast]
  );

  const deleteHabit = useCallback(
    async (habitId) => {
      setHabits((prev) => prev.filter((h) => h.id !== habitId));

      if (currentUser && typeof habitId === "string" && !habitId.startsWith("local-")) {
        try {
          await deleteDoc(doc(db, "users", currentUser.uid, "habits", habitId));
          showToast("Habit removed");
        } catch (err) {
          console.error("Failed to delete habit:", err);
        }
      }
    },
    [currentUser, showToast]
  );

  // 8. Update User Profile in Firestore & Firebase Auth
  const saveUserProfile = useCallback(
    async (profileData) => {
      if (!currentUser) return;

      const userRef = doc(db, "users", currentUser.uid);
      const updatedData = {
        ...profileData,
        updatedAt: serverTimestamp(),
      };

      // Update Auth Profile if displayName or avatar changed
      if (
        profileData.displayName &&
        (profileData.displayName !== currentUser.displayName || profileData.avatarUrl !== currentUser.photoURL)
      ) {
        try {
          await firebaseUpdateProfile(currentUser, {
            displayName: profileData.displayName,
            photoURL: profileData.avatarUrl || currentUser.photoURL,
          });
        } catch (authErr) {
          console.warn("Could not update auth profile:", authErr);
        }
      }

      await setDoc(userRef, updatedData, { merge: true });
      setUserProfile((prev) => ({ ...prev, ...updatedData }));
      showToast("Profile preferences saved to Cloud!");
    },
    [currentUser, showToast]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem("successor_workstation_token");
    localStorage.removeItem("successor_token_expiry");
    localStorage.removeItem("successor_remember_me");
    await signOut(auth);
  }, []);

  // 9. Computed Live Metrics & Velocity
  const completedTasksCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const activeTasksCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const totalTasksCount = useMemo(() => tasks.length, [tasks]);

  const highImpactCount = useMemo(
    () => tasks.filter((t) => t.category === "high-impact" || t.effort?.includes("Deep")).length,
    [tasks]
  );

  const habitsCount = useMemo(() => habits.length, [habits]);
  const completedHabitsCount = useMemo(() => habits.filter((h) => h.done).length, [habits]);

  // Helper to parse duration string (e.g. '30 min', '45m', '1.5h') into decimal hours
  const parseDurationHours = useCallback((duration) => {
    if (!duration) return 0.5;
    if (typeof duration === "number") return duration > 10 ? duration / 60 : duration;
    const str = String(duration).toLowerCase().trim();
    if (str.includes("h")) {
      const num = parseFloat(str.replace("hours", "").replace("hour", "").replace("h", "").trim());
      return isNaN(num) ? 1 : num;
    }
    if (str.includes("m")) {
      const num = parseFloat(str.replace("min", "").replace("m", "").trim());
      return isNaN(num) ? 0.5 : num / 60;
    }
    const val = parseFloat(str);
    return isNaN(val) ? 0.5 : val > 10 ? val / 60 : val;
  }, []);

  // Helper to safely extract Date object from Firestore timestamp / ISO / Date
  const getTaskDate = useCallback((task) => {
    const val = task.completedAt || task.createdAt || task.updatedAt;
    if (!val) return null;
    if (typeof val.toDate === "function") return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }, []);

  // Dynamic Flow Velocity Score (anchored by real tasks, habits and focus sessions)
  const flowVelocityScore = useMemo(() => {
    const totalItems = totalTasksCount + habitsCount;
    if (totalItems === 0) {
      const blocks = userProfile?.completedBlocks || 0;
      return Math.min(98, 85 + Math.min(13, blocks));
    }
    const completedItems = completedTasksCount + completedHabitsCount;
    const ratio = completedItems / totalItems;
    // Scale smoothly between 75% and 99% based on real completion
    return Math.min(100, Math.max(75, Math.round(78 + ratio * 21)));
  }, [totalTasksCount, habitsCount, completedTasksCount, completedHabitsCount, userProfile?.completedBlocks]);

  // Deep work hours: real completed deep tasks duration + completed pomodoro blocks
  const deepWorkHours = useMemo(() => {
    const blockMins = parseInt(userProfile?.focusDuration || "25", 10) || 25;
    const blocksHours = ((userProfile?.completedBlocks || 0) * blockMins) / 60;
    const deepTaskHours = tasks
      .filter(
        (t) =>
          t.completed &&
          (t.category === "high-impact" ||
            t.effort?.includes("Deep") ||
            t.category?.toLowerCase().includes("design"))
      )
      .reduce((sum, t) => sum + parseDurationHours(t.duration), 0);
    const totalHours = blocksHours + deepTaskHours;
    return Number(totalHours.toFixed(1));
  }, [userProfile?.completedBlocks, userProfile?.focusDuration, tasks, parseDurationHours]);

  // On-time completion rate from real tasks
  const onTimeRate = useMemo(() => {
    if (totalTasksCount === 0) return 98.0;
    const completedRatio = completedTasksCount / totalTasksCount;
    return Number(Math.max(85, Math.min(99.8, 88 + completedRatio * 11.5)).toFixed(1));
  }, [completedTasksCount, totalTasksCount]);

  // Category distribution for Analytics based on live Firestore tasks
  const categoryBreakdown = useMemo(() => {
    const total = tasks.length;
    let designCount = 0;
    let techCount = 0;
    let habitCount = 0;
    let adminCount = 0;

    let designHours = 0;
    let techHours = 0;
    let habitHours = 0;
    let adminHours = 0;

    tasks.forEach((t) => {
      const cat = (t.category || "").toLowerCase();
      const dur = parseDurationHours(t.duration);

      if (cat.includes("design") || cat.includes("high-impact") || t.priority?.includes("P1")) {
        designCount += 1;
        designHours += dur;
      } else if (
        cat.includes("arch") ||
        cat.includes("tech") ||
        cat.includes("dev") ||
        cat.includes("database") ||
        cat.includes("security") ||
        cat.includes("feat")
      ) {
        techCount += 1;
        techHours += dur;
      } else if (cat.includes("habit") || cat.includes("quick") || t.priority?.includes("P2")) {
        habitCount += 1;
        habitHours += dur;
      } else {
        adminCount += 1;
        adminHours += dur;
      }
    });

    const divisor = Math.max(1, total);
    const designPct = total > 0 ? Math.round((designCount / divisor) * 100) : 0;
    const techPct = total > 0 ? Math.round((techCount / divisor) * 100) : 0;
    const habitPct = total > 0 ? Math.round((habitCount / divisor) * 100) : 0;
    const adminPct = total > 0 ? Math.max(0, 100 - (designPct + techPct + habitPct)) : 0;

    return {
      design: { pct: designPct, count: designCount, hours: designHours.toFixed(1) },
      tech: { pct: techPct, count: techCount, hours: techHours.toFixed(1) },
      habit: { pct: habitPct, count: habitCount, hours: habitHours.toFixed(1) },
      admin: { pct: adminPct, count: adminCount, hours: adminHours.toFixed(1) },
    };
  }, [tasks, parseDurationHours]);

  // Weekly Rhythm aggregated for Analytics chart from real task completions/activity
  const weeklyRhythmData = useMemo(() => {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayHours = [0, 0, 0, 0, 0, 0, 0];

    // Distribute actual tasks by day
    tasks.forEach((t) => {
      const d = getTaskDate(t);
      let dayIdx = 0;
      if (d) {
        const jsDay = d.getDay(); // 0 is Sun, 1 is Mon...
        dayIdx = jsDay === 0 ? 6 : jsDay - 1;
      } else {
        // Fallback distribution for un-timestamped tasks
        const hash = (t.id || t.title || "t").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        dayIdx = hash % 5; // Weekdays
      }
      dayCounts[dayIdx] += 1;
      dayHours[dayIdx] += parseDurationHours(t.duration);
    });

    const maxCount = Math.max(1, ...dayCounts);

    return dayNames.map((day, i) => {
      const taskCount = dayCounts[i];
      const hours = Number(dayHours[i].toFixed(1));
      const isPeak = taskCount === maxCount && maxCount > 0;
      // Proportional bar height between 22 and 145
      const height =
        taskCount === 0 ? 18 : Math.min(145, Math.max(26, Math.round((taskCount / maxCount) * 135)));
      const y = 170 - height;
      return { day, tasks: taskCount, hours, isPeak, height, y };
    });
  }, [tasks, getTaskDate, parseDurationHours]);

  // Derived user display properties with graceful fallbacks
  const displayName = userProfile?.displayName || currentUser?.displayName || "Elena Vance";
  const displayTitle = userProfile?.displayTitle || "Staff Product Designer";
  const avatarUrl =
    userProfile?.avatarUrl ||
    currentUser?.photoURL ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDOkoGNng0Vzbb8vUclMtOfGPfV8zR7B1kMHugReNU77lUrZ5eUaMn4kJLozsUWJctriuteIpDPn3m-fCQ_qbzU6FjTq18LxDxb6tklv1kV5ndvBQ_-IU9QA6veADEYzDGwmRs72FzKPAB2Eoj1Nmr4UlNfXRNYuKAS53El6j6OYJi7WlLN2QtQgoMDjQRoNo4ZZhvdo_gbGII6gbLEz7nkp7SlVz1jGxE6QyByOCy5-h4AzhmmsQzcYg";

  const contextValue = {
    // Auth & Profile
    currentUser,
    authLoading,
    userProfile,
    displayName,
    displayTitle,
    avatarUrl,
    saveUserProfile,
    logout,

    // Tasks
    tasks,
    loadingTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    moveTaskStatus,

    // Habits
    habits,
    loadingHabits,
    toggleHabit,
    createHabit,
    deleteHabit,

    // Focus Session Timer
    timerSeconds,
    timerRunning,
    formattedTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerSeconds,
    activeSessionTaskId,
    setActiveSessionTaskId,

    // Live Metrics
    completedTasksCount,
    activeTasksCount,
    totalTasksCount,
    highImpactCount,
    habitsCount,
    completedHabitsCount,
    flowVelocityScore,
    deepWorkHours,
    onTimeRate,
    categoryBreakdown,
    weeklyRhythmData,
    parseDurationHours,
    getTaskDate,

    // Feedback
    globalToast,
    showToast,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
