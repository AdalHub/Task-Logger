"""SQLAlchemy ORM models."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from backend.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    color = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    activities = relationship("Activity", back_populates="task", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    logged_at = Column(DateTime, nullable=False)
    no_time_assigned = Column(Boolean, default=False, nullable=False)
    display_time = Column(DateTime, nullable=True)

    task = relationship("Task", back_populates="activities")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(64), primary_key=True)
    value = Column(String(512), nullable=True)
