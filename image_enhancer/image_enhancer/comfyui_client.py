from __future__ import annotations

import json
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from PIL import Image


class ComfyUICancelled(RuntimeError):
    pass


def _normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def _json_request(base_url: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    url = _normalize_base_url(base_url) + path
    body = None
    headers = {"User-Agent": "ImageEnhancer-Unova/1.0"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(url, data=body, headers=headers, method="POST" if body is not None else "GET")
    with urlopen(req, timeout=60) as response:
        raw = response.read()
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def _upload_image(base_url: str, filename: str, image_bytes: bytes) -> dict[str, Any]:
    boundary = f"----ImageEnhancer{uuid.uuid4().hex}"
    parts = [
        f"--{boundary}\r\n".encode("utf-8"),
        (
            f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
            "Content-Type: image/png\r\n\r\n"
        ).encode("utf-8"),
        image_bytes,
        b"\r\n",
        f"--{boundary}\r\n".encode("utf-8"),
        b'Content-Disposition: form-data; name="type"\r\n\r\ninput\r\n',
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    body = b"".join(parts)
    req = Request(
        _normalize_base_url(base_url) + "/upload/image",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "ImageEnhancer-Unova/1.0",
        },
        method="POST",
    )
    with urlopen(req, timeout=120) as response:
        raw = response.read()
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


def _upload_path_image(base_url: str, image_path: str | Path) -> dict[str, Any]:
    path = Path(image_path).expanduser()
    if not path.exists():
        raise RuntimeError(f"No existe la imagen auxiliar de ComfyUI: {path}")
    return _upload_image(base_url, path.name, path.read_bytes())


def _replace_placeholders(node: Any, replacements: dict[str, str]) -> Any:
    if isinstance(node, dict):
        return {key: _replace_placeholders(value, replacements) for key, value in node.items()}
    if isinstance(node, list):
        return [_replace_placeholders(item, replacements) for item in node]
    if isinstance(node, str):
        return replacements.get(node, node)
    return node


def load_workflow(workflow_path: str | Path) -> dict[str, Any]:
    path = Path(workflow_path).expanduser()
    if not path.exists():
        raise RuntimeError(f"No existe el workflow de ComfyUI: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"No se pudo leer el workflow JSON: {path}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("El workflow de ComfyUI debe ser un objeto JSON.")
    return payload


def smoke_comfyui(base_url: str, workflow_path: str = "") -> tuple[bool, str]:
    try:
        stats = _json_request(base_url, "/system_stats")
    except Exception as exc:
        return False, f"ComfyUI no responde en {base_url}: {exc}"
    if workflow_path:
        try:
            load_workflow(workflow_path)
        except Exception as exc:
            return False, str(exc)
    name = ""
    system = stats.get("system", {}) if isinstance(stats, dict) else {}
    if isinstance(system, dict):
        name = system.get("hostname", "")
    msg = f"ComfyUI API OK en {base_url}"
    if name:
        msg += f" ({name})"
    if workflow_path:
        msg += f" · workflow OK: {Path(workflow_path).name}"
    return True, msg


def interrupt_prompt(base_url: str):
    try:
        _json_request(base_url, "/interrupt", {})
    except Exception:
        return


def run_workflow(
    image: Image.Image,
    *,
    base_url: str,
    workflow_path: str,
    output_prefix: str,
    prompt_text: str = "",
    negative_prompt: str = "",
    reference_image_path: str = "",
    control_image_path: str = "",
    workflow_params: dict[str, Any] | None = None,
    cancel_check: Callable[[], bool] | None = None,
    status_cb: Callable[[str], None] | None = None,
    poll_interval: float = 1.0,
    timeout_seconds: float = 1800.0,
) -> tuple[Image.Image, dict[str, Any]]:
    workflow = load_workflow(workflow_path)
    if cancel_check and cancel_check():
        raise ComfyUICancelled("ComfyUI cancelado antes de iniciar.")

    if status_cb:
        status_cb("Validando ComfyUI API...")
    _json_request(base_url, "/system_stats")

    upload_name = f"{uuid.uuid4().hex}.png"
    buf = BytesIO()
    image.convert("RGBA").save(buf, format="PNG")
    if status_cb:
        status_cb("Subiendo imagen a ComfyUI...")
    upload_info = _upload_image(base_url, upload_name, buf.getvalue())
    remote_name = upload_info.get("name") or upload_name
    subfolder = upload_info.get("subfolder", "")
    image_type = upload_info.get("type", "input")

    ref_info: dict[str, Any] = {}
    if reference_image_path.strip():
        if status_cb:
            status_cb("Subiendo imagen de referencia a ComfyUI...")
        ref_info = _upload_path_image(base_url, reference_image_path.strip())

    control_info: dict[str, Any] = {}
    if control_image_path.strip():
        if status_cb:
            status_cb("Subiendo control image a ComfyUI...")
        control_info = _upload_path_image(base_url, control_image_path.strip())

    prefix = f"{output_prefix}_{uuid.uuid4().hex[:8]}"
    workflow_params = workflow_params or {}
    replacements = {
        "__COMFY_IMAGE__": remote_name,
        "__COMFY_IMAGE_SUBFOLDER__": subfolder,
        "__COMFY_IMAGE_TYPE__": image_type,
        "__COMFY_REF_IMAGE__": str(ref_info.get("name", "")),
        "__COMFY_REF_IMAGE_SUBFOLDER__": str(ref_info.get("subfolder", "")),
        "__COMFY_REF_IMAGE_TYPE__": str(ref_info.get("type", "input" if ref_info else "")),
        "__COMFY_CONTROL_IMAGE__": str(control_info.get("name", "")),
        "__COMFY_CONTROL_IMAGE_SUBFOLDER__": str(control_info.get("subfolder", "")),
        "__COMFY_CONTROL_IMAGE_TYPE__": str(control_info.get("type", "input" if control_info else "")),
        "__OUTPUT_PREFIX__": prefix,
        "__PROMPT__": prompt_text,
        "__NEGATIVE_PROMPT__": negative_prompt,
        "__WIDTH__": str(image.width),
        "__HEIGHT__": str(image.height),
    }
    for key, value in workflow_params.items():
        placeholder = key if str(key).startswith("__") else f"__{str(key).upper()}__"
        replacements[placeholder] = str(value)

    prompt_payload = {
        "prompt": _replace_placeholders(
            workflow,
            replacements,
        ),
        "client_id": uuid.uuid4().hex,
    }

    if cancel_check and cancel_check():
        raise ComfyUICancelled("ComfyUI cancelado antes de enviar el workflow.")

    if status_cb:
        status_cb("Enviando workflow a ComfyUI...")
    prompt_response = _json_request(base_url, "/prompt", prompt_payload)
    prompt_id = prompt_response.get("prompt_id", "")
    if not prompt_id:
        raise RuntimeError("ComfyUI no devolvio prompt_id.")

    deadline = timeout_seconds
    elapsed = 0.0
    while elapsed < deadline:
        if cancel_check and cancel_check():
            interrupt_prompt(base_url)
            raise ComfyUICancelled("ComfyUI cancelado por el usuario.")
        if status_cb:
            status_cb(f"Esperando resultado de ComfyUI... {int(elapsed)}s")
        history = _json_request(base_url, f"/history/{prompt_id}")
        item = history.get(prompt_id)
        outputs = item.get("outputs", {}) if isinstance(item, dict) else {}
        for node_output in outputs.values():
            images = node_output.get("images", []) if isinstance(node_output, dict) else []
            if images:
                first = images[0]
                query = urlencode(
                    {
                        "filename": first.get("filename", ""),
                        "subfolder": first.get("subfolder", ""),
                        "type": first.get("type", "output"),
                    }
                )
                req = Request(
                    _normalize_base_url(base_url) + f"/view?{query}",
                    headers={"User-Agent": "ImageEnhancer-Unova/1.0"},
                )
                with urlopen(req, timeout=120) as response:
                    out_bytes = response.read()
                out_image = Image.open(BytesIO(out_bytes)).convert("RGBA")
                return out_image, {
                    "prompt_id": prompt_id,
                    "output_prefix": prefix,
                    "filename": first.get("filename", ""),
                    "subfolder": first.get("subfolder", ""),
                    "type": first.get("type", "output"),
                    "reference_image": str(ref_info.get("name", "")),
                    "control_image": str(control_info.get("name", "")),
                }
        if item and item.get("status", {}).get("status_str") == "error":
            messages = item.get("status", {}).get("messages", [])
            raise RuntimeError(f"ComfyUI devolvio error: {messages}")
        elapsed += poll_interval
        import time

        time.sleep(poll_interval)

    interrupt_prompt(base_url)
    raise RuntimeError("ComfyUI no devolvio resultado dentro del tiempo esperado.")
