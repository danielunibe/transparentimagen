# Asteria Python Sidecar

This directory contains the Python native sidecar scripts for Asteria. 
The sidecar is responsible for running heavier local AI tasks (like actual background removal via rembg, or local generation via deep learning models) in future phases.

## Current Phase (Phase 27 - Batch Background Removal)

The sidecar now actively supports real background removal through `rembg` if the requisite dependencies are explicitly installed. The front-end now batches calls sequentially and displays proper progress inside the Batch Processing panel. Output PNGs preserve full alpha transparency.

### Dependencies

```bash
pip install -r requirements.txt
```

### Testing locally

Make sure you have python installed:

```bash
python asteria_sidecar.py health
# {"ok": true, "engine": "python_sidecar", "version": "0.1.0", "message": "Asteria Python sidecar is available."}

python asteria_sidecar.py capabilities
# {"ok": true, "capabilities": { ... "removeBg": true ... }}

python asteria_sidecar.py remove-bg --input test.png --output test_cutout.png
# {"ok": true, "status": "completed", "output": "test_cutout.png", "mimeType": "image/png", "message": "Background removed locally."}
```
