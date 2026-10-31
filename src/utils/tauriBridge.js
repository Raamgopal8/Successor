/**
 * Tauri IPC Rust Bridge Utility
 * Seamlessly connects React UI to the Tauri Rust native backend,
 * with graceful browser fallbacks when running as a web app.
 */

export const isTauri = () => {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
};

/**
 * Fetch native host system information
 */
export async function getNativeSystemInfo() {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("get_system_info");
    } catch (err) {
      console.warn("Tauri get_system_info invocation failed:", err);
    }
  }

  return {
    os: navigator.userAgent.includes("Win")
      ? "windows"
      : navigator.userAgent.includes("Mac")
      ? "macos"
      : "linux",
    arch: "x86_64",
    app_name: "Successor Web/Desktop",
    app_version: "0.1.0",
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Log a completed focus session to desktop persistence
 */
export async function logNativeFocusSession(session) {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("log_focus_session", { session });
    } catch (err) {
      console.warn("Tauri log_focus_session failed:", err);
    }
  }
  return "Logged in session memory";
}

/**
 * Export executive report to user's native desktop or download directory
 */
export async function exportNativeReport(filename, content, format = "markdown") {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("export_desktop_report", {
        report: { filename, content, format },
      });
    } catch (err) {
      console.warn("Tauri export_desktop_report failed:", err);
    }
  }

  // Web fallback: triggers a browser download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    file_path: filename,
    message: `Report ${filename} downloaded via browser.`,
  };
}

/**
 * Native circadian peak query
 */
export async function getCircadianPeak(chronotype) {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("get_circadian_peak", { chronotype });
    } catch (err) {
      console.warn("Tauri get_circadian_peak failed:", err);
    }
  }

  const [start, end, label] =
    chronotype === "owl"
      ? [17.0, 22.5, "5:00 PM – 10:30 PM (Evening Surge)"]
      : chronotype === "falcon"
      ? [11.0, 16.5, "11:00 AM – 4:30 PM (Midday Cadence)"]
      : [8.5, 12.5, "8:30 AM – 12:30 PM (Morning Lark Peak)"];

  return {
    chronotype,
    peak_start_hour: start,
    peak_end_hour: end,
    window_label: label,
    optimal_block_minutes: 50,
  };
}

/**
 * Fetch or initialize the persistent device UUID via Tauri native Rust backend
 */
export async function getNativeDeviceUuid() {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("get_or_create_device_uuid");
    } catch (err) {
      console.warn("Tauri get_or_create_device_uuid failed:", err);
    }
  }
  return null;
}

/**
 * Generate a fresh standard RFC 4122 UUID v4 via Tauri native Rust backend
 */
export async function generateNativeUuid() {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("generate_uuid");
    } catch (err) {
      console.warn("Tauri generate_uuid failed:", err);
    }
  }
  return null;
}

/**
 * Fetch the Firebase App Check Debug Token from the native Rust backend
 */
export async function getNativeAppCheckToken() {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("get_app_check_debug_token");
    } catch (err) {
      console.warn("Tauri get_app_check_debug_token failed:", err);
    }
  }
  return "B2B852DC-14DD-4204-96E4-DDD011A0747A";
}

/**
 * Fetch the full native App Check and Firebase AI configuration from Rust
 */
export async function getNativeAppCheckConfig() {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("get_app_check_config");
    } catch (err) {
      console.warn("Tauri get_app_check_config failed:", err);
    }
  }
  return {
    debug_token: "B2B852DC-14DD-4204-96E4-DDD011A0747A",
    project_id: "fledgeportal",
    api_key: "AIzaSyCLAPwadPE7TDzrkZoH7ax_CrR6b3RP054",
    app_id: "1:844515198625:web:d1febaeabb62cc7756d2e0",
  };
}

