use desktop_gate::{Snapshot, Supervisor};
use serde::Deserialize;
use serde_json::json;
use std::{sync::Mutex, time::Duration};
use tauri::{Manager, State};

struct Gate {
    engine: Supervisor,
    last_status: Mutex<String>,
}
#[tauri::command]
fn engine_status(gate: State<'_, Gate>) -> Snapshot {
    let snapshot = gate.engine.snapshot();
    let key = format!(
        "{}:{}:{:?}",
        snapshot.phase, snapshot.generation, snapshot.last_probe
    );
    let mut last = gate.last_status.lock().unwrap();
    if *last != key {
        println!("GATE {}", json!({"kind":"engine","state":snapshot}));
        *last = key;
    }
    snapshot
}
#[tauri::command]
fn engine_retry(gate: State<'_, Gate>) -> Result<(), String> {
    gate.engine.retry()
}
#[tauri::command]
fn engine_probe(gate: State<'_, Gate>) -> Result<u64, String> {
    gate.engine.probe()
}
#[tauri::command]
fn gate_close(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("window-unavailable")?
        .close()
        .map_err(|_| "close-failed".into())
}
#[derive(Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct RenderReport {
    surface: String,
    theme: String,
    webgl2: bool,
    frames: u64,
    width: u32,
    height: u32,
    nonzero_pixels: u32,
    distinct_colors: u32,
    selected_value: Option<u32>,
    context_lost: bool,
    features: u32,
}
#[tauri::command]
fn renderer_report(report: RenderReport) -> Result<(), String> {
    if !["flat", "globe"].contains(&report.surface.as_str())
        || !["day", "dark"].contains(&report.theme.as_str())
        || report.width > 16384
        || report.height > 16384
        || report.features > 2000
        || report
            .selected_value
            .is_some_and(|v| !(1..=2000).contains(&v))
    {
        return Err("invalid-renderer-report".into());
    }
    println!("GATE {}", json!({"kind":"renderer","report":report}));
    Ok(())
}
fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let executable = app.path().resource_dir()?.join("engine/geogematria-engine");
            let args = std::env::var("GEOGEMATRIA_GATE_STARTUP_DELAY")
                .ok()
                .and_then(|s| s.parse::<u32>().ok())
                .filter(|v| *v <= 30)
                .map(|delay| vec!["--gate-startup-delay".into(), delay.to_string()])
                .unwrap_or_default();
            let engine = Supervisor::new(executable, args, Duration::from_secs(12));
            app.manage(Gate {
                engine: engine.clone(),
                last_status: Mutex::new(String::new()),
            });
            std::thread::spawn(move || {
                let _ = engine.retry();
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            engine_status,
            engine_retry,
            engine_probe,
            gate_close,
            renderer_report
        ])
        .on_window_event(|window, event| {
            if matches!(
                event,
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed
            ) {
                let gate = window.state::<Gate>();
                gate.engine.close();
                println!(
                    "GATE {}",
                    json!({"kind":"close","state":gate.engine.snapshot()})
                );
            }
        })
        .build(tauri::generate_context!())
        .expect("Tauri gate initialization failed");
    app.run(|handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            handle.state::<Gate>().engine.close();
        }
    });
}
