"""
api/services

Business logic, scoring, and external integrations.

Public re-exports (backwards-compatible with the old services.py):
  FLOOD_INDICATORS, score_drought, score_flood
"""
from api.services.scoring import FLOOD_INDICATORS, score_drought, score_flood  # noqa: F401

__all__ = [
    "FLOOD_INDICATORS",
    "score_drought",
    "score_flood",
]