/**
 * 3. Handling Missed Tasks: Rust Algorithmic Rebalancing
 * Invokes native Rust calculation for zero-latency, zero-cost scheduling.
 * Formula: Priority Score = (Urgency) * 0.5 + (Dependency Count) * 0.3 + (Age in Days) * 0.2
 * Slots into daily working slots in topological order, flagging oversized tasks for LLM fallback.
 *
 * @param {Array} tasks - List of candidate tasks
 * @param {number} [dailyCapacityHours=4.0] - Daily capacity
 * @param {string} [currentDate] - Current date string YYYY-MM-DD
 */
export async function rebalanceNativeMissedTasks(tasks, dailyCapacityHours = 4.0, currentDate = "") {
  const formattedTasks = (tasks || []).map((t) => {
    // Parse duration in minutes
    let durationMins = 45;
    const durStr = String(t.duration || "").toLowerCase();
    if (durStr.includes("h")) {
      const h = parseFloat(durStr.replace("hours", "").replace("hour", "").replace("h", ""));
      durationMins = isNaN(h) ? 60 : Math.round(h * 60);
    } else if (durStr.includes("m")) {
      const m = parseFloat(durStr.replace("min", "").replace("m", ""));
      durationMins = isNaN(m) ? 45 : Math.round(m);
    }

    // Compute age in days (from rollover count, overdue delta, or creation timestamp)
    let ageDays = Number(t.rolloverCount || 0);
    const dueDateStr = t.dueDate || t.due_date || (t.date && t.date.match(/^\d{4}-\d{2}-\d{2}$/) ? t.date : null);
    if (dueDateStr) {
      const due = new Date(dueDateStr);
      const now = new Date();
      const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      if (diff > 0) ageDays = Math.max(ageDays, diff);
    }
    if (t.createdAt?.seconds) {
      const diffSec = Math.floor(Date.now() / 1000) - t.createdAt.seconds;
      ageDays = Math.max(ageDays, Math.floor(diffSec / 86400));
    }
    if (!ageDays || ageDays < 1) ageDays = 1.0;

    return {
      id: String(t.id),
      title: String(t.title || "Untitled Task"),
      status: t.status || (t.completed ? "completed" : "pending"),
      due_date: dueDateStr,
      duration_minutes: durationMins,
      priority: t.priority || "P2 Strategic",
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
      age_days: ageDays,
      created_at: t.createdAt?.seconds || null,
    };
  });

  const todayStr = currentDate || new Date().toISOString().split("T")[0];

  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke("rebalance_missed_tasks", {
        tasks: formattedTasks,
        dailyCapacityHours: Number(dailyCapacityHours) || 4.0,
        currentDate: todayStr,
      });
    } catch (err) {
      console.warn("Tauri rebalance_missed_tasks native call failed, using web algorithmic engine:", err);
    }
  }

  // -------------------------------------------------------------------------
  // Algorithmic Fallback (Identical Rust Formula & Topological Sort in Pure JS)
  // Priority Score = (Urgency) * 0.5 + (Dependency Count) * 0.3 + (Age in Days) * 0.2
  // -------------------------------------------------------------------------
  const capacityMins = (dailyCapacityHours || 4.0) * 60;
  const maxSlotMins = 90;

  // Filter missed tasks
  const missed = formattedTasks.filter((t) => {
    const st = (t.status || "").toLowerCase();
    if (st === "completed" || st === "done") return false;
    if (t.due_date && t.due_date < todayStr) return true;
    return t.age_days >= 1 || st === "pending" || st === "backlog" || st === "ready";
  });

  if (missed.length === 0) {
    return {
      success: true,
      total_missed_detected: 0,
      total_rescheduled: 0,
      tasks_needing_llm_subdivision: 0,
      daily_capacity_hours: dailyCapacityHours,
      diagnostic_summary: "No overdue or missed tasks detected. Trajectory is on schedule.",
      overload_risk_level: "Low",
      scheduled_tasks: [],
    };
  }

  // Dependency mapping
  const depCounts = {};
  for (const t of missed) {
    for (const d of t.dependencies || []) {
      depCounts[d] = (depCounts[d] || 0) + 1;
    }
  }

  const scored = missed.map((t) => {
    const p = (t.priority || "").toLowerCase();
    const urgency = p.includes("p1") || p.includes("urgent") || p.includes("high") ? 10.0 : p.includes("p2") || p.includes("strategic") ? 6.0 : 3.0;
    const inDeps = (t.dependencies || []).length;
    const outDeps = depCounts[t.id] || 0;
    const depWeight = Math.min(10.0, inDeps + outDeps);
    const age = Math.min(10.0, Math.max(0.0, t.age_days || 1.0));
    const score = urgency * 0.5 + depWeight * 0.3 + age * 0.2;
    return { task: t, urgency, depCount: inDeps + outDeps, age, score, duration: t.duration_minutes || 45 };
  });

  // Topological and priority sort
  scored.sort((a, b) => {
    if ((b.task.dependencies || []).includes(a.task.id)) return -1;
    if ((a.task.dependencies || []).includes(b.task.id)) return 1;
    return b.score - a.score;
  });

  const dayAllocated = [0, 0, 0, 0, 0, 0, 0];
  const dayLabels = ["Today", "Tomorrow", "In 2 Days", "In 3 Days", "In 4 Days", "In 5 Days", "In 6 Days"];
  let subdivisionCount = 0;

  const scheduledTasks = scored.map((item) => {
    const needsSubdivision = item.duration > maxSlotMins;
    if (needsSubdivision) subdivisionCount++;

    let targetIdx = 0;
    let found = false;
    for (let i = 0; i < dayAllocated.length; i++) {
      if (dayAllocated[i] + item.duration <= capacityMins) {
        dayAllocated[i] += item.duration;
        targetIdx = i;
        found = true;
        break;
      }
    }

    const recDay = found ? dayLabels[targetIdx] : "Backlog";
    const action = needsSubdivision ? "subdivide_llm_fallback" : recDay === "Backlog" ? "defer_to_backlog" : "reschedule";
    const slotTime = found ? `${Math.floor(9 + (dayAllocated[targetIdx] - item.duration) / 60).toString().padStart(2, "0")}:${Math.round((dayAllocated[targetIdx] - item.duration) % 60).toString().padStart(2, "0")}` : "TBD (Backlog)";
    const newPriority = item.score >= 6.5 ? "P1 Urgent & High Impact" : item.score >= 4.0 ? "P2 Strategic" : "P3 Maintenance";

    return {
      original_task_id: item.task.id,
      new_title: item.task.title,
      action,
      priority_score: Math.round(item.score * 10) / 10,
      urgency_weight: item.urgency,
      dependency_count: item.depCount,
      age_days: item.age,
      recommended_day: recDay,
      day_offset: targetIdx,
      scheduled_slot_start: slotTime,
      duration_minutes: item.duration,
      new_priority: newPriority,
      requires_llm_subdivision: needsSubdivision,
      reasoning: `Priority Score: ${item.score.toFixed(1)} (Urgency=${item.urgency.toFixed(0)}, Deps=${item.depCount}, Age=${item.age.toFixed(0)}d). Slotted into ${recDay} (${item.duration}m).${needsSubdivision ? " Exceeds 90m: Flagged for LLM atomic breakdown." : ""}`,
    };
  });

  return {
    success: true,
    total_missed_detected: missed.length,
    total_rescheduled: scheduledTasks.length,
    tasks_needing_llm_subdivision: subdivisionCount,
    daily_capacity_hours: dailyCapacityHours,
    diagnostic_summary: `Algorithmic Engine rebalanced ${missed.length} missed tasks across ${dailyCapacityHours}h daily capacity. ${scheduledTasks.length - subdivisionCount} scheduled directly; ${subdivisionCount} task(s) flagged for LLM atomic breakdown.`,
    overload_risk_level: missed.length > 8 || subdivisionCount > 3 ? "Critical" : missed.length > 3 ? "Medium" : "Low",
    scheduled_tasks: scheduledTasks,
  };
}
