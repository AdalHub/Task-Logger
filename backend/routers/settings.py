"""Settings API."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Setting
from backend.schemas import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_HOTKEY = "ctrl+alt+shift+l"


def _get_setting(db: Session, key: str, default: str | bool) -> str | bool:
    row = db.query(Setting).filter(Setting.key == key).first()
    if not row or row.value is None:
        return default
    if default is True or default is False:
        return row.value.lower() in ("1", "true", "yes")
    return row.value


def _set_setting(db: Session, key: str, value: str | bool) -> None:
    if isinstance(value, bool):
        value = "true" if value else "false"
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))
    db.commit()


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)) -> SettingsResponse:
    return SettingsResponse(
        hotkey=str(_get_setting(db, "hotkey", DEFAULT_HOTKEY)),
        run_at_startup=bool(_get_setting(db, "run_at_startup", False)),
    )


@router.put("", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)) -> SettingsResponse:
    if body.hotkey is not None:
        _set_setting(db, "hotkey", body.hotkey.strip().lower())
    if body.run_at_startup is not None:
        _set_setting(db, "run_at_startup", body.run_at_startup)
    return get_settings(db)
