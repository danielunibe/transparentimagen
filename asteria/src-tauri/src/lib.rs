use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::UNIX_EPOCH;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const SIDECAR_SCRIPT: &str = "sidecars/python-ai/asteria_sidecar.py";
const MODELS_DIR: &str = "sidecars/python-ai/models";
const ASTERIA_SQLITE_URL: &str = "sqlite:asteria.db";
const MAX_NATIVE_MEDIA_BYTES: u64 = 512 * 1024 * 1024;
const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "webp", "bmp", "gif", "svg", "heic", "avif",
];
const VIDEO_EXTENSIONS: &[&str] = &["mp4", "mov", "webm", "mkv", "avi"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeFileEntry {
    name: String,
    path: String,
    size: u64,
    modified_at: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeFolderEntry {
    name: String,
    path: String,
    image_count: usize,
    video_count: usize,
    folder_count: usize,
    child_files: Vec<NativeFileEntry>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeScanPayload {
    normalized_path: String,
    folders: Vec<NativeFolderEntry>,
    files: Vec<NativeFileEntry>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeDirectoryStatus {
    normalized_path: String,
    exists: bool,
    readable: bool,
    error: Option<String>,
}

fn media_kind(path: &std::path::Path) -> Option<&'static str> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        Some("image")
    } else if VIDEO_EXTENSIONS.contains(&extension.as_str()) {
        Some("video")
    } else {
        None
    }
}

fn native_file_entry(path: PathBuf) -> Result<NativeFileEntry, String> {
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64);
    Ok(NativeFileEntry {
        name: path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        size: metadata.len(),
        modified_at,
    })
}

fn canonical_directory(path: &str) -> Result<PathBuf, String> {
    let directory = fs::canonicalize(path).map_err(|error| error.to_string())?;
    if !directory.is_dir() {
        return Err(format!("Path is not a directory: {}", directory.display()));
    }
    Ok(directory)
}

fn migrate_legacy_app_database(app: &tauri::AppHandle) -> Result<(), String> {
    let target_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let target_db = target_dir.join("asteria.db");
    if target_db.exists() {
        return Ok(());
    }
    let roaming = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| "APPDATA is unavailable.".to_string())?;
    let legacy_db = roaming.join("com.tauri.dev").join("asteria.db");
    if !legacy_db.is_file() {
        return Ok(());
    }
    fs::create_dir_all(&target_dir).map_err(|error| error.to_string())?;
    fs::copy(legacy_db, target_db).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn validate_native_directory(path: String) -> NativeDirectoryStatus {
    match canonical_directory(&path) {
        Ok(directory) => {
            let readable = fs::read_dir(&directory).is_ok();
            NativeDirectoryStatus {
                normalized_path: directory.to_string_lossy().to_string(),
                exists: true,
                readable,
                error: if readable {
                    None
                } else {
                    Some("Directory is not readable.".to_string())
                },
            }
        }
        Err(error) => NativeDirectoryStatus {
            normalized_path: path,
            exists: false,
            readable: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn scan_native_directory(path: String) -> Result<NativeScanPayload, String> {
    let directory = canonical_directory(&path)?;
    let mut folders = Vec::new();
    let mut files = Vec::new();

    for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let entry_path = entry.path();
        if entry_path.is_dir() {
            let mut child_files = Vec::new();
            let mut image_count = 0;
            let mut video_count = 0;
            let mut folder_count = 0;
            if let Ok(children) = fs::read_dir(&entry_path) {
                for child in children.flatten() {
                    let child_path = child.path();
                    if child_path.is_dir() {
                        folder_count += 1;
                    } else if let Some(kind) = media_kind(&child_path) {
                        if kind == "image" {
                            image_count += 1;
                        } else {
                            video_count += 1;
                        }
                        if let Ok(file_entry) = native_file_entry(child_path) {
                            child_files.push(file_entry);
                        }
                    }
                }
            }
            folders.push(NativeFolderEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry_path.to_string_lossy().to_string(),
                image_count,
                video_count,
                folder_count,
                child_files,
            });
        } else if media_kind(&entry_path).is_some() {
            files.push(native_file_entry(entry_path)?);
        }
    }

    folders.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    files.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(NativeScanPayload {
        normalized_path: directory.to_string_lossy().to_string(),
        folders,
        files,
    })
}

#[tauri::command]
fn read_native_media_file(path: String) -> Result<Vec<u8>, String> {
    let file_path = fs::canonicalize(&path).map_err(|error| error.to_string())?;
    if !file_path.is_file() || media_kind(&file_path).is_none() {
        return Err("Only supported image and video files can be read.".to_string());
    }
    let metadata = fs::metadata(&file_path).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_NATIVE_MEDIA_BYTES {
        return Err("Media file exceeds the 512 MB native read limit.".to_string());
    }
    fs::read(file_path).map_err(|error| error.to_string())
}

fn repo_root_path() -> Result<PathBuf, String> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "Unable to resolve repository root from CARGO_MANIFEST_DIR.".to_string())
}

fn sidecar_script_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        return Ok(repo_root_path()?.join(SIDECAR_SCRIPT));
    }
    app.path()
        .resource_dir()
        .map(|path| path.join(SIDECAR_SCRIPT))
        .map_err(|error| error.to_string())
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

