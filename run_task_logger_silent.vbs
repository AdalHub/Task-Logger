' Run Task Logger without showing a console window (for Startup folder).
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && uv run python launcher.py", 0, False
