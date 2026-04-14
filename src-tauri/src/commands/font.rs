use font_kit::source::SystemSource;
use std::collections::BTreeSet;

#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<String>, String> {
    let source = SystemSource::new();
    let fonts = source.all_families().map_err(|e| e.to_string())?;

    let unique: BTreeSet<String> = fonts
        .into_iter()
        .filter(|name| !name.starts_with('.'))
        .collect();

    Ok(unique.into_iter().collect())
}