fn run_sidecar(app: &tauri::AppHandle, args: &[String]) -> Result<String, String> {
    let script_path = sidecar_script_path(app)?;
    if !script_path.is_file() {
        return Err(format!(
            "Python sidecar script not found: {}",
            script_path.display()
        ));
    }

    let models_dir = models_dir_path(app)?;
    let output = Command::new("python")
        .env("ASTERIA_MODELS_DIR", &models_dir)
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

fn models_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = if cfg!(debug_assertions) {
        repo_root_path()?.join(MODELS_DIR)
    } else {
        app.path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("models")
    };
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path)
}

fn run_sidecar_image_command(
    app: &tauri::AppHandle,
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
    run_sidecar(app, &args)
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
fn check_python_sidecar(app: tauri::AppHandle) -> Result<String, String> {
    run_sidecar(&app, &["health".to_string()])
}

#[tauri::command]
fn get_python_sidecar_capabilities(app: tauri::AppHandle) -> Result<String, String> {
    run_sidecar(&app, &["capabilities".to_string()])
}

#[tauri::command]
fn list_python_models(app: tauri::AppHandle) -> Result<String, String> {
    run_sidecar(&app, &["models".to_string()])
}

#[tauri::command]
fn validate_python_models(app: tauri::AppHandle) -> Result<String, String> {
    run_sidecar(&app, &["validate-models".to_string()])
}

#[tauri::command]
fn smoke_test_python_upscale_model(
    app: tauri::AppHandle,
    model_id: String,
) -> Result<String, String> {
    run_sidecar(
        &app,
        &[
            "smoke-test-upscale".to_string(),
            "--model".to_string(),
            model_id,
        ],
    )
}

#[tauri::command]
fn open_models_folder(app: tauri::AppHandle) -> Result<(), String> {
    let path = models_dir_path(&app)?;
    open_path(path.to_string_lossy().to_string())
}

#[tauri::command]
fn run_python_remove_bg(
    app: tauri::AppHandle,
    input_path: String,
    output_path: String,
) -> Result<String, String> {
    run_sidecar_image_command(&app, "remove-bg", input_path, output_path, vec![])
}

#[tauri::command]
fn run_python_enhance(
    app: tauri::AppHandle,
    input_path: String,
    output_path: String,
) -> Result<String, String> {
    run_sidecar_image_command(&app, "enhance", input_path, output_path, vec![])
}

#[tauri::command]
fn run_python_resize(
    app: tauri::AppHandle,
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
    run_sidecar_image_command(&app, "resize", input_path, output_path, extra_args)
}

#[tauri::command]
fn run_python_convert(
    app: tauri::AppHandle,
    input_path: String,
    output_path: String,
    format: String,
) -> Result<String, String> {
    let normalized = format.to_ascii_lowercase();
    if !["png", "jpeg", "jpg", "webp"].contains(&normalized.as_str()) {
        return Err(format!("Unsupported output format: {}", format));
    }
    run_sidecar_image_command(
        &app,
        "convert",
        input_path,
        output_path,
        vec!["--format".to_string(), normalized],
    )
}

#[tauri::command]
fn run_python_upscale(
    app: tauri::AppHandle,
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
    run_sidecar_image_command(&app, "upscale", input_path, output_path, extra_args)
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
        Migration {
            version: 5,
            description: "create_folder_sources_table",
            sql: "CREATE TABLE IF NOT EXISTS folder_sources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                native_path TEXT NOT NULL UNIQUE,
                metadata_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_migration_log_table",
            sql: "CREATE TABLE IF NOT EXISTS migration_log (
                migration_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                imported_count INTEGER NOT NULL DEFAULT 0,
                error TEXT
            );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
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
            run_python_upscale,
            validate_native_directory,
            scan_native_directory,
            read_native_media_file
        ])
        .setup(|app| {
            if let Err(error) = migrate_legacy_app_database(app.handle()) {
                log::warn!("Legacy Asteria database migration skipped: {}", error);
            }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_directory(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "asteria-native-test-{}-{}",
            label,
            std::process::id()
        ))
    }

    #[test]
    fn native_directory_scan_and_media_read_are_bounded() {
        let root = test_directory("scan");
        let child = root.join("nested");
        fs::create_dir_all(&child).expect("create native test directory");
        fs::write(root.join("sample.png"), [137, 80, 78, 71]).expect("write image fixture");
        fs::write(root.join("ignored.txt"), b"ignored").expect("write ignored fixture");
        fs::write(child.join("nested.jpg"), [255, 216, 255]).expect("write nested fixture");

        let status = validate_native_directory(root.to_string_lossy().to_string());
        assert!(status.exists);
        assert!(status.readable);

        let scan = scan_native_directory(root.to_string_lossy().to_string())
            .expect("scan native directory");
        assert_eq!(scan.files.len(), 1);
        assert_eq!(scan.files[0].name, "sample.png");
        assert_eq!(scan.folders.len(), 1);
        assert_eq!(scan.folders[0].image_count, 1);

        let bytes = read_native_media_file(scan.files[0].path.clone()).expect("read image");
        assert_eq!(bytes, vec![137, 80, 78, 71]);
        assert!(
            read_native_media_file(root.join("ignored.txt").to_string_lossy().to_string()).is_err()
        );

        fs::remove_dir_all(&root).expect("remove native test directory");
    }

    #[test]
    fn missing_native_directory_is_reported_without_panicking() {
        let root = test_directory("missing");
        if root.exists() {
            fs::remove_dir_all(&root).expect("remove stale test directory");
        }
        let status = validate_native_directory(root.to_string_lossy().to_string());
        assert!(!status.exists);
        assert!(!status.readable);
        assert!(status.error.is_some());
    }
}
