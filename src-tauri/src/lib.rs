mod commands;

use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // On second instance, open files in a new window
            let files: Vec<&str> = args
                .iter()
                .skip(1)
                .map(|s| s.as_str())
                .filter(|s| s.ends_with(".md"))
                .collect();
            if !files.is_empty() {
                let init_data = serde_json::json!({
                    "type": "open-files",
                    "files": files,
                })
                .to_string();
                let _ = commands::window::open_new_window(app.clone(), Some(init_data));
            } else if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // Open files passed as CLI arguments on first launch
            let args: Vec<String> = std::env::args().skip(1).collect();
            let files: Vec<String> = args
                .into_iter()
                .filter(|s| s.ends_with(".md") || s.ends_with(".markdown"))
                .map(|s| {
                    // Resolve relative paths to absolute
                    let p = std::path::Path::new(&s);
                    if p.is_absolute() {
                        s
                    } else {
                        std::env::current_dir()
                            .map(|d| d.join(p).to_string_lossy().to_string())
                            .unwrap_or(s)
                    }
                })
                .collect();

            if !files.is_empty() {
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    // Wait for the window to be ready before emitting
                    std::thread::sleep(std::time::Duration::from_millis(600));
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("open-files", &files);
                    }
                });
            }

            let file_menu = SubmenuBuilder::new(app, "파일")
                .text("open-folder", "폴더 열기")
                .text("open-file", "파일 열기")
                .text("recent-folders", "최근 폴더...")
                .separator()
                .text("save-file", "저장")
                .text("new-window", "새 윈도우")
                .separator()
                .text("export-html", "HTML로 내보내기")
                .text("export-pdf", "PDF로 내보내기")
                .separator()
                .quit()
                .build()?;

            let theme_menu = SubmenuBuilder::new(app, "테마")
                .text("theme-system", "시스템 설정")
                .text("theme-light", "라이트")
                .text("theme-dark", "다크")
                .build()?;

            let font_menu = SubmenuBuilder::new(app, "폰트")
                .text("font-select", "폰트 선택...")
                .text("font-size-up", "크기 키우기")
                .text("font-size-down", "크기 줄이기")
                .text("font-size-reset", "크기 초기화")
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "편집")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "보기")
                .item(&theme_menu)
                .item(&font_menu)
                .separator()
                .text("toggle-sidebar", "사이드바 토글")
                .text("toggle-toc", "목차 토글")
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            // Send menu event to the focused window
            let windows = app.webview_windows();
            let target = windows
                .values()
                .find(|w| w.is_focused().unwrap_or(false))
                .or_else(|| windows.values().next());
            if let Some(window) = target {
                let _ = window.emit("menu-event", event.id().0.as_str());
            }
        })
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
            commands::open::open_with_default_app,
            commands::open::open_url_in_browser,
            commands::window::open_new_window,
            commands::git::get_git_diff_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
