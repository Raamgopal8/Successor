//! RAG-Based Roadmap Engine — Successor Desktop App
//! Fetches structured career/technology roadmaps from roadmap.sh (GitHub JSON API)
//! and other sources, chunks them into daily achievable tasks, assembles a RAG
//! context, and calls the Gemini API to generate a personalized N-day plan.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::Manager;

// ─────────────────────────────────────────────────────────────────
// 1. Public Data Types
// ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DayPlan {
    pub day: u32,
    pub week: u32,
    pub title: String,
    pub tasks: Vec<String>,
    pub resources: Vec<String>,
    pub milestone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RoadmapPlanResult {
    pub roadmap_source: String,
    pub roadmap_id: String,
    pub total_topics: usize,
    pub n_days: u32,
    pub days: Vec<DayPlan>,
    pub fetched_at: String,
    pub is_cached: bool,
    pub cache_warning: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CachedRoadmap {
    id: String,
    topics: Vec<String>,
    fetched_at_unix: i64,
    source_url: String,
}

// ─────────────────────────────────────────────────────────────────
// 2. Keyword → Roadmap ID Resolution
// ─────────────────────────────────────────────────────────────────

static ROADMAP_KEYWORD_MAP: &[(&str, &str)] = &[
    ("rust", "rust"),
    ("python", "python"),
    ("javascript", "javascript"),
    ("typescript", "typescript"),
    ("react", "react"),
    ("nodejs", "nodejs"),
    ("node.js", "nodejs"),
    ("backend", "backend"),
    ("frontend", "frontend"),
    ("fullstack", "full-stack"),
    ("full stack", "full-stack"),
    ("devops", "devops"),
    ("docker", "docker"),
    ("kubernetes", "kubernetes"),
    ("android", "android"),
    ("ios", "ios"),
    ("flutter", "flutter"),
    ("golang", "golang"),
    ("go ", "golang"),
    ("java", "java"),
    ("c++", "cpp"),
    ("cpp", "cpp"),
    ("cs", "computer-science"),
    ("computer science", "computer-science"),
    ("sql", "sql"),
    ("postgresql", "postgresql"),
    ("mongodb", "mongodb"),
    ("cloud", "aws"),
    ("aws", "aws"),
    ("azure", "azure"),
    ("gcp", "gcp"),
    ("linux", "linux"),
    ("git", "git"),
    ("cyber", "cyber-security"),
    ("security", "cyber-security"),
    ("ml", "mlops"),
    ("machine learning", "mlops"),
    ("data science", "data-analyst"),
    ("data analyst", "data-analyst"),
    ("prompt", "prompt-engineering"),
    ("ai engineer", "ai-engineer"),
    ("design", "ux-design"),
    ("ux", "ux-design"),
    ("product manager", "product-manager"),
    ("game", "game-developer"),
    ("redis", "redis"),
    ("graphql", "graphql"),
    ("api", "api-design"),
    ("system design", "system-design"),
    ("architecture", "software-design-architecture"),
];

pub fn resolve_roadmap_id(goal: &str) -> String {
    let lower = goal.to_lowercase();
    for (keyword, id) in ROADMAP_KEYWORD_MAP {
        if lower.contains(keyword) {
            return id.to_string();
        }
    }
    // Generic programming fallback
    "computer-science".to_string()
}

// ─────────────────────────────────────────────────────────────────
// 3. Cache Helpers
// ─────────────────────────────────────────────────────────────────

const CACHE_TTL_SECS: i64 = 86400; // 24 hours

fn get_cache_path(app_data_dir: &PathBuf, roadmap_id: &str) -> PathBuf {
    app_data_dir
        .join("roadmap_cache")
        .join(format!("{}.json", roadmap_id))
}

fn load_cached_roadmap(
    app_data_dir: &PathBuf,
    roadmap_id: &str,
) -> Option<(CachedRoadmap, bool /* is_stale */)> {
    let path = get_cache_path(app_data_dir, roadmap_id);
    if !path.exists() {
        return None;
    }
    if let Ok(mut f) = OpenOptions::new().read(true).open(&path) {
        let mut buf = String::new();
        if f.read_to_string(&mut buf).is_ok() {
            if let Ok(cached) = serde_json::from_str::<CachedRoadmap>(&buf) {
                let age = Utc::now().timestamp() - cached.fetched_at_unix;
                let is_stale = age > CACHE_TTL_SECS;
                return Some((cached, is_stale));
            }
        }
    }
    None
}

fn save_cached_roadmap(app_data_dir: &PathBuf, entry: &CachedRoadmap) {
    let cache_dir = app_data_dir.join("roadmap_cache");
    let _ = fs::create_dir_all(&cache_dir);
    let path = get_cache_path(app_data_dir, &entry.id);
    if let Ok(json) = serde_json::to_string_pretty(entry) {
        if let Ok(mut f) = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&path)
        {
            let _ = f.write_all(json.as_bytes());
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// 4. Roadmap Fetching — roadmap.sh GitHub raw JSON
// ─────────────────────────────────────────────────────────────────

/// Attempts to fetch the roadmap JSON from roadmap.sh's public GitHub repo.
/// Falls back to the roadmap.sh REST API, then to a curated built-in topic list.
pub async fn fetch_roadmap_topics(roadmap_id: &str) -> (Vec<String>, String) {
    // Primary: roadmap.sh GitHub raw JSON (structured node labels)
    let github_raw_url = format!(
        "https://raw.githubusercontent.com/kamranahmedse/developer-roadmap/master/public/jsons/{}.json",
        roadmap_id
    );

    if let Ok(topics) = try_fetch_github_json(&github_raw_url).await {
        return (topics, github_raw_url);
    }

    // Secondary: roadmap.sh REST API
    let api_url = format!("https://roadmap.sh/api/v1-json/{}", roadmap_id);
    if let Ok(topics) = try_fetch_api_json(&api_url).await {
        return (topics, api_url);
    }

    // Tertiary: TheOdinProject and FreeCodeCamp HTML scrape for well-known paths
    if let Ok(topics) = try_scrape_supplementary(roadmap_id).await {
        return (topics, format!("https://theodinproject.com/paths/{}", roadmap_id));
    }

    // Built-in fallback for common roadmaps
    let fallback = builtin_fallback(roadmap_id);
    (fallback, "built-in-fallback".to_string())
}

async fn try_fetch_github_json(url: &str) -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(url)
        .header("User-Agent", "Successor-App/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let body = response.text().await.map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    let topics = extract_topics_from_roadmap_json(&json);
    if topics.is_empty() {
        return Err("No topics found in JSON".to_string());
    }
    Ok(topics)
}

async fn try_fetch_api_json(url: &str) -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(url)
        .header("User-Agent", "Successor-App/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let body = response.text().await.map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    let topics = extract_topics_from_roadmap_json(&json);
    if topics.is_empty() {
        Err("No topics found".to_string())
    } else {
        Ok(topics)
    }
}

async fn try_scrape_supplementary(roadmap_id: &str) -> Result<Vec<String>, String> {
    // Try TheOdinProject curriculum for web-related paths
    let odin_map: HashMap<&str, &str> = [
        ("frontend", "https://www.theodinproject.com/paths/full-stack-javascript"),
        ("full-stack", "https://www.theodinproject.com/paths/full-stack-ruby-on-rails"),
        ("javascript", "https://www.theodinproject.com/paths/full-stack-javascript"),
    ].into_iter().collect();

    if let Some(url) = odin_map.get(roadmap_id) {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| e.to_string())?;

        let response = client
            .get(*url)
            .header("User-Agent", "Mozilla/5.0 (compatible; SuccessorApp/1.0)")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let html = response.text().await.map_err(|e| e.to_string())?;
        let topics = scrape_odin_topics(&html);
        if !topics.is_empty() {
            return Ok(topics);
        }
    }

    Err("No supplementary source matched".to_string())
}

/// Recursively extracts topic/node labels from the roadmap.sh JSON structure
fn extract_topics_from_roadmap_json(json: &serde_json::Value) -> Vec<String> {
    let mut topics: Vec<String> = Vec::new();
    extract_recursive(json, &mut topics, 0);
    topics.dedup();
    topics
}

fn extract_recursive(value: &serde_json::Value, topics: &mut Vec<String>, depth: usize) {
    if depth > 8 {
        return;
    }
    match value {
        serde_json::Value::Object(map) => {
            // roadmap.sh JSON node structure: {"label": "...", "children": [...]}
            if let Some(label) = map.get("label").and_then(|v| v.as_str()) {
                let clean = label.trim().to_string();
                if !clean.is_empty() && clean.len() > 2 && !clean.starts_with('@') {
                    topics.push(clean);
                }
            }
            // Also check "text", "title", "name" keys used in some formats
            for key in &["text", "title", "name", "content"] {
                if let Some(val) = map.get(*key).and_then(|v| v.as_str()) {
                    let clean = val.trim().to_string();
                    if !clean.is_empty() && clean.len() > 3 {
                        topics.push(clean);
                    }
                }
            }
            for (_, v) in map {
                extract_recursive(v, topics, depth + 1);
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr {
                extract_recursive(item, topics, depth + 1);
            }
        }
        _ => {}
    }
}

fn scrape_odin_topics(html: &str) -> Vec<String> {
    use scraper::{Html, Selector};
    let document = Html::parse_document(html);
    let mut topics = Vec::new();

    // TheOdinProject uses h2, h3 for lesson/section titles
    for sel in &["h2", "h3", ".course-name", ".lesson-title"] {
        if let Ok(selector) = Selector::parse(sel) {
            for element in document.select(&selector) {
                let text = element.text().collect::<String>();
                let clean = text.trim().to_string();
                if !clean.is_empty() && clean.len() > 4 {
                    topics.push(clean);
                }
            }
        }
    }
    topics.dedup();
    topics
}

// ─────────────────────────────────────────────────────────────────
// 5. Built-in Fallback Topic Libraries
// ─────────────────────────────────────────────────────────────────

fn builtin_fallback(roadmap_id: &str) -> Vec<String> {
    match roadmap_id {
        "rust" => vec![
            "Install Rust & Cargo toolchain".into(), "Variables, mutability & shadowing".into(),
            "Data types: scalars & compound".into(), "Functions & control flow".into(),
            "Ownership & borrowing rules".into(), "References & the borrow checker".into(),
            "Slices & string types".into(), "Structs: defining & instantiating".into(),
            "Methods & associated functions".into(), "Enums & pattern matching".into(),
            "Option<T> & handling None".into(), "Result<T, E> & error propagation".into(),
            "Packages, crates & modules".into(), "use declarations & visibility".into(),
            "Common collections: Vec, HashMap, HashSet".into(),
            "Generic types & type parameters".into(), "Traits & trait bounds".into(),
            "Lifetimes & lifetime annotations".into(), "Closures & iterators".into(),
            "Smart pointers: Box, Rc, RefCell".into(), "Concurrency: threads & channels".into(),
            "async/await & tokio basics".into(), "Writing unit & integration tests".into(),
            "Cargo workspaces & publishing".into(), "Build a real CLI project".into(),
        ],
        "python" => vec![
            "Install Python & setup virtual environments".into(),
            "Variables, types & basic I/O".into(), "Control flow: if/else, loops".into(),
            "Functions, arguments & return values".into(), "Lists, tuples, dicts & sets".into(),
            "File I/O & exception handling".into(), "Object-oriented programming in Python".into(),
            "Modules & packages".into(), "Virtual environments & pip".into(),
            "List comprehensions & generators".into(), "Decorators & context managers".into(),
            "Regular expressions".into(), "Working with JSON & CSV".into(),
            "HTTP requests with requests library".into(), "Testing with pytest".into(),
            "Data analysis with pandas & numpy".into(), "Data visualization with matplotlib".into(),
            "FastAPI or Flask web framework".into(), "Database access with SQLAlchemy".into(),
            "Async programming with asyncio".into(), "Docker & containerization".into(),
            "Deployment to cloud (Render/Fly.io)".into(), "Build a complete REST API project".into(),
        ],
        "frontend" => vec![
            "HTML5 semantics & document structure".into(), "CSS fundamentals & box model".into(),
            "Flexbox layout mastery".into(), "CSS Grid layout".into(),
            "Responsive design & media queries".into(), "JavaScript fundamentals".into(),
            "DOM manipulation & events".into(), "Fetch API & async/await".into(),
            "Modern ES6+ features".into(), "React fundamentals & JSX".into(),
            "React state & props".into(), "React hooks: useState, useEffect".into(),
            "React Router for navigation".into(), "State management with Context or Redux".into(),
            "CSS-in-JS or Tailwind CSS".into(), "Component testing with Vitest".into(),
            "Build tools: Vite".into(), "TypeScript basics for React".into(),
            "API integration & data fetching".into(), "Performance: lazy loading, code splitting".into(),
            "Web accessibility (WCAG)".into(), "PWA fundamentals".into(),
            "Deployment to Vercel/Netlify".into(), "Build a full-featured portfolio project".into(),
        ],
        "devops" => vec![
            "Linux fundamentals & shell scripting".into(), "Version control with Git".into(),
            "Docker: containerization basics".into(), "Docker Compose for multi-service apps".into(),
            "CI/CD with GitHub Actions".into(), "Kubernetes fundamentals".into(),
            "Helm charts & manifests".into(), "Infrastructure as Code with Terraform".into(),
            "AWS fundamentals (EC2, S3, RDS)".into(), "Monitoring with Prometheus & Grafana".into(),
            "Log management with ELK stack".into(), "Networking: DNS, TLS, load balancers".into(),
            "Security: secrets, IAM, least privilege".into(),
            "Site Reliability Engineering principles".into(),
            "Chaos engineering & incident response".into(),
        ],
        _ => vec![
            "Define your learning goal & outcome metrics".into(),
            "Research and curate core resources".into(),
            "Establish a daily study habit and schedule".into(),
            "Master fundamentals and core concepts".into(),
            "Apply knowledge through hands-on projects".into(),
            "Review, debug & refine your project".into(),
            "Seek peer feedback and mentorship".into(),
            "Build a portfolio showcasing your work".into(),
            "Contribute to open source or communities".into(),
            "Apply for roles or launch your project".into(),
        ],
    }
}

// ─────────────────────────────────────────────────────────────────
// 6. Topic Chunker — distribute topics across N days
// ─────────────────────────────────────────────────────────────────

pub fn chunk_topics_into_days(topics: &[String], n_days: u32) -> Vec<DayPlan> {
    let n = n_days as usize;
    let total = topics.len();
    let mut days = Vec::with_capacity(n);

    for day_idx in 0..n {
        let week = (day_idx / 7) as u32 + 1;
        let day_num = day_idx as u32 + 1;

        // Determine which topics belong to this day
        // Distribute topics proportionally with overlap for review
        let topics_per_day = if total > n { 2 } else { 1 };
        let start = (day_idx * total / n).min(total.saturating_sub(1));
        let end = ((day_idx * total / n) + topics_per_day).min(total);

        let day_topics: Vec<String> = if start < end {
            topics[start..end].to_vec()
        } else if !topics.is_empty() {
            vec![topics[total - 1].clone()]
        } else {
            vec![format!("Self-directed study: Day {}", day_num)]
        };

        let primary_topic = day_topics.first().cloned().unwrap_or_default();

        // Build 3-5 concrete tasks per day
        let tasks = build_day_tasks(&primary_topic, day_num, week, n_days);

        // Weekly milestone on day 7, 14, 21... or last day
        let milestone = if day_num % 7 == 0 || day_num == n_days {
            Some(format!(
                "Week {} Milestone: Demonstrate competency in {} — build a small project or pass a self-quiz.",
                week, primary_topic
            ))
        } else {
            None
        };

        // Curated resources for the topic
        let resources = build_resources(&primary_topic);

        days.push(DayPlan {
            day: day_num,
            week,
            title: format!("Day {}: {}", day_num, primary_topic),
            tasks,
            resources,
            milestone,
        });
    }

    days
}

fn build_day_tasks(topic: &str, day: u32, week: u32, total_days: u32) -> Vec<String> {
    let phase = if day <= total_days / 3 {
        "Foundation"
    } else if day <= (total_days * 2) / 3 {
        "Application"
    } else {
        "Mastery"
    };

    vec![
        format!("[{}] Study core concepts of: {}", phase, topic),
        format!(
            "Write 10–20 lines of code / notes practicing {}",
            topic
        ),
        format!(
            "Solve 1–2 exercises or examples related to {}",
            topic
        ),
        format!("Week {}: Review Week's progress and document key learnings", week),
        format!(
            "End of Day {}: Commit work, reflect, plan Day {}",
            day,
            day + 1
        ),
    ]
}

fn build_resources(topic: &str) -> Vec<String> {
    let lower = topic.to_lowercase();
    let mut res = vec![
        format!("https://roadmap.sh — {}", topic),
        format!("https://developer.mozilla.org — search for \"{}\"", topic),
    ];

    if lower.contains("rust") {
        res.push("https://doc.rust-lang.org/book/".into());
        res.push("https://exercism.org/tracks/rust".into());
    } else if lower.contains("python") {
        res.push("https://docs.python.org/3/tutorial/".into());
        res.push("https://exercism.org/tracks/python".into());
    } else if lower.contains("javascript") || lower.contains("js") {
        res.push("https://javascript.info".into());
        res.push("https://theodinproject.com/paths/full-stack-javascript".into());
    } else if lower.contains("react") {
        res.push("https://react.dev/learn".into());
    } else if lower.contains("devops") || lower.contains("docker") {
        res.push("https://labs.play-with-docker.com".into());
        res.push("https://freecodecamp.org/learn/devops".into());
    }

    res
}

// ─────────────────────────────────────────────────────────────────
// 7. RAG Context Assembler + Gemini API Call
// ─────────────────────────────────────────────────────────────────

pub async fn call_gemini_with_rag(
    topics: &[String],
    goal: &str,
    n_days: u32,
    roadmap_id: &str,
    source_url: &str,
    api_key: &str,
    model: &str,
) -> Result<Vec<DayPlan>, String> {
    // Build RAG context from topics — take top 60 for token efficiency
    let topic_list: Vec<String> = topics
        .iter()
        .take(60)
        .enumerate()
        .map(|(i, t)| format!("{}. {}", i + 1, t))
        .collect();
    let rag_context = topic_list.join("\n");

    let system_prompt = format!(
        "You are an expert learning coach and curriculum designer with deep knowledge of {}.\n\
        You have access to a structured, authoritative roadmap fetched from {} that covers:\n\
        ---ROADMAP TOPICS START---\n\
        {}\n\
        ---ROADMAP TOPICS END---\n\
        Use these topics as your primary knowledge source (RAG context). Do not invent topics outside this list.\n\
        Rules:\n\
        - Every day title must be unique and reference the actual topic being studied that day\n\
        - Tasks must be concrete, specific, and actionable — not vague like 'study more' or 'practice'\n\
        - Progress must be chronologically sequential — build on previous days\n\
        - Each week should end with a mini-milestone deliverable\n\
        - Format: Use day headers like 'Day N: <Specific Topic>' and bulleted tasks under each day\n\
        - Return ONLY the roadmap. No preamble, no meta-commentary.",
        goal, source_url, rag_context
    );

    let user_prompt = format!(
        "Create a detailed, personalized {}-day learning roadmap for: \"{}\"\n\
        Roadmap ID: {}\n\
        Total days: {}\n\
        Cover all roadmap topics proportionally. For each day provide:\n\
        - Day title (Day N: Specific Topic Name)\n\
        - 3-4 concrete tasks\n\
        - 1 resource link\n\
        - Weekly milestone (every 7 days)\n\
        Make it achievable by a dedicated learner spending 1-2 hours per day.",
        n_days, goal, roadmap_id, n_days
    );

    let request_body = serde_json::json!({
        "system_instruction": {
            "parts": [{ "text": system_prompt }]
        },
        "contents": [{
            "parts": [{ "text": user_prompt }]
        }],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 8192,
            "topP": 0.9
        }
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Gemini request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API error {}: {}", status, body));
    }

    let resp_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;

    let raw_text = resp_json
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if raw_text.is_empty() {
        return Err("Gemini returned an empty response".to_string());
    }

    // Parse the Gemini text response into DayPlan structs
    Ok(parse_gemini_roadmap_text(&raw_text, n_days))
}

/// Parses Gemini's markdown-style roadmap text into structured DayPlan objects
fn parse_gemini_roadmap_text(text: &str, _n_days: u32) -> Vec<DayPlan> {
    let mut days: Vec<DayPlan> = Vec::new();
    let mut current_day: Option<DayPlan> = None;
    let mut current_resource: Vec<String> = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();

        // Detect day header: "Day 1:", "**Day 1:**", "## Day 1:", etc.
        if let Some(day_part) = extract_day_header(trimmed) {
            if let Some(d) = current_day.take() {
                let mut d = d;
                d.resources = current_resource.drain(..).collect();
                days.push(d);
            }

            let day_num = day_part.0;
            let title = day_part.1;
            let week = (day_num - 1) / 7 + 1;

            current_day = Some(DayPlan {
                day: day_num,
                week,
                title,
                tasks: Vec::new(),
                resources: Vec::new(),
                milestone: None,
            });
        } else if let Some(ref mut d) = current_day {
            // Bullet point → task
            if trimmed.starts_with('-') || trimmed.starts_with('•') || trimmed.starts_with('*') {
                let task = trimmed.trim_start_matches(['-', '•', '*', ' ']).to_string();
                if !task.is_empty() && task.len() > 5 {
                    d.tasks.push(task);
                }
            }
            // Numbered item → task
            else if trimmed.len() > 2
                && trimmed.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false)
                && (trimmed.contains(". ") || trimmed.contains(") "))
            {
                let task = trimmed
                    .splitn(2, ". ")
                    .nth(1)
                    .or_else(|| trimmed.splitn(2, ") ").nth(1))
                    .unwrap_or("")
                    .to_string();
                if !task.is_empty() {
                    d.tasks.push(task);
                }
            }
            // URL line → resource
            else if trimmed.starts_with("http") {
                current_resource.push(trimmed.to_string());
            }
            // Milestone detection
            else if trimmed.to_lowercase().contains("milestone") || trimmed.to_lowercase().contains("deliverable") {
                d.milestone = Some(trimmed.trim_start_matches(['#', ' ', '*']).to_string());
            }
        }
    }

    // Push the last day
    if let Some(mut d) = current_day {
        d.resources = current_resource;
        days.push(d);
    }

    // If Gemini returned fewer days than requested, fill the remaining with algorithmic chunks
    days
}

fn extract_day_header(line: &str) -> Option<(u32, String)> {
    // Strip markdown bold/heading markers
    let clean = line
        .trim_start_matches(['#', '*', ' '])
        .trim_end_matches(['*', ':'])
        .trim();

    if !clean.to_lowercase().starts_with("day ") {
        return None;
    }

    // Extract day number
    let after_day = &clean[4..]; // skip "day "
    let num_end = after_day.find(|c: char| !c.is_ascii_digit()).unwrap_or(after_day.len());
    let day_num: u32 = after_day[..num_end].parse().ok()?;

    // Extract title (everything after "Day N:" or "Day N -")
    let rest = after_day[num_end..]
        .trim_start_matches([':', '-', ' ', '*'])
        .trim()
        .to_string();

    let title = if rest.is_empty() {
        format!("Day {}", day_num)
    } else {
        format!("Day {}: {}", day_num, rest)
    };

    Some((day_num, title))
}

// ─────────────────────────────────────────────────────────────────
// 8. Main Tauri Command Entry Point
// ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fetch_roadmap_plan(
    app: tauri::AppHandle,
    goal: String,
    roadmap_id: Option<String>,
    n_days: u32,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<RoadmapPlanResult, String> {
    let n_days = n_days.max(7).min(365);
    let model_str = model
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| "gemini-3.8-flash".to_string());

    // Resolve the roadmap ID from goal keywords
    let resolved_id = roadmap_id
        .filter(|id| !id.is_empty())
        .unwrap_or_else(|| resolve_roadmap_id(&goal));

    // Get app data dir for cache
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Check cache first
    let (topics, source_url, is_cached, cache_warning) =
        match load_cached_roadmap(&app_data_dir, &resolved_id) {
            Some((cached, is_stale)) => {
                if is_stale {
                    // Try to refresh; if failed, use stale with warning
                    match fetch_roadmap_topics(&resolved_id).await {
                        (fresh_topics, url) if !fresh_topics.is_empty() => {
                            let new_cache = CachedRoadmap {
                                id: resolved_id.clone(),
                                topics: fresh_topics.clone(),
                                fetched_at_unix: Utc::now().timestamp(),
                                source_url: url.clone(),
                            };
                            save_cached_roadmap(&app_data_dir, &new_cache);
                            (fresh_topics, url, false, None)
                        }
                        _ => (
                            cached.topics.clone(),
                            cached.source_url.clone(),
                            true,
                            Some("Using cached roadmap data (refresh failed — offline?)".to_string()),
                        ),
                    }
                } else {
                    (cached.topics.clone(), cached.source_url.clone(), true, None)
                }
            }
            None => {
                let (fresh_topics, url) = fetch_roadmap_topics(&resolved_id).await;
                let new_cache = CachedRoadmap {
                    id: resolved_id.clone(),
                    topics: fresh_topics.clone(),
                    fetched_at_unix: Utc::now().timestamp(),
                    source_url: url.clone(),
                };
                save_cached_roadmap(&app_data_dir, &new_cache);
                (fresh_topics, url, false, None)
            }
        };

    let total_topics = topics.len();

    // Try Gemini RAG call if API key provided, otherwise fall back to algorithmic chunking
    let days = if let Some(ref key) = api_key {
        if !key.is_empty() {
            match call_gemini_with_rag(
                &topics,
                &goal,
                n_days,
                &resolved_id,
                &source_url,
                key,
                &model_str,
            )
            .await
            {
                Ok(mut gemini_days) => {
                    // Fill in gaps with algorithmic days if Gemini returned fewer days
                    if gemini_days.len() < n_days as usize {
                        let algo_days = chunk_topics_into_days(&topics, n_days);
                        for algo_day in algo_days {
                            if !gemini_days.iter().any(|d| d.day == algo_day.day) {
                                gemini_days.push(algo_day);
                            }
                        }
                        gemini_days.sort_by_key(|d| d.day);
                    }
                    gemini_days
                }
                Err(_) => chunk_topics_into_days(&topics, n_days),
            }
        } else {
            chunk_topics_into_days(&topics, n_days)
        }
    } else {
        chunk_topics_into_days(&topics, n_days)
    };

    Ok(RoadmapPlanResult {
        roadmap_source: source_url,
        roadmap_id: resolved_id,
        total_topics,
        n_days,
        days,
        fetched_at: Utc::now().to_rfc3339(),
        is_cached,
        cache_warning,
    })
}
