"""Tasks API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Task
from backend.schemas import TaskCreate, TaskResponse
from backend.services.color import next_task_color

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
def list_tasks(db: Session = Depends(get_db)) -> list[Task]:
    return db.query(Task).order_by(Task.name).all()


@router.post("", response_model=TaskResponse)
def create_task(body: TaskCreate, db: Session = Depends(get_db)) -> Task:
    existing = db.query(Task).filter(Task.name == body.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Task with this name already exists")
    count = db.query(Task).count()
    color = next_task_color(count)
    task = Task(name=body.name.strip(), color=color)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)) -> None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
