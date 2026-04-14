use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const MAX_DEPTH: u16 = 20;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub fn read_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }
    read_dir_recursive(path, 0)
}

fn read_dir_recursive(dir: &Path, depth: u16) -> Result<Vec<FileEntry>, String> {
    if depth > MAX_DEPTH {
        return Ok(Vec::new());
    }

    // Skip symlinks to avoid cycles
    if dir
        .symlink_metadata()
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
    {
        return Ok(Vec::new());
    }

    let mut entries: Vec<FileEntry> = Vec::new();
    let read_dir = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            let children = read_dir_recursive(&path, depth + 1)?;
            let has_md = children
                .iter()
                .any(|c| c.is_directory || c.name.ends_with(".md"));
            if has_md {
                entries.push(FileEntry {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_directory: true,
                    children: Some(children),
                });
            }
        } else if name.ends_with(".md") {
            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_directory: false,
                children: None,
            });
        }
    }

    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

fn validate_path_within(path: &Path, root: &Path) -> Result<(), String> {
    let canonical_root = fs::canonicalize(root).map_err(|e| e.to_string())?;
    let canonical_path = fs::canonicalize(path).map_err(|e| e.to_string())?;
    if !canonical_path.starts_with(&canonical_root) {
        return Err("Access denied: path outside workspace".to_string());
    }
    Ok(())
}

fn sanitize_filename(name: &str) -> Result<String, String> {
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err("Invalid file name".to_string());
    }
    if name.is_empty() {
        return Err("File name cannot be empty".to_string());
    }
    Ok(name.to_string())
}

#[tauri::command]
pub fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read {}: {}", file_path, e))
}

#[tauri::command]
pub fn write_file(file_path: String, content: String) -> Result<(), String> {
    fs::write(&file_path, &content).map_err(|e| format!("Failed to write {}: {}", file_path, e))
}

#[tauri::command]
pub fn create_md_file(dir_path: String, file_name: String) -> Result<String, String> {
    let sanitized = sanitize_filename(&file_name)?;
    let name = if sanitized.ends_with(".md") {
        sanitized
    } else {
        format!("{}.md", sanitized)
    };
    let full_path = PathBuf::from(&dir_path).join(&name);

    // Verify the resulting path stays within dir_path
    let canonical_dir = fs::canonicalize(&dir_path).map_err(|e| e.to_string())?;
    let parent = full_path
        .parent()
        .ok_or_else(|| "Invalid path".to_string())?;
    let canonical_parent = fs::canonicalize(parent).map_err(|e| e.to_string())?;
    if !canonical_parent.starts_with(&canonical_dir) {
        return Err("Path traversal detected".to_string());
    }

    if full_path.exists() {
        return Err(format!("File already exists: {}", full_path.display()));
    }
    fs::write(&full_path, "").map_err(|e| e.to_string())?;
    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    let settings_path = config_dir.join("settings.json");
    if settings_path.exists() {
        fs::read_to_string(&settings_path).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub fn save_settings(app_handle: tauri::AppHandle, settings_json: String) -> Result<(), String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    let settings_path = config_dir.join("settings.json");
    fs::write(&settings_path, &settings_json).map_err(|e| e.to_string())
}
