"""
api/models.py

Stub County model — required by accounts.User.county FK.
Full data models (SubCounty, FloodObservation, etc.) come in Epic 2 / Issue #14.
"""
from django.db import models


class County(models.Model):
    name   = models.CharField(max_length=100, unique=True)
    code   = models.CharField(max_length=10, unique=True)      # e.g. "KSM", "SIA", "HB"
    region = models.CharField(max_length=100, blank=True)      # e.g. "Nyanza"

    class Meta:
        verbose_name_plural = "Counties"
        ordering            = ["name"]

    def __str__(self) -> str:
        return self.name
