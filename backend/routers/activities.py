"""Activities API."""
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from backend.database import get_db
from backend.models import Activity, Task
from backend.schemas import (
    ActivityCreateManual,
    ActivityCreateStopwatch,
    ActivityResponse,
    ActivityRunningResponse,
    StatsByTask,
    StatsTimeSeriesPoint,
)

router = APIRouter(prefix="/api/activities", tags=["activities"])


def _activity_to_response(a: Activity) -> ActivityResponse:
    return ActivityResponse(
        id=a.id,
        task_id=a.task_id,
        task_name=a.task.name,
        task_color=a.task.color,
        start_time=a.start_time,
        end_time=a.end_time,
        duration_minutes=a.duration_minutes,
        logged_at=a.logged_at,
        no_time_assigned=a.no_time_assigned,
        display_time=a.display_time,
    )


@router.get("/running", response_model=Optional[ActivityRunningResponse])
def get_running_activity(db: Session = Depends(get_db)):
    """Return the current open activity (stopwatch started, not stopped), if any."""
    a = (
        db.query(Activity)
        .join(Task)
        .filter(Activity.end_time.is_(None), Activity.no_time_assigned.is_(False))
        .first()
    )
    if not a:
        return None
    return ActivityRunningResponse(
        id=a.id,
        task_id=a.task_id,
        task_name=a.task.name,
        task_color=a.task.color,
        start_time=a.start_time,
    )


@router.get("/days")
def list_days_with_activities(
    db: Session = Depends(get_db),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
):
    """Return list of dates (YYYY-MM-DD) that have at least one activity in the given month."""
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    rows = (
        db.query(distinct(func.date(Activity.logged_at)))
        .filter(Activity.logged_at >= start, Activity.logged_at < end)
        .all()
    )
    return [r[0].isoformat() if hasattr(r[0], "isoformat") else str(r[0]) for r in rows]


