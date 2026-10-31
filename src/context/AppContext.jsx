import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";

export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export const getTodayString = getLocalDateString;

export const getYesterdayString = (d = new Date()) => {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return getLocalDateString(y);
};

export const getDaysDifference = (earlierDateStr, laterDateStr) => {
  if (!earlierDateStr || !laterDateStr) return null;
  const [y1, m1, d1] = earlierDateStr.split("-").map(Number);
  const [y2, m2, d2] = laterDateStr.split("-").map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const parseTaskDateHelper = (task) => {
  if (!task) return null;
  const val = task.completedAt || task.createdAt || task.updatedAt;
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const AppContext = createContext(null);

export const LABEL_COLOR_OPTIONS = [
  { key: "error", label: "Red / Urgent", bg: "bg-error-container text-on-error-container", border: "border-error/30", dot: "bg-error" },
  { key: "primary", label: "Indigo / Primary", bg: "bg-primary-container text-on-primary-container", border: "border-primary/30", dot: "bg-primary" },
  { key: "secondary", label: "Teal / Ritual", bg: "bg-secondary-container text-on-secondary-container", border: "border-secondary/30", dot: "bg-secondary" },
  { key: "tertiary", label: "Amber / Strategic", bg: "bg-tertiary-container text-on-tertiary-container", border: "border-tertiary/30", dot: "bg-tertiary" },
  { key: "emerald", label: "Green / Growth", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  { key: "purple", label: "Purple / Strategy", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300", border: "border-purple-500/30", dot: "bg-purple-500" },
  { key: "blue", label: "Blue / Dev", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300", border: "border-blue-500/30", dot: "bg-blue-500" },
  { key: "pink", label: "Pink / Design", bg: "bg-pink-500/15 text-pink-700 dark:text-pink-300", border: "border-pink-500/30", dot: "bg-pink-500" },
  { key: "orange", label: "Orange / Review", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300", border: "border-orange-500/30", dot: "bg-orange-500" },
  { key: "slate", label: "Slate / Neutral", bg: "bg-surface-container-high text-on-surface-variant", border: "border-outline-variant/30", dot: "bg-outline" },
];

export const DEFAULT_TASK_LABELS = [
  { id: "lbl-p1", name: "P1 Urgent & High Impact", type: "priority", color: "error" },
  { id: "lbl-p2", name: "P2 Strategic", type: "priority", color: "tertiary" },
  { id: "lbl-p3", name: "P3 Maintenance", type: "priority", color: "slate" },
  { id: "lbl-p4", name: "P4 Low Priority", type: "priority", color: "slate" },
  { id: "lbl-work", name: "Work Sprint", type: "category", color: "primary" },
  { id: "lbl-deep", name: "Deep Work", type: "category", color: "tertiary" },
  { id: "lbl-quick", name: "Quick Wins", type: "category", color: "emerald" },
  { id: "lbl-personal", name: "Personal Rituals", type: "category", color: "secondary" },
  { id: "lbl-design", name: "Design System", type: "category", color: "pink" },
  { id: "lbl-dev", name: "Engineering / Dev", type: "category", color: "blue" },
];

export const getLabelStyleHelper = (nameOrId, customLabels = DEFAULT_TASK_LABELS) => {
  if (!nameOrId) {
    return {
      bg: "bg-surface-container-high text-on-surface-variant",
      border: "border-outline-variant/30",
      dot: "bg-outline",
    };
  }

  const str = String(nameOrId).toLowerCase().trim();
  const list = Array.isArray(customLabels) && customLabels.length > 0 ? customLabels : DEFAULT_TASK_LABELS;
  const found = list.find(
    (l) => l.id?.toLowerCase() === str || l.name?.toLowerCase() === str
  );
  if (found) {
    const colorOpt = LABEL_COLOR_OPTIONS.find((c) => c.key === found.color) || LABEL_COLOR_OPTIONS[1];
    return {
      bg: colorOpt.bg,
      border: colorOpt.border,
      dot: colorOpt.dot,
    };
  }

  if (str.includes("p1") || str.includes("urgent") || str.includes("high-impact")) {
    return LABEL_COLOR_OPTIONS[0];
  }
  if (str.includes("p2") || str.includes("strategic") || str.includes("quick-wins")) {
    return LABEL_COLOR_OPTIONS[3];
  }
  if (str.includes("p3") || str.includes("maintenance")) {
    return LABEL_COLOR_OPTIONS[9];
  }
  if (str.includes("deep")) {
    return LABEL_COLOR_OPTIONS[3];
  }
  if (str.includes("personal") || str.includes("habit")) {
    return LABEL_COLOR_OPTIONS[2];
  }
  if (str.includes("work") || str.includes("sprint")) {
    return LABEL_COLOR_OPTIONS[1];
  }

  const hash = str.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return LABEL_COLOR_OPTIONS[Math.abs(hash) % LABEL_COLOR_OPTIONS.length];
};

const INITIAL_HABITS = [
  { title: "Review daily priority queue", duration: "10m", done: false, cadence: "weekdays", streak: 5, bestStreak: 12, streakShields: 2 },
  { title: "Shield 90m deep work sprint", duration: "90m", done: false, cadence: "weekdays", streak: 7, bestStreak: 14, streakShields: 2 },
  { title: "Midday posture reset & walk", duration: "15m", done: false, cadence: "daily", streak: 12, bestStreak: 20, streakShields: 1 },
  { title: "Evening async review & triage", duration: "15m", done: false, cadence: "daily", streak: 4, bestStreak: 9, streakShields: 2 },
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
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
      } else {
        const isGuest = localStorage.getItem("successor_guest_session") === "true";
        if (isGuest) {
          setCurrentUser({
            uid: "guest-workstation-local",
            isAnonymous: true,
            displayName: "Guest Executive",
            email: "guest@successor.local",
            getIdToken: async () => "local-guest-token",
          });
        } else {
          setCurrentUser(null);
        }
        setAuthLoading(false);
      }
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
            displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Josh Royce",
            displayTitle: "Product Manager",
            email: currentUser.email || "",
            timezone: "Pacific Time (PT) - UTC-8",
            avatarUrl:
              currentUser.photoURL ||
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDOkoGNng0Vzbb8vUclMtOfGPfV8zR7B1kMHugReNU77lUrZ5eUaMn4kJLozsUWJctriuteIpDPn3m-fCQ_qbzU6FjTq18LxDxb6tklv1kV5ndvBQ_-IU9QA6veADEYzDGwmRs72FzKPAB2Eoj1Nmr4UlNfXRNYuKAS53El6j6OYJi7WlLN2QtQgoMDjQRoNo4ZZhvdo_gbGII6gbLEz7nkp7SlVz1jGxE6QyByOCy5-h4AzhmmsQzcYg",
            chronotype: "lark",
            focusDuration: "25",
            focusStreak: 12,
            longestStreak: 21,
            streakFreezes: 2,
            restDaysCadence: "Weekends (Sat & Sun)",
            lastStreakCreditedDate: getYesterdayString(new Date()),
            lastTaskCompletedDate: getYesterdayString(new Date()),
            completedBlocks: 0,
            dailyTargetBlocks: 3,
            lastResetDate: getLocalDateString(new Date()),
            rolloverEnabled: true,
            briefingEnabled: true,
            customLabels: DEFAULT_TASK_LABELS,
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
          const todayStr = getLocalDateString(new Date());
          const staleHabitsToReset = [];

          const list = snapshot.docs.map((d) => {
            const data = d.data();
            const habitId = d.id;

            // A habit is done today if and only if it was completed on today's local date
            let isDoneToday = false;
            if (data.done) {
              if (data.lastCompletedDate) {
                isDoneToday = data.lastCompletedDate === todayStr;
              } else if (data.completedAt) {
                try {
                  const compDate = data.completedAt.toDate
                    ? data.completedAt.toDate()
                    : new Date(data.completedAt);
                  isDoneToday = getLocalDateString(compDate) === todayStr;
                } catch {
                  isDoneToday = false;
                }
              }
            }

            // If the document in Firestore had done: true from a previous date, queue it to reset in Firestore
            if (data.done && !isDoneToday) {
              staleHabitsToReset.push(habitId);
            }

            return {
              id: habitId,
              ...data,
              done: isDoneToday,
            };
          });

          setHabits(list);
          setLoadingHabits(false);

          // Asynchronously update Firestore for any stale habit documents so database remains clean
          if (staleHabitsToReset.length > 0 && currentUser) {
            try {
              const batch = writeBatch(db);
              staleHabitsToReset.forEach((hId) => {
                const hRef = doc(db, "users", currentUser.uid, "habits", hId);
                batch.set(hRef, { done: false, updatedAt: serverTimestamp() }, { merge: true });
              });
              await batch.commit();
            } catch (err) {
              console.warn("Could not sync reset stale habits:", err);
            }
          }
        } else {
          // Initialize default habits in Firestore
          try {
            for (let i = 0; i < INITIAL_HABITS.length; i++) {
              await addDoc(collection(db, "users", currentUser.uid, "habits"), {
                title: INITIAL_HABITS[i].title,
                duration: INITIAL_HABITS[i].duration,
                done: false,
                lastCompletedDate: null,
                cadence: INITIAL_HABITS[i].cadence || "daily",
                streak: INITIAL_HABITS[i].streak || 0,
                bestStreak: INITIAL_HABITS[i].bestStreak || 0,
                streakShields: INITIAL_HABITS[i].streakShields ?? 2,
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

  // Increment or record completed focus blocks for today
  const incrementCompletedBlocks = useCallback(
    async (amount = 1) => {
      const todayStr = getLocalDateString(new Date());
      const isToday = userProfile?.lastResetDate === todayStr;
      const currentCompleted = isToday ? (userProfile?.completedBlocks || 0) : 0;
      const nextBlocks = Math.max(0, currentCompleted + amount);

      setUserProfile((prev) => ({
        ...prev,
        completedBlocks: nextBlocks,
        lastResetDate: todayStr,
      }));

      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(
            userRef,
            {
              completedBlocks: nextBlocks,
              lastResetDate: todayStr,
              lastSessionCompletedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn("Failed to increment completed blocks:", err);
        }
      }

      if (amount > 0) {
        showToast(`🎯 Focus Block recorded! (${nextBlocks} today)`, "success");
      }
      return nextBlocks;
    },
    [currentUser, userProfile, showToast]
  );

  // 5. Global Pomodoro Timer interval
  useEffect(() => {
    let interval = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      incrementCompletedBlocks(1);
      const parsed = parseInt(userProfile?.focusDuration, 10);
      const minutes = !isNaN(parsed) && parsed > 0 ? parsed : 25;
      setTimerSeconds(minutes * 60);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds, incrementCompletedBlocks, userProfile?.focusDuration]);

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

      const todayStr = getLocalDateString(new Date());
      const initialDate = taskData.date || (status === "backlog" ? "Backlog" : "Today");
      const assignedDate = taskData.assignedDate || (status === "backlog" ? null : todayStr);

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
        date: initialDate,
        assignedDate,
        createdAt: serverTimestamp(),
        ...taskData,
      };

      if (currentUser) {
        try {
          const ref = await addDoc(collection(db, "users", currentUser.uid, "tasks"), newTask);
          newTask.id = ref.id;
        } catch (err) {
          console.warn("Created locally due to error:", err);
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

  // Bulk creation of tasks (e.g. from AI Goal / Sprint generator)
  const createMultipleTasks = useCallback(
    async (taskDataArray = []) => {
      if (!Array.isArray(taskDataArray) || taskDataArray.length === 0) return [];
      const todayStr = getLocalDateString(new Date());

      const preparedTasks = taskDataArray.map((t, idx) => {
        const category = t.category || "Work Sprint";
        const status = t.status || (t.completed ? "completed" : "ready");
        const priority =
          t.priority ||
          (category.toLowerCase().includes("deep") || category.toLowerCase().includes("high")
            ? "P1 Urgent & High Impact"
            : "P2 Strategic");

        return {
          title: t.title?.trim() || `Generated Task ${idx + 1}`,
          description: t.description?.trim() || "Synthesized by AI Goal Planner.",
          category,
          priority,
          duration: t.duration || "30 min",
          effort: t.effort || "⚡⚡ Med",
          tags: t.tags || ["#AISprint"],
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : "0/1",
          completed: status === "completed",
          status,
          isHighlight: !!t.isHighlight,
          code: `FF-${Math.floor(1000 + Math.random() * 9000)}`,
          assignee: currentUser?.displayName?.slice(0, 2).toUpperCase() || "YOU",
          date: t.date || (status === "backlog" ? "Backlog" : "Today"),
          assignedDate: t.assignedDate || (status === "backlog" ? null : todayStr),
          createdAt: serverTimestamp(),
          ...t,
        };
      });

      if (currentUser) {
        try {
          const batch = writeBatch(db);
          preparedTasks.forEach((task) => {
            const newDocRef = doc(collection(db, "users", currentUser.uid, "tasks"));
            task.id = newDocRef.id;
            batch.set(newDocRef, task);
          });
          await batch.commit();
        } catch (err) {
          console.warn("Batch write error, generating local IDs:", err);
          preparedTasks.forEach((t) => {
            if (!t.id) t.id = "local-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
          });
        }
      } else {
        preparedTasks.forEach((t) => {
          t.id = "local-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
        });
      }

      setTasks((prev) => [...preparedTasks, ...prev]);
      showToast(`⚡ Generated and saved ${preparedTasks.length} tasks!`, "success");
      return preparedTasks;
    },
    [currentUser, showToast]
  );

  // Persistently record completed task count so deletion never decreases it
  const recordTaskCompleted = useCallback(
    async (countDelta = 1) => {
      const activeCompleted = tasks.filter((t) => t.completed || t.status === "completed").length;
      const currentLifetime = Number(
        userProfile?.lifetimeCompletedTasksCount ??
        (typeof window !== "undefined" ? localStorage.getItem("successor_lifetime_completed_count") : 0) ??
        0
      );
      const nextLifetime = Math.max(activeCompleted + countDelta, currentLifetime + countDelta);

      setUserProfile((prev) => (prev ? { ...prev, lifetimeCompletedTasksCount: nextLifetime } : prev));
      try {
        localStorage.setItem("successor_lifetime_completed_count", String(nextLifetime));
      } catch (_) {}

      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, { lifetimeCompletedTasksCount: nextLifetime }, { merge: true });
        } catch (e) {
          console.warn("Could not save lifetimeCompletedTasksCount:", e);
        }
      }
    },
    [currentUser, userProfile?.lifetimeCompletedTasksCount, tasks]
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      const existingTask = tasks.find((t) => t.id === taskId);
      const wasCompleted = existingTask ? (existingTask.completed || existingTask.status === "completed") : false;
      const isNowCompleted = (updates.completed === true || updates.status === "completed");

      if (isNowCompleted && !wasCompleted) {
        recordTaskCompleted(1);
      }

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
          console.error("Failed to update task:", err);
        }
      }
    },
    [currentUser, tasks, recordTaskCompleted]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      const taskToDelete = tasks.find((t) => t.id === taskId);
      const isCompleted = taskToDelete ? (taskToDelete.completed || taskToDelete.status === "completed") : false;

      // Ensure lifetime count captures this task BEFORE it is removed from tasks array
      if (isCompleted) {
        const activeCompleted = tasks.filter((t) => t.completed || t.status === "completed").length;
        const currentLifetime = Number(
          userProfile?.lifetimeCompletedTasksCount ??
          (typeof window !== "undefined" ? localStorage.getItem("successor_lifetime_completed_count") : 0) ??
          0
        );
        const targetLifetime = Math.max(currentLifetime, activeCompleted);
        if (targetLifetime > currentLifetime) {
          setUserProfile((prev) => (prev ? { ...prev, lifetimeCompletedTasksCount: targetLifetime } : prev));
          try {
            localStorage.setItem("successor_lifetime_completed_count", String(targetLifetime));
          } catch (_) {}
          if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            setDoc(userDocRef, { lifetimeCompletedTasksCount: targetLifetime }, { merge: true }).catch(() => {});
          }
        }
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      // Remove from dailyHighlightTaskIds if present
      if (userProfile?.dailyHighlightTaskIds?.includes(taskId)) {
        const nextIds = userProfile.dailyHighlightTaskIds.filter((id) => id !== taskId);
        setUserProfile((prev) => (prev ? { ...prev, dailyHighlightTaskIds: nextIds } : prev));
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          setDoc(userDocRef, { dailyHighlightTaskIds: nextIds }, { merge: true }).catch(() => {});
        }
      }

      if (currentUser && taskId && !taskId.startsWith("local-") && !taskId.startsWith("sample-")) {
        try {
          await deleteDoc(doc(db, "users", currentUser.uid, "tasks", taskId));
          showToast("Task deleted from database (completed count preserved)");
        } catch (err) {
          console.error("Failed to delete task:", err);
        }
      }
    },
    [tasks, currentUser, userProfile?.dailyHighlightTaskIds, userProfile?.lifetimeCompletedTasksCount, showToast]
  );

  // Permanently delete all completed tasks while keeping completed count intact
  const deleteCompletedTasks = useCallback(async () => {
    const completedTasks = tasks.filter((t) => t.completed || t.status === "completed");
    if (completedTasks.length === 0) return 0;

    // Snapshot full completed count into lifetimeCompletedTasksCount
    const activeCompleted = tasks.filter((t) => t.completed || t.status === "completed").length;
    const currentLifetime = Number(
      userProfile?.lifetimeCompletedTasksCount ??
      (typeof window !== "undefined" ? localStorage.getItem("successor_lifetime_completed_count") : 0) ??
      0
    );
    const targetLifetime = Math.max(currentLifetime, activeCompleted);

    setUserProfile((prev) => (prev ? { ...prev, lifetimeCompletedTasksCount: targetLifetime } : prev));
    try {
      localStorage.setItem("successor_lifetime_completed_count", String(targetLifetime));
    } catch (_) {}

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      setDoc(userRef, { lifetimeCompletedTasksCount: targetLifetime }, { merge: true }).catch(() => {});
    }

    // Remove locally
    const completedIds = new Set(completedTasks.map((t) => t.id));
    setTasks((prev) => prev.filter((t) => !completedIds.has(t.id)));

    // Remove in Firestore
    if (currentUser) {
      try {
        const batch = writeBatch(db);
        completedTasks.forEach((t) => {
          if (t.id && !t.id.startsWith("local-") && !t.id.startsWith("sample-")) {
            batch.delete(doc(db, "users", currentUser.uid, "tasks", t.id));
          }
        });
        await batch.commit();
      } catch (err) {
        console.warn("Batch delete error, fallback to individual deletes:", err);
        for (const t of completedTasks) {
          if (t.id && !t.id.startsWith("local-")) {
            deleteDoc(doc(db, "users", currentUser.uid, "tasks", t.id)).catch(() => {});
          }
        }
      }
    }

    showToast(`Deleted ${completedTasks.length} completed task${completedTasks.length > 1 ? "s" : ""} from database (completed count preserved).`, "success");
    return completedTasks.length;
  }, [tasks, userProfile?.lifetimeCompletedTasksCount, currentUser, showToast]);

  // Refill a streak freeze (grace day for focus streak)
  const refillStreakFreeze = useCallback(async () => {
    const currentFreezes = typeof userProfile?.streakFreezes === "number" ? userProfile.streakFreezes : 2;
    const maxFreezes = 3;
    if (currentFreezes >= maxFreezes) {
      showToast(`You already have the maximum of ${maxFreezes} streak freezes!`, "info");
      return;
    }
    const nextFreezes = currentFreezes + 1;
    if (currentUser) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, { streakFreezes: nextFreezes, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.error("Failed to update streak freezes:", e);
      }
    }
    setUserProfile((prev) => ({ ...prev, streakFreezes: nextFreezes }));
    showToast(`❄️ Streak freeze added! You have ${nextFreezes} ${nextFreezes === 1 ? "freeze" : "freezes"}.`, "success");
  }, [currentUser, userProfile?.streakFreezes, showToast]);

  // Centralized Daily Focus Streak Evaluation
  // Rule: If user completes a single task today -> +1 to streak (awarded once per day).
  // If user uncompletes all tasks today -> streak rolls back by 1.
  const syncDailyStreak = useCallback(
    async (nextTasks, justCompleted) => {
      const todayStr = getLocalDateString(new Date());
      const currentStreak = Number(userProfile?.focusStreak || 0);
      const streakFreezes = typeof userProfile?.streakFreezes === "number" ? userProfile.streakFreezes : 2;
      const lastCredited = userProfile?.lastStreakCreditedDate;

      if (justCompleted) {
        // If streak was already credited today, do not increment again
        if (lastCredited === todayStr) return;

        let nextStreak = 1;
        let nextFreezes = streakFreezes;
        let freezeUsedCount = 0;

        if (currentStreak > 0 && lastCredited) {
          const diffDays = getDaysDifference(lastCredited, todayStr);
          if (diffDays === 1) {
            // Consecutive day (yesterday was active)
            nextStreak = currentStreak + 1;
          } else if (diffDays && diffDays > 1) {
            const missedDays = diffDays - 1;
            if (streakFreezes >= missedDays) {
              // Grace days (streak freezes) protect the streak!
              nextFreezes = streakFreezes - missedDays;
              freezeUsedCount = missedDays;
              nextStreak = currentStreak + 1;
            } else {
              // Freezes insufficient to bridge gap: resets to 1 (starting fresh today)
              nextStreak = 1;
            }
          } else {
            nextStreak = currentStreak + 1;
          }
        } else if (currentStreak > 0) {
          nextStreak = currentStreak + 1;
        }

        const prevLongest = Number(userProfile?.longestStreak || userProfile?.bestStreak || 21);
        const nextLongest = Math.max(nextStreak, prevLongest);

        const updates = {
          focusStreak: nextStreak,
          longestStreak: nextLongest,
          streakFreezes: nextFreezes,
          lastStreakCreditedDate: todayStr,
          lastTaskCompletedDate: todayStr,
          ...(freezeUsedCount > 0 ? { lastStreakFreezeUsedDate: todayStr } : {}),
          updatedAt: serverTimestamp(),
        };

        if (currentUser) {
          try {
            const userRef = doc(db, "users", currentUser.uid);
            await setDoc(userRef, updates, { merge: true });
          } catch (err) {
            console.error("Failed to update daily streak:", err);
          }
        }

        setUserProfile((prev) => ({
          ...prev,
          ...updates,
        }));

        if (freezeUsedCount > 0) {
          showToast(
            `🛡️ Used ${freezeUsedCount} streak freeze to protect your streak! Now ${nextStreak} days 🔥`,
            "info"
          );
        } else {
          showToast(
            `🔥 Task completed! Daily streak extended to ${nextStreak} ${nextStreak === 1 ? "day" : "days"}!`,
            "success"
          );
        }
      } else {
        // A task was uncompleted: check if user still has at least 1 completed task today
        const completedTodayCount = nextTasks.filter((t) => {
          if (!t.completed && t.status !== "completed") return false;
          const dStr =
            t.completedDate ||
            (t.completedAt ? getLocalDateString(parseTaskDateHelper(t)) : null) ||
            t.assignedDate;
          return dStr === todayStr;
        }).length;

        if (completedTodayCount === 0 && lastCredited === todayStr) {
          const rollbackStreak = Math.max(0, currentStreak - 1);
          const updates = {
            focusStreak: rollbackStreak,
            lastStreakCreditedDate: null,
            updatedAt: serverTimestamp(),
          };

          if (currentUser) {
            try {
              const userRef = doc(db, "users", currentUser.uid);
              await setDoc(userRef, updates, { merge: true });
            } catch (err) {
              console.error("Failed to rollback daily streak:", err);
            }
          }

          setUserProfile((prev) => ({
            ...prev,
            focusStreak: rollbackStreak,
            lastStreakCreditedDate: null,
          }));

          showToast("Daily streak rolled back as no tasks are completed today.", "info");
        }
      }
    },
    [currentUser, userProfile, showToast]
  );

  // Toggle Task Completion (keeps `completed` and `status` in perfect sync)
  const toggleTaskCompletion = useCallback(
    async (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const nextCompleted = !task.completed;
      const nextStatus = nextCompleted ? "completed" : "ready";
      const todayStr = getLocalDateString(new Date());

      const nextTasks = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: nextCompleted,
              status: nextStatus,
              completedDate: nextCompleted ? todayStr : null,
            }
          : t
      );

      setTasks(nextTasks);

      // Daily streak evaluation
      syncDailyStreak(nextTasks, nextCompleted);

      if (nextCompleted) {
        recordTaskCompleted(1);
      }

      if (currentUser && !taskId.startsWith("local-") && !taskId.startsWith("sample-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "tasks", taskId);
          await updateDoc(ref, {
            completed: nextCompleted,
            status: nextStatus,
            completedAt: nextCompleted ? serverTimestamp() : null,
            completedDate: nextCompleted ? todayStr : null,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to update task completion:", err);
        }
      }
    },
    [tasks, currentUser, syncDailyStreak, recordTaskCompleted]
  );

  // Move task status across Kanban columns (backlog, ready, in_progress, review, completed)
  const moveTaskStatus = useCallback(
    async (taskId, targetStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      const isCompleted = targetStatus === "completed";
      const wasCompleted = task ? (task.completed || task.status === "completed") : false;
      const todayStr = getLocalDateString(new Date());

      const updates = {
        status: targetStatus,
        completed: isCompleted,
        completedAt: isCompleted ? serverTimestamp() : null,
        completedDate: isCompleted ? todayStr : null,
        updatedAt: serverTimestamp(),
      };

      if (targetStatus === "ready" || targetStatus === "in_progress") {
        updates.assignedDate = todayStr;
        updates.date = "Today";
      } else if (targetStatus === "backlog") {
        updates.date = "Backlog";
      }

      const nextTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      );

      setTasks(nextTasks);

      if (isCompleted && !wasCompleted) {
        syncDailyStreak(nextTasks, true);
        recordTaskCompleted(1);
      } else if (!isCompleted && wasCompleted) {
        syncDailyStreak(nextTasks, false);
      }

      if (currentUser && taskId && !taskId.startsWith("local-") && !taskId.startsWith("board-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "tasks", taskId);
          await updateDoc(ref, updates);
        } catch (err) {
          console.error("Failed to move task status:", err);
        }
      }
    },
    [tasks, currentUser, syncDailyStreak]
  );

  // Toggle / ReDesignate Daily Highlight (Single or Multi-Task non-negotiable objective)
  const toggleDailyHighlight = useCallback(
    async (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const nextHighlight = !task.isHighlight;
      const todayStr = getLocalDateString(new Date());

      const updates = {
        isHighlight: nextHighlight,
        highlightDesignatedAt: nextHighlight ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      };

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );

      // Compute updated array of highlight IDs
      const currentHighlights = tasks
        .filter((t) => (t.id === taskId ? nextHighlight : t.isHighlight))
        .map((t) => t.id);

      if (currentUser) {
        try {
          if (!taskId.startsWith("local-") && !taskId.startsWith("sample-")) {
            const taskRef = doc(db, "users", currentUser.uid, "tasks", taskId);
            await updateDoc(taskRef, updates);
          }
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(
            userRef,
            {
              dailyHighlightTaskIds: currentHighlights,
              dailyFocusPlanLocked: currentHighlights.length > 0,
              lastHighlightUpdate: todayStr,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          console.error("Failed to sync highlight:", err);
        }
      }

      setUserProfile((prev) => ({
        ...prev,
        dailyHighlightTaskIds: currentHighlights,
        dailyFocusPlanLocked: currentHighlights.length > 0,
      }));

      if (nextHighlight) {
        showToast(`⭐ Designated Primary Highlight: "${task.title}"`, "success");
      } else {
        showToast(`Removed "${task.title}" from Primary Highlights`);
      }
    },
    [tasks, currentUser, showToast]
  );

  // Set multiple highlights and lock in the day's focus plan
  const setDailyHighlightsAndLockPlan = useCallback(
    async (taskIds = [], capacityHours = 5.0) => {
      const todayStr = getLocalDateString(new Date());
      const idSet = new Set(taskIds);

      // Update local state immediately
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          isHighlight: idSet.has(t.id),
        }))
      );

      if (currentUser) {
        try {
          const batch = writeBatch(db);

          tasks.forEach((t) => {
            if (!t.id.startsWith("local-") && !t.id.startsWith("sample-")) {
              const isHigh = idSet.has(t.id);
              if (Boolean(t.isHighlight) !== isHigh) {
                const taskRef = doc(db, "users", currentUser.uid, "tasks", t.id);
                batch.update(taskRef, {
                  isHighlight: isHigh,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          });

          const userRef = doc(db, "users", currentUser.uid);
          batch.set(
            userRef,
            {
              dailyHighlightTaskIds: taskIds,
              dailyCapacityHours: capacityHours,
              dailyFocusPlanLocked: true,
              lastMorningPlanningDate: todayStr,
              lastFocusPlanLockedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          await batch.commit();
        } catch (err) {
          console.error("Failed to lock in daily highlights:", err);
        }
      }

      setUserProfile((prev) => ({
        ...prev,
        dailyHighlightTaskIds: taskIds,
        dailyCapacityHours: capacityHours,
        dailyFocusPlanLocked: true,
        lastMorningPlanningDate: todayStr,
      }));

      showToast(
        `⭐ Locked in ${taskIds.length} Primary Highlight${taskIds.length === 1 ? "" : "s"} & Daily Focus Plan!`,
        "success"
      );
    },
    [tasks, currentUser, showToast]
  );

  // 7. Habit Operations & Streaks Engine
  const toggleHabit = useCallback(
    async (habitId) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const nextDone = !habit.done;
      const todayStr = getLocalDateString();
      const currentStreak = habit.streak || 0;
      const nextStreak = nextDone ? currentStreak + 1 : Math.max(0, currentStreak - 1);
      const nextBestStreak = Math.max(habit.bestStreak || 0, nextStreak);

      const updates = {
        done: nextDone,
        streak: nextStreak,
        bestStreak: nextBestStreak,
        lastCompletedDate: nextDone ? todayStr : null,
        completedAt: nextDone ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      };

      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, ...updates } : h))
      );

      if (currentUser && typeof habitId === "string" && !habitId.startsWith("local-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "habits", habitId);
          await updateDoc(ref, updates);
        } catch (err) {
          console.error("Failed to toggle habit:", err);
        }
      }

      if (nextDone) {
        showToast(`🔥 ${habit.title} checked! Streak: ${nextStreak}d`);
      }
    },
    [habits, currentUser, showToast]
  );

  const createHabit = useCallback(
    async (habitData) => {
      const newHabit = {
        title: habitData.title?.trim() || "New Habit",
        duration: habitData.duration?.trim() || "15m",
        done: false,
        lastCompletedDate: null,
        cadence: habitData.cadence || "daily", // 'daily' | 'weekdays' | 'weekly' | 'custom'
        targetDaysPerWeek: habitData.targetDaysPerWeek || 3,
        streak: 0,
        bestStreak: 0,
        streakShields: habitData.streakShields ?? 2,
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

  const updateHabit = useCallback(
    async (habitId, updates) => {
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, ...updates } : h))
      );

      if (currentUser && typeof habitId === "string" && !habitId.startsWith("local-")) {
        try {
          const ref = doc(db, "users", currentUser.uid, "habits", habitId);
          await updateDoc(ref, {
            ...updates,
            updatedAt: serverTimestamp(),
          });
          showToast("Habit ritual updated");
        } catch (err) {
          console.error("Failed to update habit:", err);
        }
      }
    },
    [currentUser, showToast]
  );

  const refillHabitShield = useCallback(
    async (habitId) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      const newShields = (habit.streakShields ?? 2) + 1;
      await updateHabit(habitId, { streakShields: newShields });
      showToast(`🛡️ Streak Shield added to ${habit.title}! Total: ${newShields}`);
    },
    [habits, updateHabit, showToast]
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

  // Smart Task Rollover Breakdown Assistant
  const autoBreakdownTask = useCallback(
    async (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const baseTitle = (task.title || "Task").replace(/\[\d+m\]/g, "").trim();
      const subtasks = [
        {
          id: `sub-${Date.now()}-1`,
          title: `Research & Initial Scope: ${baseTitle}`,
          duration: "15m",
          completed: false,
        },
        {
          id: `sub-${Date.now()}-2`,
          title: `Sprint Core Execution: ${baseTitle}`,
          duration: "15m",
          completed: false,
        },
        {
          id: `sub-${Date.now()}-3`,
          title: `Review, Polish & Finalize: ${baseTitle}`,
          duration: "15m",
          completed: false,
        },
      ];

      const updates = {
        subtasks,
        duration: "45m",
        status: "ready",
        date: "Today",
        effort: "⚡ High Impact",
        rolloverDiagnosticDismissed: true,
        rolloverCount: 0,
        updatedAt: serverTimestamp(),
      };

      await updateTask(taskId, updates);
      showToast(`⚡ "${baseTitle}" broken into 3 x 15m atomic subtasks!`, "success");
    },
    [tasks, updateTask, showToast]
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
    localStorage.removeItem("successor_credentialless");
    localStorage.removeItem("successor_guest_session");
    await signOut(auth);
  }, []);

  // 9. Computed Live Metrics & Velocity (preserves completed count even if completed tasks are deleted)
  const completedTasksCount = useMemo(() => {
    const activeCompleted = tasks.filter((t) => t.completed || t.status === "completed").length;
    const lifetimeCount = Number(
      userProfile?.lifetimeCompletedTasksCount ??
      (typeof window !== "undefined" ? localStorage.getItem("successor_lifetime_completed_count") : 0) ??
      0
    );
    return Math.max(activeCompleted, lifetimeCount);
  }, [tasks, userProfile?.lifetimeCompletedTasksCount]);
  const activeTasksCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const totalTasksCount = useMemo(() => tasks.length, [tasks]);

  const highImpactCount = useMemo(
    () => tasks.filter((t) => t.category === "high-impact" || t.effort?.includes("Deep")).length,
    [tasks]
  );

  const dailyHighlightTasks = useMemo(() => {
    const highlightIds = new Set(userProfile?.dailyHighlightTaskIds || []);
    return tasks.filter((t) => t.isHighlight || highlightIds.has(t.id));
  }, [tasks, userProfile?.dailyHighlightTaskIds]);

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

  // 10. Daily Rollover & Counter Resets
  const rolloverInProgressRef = useRef(false);

  const runDailyRolloverAndReset = useCallback(
    async (force = false) => {
      if (rolloverInProgressRef.current) return;
      rolloverInProgressRef.current = true;

      try {
        const todayStr = getLocalDateString(new Date());
        const yesterdayStr = getYesterdayString(new Date());
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const lastResetDate = userProfile?.lastResetDate;
        const lastHabitResetDate = userProfile?.lastHabitResetDate;
        const isNewDay = !lastResetDate || lastResetDate !== todayStr;
        const isNewHabitDay = !lastHabitResetDate || lastHabitResetDate !== todayStr;
        const rolloverEnabled = userProfile?.rolloverEnabled !== false;

        // Local / guest user fallback: ensure in-memory habits reset properly
        if (!currentUser) {
          if (isNewDay || isNewHabitDay || force) {
            setHabits((prev) =>
              prev.map((h) => ({
                ...h,
                done: false,
              }))
            );
          }
          return;
        }

        // Tasks assigned for today or past days that are still unfinished in active columns
        const tasksToRollover = rolloverEnabled
          ? tasks.filter((t) => {
              if (t.completed || t.status === "completed" || t.status === "backlog") return false;
              if (!["ready", "in_progress", "review"].includes(t.status)) return false;

              // If task was assigned to a previous day
              const taskAssignedDate = t.assignedDate;
              if (taskAssignedDate && typeof taskAssignedDate === "string") {
                return taskAssignedDate < todayStr;
              }
              const taskDate = getTaskDate(t);
              if (taskDate) {
                return taskDate < startOfToday;
              }
              // If force === true, rollover any active task if requested
              return force;
            })
          : [];

        // Check if habits reset needed (new habit day, general new day, forced, or any habits still done from a previous day)
        const staleHabits = habits.filter((h) => h.done && h.lastCompletedDate !== todayStr);
        const shouldResetHabits = isNewHabitDay || isNewDay || force || staleHabits.length > 0;

        // Check if blocks reset needed
        const currentBlocks = userProfile?.completedBlocks || 0;
        const shouldResetBlocks = (isNewDay && currentBlocks > 0) || force;

        // If nothing needs rollover or reset and day matches, exit early
        if (
          tasksToRollover.length === 0 &&
          !shouldResetHabits &&
          !shouldResetBlocks &&
          lastResetDate === todayStr &&
          lastHabitResetDate === todayStr
        ) {
          if (force) {
            showToast("Workspace is already up-to-date for today.", "info");
          }
          return;
        }

        const batch = writeBatch(db);

        // 1. Move unfinished active tasks to Backlog with rolloverCount tracking
        if (tasksToRollover.length > 0) {
          tasksToRollover.forEach((t) => {
            const nextCount = (t.rolloverCount || 0) + 1;
            if (t.id && !t.id.startsWith("local-") && !t.id.startsWith("sample-")) {
              const taskRef = doc(db, "users", currentUser.uid, "tasks", t.id);
              batch.set(
                taskRef,
                {
                  status: "backlog",
                  date: "Backlog",
                  rolledOverAt: serverTimestamp(),
                  rolloverDate: todayStr,
                  rolloverCount: nextCount,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
          });

          const rolloverMap = new Map(
            tasksToRollover.map((t) => [t.id, (t.rolloverCount || 0) + 1])
          );
          setTasks((prev) =>
            prev.map((t) =>
              rolloverMap.has(t.id)
                ? {
                    ...t,
                    status: "backlog",
                    date: "Backlog",
                    rolloverDate: todayStr,
                    rolledOverAt: new Date(),
                    rolloverCount: rolloverMap.get(t.id),
                  }
                : t
            )
          );
        }

        // 2. Reset habit checkboxes and evaluate streak shields
        if (habits.length > 0 && shouldResetHabits) {
          const dayOfWeek = new Date().getDay(); // 0 Sun, 6 Sat
          const isWeekendOrMon = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 1;

          habits.forEach((h) => {
            const isWeekendProtected = h.cadence === "weekdays" && isWeekendOrMon;
            let nextStreak = h.streak || 0;
            let nextShields = h.streakShields ?? 2;
            let shieldUsed = false;

            // Only evaluate streak penalties if this is a genuine new habit day transition
            if (isNewHabitDay || isNewDay || force) {
              const wasCompletedYesterday = h.lastCompletedDate === yesterdayStr;
              if (!h.done && !wasCompletedYesterday) {
                if (isWeekendProtected) {
                  // Preserved due to weekday cadence
                } else if (nextShields > 0) {
                  // Streak shield consumed!
                  nextShields -= 1;
                  shieldUsed = true;
                } else {
                  nextStreak = 0;
                }
              }
            }

            const habitUpdates = {
              done: false,
              streak: nextStreak,
              streakShields: nextShields,
              ...(shieldUsed ? { lastShieldUsedDate: todayStr } : {}),
              updatedAt: serverTimestamp(),
            };

            if (h.id && !String(h.id).startsWith("local-")) {
              const habitRef = doc(db, "users", currentUser.uid, "habits", h.id);
              batch.set(habitRef, habitUpdates, { merge: true });
            }
          });

          setHabits((prev) =>
            prev.map((h) => {
              const isWeekendProtected = h.cadence === "weekdays" && isWeekendOrMon;
              let nextStreak = h.streak || 0;
              let nextShields = h.streakShields ?? 2;
              let shieldUsed = false;

              if (isNewHabitDay || isNewDay || force) {
                const wasCompletedYesterday = h.lastCompletedDate === yesterdayStr;
                if (!h.done && !wasCompletedYesterday) {
                  if (isWeekendProtected) {
                    // Preserved
                  } else if (nextShields > 0) {
                    nextShields -= 1;
                    shieldUsed = true;
                  } else {
                    nextStreak = 0;
                  }
                }
              }

              return {
                ...h,
                done: false,
                streak: nextStreak,
                streakShields: nextShields,
                ...(shieldUsed ? { lastShieldUsedDate: todayStr } : {}),
              };
            })
          );
        }

        // 3. Reset daily completed blocks & update lastResetDate and lastHabitResetDate
        const userRef = doc(db, "users", currentUser.uid);
        const profileUpdates = {
          lastResetDate: todayStr,
          lastHabitResetDate: todayStr,
            updatedAt: serverTimestamp(),
        };
        if (shouldResetBlocks || isNewDay) {
          profileUpdates.completedBlocks = 0;
        }

        // 4. Focus Streak & Streak Freeze evaluation on new day
        const currentStreak = Number(userProfile?.focusStreak || 0);
        let nextStreak = currentStreak;
        let nextFreezes = typeof userProfile?.streakFreezes === "number" ? userProfile.streakFreezes : 2;
        let freezeUsedCount = 0;
        let streakResetToZero = false;

        if (isNewDay && currentStreak > 0) {
          const lastCredited = userProfile?.lastStreakCreditedDate;
          const yesterdayStr = getYesterdayString(new Date());
          const isYesterdayCredited = lastCredited === yesterdayStr;
          const isTodayCredited = lastCredited === todayStr;

          if (!isYesterdayCredited && !isTodayCredited) {
            // Yesterday had NO completed task!
            let missedDays = 1;
            if (lastCredited) {
              const diffDays = getDaysDifference(lastCredited, todayStr);
              if (diffDays && diffDays > 1) {
                missedDays = diffDays - 1;
              }
            }

            if (nextFreezes >= missedDays) {
              // Streak freeze covers missed days!
              nextFreezes = nextFreezes - missedDays;
              freezeUsedCount = missedDays;
              profileUpdates.lastStreakCreditedDate = yesterdayStr;
              profileUpdates.lastStreakFreezeUsedDate = yesterdayStr;
            } else {
              // Freezes exhausted: reset streak to 0!
              nextStreak = 0;
              nextFreezes = Math.max(0, nextFreezes - missedDays);
              streakResetToZero = true;
              profileUpdates.lastStreakCreditedDate = null;
            }
            profileUpdates.focusStreak = nextStreak;
            profileUpdates.streakFreezes = nextFreezes;
          }
        }

        batch.set(userRef, profileUpdates, { merge: true });
        setUserProfile((prev) => ({
          ...prev,
          ...profileUpdates,
          completedBlocks: shouldResetBlocks || isNewDay ? 0 : prev?.completedBlocks || 0,
        }));

        await batch.commit();

        if (freezeUsedCount > 0) {
          showToast(
            `🛡️ ${freezeUsedCount} streak freeze used to protect your ${currentStreak}-day focus streak!`,
            "info"
          );
        } else if (streakResetToZero) {
          showToast(
            "Daily focus streak reset to 0 because yesterday was missed without streak freezes.",
            "warning"
          );
        }

        if (tasksToRollover.length > 0) {
          showToast(
            `📅 Daily rollover: ${tasksToRollover.length} uncompleted ${
              tasksToRollover.length === 1 ? "task" : "tasks"
            } moved to Backlog. Daily blocks reset.`,
            "info"
          );
        } else if (isNewDay || shouldResetBlocks) {
          showToast("🌅 Good morning! Daily blocks and habits have been reset for today.", "info");
        } else if (force) {
          showToast("Daily rollover & reset completed successfully.", "success");
        }
      } catch (err) {
        console.error("Daily rollover error:", err);
        if (force) {
          showToast("Failed to perform daily rollover", "error");
        }
      } finally {
        rolloverInProgressRef.current = false;
      }
    },
    [currentUser, userProfile, tasks, habits, getTaskDate, showToast]
  );

  // Automated trigger on app launch, 60s midnight check, and tab visibility/focus
  useEffect(() => {
    if (!currentUser || loadingTasks || loadingHabits) return;

    // Run check on mount once auth & data are ready
    runDailyRolloverAndReset(false);

    // 60-second interval to catch midnight rollover seamlessly
    const interval = setInterval(() => {
      runDailyRolloverAndReset(false);
    }, 60 * 1000);

    // Window focus or tab visibility change (e.g. computer woke up or returned to app)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        runDailyRolloverAndReset(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [currentUser, loadingTasks, loadingHabits, runDailyRolloverAndReset]);

  // Today's completed tasks count
  const todayCompletedTasksCount = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return tasks.filter((t) => {
      if (!t.completed) return false;
      const taskDateStr =
        t.completedDate ||
        (t.completedAt ? getLocalDateString(getTaskDate(t)) : null) ||
        t.assignedDate;
      return taskDateStr === todayStr;
    }).length;
  }, [tasks, getTaskDate]);

  // 11. Custom Labels & Priorities Management
  const taskLabels = useMemo(() => {
    if (Array.isArray(userProfile?.customLabels) && userProfile.customLabels.length > 0) {
      return userProfile.customLabels;
    }
    return DEFAULT_TASK_LABELS;
  }, [userProfile?.customLabels]);

  const saveTaskLabels = useCallback(
    async (newLabels) => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, { customLabels: newLabels, updatedAt: serverTimestamp() }, { merge: true });
          setUserProfile((prev) => ({ ...prev, customLabels: newLabels }));
          showToast("Task labels & priorities updated!");
        } catch (err) {
          console.error("Failed to save custom labels:", err);
          showToast("Failed to save labels", "error");
        }
      } else {
        setUserProfile((prev) => ({ ...prev, customLabels: newLabels }));
        showToast("Task labels updated locally");
      }
    },
    [currentUser, showToast]
  );

  const addCustomLabel = useCallback(
    async (labelData) => {
      const id = `lbl-${Date.now()}`;
      const newLabel = {
        id,
        name: labelData.name?.trim() || "New Label",
        type: labelData.type || "category",
        color: labelData.color || "primary",
      };
      const updated = [...taskLabels, newLabel];
      await saveTaskLabels(updated);
      return newLabel;
    },
    [taskLabels, saveTaskLabels]
  );

  const updateCustomLabel = useCallback(
    async (labelId, updates) => {
      const updated = taskLabels.map((l) => (l.id === labelId ? { ...l, ...updates } : l));
      await saveTaskLabels(updated);
    },
    [taskLabels, saveTaskLabels]
  );

  const deleteCustomLabel = useCallback(
    async (labelId) => {
      const updated = taskLabels.filter((l) => l.id !== labelId);
      await saveTaskLabels(updated);
    },
    [taskLabels, saveTaskLabels]
  );

  const resetCustomLabels = useCallback(async () => {
    await saveTaskLabels(DEFAULT_TASK_LABELS);
  }, [saveTaskLabels]);

  const getLabelStyle = useCallback(
    (nameOrId) => getLabelStyleHelper(nameOrId, taskLabels),
    [taskLabels]
  );

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
    createMultipleTasks,
    updateTask,
    deleteTask,
    deleteCompletedTasks,
    toggleTaskCompletion,
    moveTaskStatus,
    toggleDailyHighlight,
    setDailyHighlightsAndLockPlan,
    dailyHighlightTasks,

    // Custom Labels & Priorities
    taskLabels,
    saveTaskLabels,
    addCustomLabel,
    updateCustomLabel,
    deleteCustomLabel,
    resetCustomLabels,
    getLabelStyle,
    DEFAULT_TASK_LABELS,
    LABEL_COLOR_OPTIONS,

    // Habits
    habits,
    loadingHabits,
    toggleHabit,
    createHabit,
    updateHabit,
    refillHabitShield,
    deleteHabit,

    // Smart Rollover Breakdown
    autoBreakdownTask,

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
    incrementCompletedBlocks,

    // Daily Rollover & Resets & Streaks
    runDailyRolloverAndReset,
    todayCompletedTasksCount,
    getLocalDateString,
    getYesterdayString,
    getDaysDifference,
    refillStreakFreeze,

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
