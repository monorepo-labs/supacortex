use tauri::Manager;
use tauri::{LogicalPosition, LogicalSize, WebviewBuilder, WebviewUrl};
use tauri::Emitter;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg(not(debug_assertions))]
use tauri_plugin_updater::UpdaterExt;

/// Global abort handle for the SSE listener
static SSE_ABORT: std::sync::OnceLock<Arc<Mutex<Option<tokio::sync::watch::Sender<bool>>>>> = std::sync::OnceLock::new();

fn sse_abort() -> &'static Arc<Mutex<Option<tokio::sync::watch::Sender<bool>>>> {
    SSE_ABORT.get_or_init(|| Arc::new(Mutex::new(None)))
}

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

/// Proxy fetch: makes HTTP requests from Rust to bypass mixed-content blocking.
/// Returns JSON with status code and body so the frontend can construct a proper Response.
#[tauri::command]
async fn proxy_fetch(
  url: String,
  method: String,
  body: Option<String>,
  headers: Option<std::collections::HashMap<String, String>>,
) -> Result<String, String> {
  let client = reqwest::Client::new();
  let mut req = match method.to_uppercase().as_str() {
    "POST" => client.post(&url),
    "PUT" => client.put(&url),
    "DELETE" => client.delete(&url),
    "PATCH" => client.patch(&url),
    _ => client.get(&url),
  };

  if let Some(hdrs) = headers {
    for (k, v) in hdrs {
      req = req.header(&k, &v);
    }
  }

  if let Some(ref b) = body {
    req = req.body(b.clone());
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status().as_u16();
  let resp_body = resp.text().await.map_err(|e| e.to_string())?;

  // Return JSON envelope so frontend can reconstruct a proper Response with correct status
  let envelope = serde_json::json!({
    "status": status,
    "body": resp_body,
  });
  Ok(envelope.to_string())
}

/// Start SSE listener: connects to the opencode /event endpoint from Rust,
/// parses SSE frames, and emits each event to the frontend via Tauri events.
#[tauri::command]
async fn start_sse(app: tauri::AppHandle, url: String) -> Result<(), String> {
  // Stop any existing SSE listener
  {
    let mut guard = sse_abort().lock().await;
    if let Some(tx) = guard.take() {
      let _ = tx.send(true);
    }
  }

  let (tx, mut rx) = tokio::sync::watch::channel(false);
  {
    let mut guard = sse_abort().lock().await;
    *guard = Some(tx);
  }

  let app_handle = app.clone();

  tokio::spawn(async move {
    loop {
      // Check if we should stop
      if *rx.borrow() {
        break;
      }

      match reqwest::Client::new()
        .get(&url)
        .header("accept", "text/event-stream")
        .header("cache-control", "no-cache")
        .send()
        .await
      {
        Ok(resp) => {
          if !resp.status().is_success() {
            let _ = app_handle.emit("opencode-sse-error", format!("SSE HTTP {}", resp.status()));
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            continue;
          }

          use futures_util::StreamExt;
          let mut stream = resp.bytes_stream();
          let mut buffer = String::new();


          loop {
            tokio::select! {
              _ = rx.changed() => {
                if *rx.borrow() { break; }
              }
              chunk = stream.next() => {
                match chunk {
                  Some(Ok(bytes)) => {
                    let chunk_str = String::from_utf8_lossy(&bytes);
                    buffer.push_str(&chunk_str);

                    // Parse SSE frames (separated by double newlines)
                    while let Some(pos) = buffer.find("\n\n") {
                      let frame = buffer[..pos].to_string();
                      buffer = buffer[pos + 2..].to_string();

                      let mut data_lines = Vec::new();
                      let mut event_name = None;

                      for line in frame.lines() {
                        if let Some(d) = line.strip_prefix("data:") {
                          data_lines.push(d.trim_start().to_string());
                        } else if let Some(e) = line.strip_prefix("event:") {
                          event_name = Some(e.trim_start().to_string());
                        }
                      }

                      if !data_lines.is_empty() {
                        let data = data_lines.join("\n");
                        // Emit the raw data string directly — the data IS the JSON event object
                        let _ = app_handle.emit("opencode-sse-event", &data);
                      }
                    }
                  }
                  Some(Err(e)) => {
                    let _ = app_handle.emit("opencode-sse-error", e.to_string());
                    break;
                  }
                  None => {
                    // Stream ended
                    break;
                  }
                }
              }
            }
          }
        }
        Err(e) => {
          let _ = app_handle.emit("opencode-sse-error", e.to_string());
        }
      }

      // Check abort before reconnecting
      if *rx.borrow() {
        break;
      }

      // Reconnect after delay
      tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
  });

  Ok(())
}

/// Stop the SSE listener
#[tauri::command]
async fn stop_sse() -> Result<(), String> {
  let mut guard = sse_abort().lock().await;
  if let Some(tx) = guard.take() {
    let _ = tx.send(true);
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
      open_webview, close_webview, resize_webview,
      proxy_fetch, start_sse, stop_sse
    ])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();

      #[cfg(target_os = "macos")]
      window_vibrancy::apply_vibrancy(&window, window_vibrancy::NSVisualEffectMaterial::Sidebar, None, None)
        .expect("failed to apply vibrancy");

      // Auto-update check (release builds only)
      #[cfg(not(debug_assertions))]
      {
        let handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
          // Wait for frontend to load and register event listeners
          tokio::time::sleep(std::time::Duration::from_secs(5)).await;

          match handle.updater() {
            Ok(updater) => {
              match updater.check().await {
                Ok(Some(update)) => {
                  let _ = handle.emit("update-available", serde_json::json!({
                    "version": update.version,
                    "body": update.body
                  }));
                  // Download in background, then notify frontend it's ready
                  match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(()) => {
                      let _ = handle.emit("update-downloaded", ());
                    }
                    Err(e) => {
                      log::warn!("Update download failed: {}", e);
                    }
                  }
                }
                Ok(None) => {} // No update available
                Err(e) => {
                  log::warn!("Update check failed: {}", e);
                }
              }
            }
            Err(e) => {
              log::warn!("Updater init failed: {}", e);
            }
          }
        });
      }

      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
          } else {
            log::LevelFilter::Warn
          })
          .build(),
      )?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
