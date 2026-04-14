use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

static WINDOW_COUNTER: AtomicU32 = AtomicU32::new(1);

#[tauri::command]
pub fn open_new_window(app: AppHandle, init_data: Option<String>) -> Result<String, String> {
    let count = WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    let label = format!("editor-{}", count);

    let url = match &init_data {
        Some(data) => {
            let encoded = urlencoding::encode(data);
            WebviewUrl::App(format!("index.html?init={}", encoded).into())
        }
        None => WebviewUrl::App("index.html".into()),
    };

    WebviewWindowBuilder::new(&app, &label, url)
        .title("md-browser")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(label)
}
