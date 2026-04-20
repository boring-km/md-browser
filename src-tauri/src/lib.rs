mod commands;
#[cfg(target_os = "macos")]
mod macos_open_files;

use std::sync::Mutex;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager, RunEvent};

pub struct PendingFiles(pub Mutex<Vec<String>>);

fn filter_md_args<I, S>(args: I) -> Vec<String>
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    args.into_iter()
        .map(Into::into)
        .filter(|s| s.ends_with(".md") || s.ends_with(".markdown"))
        .map(|s| {
            let p = std::path::Path::new(&s);
            if p.is_absolute() {
                s
            } else {
                std::env::current_dir()
                    .map(|d| d.join(p).to_string_lossy().to_string())
                    .unwrap_or(s)
            }
        })
        .collect()
}

#[tauri::command]
fn take_pending_files(state: tauri::State<'_, PendingFiles>) -> Vec<String> {
    let mut guard = state.0.lock().unwrap();
    std::mem::take(&mut *guard)
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    macos_open_files::install_handler();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // On second instance, open files in a new window
            let files = filter_md_args(args.into_iter().skip(1));
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
            // Collect CLI file arguments and any AppleEvents received before setup.
            let mut files = filter_md_args(std::env::args().skip(1));
            #[cfg(target_os = "macos")]
            {
                let queued: Vec<String> = macos_open_files::take_queued_paths()
                    .into_iter()
                    .filter(|s| s.ends_with(".md") || s.ends_with(".markdown"))
                    .collect();
                files.extend(queued);
            }
            app.manage(PendingFiles(Mutex::new(files)));

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
            take_pending_files,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        // Drain any AppleEvent-queued paths (macOS) and route them to the main window.
        #[cfg(target_os = "macos")]
        {
            let queued: Vec<String> = macos_open_files::take_queued_paths()
                .into_iter()
                .filter(|s| s.ends_with(".md") || s.ends_with(".markdown"))
                .collect();
            if !queued.is_empty() {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.set_focus();
                    let _ = window.emit("open-files", &queued);
                } else if let Some(state) = app_handle.try_state::<PendingFiles>() {
                    state.0.lock().unwrap().extend(queued);
                }
            }
        }

        if let RunEvent::Opened { urls } = &event {
            let files: Vec<String> = urls
                .iter()
                .filter_map(|u| u.to_file_path().ok())
                .map(|p| p.to_string_lossy().to_string())
                .filter(|s| s.ends_with(".md") || s.ends_with(".markdown"))
                .collect();
            if files.is_empty() {
                return;
            }
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.emit("open-files", &files);
            } else {
                // Window not ready yet — stash for the frontend to pull on init.
                #[cfg(target_os = "macos")]
                macos_open_files::push_paths(files.clone());
                if let Some(state) = app_handle.try_state::<PendingFiles>() {
                    state.0.lock().unwrap().extend(files);
                }
            }
        }
    });
}
