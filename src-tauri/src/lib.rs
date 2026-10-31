use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, OpenOptions};
use std::io::{Read, Write};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub app_name: String,
    pub app_version: String,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FocusSessionLog {
    pub id: String,
    pub task_title: String,
    pub duration_minutes: u32,
    pub session_type: String,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportReportRequest {
    pub format: String,
    pub content: String,
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportReportResult {
    pub success: bool,
    pub file_path: String,
    pub message: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Successor native desktop app.", name)
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_name: "Successor".to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: now,
    }
}

#[tauri::command]
fn log_focus_session(app: AppHandle, session: FocusSessionLog) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    create_dir_all(&app_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let file_path = app_dir.join("focus_sessions.jsonl");

    let serialized = serde_json::to_string(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    writeln!(file, "{}", serialized).map_err(|e| format!("Failed to write log entry: {}", e))?;

    Ok(format!("Logged session '{}' to disk", session.task_title))
}

#[tauri::command]
fn get_focus_sessions(app: AppHandle) -> Result<Vec<FocusSessionLog>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let file_path = app_dir.join("focus_sessions.jsonl");
    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let mut file = OpenOptions::new()
        .read(true)
        .open(&file_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|e| format!("Failed to read log file: {}", e))?;

    let mut sessions = Vec::new();
    for line in content.lines() {
        if let Ok(item) = serde_json::from_str::<FocusSessionLog>(line) {
            sessions.push(item);
        }
    }

    Ok(sessions)
}

#[tauri::command]
fn export_desktop_report(app: AppHandle, report: ExportReportRequest) -> Result<ExportReportResult, String> {
    let download_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().desktop_dir())
        .map_err(|e| format!("Failed to get target download or desktop dir: {}", e))?;

    let file_path = download_dir.join(&report.filename);

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&file_path)
        .map_err(|e| format!("Failed to create export file: {}", e))?;

    file.write_all(report.content.as_bytes())
        .map_err(|e| format!("Failed to write export content: {}", e))?;

    Ok(ExportReportResult {
        success: true,
        file_path: file_path.to_string_lossy().to_string(),
        message: format!("Report successfully exported to {}", file_path.display()),
    })
}

