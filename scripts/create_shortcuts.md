# Task Logger – Desktop and Startup shortcuts

## Option 1: Batch file (recommended)

1. Create a shortcut to the batch file:
   - Right-click `run_task_logger.bat` (in this project folder) → **Create shortcut**.
   - Move the shortcut to your **Desktop** and/or to your **Startup** folder.

2. **Startup folder** (run at login):
   - Press `Win + R`, type `shell:startup`, press Enter.
   - Move (or copy) the shortcut into the folder that opens.

3. Double-click the shortcut (on Desktop or from Startup) to start Task Logger. Use the system tray icon or your hotkey to open the app in the browser.

## Option 2: Shortcut with uv

1. Right-click on Desktop → **New** → **Shortcut**.
2. **Target**:  
   `uv run python launcher.py`  
   (If `uv` is not on PATH, use the full path to `uv`, e.g. `C:\Users\YourName\.local\bin\uv.exe run python launcher.py`.)
3. **Start in**:  
   `C:\Users\Adal\Documents\PROJECTS\task_logger`  
   (Replace with your actual project path.)
4. Name the shortcut **Task Logger**.
5. To run at startup: press `Win + R`, type `shell:startup`, press Enter, and copy this shortcut into that folder.

## Changing the hotkey

Open the app in the browser → click the ⚙ (Settings) → set **Hotkey** and save. The new hotkey is used the next time you start the launcher.
