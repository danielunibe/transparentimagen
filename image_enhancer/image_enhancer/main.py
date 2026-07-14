from __future__ import annotations

import tkinter as tk

from ui import ImageEnhancerApp


def main() -> int:
    root = tk.Tk()
    ImageEnhancerApp(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
