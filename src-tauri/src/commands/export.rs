use std::fs;

#[tauri::command]
pub fn export_html(
    file_path: String,
    html_content: String,
    css_content: String,
) -> Result<(), String> {
    let full_html = format!(
        r#"<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
{}
</style>
</head>
<body>
<article class="markdown-body">
{}
</article>
</body>
</html>"#,
        css_content, html_content
    );
    fs::write(&file_path, full_html).map_err(|e| format!("Failed to export HTML: {}", e))
}
