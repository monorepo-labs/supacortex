use tauri::Manager;
use tauri::{LogicalPosition, LogicalSize, WebviewBuilder, WebviewUrl};

#[tauri::command]
async fn open_webview(
  app: tauri::AppHandle,
  url: String,
  label: String,
  x: f64,
  y: f64,
  width: f64,
  height: f64,
) -> Result<(), String> {
  // If this webview already exists, reposition it
  if let Some(existing) = app.get_webview(&label) {
    existing.set_position(LogicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    existing.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
    existing.set_focus().map_err(|e| e.to_string())?;
    return Ok(());
  }

  let external_url = url.parse().map_err(|e: url::ParseError| e.to_string())?;
  let webview_window = app.get_webview_window("main").ok_or("main window not found")?;
  let window = webview_window.as_ref().window();

  window.add_child(
    WebviewBuilder::new(&label, WebviewUrl::External(external_url)),
    LogicalPosition::new(x, y),
    LogicalSize::new(width, height),
  ).map_err(|e: tauri::Error| e.to_string())?;

  Ok(())
}

#[tauri::command]
async fn close_webview(app: tauri::AppHandle, label: String) -> Result<(), String> {
  if let Some(webview) = app.get_webview(&label) {
    webview.close().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
async fn resize_webview(
  app: tauri::AppHandle,
  label: String,
  x: f64,
  y: f64,
  width: f64,
  height: f64,
) -> Result<(), String> {
  if let Some(webview) = app.get_webview(&label) {
    webview.set_position(LogicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    webview.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![open_webview, close_webview, resize_webview])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();

      #[cfg(target_os = "macos")]
      window_vibrancy::apply_vibrancy(&window, window_vibrancy::NSVisualEffectMaterial::Sidebar, None, None)
        .expect("failed to apply vibrancy");

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
