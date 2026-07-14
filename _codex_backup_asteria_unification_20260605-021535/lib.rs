use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn get_runtime_info() -> String {
    "tauri".to_string()
}

#[tauri::command]
fn show_item_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        let target_dir = PathBuf::from(&path).parent().unwrap_or(std::path::Path::new("")).to_path_buf();
        std::process::Command::new("xdg-open")
            .arg(&target_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn write_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file_dialog() -> Result<Option<String>, String> {
    Ok(None)
}

#[tauri::command]
fn check_python_sidecar() -> Result<String, String> {
    let output = std::process::Command::new("python")
        .arg("sidecars/python-ai/asteria_sidecar.py")
        .arg("health")
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_python_sidecar_capabilities() -> Result<String, String> {
    let output = std::process::Command::new("python")
        .arg("sidecars/python-ai/asteria_sidecar.py")
        .arg("capabilities")
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn run_python_remove_bg(input_path: String, output_path: String) -> Result<String, String> {
    let output = std::process::Command::new("python")
        .arg("sidecars/python-ai/asteria_sidecar.py")
        .arg("remove-bg")
        .arg("--input")
        .arg(&input_path)
        .arg("--output")
        .arg(&output_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
        get_runtime_info,
        show_item_in_folder,
        open_path,
        write_file,
        save_file_dialog,
        check_python_sidecar,
        get_python_sidecar_capabilities,
        run_python_remove_bg
    ])
    .setup(|app| {
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
