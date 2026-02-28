"""Pydantic schemas for API request/response."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class TaskResponse(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityCreateStopwatch(BaseModel):
    task_id: int


class ActivityCreateManual(BaseModel):
    task_id: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    logged_at: Optional[datetime] = None


class ActivityResponse(BaseModel):
    id: int
    task_id: int
    task_name: str
    task_color: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int
    logged_at: datetime
    no_time_assigned: bool
    display_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class ActivityRunningResponse(BaseModel):
    id: int
    task_id: int
    task_name: str
    task_color: str
    start_time: datetime

    class Config:
        from_attributes = True


class SettingsResponse(BaseModel):
    hotkey: str
    run_at_startup: bool


class SettingsUpdate(BaseModel):
    hotkey: Optional[str] = None
    run_at_startup: Optional[bool] = None


class StatsByTask(BaseModel):
    task_id: int
    task_name: str
    task_color: str
    total_hours: float