#[tauri::command]
fn get_circadian_peak(chronotype: &str) -> serde_json::Value {
    let (peak_start, peak_end, label) = match chronotype.to_lowercase().as_str() {
        "owl" => (17.0, 22.5, "5:00 PM – 10:30 PM (Evening Surge)"),
        "falcon" => (11.0, 16.5, "11:00 AM – 4:30 PM (Midday Cadence)"),
        _ => (8.5, 12.5, "8:30 AM – 12:30 PM (Morning Lark Peak)"),
    };

    serde_json::json!({
        "chronotype": chronotype,
        "peak_start_hour": peak_start,
        "peak_end_hour": peak_end,
        "window_label": label,
        "optimal_block_minutes": 50,
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceUuidRecord {
    pub uuid: String,
    pub created_at: u64,
    pub os: String,
    pub arch: String,
    pub app_version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceUuidResponse {
    pub uuid: String,
    pub is_new: bool,
    pub created_at: u64,
    pub os: String,
    pub arch: String,
    pub source: String,
}

/// Generates an RFC 4122 compliant Version 4 UUID
pub fn generate_standard_uuid_v4() -> String {
    let mut bytes = [0u8; 16];

    // Priority 1: Read from OS cryptographically secure random source on Unix
    #[cfg(unix)]
    {
        if let Ok(mut f) = std::fs::File::open("/dev/urandom") {
            let _ = f.read_exact(&mut bytes);
        }
    }

    // Priority 2: High-entropy fallback using system timestamp, PID & address space entropy
    if bytes == [0u8; 16] {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let pid = std::process::id() as u128;
        let stack_addr = &bytes as *const _ as usize as u128;
        let mut state = now ^ (pid << 48) ^ (stack_addr << 24);

        for chunk in bytes.chunks_mut(8) {
            state = state.wrapping_add(0x9E3779B97F4A7C15);
            let mut z = state;
            z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
            z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
            let val = (z ^ (z >> 31)) as u64;
            let val_bytes = val.to_le_bytes();
            let len = chunk.len().min(8);
            chunk[..len].copy_from_slice(&val_bytes[..len]);
        }
    }

    // Set RFC 4122 Version 4 (0100 in bits 4-7 of octet 6)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Set RFC 4122 Variant (10 in bits 6-7 of octet 8)
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6], bytes[7],
        bytes[8], bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
}

/// Validates whether a string matches standard RFC 4122 36-character hyphenated UUID syntax
pub fn is_valid_uuid(uuid_str: &str) -> bool {
    if uuid_str.len() != 36 {
        return false;
    }
    uuid_str
        .chars()
        .enumerate()
        .all(|(i, c)| match i {
            8 | 13 | 18 | 23 => c == '-',
            _ => c.is_ascii_hexdigit(),
        })
}

#[tauri::command]
fn generate_uuid() -> String {
    generate_standard_uuid_v4()
}

#[tauri::command]
fn get_or_create_device_uuid(app: AppHandle) -> Result<DeviceUuidResponse, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    create_dir_all(&app_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let file_path = app_dir.join("device_uuid.json");

    // 1. Check if an existing persistent UUID is saved on disk
    if file_path.exists() {
        if let Ok(mut file) = OpenOptions::new().read(true).open(&file_path) {
            let mut content = String::new();
            if file.read_to_string(&mut content).is_ok() {
                if let Ok(record) = serde_json::from_str::<DeviceUuidRecord>(&content) {
                    if is_valid_uuid(&record.uuid) {
                        return Ok(DeviceUuidResponse {
                            uuid: record.uuid,
                            is_new: false,
                            created_at: record.created_at,
                            os: record.os,
                            arch: record.arch,
                            source: "disk_storage".to_string(),
                        });
                    }
                }
            }
        }
    }

    // 2. Generate new standard UUID v4 and persist to disk
    let new_uuid = generate_standard_uuid_v4();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let record = DeviceUuidRecord {
        uuid: new_uuid.clone(),
        created_at: now,
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    };

    if let Ok(serialized) = serde_json::to_string_pretty(&record) {
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&file_path)
        {
            let _ = file.write_all(serialized.as_bytes());
        }
    }

    Ok(DeviceUuidResponse {
        uuid: new_uuid,
        is_new: true,
        created_at: now,
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        source: "newly_generated".to_string(),
    })
}

/// Firebase App Check Debug Token (Registered in Firebase Console for fledgeportal)
pub const DEFAULT_APP_CHECK_DEBUG_TOKEN: &str = "B2B852DC-14DD-4204-96E4-DDD011A0747A";

#[derive(Debug, Serialize, Deserialize)]
pub struct AppCheckConfig {
    pub debug_token: String,
    pub project_id: String,
    pub api_key: String,
    pub app_id: String,
}

#[tauri::command]
fn get_app_check_config() -> AppCheckConfig {
    AppCheckConfig {
        debug_token: DEFAULT_APP_CHECK_DEBUG_TOKEN.to_string(),
        project_id: "fledgeportal".to_string(),
        api_key: "AIzaSyCLAPwadPE7TDzrkZoH7ax_CrR6b3RP054".to_string(),
        app_id: "1:844515198625:web:d1febaeabb62cc7756d2e0".to_string(),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NativeAiRequest {
    pub prompt: String,
    pub model: Option<String>,
    pub system_instruction: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NativeAiResponse {
    pub success: bool,
    pub content: String,
    pub model_used: String,
    pub debug_token_used: String,
}

#[tauri::command]
fn get_app_check_debug_token() -> String {
    DEFAULT_APP_CHECK_DEBUG_TOKEN.to_string()
}

// -----------------------------------------------------------------------------
// 3. Handling Missed Tasks: Rust Algorithmic Rebalancing
// Detect Missed Tasks: tasks with status == "pending"/"ready" and due_date < current_date
// Priority Score = (Urgency) * 0.5 + (Dependency Count) * 0.3 + (Age in Days) * 0.2
// Slot into Schedule: auto-assign into daily working time slots in topological order
// Fallback to LLM: flag tasks that exceed max slot capacity and need subdivision
// -----------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RebalanceTaskInput {
    pub id: String,
    pub title: String,
    pub status: Option<String>,
    pub due_date: Option<String>,      // YYYY-MM-DD or ISO string
    pub duration_minutes: Option<f64>, // e.g. 45.0, 90.0, 120.0
    pub priority: Option<String>,      // "P1 Urgent & High Impact" | "P2 Strategic" | "P3 Maintenance"
    pub dependencies: Option<Vec<String>>, // IDs of parent tasks that must be done first
    pub age_days: Option<f64>,         // Days since creation or rollover count
    pub created_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RebalanceTaskScheduleOutput {
    pub original_task_id: String,
    pub new_title: String,
    pub action: String, // "reschedule" | "subdivide_llm_fallback" | "defer_to_backlog"
    pub priority_score: f64,
    pub urgency_weight: f64,
    pub dependency_count: usize,
    pub age_days: f64,
    pub recommended_day: String, // "Today" | "Tomorrow" | "Day 3" | ... | "Backlog"
    pub day_offset: u32,
    pub scheduled_slot_start: String,
    pub duration_minutes: f64,
    pub new_priority: String,
    pub requires_llm_subdivision: bool,
    pub reasoning: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RebalanceScheduleResponse {
    pub success: bool,
    pub total_missed_detected: usize,
    pub total_rescheduled: usize,
    pub tasks_needing_llm_subdivision: usize,
    pub daily_capacity_hours: f64,
    pub diagnostic_summary: String,
    pub overload_risk_level: String, // "Low" | "Medium" | "Critical"
    pub scheduled_tasks: Vec<RebalanceTaskScheduleOutput>,
}

#[tauri::command]
fn rebalance_missed_tasks(
    tasks: Vec<RebalanceTaskInput>,
    daily_capacity_hours: Option<f64>,
    current_date: Option<String>, // "YYYY-MM-DD"
) -> RebalanceScheduleResponse {
    let capacity_hrs = daily_capacity_hours.unwrap_or(4.0).max(1.0);
    let daily_capacity_mins = capacity_hrs * 60.0;
    let max_single_slot_mins = 90.0; // Tasks > 90m in tight schedule require LLM subdivision

    let today_str = current_date.unwrap_or_else(|| {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let days = now / 86400;
        format!("Day-{}", days)
    });

    // 1. Detect Missed Tasks: status != "completed" and (due_date < current_date or status == "pending"/"ready")
    let mut missed_tasks: Vec<RebalanceTaskInput> = tasks
        .into_iter()
        .filter(|t| {
            let status = t.status.as_deref().unwrap_or("ready").to_lowercase();
            if status == "completed" || status == "done" {
                return false;
            }
            if let Some(ref due) = t.due_date {
                if !due.is_empty() && due.as_str() < today_str.as_str() {
                    return true;
                }
            }
            // Include overdue, rolled-over, or backlog tasks needing scheduling
            t.age_days.unwrap_or(0.0) >= 1.0 || status == "pending" || status == "backlog" || status == "ready"
        })
        .collect();

    let total_detected = missed_tasks.len();
    if total_detected == 0 {
        return RebalanceScheduleResponse {
            success: true,
            total_missed_detected: 0,
            total_rescheduled: 0,
            tasks_needing_llm_subdivision: 0,
            daily_capacity_hours: capacity_hrs,
            diagnostic_summary: "No overdue or missed tasks detected. Trajectory is on schedule.".to_string(),
            overload_risk_level: "Low".to_string(),
            scheduled_tasks: Vec::new(),
        };
    }

    // 2. Calculate Priority Score:
    // Priority Score = (Urgency * 0.5) + (Dependency Count * 0.3) + (Age in Days * 0.2)
    // - Urgency: P1 / Urgent = 10.0, P2 / Strategic = 6.0, P3 / Maintenance = 3.0
    // - Dependency Count: number of other tasks that depend on this task or this task depends on (normalized to 0-10)
    // - Age in Days: age_days capped at 10.0
    struct ScoredTask {
        task: RebalanceTaskInput,
        urgency: f64,
        dep_count: usize,
        age: f64,
        score: f64,
        duration: f64,
    }

    // Map dependents count: how many tasks list this task in dependencies
    let mut dependent_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for t in &missed_tasks {
        if let Some(ref deps) = t.dependencies {
            for dep_id in deps {
                *dependent_counts.entry(dep_id.clone()).or_insert(0) += 1;
            }
        }
    }

    let mut scored_list: Vec<ScoredTask> = missed_tasks
        .drain(..)
        .map(|t| {
            let prio = t.priority.as_deref().unwrap_or("P2 Strategic").to_lowercase();
            let urgency = if prio.contains("p1") || prio.contains("urgent") || prio.contains("high") {
                10.0
            } else if prio.contains("p2") || prio.contains("strategic") {
                6.0
            } else {
                3.0
            };

            let in_deps = t.dependencies.as_ref().map(|d| d.len()).unwrap_or(0);
            let out_deps = dependent_counts.get(&t.id).copied().unwrap_or(0);
            let dep_count = in_deps + out_deps;
            let dep_weight = (dep_count as f64).min(10.0);

            let age = t.age_days.unwrap_or(1.0).max(0.0).min(10.0);

            let score = (urgency * 0.5) + (dep_weight * 0.3) + (age * 0.2);
            let duration = t.duration_minutes.unwrap_or(45.0).max(15.0);

            ScoredTask {
                task: t,
                urgency,
                dep_count,
                age,
                score,
                duration,
            }
        })
        .collect();

    // 3. Topological Ordering with Priority Weight Tie-breaking:
    // Sort tasks primarily by priority score descending, respecting dependency DAG
    scored_list.sort_by(|a, b| {
        // If 'b' depends on 'a', 'a' must precede 'b'
        if let Some(ref b_deps) = b.task.dependencies {
            if b_deps.contains(&a.task.id) {
                return std::cmp::Ordering::Less;
            }
        }
        if let Some(ref a_deps) = a.task.dependencies {
            if a_deps.contains(&b.task.id) {
                return std::cmp::Ordering::Greater;
            }
        }
        b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal)
    });

    // 4. Slot into Schedule:
    // Iterate through future working days (e.g., Day 0: Today, Day 1: Tomorrow, etc.)
    // respecting daily_capacity_mins (e.g., 4h = 240m).
    let mut day_allocated_mins: Vec<f64> = vec![0.0; 7]; // 7-day planning window
    let day_labels = ["Today", "Tomorrow", "In 2 Days", "In 3 Days", "In 4 Days", "In 5 Days", "In 6 Days"];

    let mut scheduled_outputs: Vec<RebalanceTaskScheduleOutput> = Vec::new();
    let mut subdivision_count = 0;

    for item in scored_list {
        // Fallback to LLM if task duration > max_single_slot_mins (e.g. >90m) to subdivide into atomic sprints
        let needs_subdivision = item.duration > max_single_slot_mins;
        if needs_subdivision {
            subdivision_count += 1;
        }

        // Find earliest day with capacity
        let mut target_day_idx = 0;
        let mut found_slot = false;

        for (idx, alloc) in day_allocated_mins.iter_mut().enumerate() {
            if *alloc + item.duration <= daily_capacity_mins {
                *alloc += item.duration;
                target_day_idx = idx;
                found_slot = true;
                break;
            }
        }

        let recommended_day = if found_slot {
            day_labels.get(target_day_idx).unwrap_or(&"Later This Week").to_string()
        } else {
            // Over capacity across 7 days: defer to backlog
            "Backlog".to_string()
        };

        let action = if needs_subdivision {
            "subdivide_llm_fallback".to_string()
        } else if recommended_day == "Backlog" {
            "defer_to_backlog".to_string()
        } else {
            "reschedule".to_string()
        };

        let slot_time = if found_slot {
            let start_min = day_allocated_mins[target_day_idx] - item.duration;
            let start_hr = 9.0 + (start_min / 60.0);
            let hr_int = start_hr as u32;
            let min_int = ((start_hr - hr_int as f64) * 60.0) as u32;
            format!("{:02}:{:02}", hr_int, min_int)
        } else {
            "TBD (Backlog)".to_string()
        };

        let new_priority = if item.score >= 6.5 {
            "P1 Urgent & High Impact".to_string()
        } else if item.score >= 4.0 {
            "P2 Strategic".to_string()
        } else {
            "P3 Maintenance".to_string()
        };

        let reasoning = format!(
            "Priority Score: {:.1} (Urgency={:.0}, Deps={}, Age={:.0}d). Slotted into {} ({}m budget).{}",
            item.score,
            item.urgency,
            item.dep_count,
            item.age,
            recommended_day,
            item.duration,
            if needs_subdivision {
                " Exceeds 90m sprint limit: Flagged for LLM atomic subdivision."
            } else {
                ""
            }
        );

        scheduled_outputs.push(RebalanceTaskScheduleOutput {
            original_task_id: item.task.id,
            new_title: item.task.title,
            action,
            priority_score: (item.score * 10.0).round() / 10.0,
            urgency_weight: item.urgency,
            dependency_count: item.dep_count,
            age_days: item.age,
            recommended_day,
            day_offset: target_day_idx as u32,
            scheduled_slot_start: slot_time,
            duration_minutes: item.duration,
            new_priority,
            requires_llm_subdivision: needs_subdivision,
            reasoning,
        });
    }

    let risk_level = if total_detected > 8 || subdivision_count > 3 {
        "Critical".to_string()
    } else if total_detected > 3 {
        "Medium".to_string()
    } else {
        "Low".to_string()
    };

    let summary = format!(
        "Rust Algorithmic Engine rebalanced {} missed tasks across a {:.1}h daily capacity budget. {} task(s) scheduled directly; {} task(s) flagged for LLM atomic breakdown.",
        total_detected,
        capacity_hrs,
        scheduled_outputs.len() - subdivision_count,
        subdivision_count
    );

    RebalanceScheduleResponse {
        success: true,
        total_missed_detected: total_detected,
        total_rescheduled: scheduled_outputs.len(),
        tasks_needing_llm_subdivision: subdivision_count,
        daily_capacity_hours: capacity_hrs,
        diagnostic_summary: summary,
        overload_risk_level: risk_level,
        scheduled_tasks: scheduled_outputs,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_info,
            log_focus_session,
            get_focus_sessions,
            export_desktop_report,
            get_circadian_peak,
            generate_uuid,
            get_or_create_device_uuid,
            get_app_check_debug_token,
            get_app_check_config,
            rebalance_missed_tasks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
