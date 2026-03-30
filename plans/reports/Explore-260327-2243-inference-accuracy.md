# NutriVision Inference Accuracy Issue Investigation

**Date:** 2026-03-27  
**Scope:** Class name / index mismatch check between Food-101 test set and model checkpoints

---

## 1. Class Names File Analysis

### Checkpoint: `checkpoints/food101/best_model/class_names.txt`

**Line count:** 100 lines

**Format:** Each line = `{index}→{class_name}` (1-indexed)

**First 10 entries:**
```
     1→apple_pie
     2→baby_back_ribs
     3→baklava
     4→beef_carpaccio
     5→beef_tartare
     6→beet_salad
     7→beignets
     8→bibimbap
     9→bread_pudding
    10→breakfast_burrito
```

**Last 10 entries:**
```
    91→spaghetti_carbonara
    92→spring_rolls
    93→steak
    94→strawberry_shortcake
    95→sushi
    96→tacos
    97→takoyaki
    98→tiramisu
    99→tuna_tartare
   100→waffles
```

**COUNT:** 100 entries (food-101 is a 101-class dataset but this file has 100 lines)

---

## 2. Test Dataset Directories

**Path:** `data/food-101/test/`

**Total directories:** 101

**First 20 directory names:**
```
apple_pie
baby_back_ribs
baklava
beef_carpaccio
beef_tartare
beet_salad
beignets
bibimbap
bread_pudding
breakfast_burrito
bruschetta
caesar_salad
cannoli
caprese_salad
carrot_cake
ceviche
cheese_plate
cheesecake
chicken_curry
chicken_quesadilla
```

---

## 3. Inference Results

**File:** `checkpoints/inference_food101_2026-03-27/food101_inference_results.json`

**Metadata:**
- Model path: `checkpoints/food101/best_model`
- Device: `cuda`
- Num samples tested: 40
- Num results: 40
- **Top-1 Accuracy: 0.95 (95%)**

**First 3 entries (raw):**

### Entry 1:
```json
{
  "image": "data/food-101/test/apple_pie/1011328.jpg",
  "ground_truth": "apple_pie",
  "top1_pred": "apple_pie",
  "top1_conf": 0.5037028789520264,
  "top3": [
    {"label": "apple_pie", "conf": 0.5037028789520264},
    {"label": "grilled_cheese_sandwich", "conf": 0.09474653005599976},
    {"label": "samosa", "conf": 0.036860477179288864}
  ],
  "correct_top1": true
}
```

### Entry 2:
```json
{
  "image": "data/food-101/test/baby_back_ribs/1005066.jpg",
  "ground_truth": "baby_back_ribs",
  "top1_pred": "baby_back_ribs",
  "top1_conf": 0.8788297772407532,
  "top3": [
    {"label": "baby_back_ribs", "conf": 0.8788297772407532},
    {"label": "pork_chop", "conf": 0.011335588060319424},
    {"label": "chicken_wings", "conf": 0.008963430300354958}
  ],
  "correct_top1": true
}
```

### Entry 3:
```json
{
  "image": "data/food-101/test/baklava/1028777.jpg",
  "ground_truth": "baklava",
  "top1_pred": "baklava",
  "top1_conf": 0.6793278455734253,
  "top3": [
    {"label": "baklava", "conf": 0.6793278455734253},
    {"label": "apple_pie", "conf": 0.0258744228631258},
    {"label": "cheesecake", "conf": 0.02274467796087265}
  ],
  "correct_top1": true
}
```

**Accuracy summary:**
- 38/40 correct (95%)
- 2 failures:
  - Ground truth: `crab_cakes` → Predicted: `pork_chop`
  - Ground truth: `cup_cakes` → Predicted: `donuts`

---

## 4. Config Constants

**File:** `nutri_vision/config.py`

```python
# Line 25:
NUM_FOOD_CLASSES = 251

# Line 26:
IMAGE_SIZE = 224

# Line 24:
VIT_PRETRAINED = "google/vit-base-patch16-224"
```

**Key finding:** Config hardcodes 251 classes but food-101 checkpoint is trained on 101 classes.

---

## 5. Calorie Database Implementation

**File:** `nutri_vision/calorie_db.py` (FULL CONTENT)

```python
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
```

**Key finding:** Line 62 maps by `idx` from class_names list. If `data/classes.txt` has 251 entries, indices 0-250 are created. The calorie lookup at line 134 in `pipeline.py` uses `top.class_index` to call `calories_per_gram(int)`, which calls `get_by_index(idx)`.

---

## 6. Data Classes File

**File:** `data/classes.txt`

**Line count:** 251 lines

