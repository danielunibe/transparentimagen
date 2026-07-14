import sys
import json
import argparse

def has_rembg():
    try:
        import PIL
        import rembg
        return True
    except ImportError:
        return False

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "No command provided"}))
        sys.exit(1)

    command = sys.argv[1]
    
    can_rembg = has_rembg()

    if command == "health":
        print(json.dumps({
            "ok": True,
            "engine": "python_sidecar",
            "version": "0.1.0",
            "message": "Asteria Python sidecar is available."
        }))
    elif command == "capabilities":
        print(json.dumps({
            "ok": True,
            "capabilities": {
                "enhance": False,
                "removeBg": can_rembg,
                "removeBgPipelineReady": True,
                "portrait": False,
                "ue5": False,
                "upscale": False,
                "promptEdit": False
            }
        }))
    elif command == "remove-bg":
        parser = argparse.ArgumentParser(description="Remove background")
        parser.add_argument("--input", required=True, help="Input image path")
        parser.add_argument("--output", required=True, help="Output image path")
        # We parse from sys.argv[2:] to avoid the "remove-bg" command name itself.
        try:
            args = parser.parse_args(sys.argv[2:])
            if not can_rembg:
                print(json.dumps({
                    "ok": False,
                    "status": "dependency_missing",
                    "engine": "python_sidecar",
                    "message": "Background removal model (rembg) is not installed."
                }))
                return

            try:
                from rembg import remove
                from PIL import Image
                import os
                
                if not os.path.exists(args.input):
                    print(json.dumps({
                        "ok": False,
                        "status": "input_missing",
                        "engine": "python_sidecar",
                        "message": f"Input file not found: {args.input}"
                    }))
                    return
                
                input_image = Image.open(args.input)
                output_image = remove(input_image)
                output_image.save(args.output, format="PNG")
                
                print(json.dumps({
                    "ok": True,
                    "status": "completed",
                    "output": args.output,
                    "mimeType": "image/png",
                    "message": "Background removed locally."
                }))
            except Exception as e:
                print(json.dumps({
                    "ok": False,
                    "status": "failed",
                    "engine": "python_sidecar",
                    "message": f"Error running rembg: {str(e)}"
                }))

        except SystemExit:
            # Handle argparse errors cleanly
            pass
    else:
        print(json.dumps({"ok": False, "error": f"Unknown command: {command}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
