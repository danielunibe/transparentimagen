# Asteria - Local Visual AI Workspace

Asteria is the official frontend and desktop shell for the unified `transparentimagen` image-processing program.

The parent project keeps the legacy Python/Tkinter app as reference and source of reusable processing logic. Asteria is the primary UI and connects local processing through Tauri plus the Python sidecar in `sidecars/python-ai`.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

```bash
npm install
```

2. Run browser mode:

```bash
npm run dev
```

3. Run desktop mode:

```bash
npm run tauri:dev
```

4. Check the Python sidecar:

```bash
python sidecars/python-ai/asteria_sidecar.py health
python sidecars/python-ai/asteria_sidecar.py capabilities
```

5. Install sidecar dependencies when needed:

```bash
pip install -r sidecars/python-ai/requirements.txt
```
