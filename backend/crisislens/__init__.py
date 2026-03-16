# Make Celery app available at package level so Django picks it up on startup.
from crisislens.celery import app as celery_app  # noqa: F401

__all__ = ("celery_app",)
