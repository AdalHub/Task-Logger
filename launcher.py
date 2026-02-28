"""
Task Logger launcher: starts FastAPI server in a thread, system tray icon, and global hotkey.
On hotkey or tray "Open", opens the default browser to the app.
"""
import sys
import threading
import webbrowser
from pathlib import Path

# Ensure project root is on path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

PORT = 8765
URL = f"http://localhost:{PORT}"


def open_app() -> None:
    webbrowser.open(URL)


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


def run_server() -> None:
    import uvicorn
    from backend.main import app
    config = uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    server.run()


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
        icon = pystray.Icon(
            "task_logger",
            img,
            "Task Logger",
            menu=pystray.Menu(
                pystray.MenuItem("Open", open_app, default=True),
                pystray.MenuItem("Quit", lambda icon: icon.stop()),
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
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    # Give server a moment to bind
    import time
    time.sleep(0.5)
    run_tray_and_hotkey()


if __name__ == "__main__":
    main()
