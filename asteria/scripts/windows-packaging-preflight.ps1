param(
    [switch]$BuildInstaller
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tauriConfigPath = Join-Path $projectRoot "src-tauri\tauri.conf.json"
$sidecarPath = Join-Path $projectRoot "sidecars\python-ai\asteria_sidecar.py"
$requiredModules = @(
    "image_ops\__init__.py",
    "image_ops\background_removal.py",
    "image_ops\enhancement.py",
    "image_ops\format_conversion.py",
    "image_ops\model_manager.py",
    "image_ops\resize.py",
    "image_ops\upscale.py",
    "image_ops\utils.py"
)

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw "Asteria packaging preflight must run on Windows."
}
if (-not (Test-Path -LiteralPath $sidecarPath)) {
    throw "Python sidecar entrypoint is missing: $sidecarPath"
}
foreach ($module in $requiredModules) {
    $modulePath = Join-Path (Split-Path $sidecarPath) $module
    if (-not (Test-Path -LiteralPath $modulePath)) {
        throw "Python sidecar module is missing: $modulePath"
    }
}

$config = Get-Content -Raw -LiteralPath $tauriConfigPath | ConvertFrom-Json
$resources = $config.bundle.resources
if (-not $resources) {
    throw "Tauri bundle resources are not configured."
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python is not available on PATH. The current sidecar contract requires a local Python runtime."
}

Push-Location $projectRoot
try {
    & python $sidecarPath health
    if ($LASTEXITCODE -ne 0) {
        throw "Python sidecar health check failed."
    }

    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed."
    }

    & cargo check --manifest-path "src-tauri\Cargo.toml"
    if ($LASTEXITCODE -ne 0) {
        throw "Rust preflight failed."
    }

    if ($BuildInstaller) {
        & npm.cmd run tauri:build
        if ($LASTEXITCODE -ne 0) {
            throw "Tauri installer build failed."
        }
    }
} finally {
    Pop-Location
}

Write-Output "Asteria Windows packaging preflight passed."
