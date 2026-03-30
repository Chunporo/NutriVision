"""Calorie database for 251 FoodX food classes.

Loads class names from ``data/classes.txt`` and calorie densities from
``data/food_calories.csv``, with fuzzy name normalisation so lookups
work even when the classifier returns ``'apple_pie'`` and the CSV has
``'Apple Pie'``.
"""

from __future__ import annotations

import csv
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from .config import CALORIES_FILE, CLASSES_FILE

logger = logging.getLogger(__name__)


def _normalise(name: str) -> str:
    """Lower-case, strip parentheticals, collapse whitespace/underscores."""
    name = re.sub(r"\(.*?\)", "", name)  # remove "(Food)" etc.
    name = name.lower().strip()
    name = re.sub(r"[\s_-]+", "_", name)
    return name


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------
@dataclass
class FoodInfo:
    """Nutritional info for one food class."""

    index: int
    name: str  # human-readable
    calories_per_100g: float  # kcal per 100 g


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
class CalorieDB:
    """Look up food class names and calorie densities."""

    def __init__(
        self,
        classes_file: str | Path = CLASSES_FILE,
        calories_file: str | Path = CALORIES_FILE,
    ) -> None:
        self._by_index: dict[int, FoodInfo] = {}
        self._by_norm: dict[str, FoodInfo] = {}

        # 1. Load class names (one per line, 1-indexed in the source file)
        class_names = self._load_classes(Path(classes_file))

        # 2. Load calorie CSV and merge
        calorie_map = self._load_calories(Path(calories_file))

        for idx, name in enumerate(class_names):
            norm = _normalise(name)
            cal = calorie_map.get(norm, 0.0)
            info = FoodInfo(index=idx, name=name, calories_per_100g=cal)
            self._by_index[idx] = info
            self._by_norm[norm] = info

        logger.info(
            "CalorieDB loaded: %d classes, %d with calorie data",
            len(self._by_index),
            sum(1 for v in self._by_index.values() if v.calories_per_100g > 0),
        )

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------
    def get_by_index(self, idx: int) -> FoodInfo | None:
        return self._by_index.get(idx)

    def get_by_name(self, name: str) -> FoodInfo | None:
        return self._by_norm.get(_normalise(name))

    @property
    def class_names(self) -> list[str]:
        """Ordered list of class names (index-aligned)."""
        return [self._by_index[i].name for i in range(len(self._by_index))]

    def calories_per_gram(self, name_or_index: str | int) -> float:
        """Return kcal/gram for a food class (0.0 if unknown)."""
        info = (
            self.get_by_index(name_or_index)
            if isinstance(name_or_index, int)
            else self.get_by_name(name_or_index)
        )
        return (info.calories_per_100g / 100.0) if info else 0.0

    def estimate_calories(self, name_or_index: str | int, weight_grams: float) -> float:
        """Estimate total kcal for a given weight of a food class."""
        return self.calories_per_gram(name_or_index) * weight_grams

    def __len__(self) -> int:
        return len(self._by_index)

    # ------------------------------------------------------------------
    # Private loaders
    # ------------------------------------------------------------------
    @staticmethod
    def _load_classes(path: Path) -> list[str]:
        if not path.exists():
            logger.warning("Classes file not found: %s — returning empty list", path)
            return []
        names: list[str] = []
        for line in path.read_text().splitlines():
            line = line.strip()
            if line:
                names.append(line)
        logger.info("Loaded %d class names from %s", len(names), path)
        return names

    @staticmethod
    def _load_calories(path: Path) -> dict[str, float]:
        """Parse the calorie CSV into {normalised_name: kcal_per_100g}."""
        if not path.exists():
            logger.warning("Calorie file not found: %s — returning empty map", path)
            return {}
        calorie_map: dict[str, float] = {}
        with path.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                food = row.get("Predicted Food Class", "").strip()
                cal_str = row.get("Estimated Calories", "0")
                # Extract numeric part: "404 cal" → 404, "237cal" → 237
                digits = re.sub(r"[^\d.]", "", cal_str)
                try:
                    cal = float(digits) if digits else 0.0
                except ValueError:
                    cal = 0.0
                if food:
                    calorie_map[_normalise(food)] = cal
        logger.info("Loaded calorie data for %d foods from %s", len(calorie_map), path)
        return calorie_map
