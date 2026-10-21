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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_info,
            log_focus_session,
            get_focus_sessions,
            export_desktop_report,
            get_circadian_peak
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