@router.get("", response_model=list[ActivityResponse])
def list_activities(
    db: Session = Depends(get_db),
    day: Optional[date] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    from_datetime: Optional[str] = Query(None),
    to_datetime: Optional[str] = Query(None),
):
    """List activities, optionally filtered by day or date range.
    Use from_datetime/to_datetime (ISO) for the day panel so the selected day is in the user's local timezone."""
    q = db.query(Activity).join(Task).order_by(Activity.logged_at.desc())
    if from_datetime is not None and to_datetime is not None:
        try:
            start = datetime.fromisoformat(from_datetime.replace("Z", "+00:00"))
            end = datetime.fromisoformat(to_datetime.replace("Z", "+00:00"))
            if start.tzinfo:
                start = start.replace(tzinfo=None)
            if end.tzinfo:
                end = end.replace(tzinfo=None)
            q = q.filter(Activity.logged_at >= start, Activity.logged_at < end)
        except (ValueError, TypeError):
            pass
    elif day is not None:
        start = datetime.combine(day, datetime.min.time())
        end = start + timedelta(days=1)
        q = q.filter(Activity.logged_at >= start, Activity.logged_at < end)
    if from_date is not None and from_datetime is None:
        q = q.filter(Activity.logged_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date is not None and to_datetime is None:
        end = datetime.combine(to_date, datetime.min.time()) + timedelta(days=1)
        q = q.filter(Activity.logged_at < end)
    activities = q.all()
    return [_activity_to_response(a) for a in activities]


@router.get("/stats", response_model=list[StatsByTask])
def stats_by_task(
    db: Session = Depends(get_db),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    """Total hours per task in the given date range (for histogram)."""
    if from_date is None:
        from_date = date.today() - timedelta(days=30)
    if to_date is None:
        to_date = date.today()
    start_dt = datetime.combine(from_date, datetime.min.time())
    end_dt = datetime.combine(to_date, datetime.min.time()) + timedelta(days=1)
    rows = (
        db.query(
            Task.id,
            Task.name,
            Task.color,
            func.sum(Activity.duration_minutes).label("total_minutes"),
        )
        .join(Activity, Activity.task_id == Task.id)
        .filter(
            Activity.logged_at >= start_dt,
            Activity.logged_at < end_dt,
        )
        .group_by(Task.id, Task.name, Task.color)
        .all()
    )
    return [
        StatsByTask(
            task_id=r.id,
            task_name=r.name,
            task_color=r.color,
            total_hours=round(r.total_minutes / 60.0, 2),
        )
        for r in rows
    ]


@router.get("/stats/time_series", response_model=list[StatsTimeSeriesPoint])
def stats_time_series(
    db: Session = Depends(get_db),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    """Daily hours per task for the date range (for line chart)."""
    if from_date is None:
        from_date = date.today() - timedelta(days=30)
    if to_date is None:
        to_date = date.today()
    start_dt = datetime.combine(from_date, datetime.min.time())
    end_dt = datetime.combine(to_date, datetime.min.time()) + timedelta(days=1)
    rows = (
        db.query(
            func.date(Activity.logged_at).label("d"),
            Task.id,
            Task.name,
            Task.color,
            func.sum(Activity.duration_minutes).label("total_minutes"),
        )
        .join(Task, Activity.task_id == Task.id)
        .filter(
            Activity.logged_at >= start_dt,
            Activity.logged_at < end_dt,
        )
        .group_by(func.date(Activity.logged_at), Task.id, Task.name, Task.color)
        .all()
    )
    out = []
    for r in rows:
        d = r.d
        if hasattr(d, "isoformat"):
            d_str = d.isoformat()
        else:
            d_str = str(d)
        out.append(
            StatsTimeSeriesPoint(
                date=d_str,
                task_id=r.id,
                task_name=r.name,
                task_color=r.color,
                hours=round(r.total_minutes / 60.0, 2),
            )
        )
    return out


@router.get("/export", response_class=PlainTextResponse)
def export_log(
    db: Session = Depends(get_db),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
) -> PlainTextResponse:
    """Export a plain-text log of all days with activity and what was done."""
    q = db.query(Activity).join(Task).order_by(Activity.logged_at.asc())
    if from_date is not None:
        q = q.filter(Activity.logged_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date is not None:
        end = datetime.combine(to_date, datetime.min.time()) + timedelta(days=1)
        q = q.filter(Activity.logged_at < end)
    activities = q.all()
    if not activities:
        return PlainTextResponse("No activity logged yet.\n")

    lines: list[str] = []
    current_date: Optional[date] = None

    for a in activities:
        d = a.logged_at.date()
        if current_date != d:
            if current_date is not None:
                lines.append("")
            current_date = d
            lines.append(d.isoformat())
        start_str = a.start_time.strftime("%H:%M") if a.start_time else "--:--"
        end_str = a.end_time.strftime("%H:%M") if a.end_time else "--:--"
        hours = a.duration_minutes // 60
        mins = a.duration_minutes % 60
        dur_str = f"{hours}h {mins}m" if hours else f"{mins}m"
        label = "No time assigned" if a.no_time_assigned else f"{start_str}–{end_str}"
        lines.append(f"- {a.task.name}: {label} ({dur_str})")

    content = "\n".join(lines) + "\n"
    filename = "task-log.txt"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return PlainTextResponse(content, headers=headers)


@router.post("", response_model=ActivityResponse)
def create_activity_stopwatch(body: ActivityCreateStopwatch, db: Session = Depends(get_db)):
    """Start stopwatch: create activity with start_time=now, end_time=null."""
    task = db.query(Task).filter(Task.id == body.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    existing = (
        db.query(Activity)
        .filter(Activity.end_time.is_(None), Activity.no_time_assigned.is_(False))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A task is already running. Stop it first.",
        )
    now = datetime.utcnow()
    activity = Activity(
        task_id=body.task_id,
        start_time=now,
        end_time=None,
        duration_minutes=0,
        logged_at=now,
        no_time_assigned=False,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return _activity_to_response(activity)


@router.post("/manual", response_model=ActivityResponse)
def create_activity_manual(body: ActivityCreateManual, db: Session = Depends(get_db)):
    """Log manually: either start+end time or total time only (no_time_assigned)."""
    task = db.query(Task).filter(Task.id == body.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logged_at = body.logged_at or datetime.utcnow()
    if body.start_time is not None and body.end_time is not None:
        start_time = body.start_time
        end_time = body.end_time
        duration = body.duration_minutes if body.duration_minutes is not None else int(
            (end_time - start_time).total_seconds() / 60
        )
        no_time_assigned = False
        display_time = None
    elif body.duration_minutes is not None:
        duration = body.duration_minutes
        start_time = None
        end_time = None
        no_time_assigned = True
        if isinstance(logged_at, datetime) and (logged_at.hour or logged_at.minute or logged_at.second):
            display_time = logged_at
        else:
            d = logged_at.date() if isinstance(logged_at, datetime) else logged_at
            display_time = datetime.combine(d, datetime.min.time()).replace(hour=12, minute=0, second=0)
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either start_time+end_time+duration_minutes or duration_minutes only.",
        )

    activity = Activity(
        task_id=body.task_id,
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration,
        logged_at=logged_at,
        no_time_assigned=no_time_assigned,
        display_time=display_time,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return _activity_to_response(activity)


@router.patch("/{activity_id}", response_model=ActivityResponse)
def stop_activity(activity_id: int, db: Session = Depends(get_db)):
    """Set end_time=now for a running activity (stop stopwatch)."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.end_time is not None:
        raise HTTPException(status_code=400, detail="Activity is already stopped")
    now = datetime.utcnow()
    activity.end_time = now
    activity.duration_minutes = int((now - activity.start_time).total_seconds() / 60)
    db.commit()
    db.refresh(activity)
    return _activity_to_response(activity)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    """Delete a logged activity (e.g. from the calendar day view)."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(activity)
    db.commit()
