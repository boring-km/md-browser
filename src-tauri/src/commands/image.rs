use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn sanitize_name(name: &str) -> String {
    name.replace(['/', '\\'], "_").replace("..", "_")
}

#[tauri::command]
pub fn save_image_to_assets(
    doc_dir: String,
    image_data: Vec<u8>,
    original_name: Option<String>,
) -> Result<String, String> {
    let assets_dir = PathBuf::from(&doc_dir).join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;
    }

    let ts = timestamp();
    let source_label = sanitize_name(&original_name.unwrap_or_else(|| "clipboard".to_string()));
    let file_name = format!("{}-{}.png", ts, source_label);
    let dest = assets_dir.join(&file_name);

    // Verify dest stays within assets_dir
    let canonical_assets = fs::canonicalize(&assets_dir).map_err(|e| e.to_string())?;
    if let Some(parent) = dest.parent() {
        if fs::canonicalize(parent).map_or(true, |p| !p.starts_with(&canonical_assets)) {
            return Err("Invalid image path".to_string());
        }
    }

    fs::write(&dest, &image_data).map_err(|e| e.to_string())?;

    Ok(format!("assets/{}", file_name))
}

#[tauri::command]
pub fn copy_image_to_assets(doc_dir: String, source_path: String) -> Result<String, String> {
    let assets_dir = PathBuf::from(&doc_dir).join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;
    }

    let source = PathBuf::from(&source_path);
    let original_name = source
        .file_name()
        .map(|n| sanitize_name(&n.to_string_lossy()))
        .unwrap_or_else(|| "image.png".to_string());

    let ts = timestamp();
    let file_name = format!("{}-{}", ts, original_name);
    let dest = assets_dir.join(&file_name);

    fs::copy(&source, &dest).map_err(|e| e.to_string())?;

    Ok(format!("assets/{}", file_name))
}
