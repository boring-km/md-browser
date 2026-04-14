mod commands;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let files: Vec<&str> = args
                    .iter()
                    .skip(1)
                    .map(|s| s.as_str())
                    .filter(|s| s.ends_with(".md"))
                    .collect();
                if !files.is_empty() {
                    let _ = window.emit("open-files", &files);
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_directory,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_md_file,
            commands::fs::load_settings,
            commands::fs::save_settings,
            commands::image::save_image_to_assets,
            commands::image::copy_image_to_assets,
            commands::font::list_system_fonts,
            commands::export::export_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