**First 20 entries:**
```
macaron
beignet
cruller
cockle_food
samosa
tiramisu
tostada
moussaka
dumpling
sashimi
knish
croquette
couscous
porridge
stuffed_cabbage
seaweed_salad
chow_mein
rigatoni
beef_tartare
cannoli
```

**Last 5 entries:**
```
chicken_cordon_bleu
eccles_cake
moo_goo_gai_pan
buffalo_wing
stuffed_tomato
```

**COUNT:** 251 entries (FoodX dataset)

---

## 7. Project Dependencies

**File:** `pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "nutri-vision"
version = "1.0.0"
description = "Food recognition and calorie estimation using ViT and Mask R-CNN"
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.10"
dependencies = [
    "torch>=2.1",
    "torchvision>=0.16",
    "transformers>=4.36",
    "numpy>=1.24",
    "pandas>=2.1",
    "opencv-python>=4.8",
    "Pillow>=10.0",
    "scikit-learn>=1.3",
    "tqdm>=4.65",
    "matplotlib>=3.7",
]
```

**Key versions:**
- `torch>=2.1`
- `transformers>=4.36`

---

## 8. Model Config Analysis

### food101 checkpoint: `checkpoints/food101/best_model/config.json`

```json
{
  "num_labels": null,
  "id2label": {
    "0": "apple_pie",
    "1": "baby_back_ribs",
    "2": "baklava",
    ...
    "100": "waffles"
  }
}
```

**Key findings:**
- `num_labels: null` (not set in this config)
- `id2label` has exactly **101 entries** (indices 0-100)
- Maps directly to test set directory names

### Main checkpoint: `checkpoints/best_model/config.json`

```json
{
  "num_labels": not specified,
  "id2label": {
    "0": "LABEL_0",
    "1": "LABEL_1",
    "2": "LABEL_2"
  }
}
```

**Key finding:** Uses generic LABEL_X instead of actual class names. Only 3 entries visible (likely incomplete or truncated dump).

---

## Key Findings Summary

| Item | Food-101 Checkpoint | FoodX (251 class) |
|------|-------------------|------------------|
| **class_names.txt lines** | 100 | N/A |
| **id2label entries** | 101 (0-100) | Unknown |
| **data/classes.txt** | N/A (separate file) | 251 lines |
| **config.py NUM_FOOD_CLASSES** | Hard-coded 251 | Hard-coded 251 |
| **data/food-101/test dirs** | 101 directories | N/A |
| **Inference accuracy** | 95% (38/40) | N/A |

---

## Critical Mismatch Identified

**ISSUE 1: Config mismatch**
- `config.py` line 25: `NUM_FOOD_CLASSES = 251` (global constant)
- `food101/best_model/config.json`: `id2label` has **101 entries**
- During training of food101 model: `build_loaders()` auto-detects 101 classes and overwrites cfg.num_labels
- During inference with food101 model: `classifier.py` line 62 loads model with `num_labels=NUM_FOOD_CLASSES` (251!)

**ISSUE 2: Class names index mapping**
- `food101/best_model/class_names.txt`: 100 lines (NOT 101!) + index markers
- `data/classes.txt`: 251 lines (used by CalorieDB)
- `pipeline.py` line 67: `class_names=self.calorie_db.class_names` → passes 251 names to classifier
- `classifier.py` lines 83-84: Index out of bounds possible if model returns index > 100

**ISSUE 3: Prediction label handling**
- Inference results show predictions use **string names** (`"apple_pie"`, `"baby_back_ribs"`)
- NOT numeric indices
- This bypasses the index mismatch but creates semantic confusion

---

## Format Anomaly in class_names.txt

The file format is unusual:
```
     1→apple_pie
     2→baby_back_ribs
```

Should be:
```
apple_pie
baby_back_ribs
```

The numeric prefix + arrow may cause parsing issues if code expects simple newline-delimited format.

---

## Unresolved Questions

1. **Why does `class_names.txt` have 100 lines but indices 0-100 (101 entries)?** Is line 1 the header? Is line numbering off-by-one?

2. **Where is the `data/classes.txt` actually used during inference?** The pipeline loads CalorieDB which loads it, but are all 251 indices valid predictions from food101 model?

3. **How is the 95% accuracy maintained if there's an index/class mismatch?** Is the food101 model truly 101-class (matching test set) despite global config saying 251?

4. **What happens when `classifier.py` tries to look up a class_index that exceeds len(class_names)?** Line 83-84 has bounds checking: `if idx < len(self.class_names)` — falls back to `f"class_{idx}"` — so no crash, but wrong label.

5. **Are the actual predictions coming from the model as indices or as strings?** The JSON results show string names, but the model outputs logits with 101 dimensions.
