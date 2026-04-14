mod commands;

use tauri::menu::{MenuBuilder, SubmenuBuilder};
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
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "파일")
                .text("open-folder", "폴더 열기")
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

            let view_menu = SubmenuBuilder::new(app, "보기")
                .item(&theme_menu)
                .item(&font_menu)
                .separator()
                .text("toggle-sidebar", "사이드바 토글")
                .text("toggle-toc", "목차 토글")
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&view_menu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(window) = app.get_webview_window("main") {
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
