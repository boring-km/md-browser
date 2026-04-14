use serde::Serialize;
use std::path::Path;
use std::process::Command;

#[derive(Serialize)]
pub struct DiffStats {
    pub added: u32,
    pub removed: u32,
}

#[tauri::command]
pub fn get_git_diff_stats(file_path: String) -> Option<DiffStats> {
    let path = Path::new(&file_path);
    let dir = path.parent()?;

    let output = Command::new("git")
        .args(["diff", "--numstat", "HEAD", "--", &file_path])
        .current_dir(dir)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().next()?;
    let parts: Vec<&str> = line.split('\t').collect();
    if parts.len() < 2 {
        return None;
    }

    let added = parts[0].parse::<u32>().unwrap_or(0);
    let removed = parts[1].parse::<u32>().unwrap_or(0);

    if added == 0 && removed == 0 {
        return None;
    }

    Some(DiffStats { added, removed })
}
