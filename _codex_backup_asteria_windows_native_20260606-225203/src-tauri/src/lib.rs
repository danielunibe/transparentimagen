use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri_plugin_sql::{Migration, MigrationKind};

const SIDECAR_SCRIPT: &str = "sidecars/python-ai/asteria_sidecar.py";
const MODELS_DIR: &str = "sidecars/python-ai/models";
const ASTERIA_SQLITE_URL: &str = "sqlite:asteria.db";

fn repo_root_path() -> Result<PathBuf, String> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Unable to resolve repository root from CARGO_MANIFEST_DIR.".to_string())
}

fn sidecar_script_path() -> Result<PathBuf, String> {
    Ok(repo_root_path()?.join(SIDECAR_SCRIPT))
}

fn validate_image_io(input_path: &str, output_path: &str) -> Result<(PathBuf, PathBuf), String> {
    let input = PathBuf::from(input_path);
    let output = PathBuf::from(output_path);

    if input_path.trim().is_empty() || output_path.trim().is_empty() {
        return Err("Input and output paths are required.".to_string());
    }
    if !input.is_file() {
        return Err(format!("Input image does not exist: {}", input.display()));
    }
    if input == output {
        return Err("Output path must be different from input path.".to_string());
    }
    let extension = input
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"].contains(&extension.as_str()) {
        return Err(format!("Unsupported input image extension: .{}", extension));
    }
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    Ok((input, output))
}

fn run_sidecar(args: &[String]) -> Result<String, String> {
    let script_path = sidecar_script_path()?;
    if !script_path.is_file() {
        return Err(format!(
            "Python sidecar script not found: {}",
            script_path.display()
        ));
    }

    let output = Command::new("python")
        .arg(script_path)
        .args(args)
        .output()
        .map_err(|error| error.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        Ok(stdout)
    } else if !stdout.is_empty() {
        Err(stdout)
    } else if !stderr.is_empty() {
        Err(stderr)
    } else {
        Err("Python sidecar failed without output.".to_string())
    }
}

fn models_dir_path() -> Result<PathBuf, String> {
    let path = repo_root_path()?.join(MODELS_DIR);
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path)
}

fn run_sidecar_image_command(
    command: &str,
    input_path: String,
    output_path: String,
    extra_args: Vec<String>,
) -> Result<String, String> {
    let (input, output) = validate_image_io(&input_path, &output_path)?;
    let mut args = vec![
        command.to_string(),
        "--input".to_string(),
        input.to_string_lossy().to_string(),
        "--output".to_string(),
        output.to_string_lossy().to_string(),
    ];
    args.extend(extra_args);
    run_sidecar(&args)
}

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
        let target_dir = PathBuf::from(&path)
            .parent()
            .unwrap_or(std::path::Path::new(""))
            .to_path_buf();
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
    run_sidecar(&["health".to_string()])
}

#[tauri::command]
fn get_python_sidecar_capabilities() -> Result<String, String> {
    run_sidecar(&["capabilities".to_string()])
}

#[tauri::command]
fn list_python_models() -> Result<String, String> {
    run_sidecar(&["models".to_string()])
}

#[tauri::command]
fn validate_python_models() -> Result<String, String> {
    run_sidecar(&["validate-models".to_string()])
}

#[tauri::command]
fn smoke_test_python_upscale_model(model_id: String) -> Result<String, String> {
    run_sidecar(&[
        "smoke-test-upscale".to_string(),
        "--model".to_string(),
        model_id,
    ])
}

#[tauri::command]
fn open_models_folder() -> Result<(), String> {
    let path = models_dir_path()?;
    open_path(path.to_string_lossy().to_string())
}

#[tauri::command]
fn run_python_remove_bg(input_path: String, output_path: String) -> Result<String, String> {
    run_sidecar_image_command("remove-bg", input_path, output_path, vec![])
}

#[tauri::command]
fn run_python_enhance(input_path: String, output_path: String) -> Result<String, String> {
    run_sidecar_image_command("enhance", input_path, output_path, vec![])
}

