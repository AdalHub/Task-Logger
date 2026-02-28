"""Standalone server entrypoint for the launcher subprocess. Run from project root."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import uvicorn
from backend.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
