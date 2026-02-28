"""
Task Logger launcher: starts FastAPI server in a subprocess, system tray icon, and global hotkey.
On hotkey or tray "Open", opens the default browser to the app.
Run from anywhere: python C:\...\task_logger\launcher.py
"""
import os
import subprocess
import sys
import webbrowser
from pathlib import Path

# Project root (works when run as: python C:\path\to\launcher.py)
ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

PORT = 8765
URL = f"http://localhost:{PORT}"

# Server subprocess (so it binds reliably when run with pythonw)
_server_process = None


def open_app() -> None:
    webbrowser.open(URL)


def start_server_process() -> None:
    """Start the FastAPI server in a separate process (use python.exe so server runs like manual 'python run_server.py')."""
    global _server_process
    server_script = ROOT / "run_server.py"
    # Use python.exe (not pythonw) for the server so it behaves like manual run; CREATE_NO_WINDOW hides the console
    python_exe = Path(sys.executable)
    if python_exe.name.lower() == "pythonw.exe":
        python_exe = python_exe.parent / "python.exe"
    cmd = [str(python_exe), str(server_script)]
    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    _server_process = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        env=os.environ.copy(),
        creationflags=creationflags,
    )


def stop_server_process() -> None:
    global _server_process
    if _server_process is not None:
        _server_process.terminate()
        _server_process.wait(timeout=5)
        _server_process = None


def get_hotkey_from_db() -> str:
    """Read hotkey from SQLite settings so we don't need the API to be up."""
    try:
        from backend.database import SessionLocal, init_db
        from backend.models import Setting
        init_db()
        db = SessionLocal()
        try:
            row = db.query(Setting).filter(Setting.key == "hotkey").first()
            if row and row.value:
                return row.value.strip().lower()
        finally:
            db.close()
    except Exception:
        pass
    return "ctrl+alt+shift+l"


def run_tray_and_hotkey() -> None:
    from pynput import keyboard
    import pystray
    from PIL import Image

    hotkey_str = get_hotkey_from_db()
    # pynput expects single angle brackets: <ctrl>+<alt>+<shift>+l
    parts = [p.strip().lower() for p in hotkey_str.split("+")]
    parse_parts = []
    for p in parts:
        if p in ("ctrl", "control"):
            parse_parts.append("<ctrl>")
        elif p == "alt":
            parse_parts.append("<alt>")
        elif p == "shift":
            parse_parts.append("<shift>")
        elif p in ("super", "win", "cmd"):
            parse_parts.append("<cmd>")
        elif len(p) == 1:
            parse_parts.append(p)
        else:
            parse_parts.append(f"<{p}>")
    combo = "+".join(parse_parts) if parse_parts else "<ctrl>+<alt>+<shift>+l"

    # HotKey must receive canonical key events (see pynput docs)
    listener_ref = [None]

    def on_press(k):
        if listener_ref[0] is not None:
            hotkey.press(listener_ref[0].canonical(k))

    def on_release(k):
        if listener_ref[0] is not None:
            hotkey.release(listener_ref[0].canonical(k))

    try:
        hotkey = keyboard.HotKey(keyboard.HotKey.parse(combo), open_app)
        listener = keyboard.Listener(on_press=on_press, on_release=on_release)
        listener_ref[0] = listener
        listener.start()
    except Exception:
        # If parse fails, hotkey/listener won't work; keep process running for tray
        listener = keyboard.Listener(on_press=lambda k: None)
        listener.start()

    # Small 16x16 icon (dark square with "T")
    img = Image.new("RGBA", (16, 16), (0x22, 0x22, 0x22, 255))
    try:
        def on_quit(icon):
            stop_server_process()
            icon.stop()

        icon = pystray.Icon(
            "task_logger",
            img,
            "Task Logger",
            menu=pystray.Menu(
                pystray.MenuItem("Open", open_app, default=True),
                pystray.MenuItem("Quit", on_quit),
            ),
        )
        icon.run()
    except Exception:
        # If tray fails (e.g. headless), just keep hotkey listener and server running
        try:
            while True:
                import time
                time.sleep(60)
        except KeyboardInterrupt:
            pass


def main() -> None:
    import time
    open_browser_on_start = "--open" in sys.argv
    start_server_process()
    time.sleep(2.0)
    if open_browser_on_start:
        open_app()
    run_tray_and_hotkey()


if __name__ == "__main__":
    main()