#[tauri::command]
fn run_python_resize(
    input_path: String,
    output_path: String,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<String, String> {
    let mut extra_args = vec![];
    if let Some(value) = width {
        extra_args.push("--width".to_string());
        extra_args.push(value.to_string());
    }
    if let Some(value) = height {
        extra_args.push("--height".to_string());
        extra_args.push(value.to_string());
    }
    run_sidecar_image_command("resize", input_path, output_path, extra_args)
}

#[tauri::command]
fn run_python_convert(
    input_path: String,
    output_path: String,
    format: String,
) -> Result<String, String> {
    let normalized = format.to_ascii_lowercase();
    if !["png", "jpeg", "jpg", "webp"].contains(&normalized.as_str()) {
        return Err(format!("Unsupported output format: {}", format));
    }
    run_sidecar_image_command(
        "convert",
        input_path,
        output_path,
        vec!["--format".to_string(), normalized],
    )
}

#[tauri::command]
fn run_python_upscale(
    input_path: String,
    output_path: String,
    scale: u32,
    engine: String,
    quality: Option<String>,
    tile_size: Option<u32>,
    tile_pad: Option<u32>,
    model: Option<String>,
) -> Result<String, String> {
    if ![2, 3, 4].contains(&scale) {
        return Err("Upscale scale must be 2, 3, or 4.".to_string());
    }
    let normalized = engine.to_ascii_lowercase();
    if !["auto", "pillow", "real-esrgan"].contains(&normalized.as_str()) {
        return Err(format!("Unsupported upscale engine: {}", engine));
    }
    let normalized_quality = quality
        .unwrap_or_else(|| "balanced".to_string())
        .to_ascii_lowercase();
    if !["fast", "balanced", "quality", "max"].contains(&normalized_quality.as_str()) {
        return Err(format!(
            "Unsupported upscale quality preset: {}",
            normalized_quality
        ));
    }
    if let Some(value) = tile_size {
        if ![64, 128, 192, 256].contains(&value) {
            return Err("Tile size must be 64, 128, 192, or 256.".to_string());
        }
    }
    if let Some(value) = tile_pad {
        if ![4, 8, 12, 16].contains(&value) {
            return Err("Tile pad must be 4, 8, 12, or 16.".to_string());
        }
    }
    if let Some(ref model_id) = model {
        let allowlisted = [
            "RealESRGAN_x2plus.onnx",
            "RealESRGAN_x4plus.onnx",
            "RealESRGAN_x4plus_anime_6B.onnx",
        ];
        if !allowlisted.contains(&model_id.as_str()) {
            return Err(format!("Unsupported Real-ESRGAN model id: {}", model_id));
        }
    }

    let mut extra_args = vec![
        "--scale".to_string(),
        scale.to_string(),
        "--engine".to_string(),
        normalized,
        "--quality".to_string(),
        normalized_quality,
    ];
    if let Some(value) = tile_size {
        extra_args.push("--tile-size".to_string());
        extra_args.push(value.to_string());
    }
    if let Some(value) = tile_pad {
        extra_args.push("--tile-pad".to_string());
        extra_args.push(value.to_string());
    }
    if let Some(model_id) = model {
        extra_args.push("--model".to_string());
        extra_args.push(model_id);
    }
    run_sidecar_image_command("upscale", input_path, output_path, extra_args)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_schema_version_table",
            sql: "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_kv_store_table",
            sql: "CREATE TABLE IF NOT EXISTS kv_store (
                namespace TEXT NOT NULL,
                key TEXT NOT NULL,
                value_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (namespace, key)
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_thumbnail_cache_table",
            sql: "CREATE TABLE IF NOT EXISTS thumbnail_cache (
                cache_key TEXT PRIMARY KEY,
                asset_id TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                size INTEGER NOT NULL,
                blob BLOB NOT NULL,
                updated_at TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "record_initial_schema_version",
            sql: "INSERT OR IGNORE INTO schema_version (version, applied_at)
                VALUES (1, datetime('now'));",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(ASTERIA_SQLITE_URL, migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_runtime_info,
            show_item_in_folder,
            open_path,
            write_file,
            save_file_dialog,
            check_python_sidecar,
            get_python_sidecar_capabilities,
            list_python_models,
            validate_python_models,
            smoke_test_python_upscale_model,
            open_models_folder,
            run_python_remove_bg,
            run_python_enhance,
            run_python_resize,
            run_python_convert,
            run_python_upscale
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
