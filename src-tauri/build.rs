use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

fn main() {
    let env_path = Path::new("../.env");
    println!("cargo:rerun-if-changed=../.env");

    if let Ok(file) = File::open(env_path) {
        let reader = BufReader::new(file);
        for line in reader.lines().flatten() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some((key, val)) = trimmed.split_once('=') {
                let key = key.trim();
                let val = val.trim().trim_matches('"').trim_matches('\'');
                println!("cargo:rustc-env={}={}", key, val);
            }
        }
    }

    tauri_build::build();
}
