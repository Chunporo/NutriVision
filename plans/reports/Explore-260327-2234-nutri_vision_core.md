# NutriVision Core Exploration Report

**Date:** 2026-03-27 | **Project:** NutriVision

---

## 1. Project Structure (Top-Level)

```
nutri_vision/
├── .claude/                    # Agent skills/context
├── .git/                       # Git repo
├── .pytest_cache/
├── .ruff_cache/
├── .venv/                      # Virtual environment
├── __pycache__/
├── assets/                     # Static resources
├── backend/                    # Backend code (FastAPI/Flask)
├── checkpoints/                # Model weights & training states
├── data/                       # Datasets & calorie database
├── docs/                       # Documentation
├── mobile/                     # Mobile app code
├── nutri_vision/               # **Main Python package**
├── plans/                      # Planning & reports
├── scripts/                    # Utility scripts
│
├── app.py                      # Streamlit app
├── inference.py                # Batch inference script
├── pyproject.toml              # Project metadata
├── requirements.txt
├── LICENSE
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── ngrok-start.sh
├── start.sh
└── uv.lock
```

---

## 2. Core Module: `nutri_vision/classifier.py` (110 lines)

**Purpose:** Vision Transformer (ViT) based food image classifier for 251 FoodX classes.

### Key Classes & Methods:

```python
@dataclass
class ClassificationResult:
    """Single classification prediction."""
    class_index: int
    class_name: str
    confidence: float


class FoodClassifier:
    """Vision Transformer food classifier (251 FoodX classes)."""
    
    __init__(
        model_path: str | Path = VIT_PRETRAINED,
        class_names: list[str] | None = None,
        device: str | None = None,
    )
    
    @torch.inference_mode()
    predict(image: Image.Image, top_k: int = 5) -> list[ClassificationResult]
        # Returns top-k predictions for a single PIL image
    
    @torch.inference_mode()
    predict_batch(images: list[Image.Image], top_k: int = 5) -> list[list[ClassificationResult]]
        # Batched prediction for multiple images
```

**Details:**
- Uses `ViTForImageClassification` from HuggingFace transformers
- Uses `ViTImageProcessor` for modern image preprocessing (replaces deprecated `ViTFeatureExtractor`)
- Fallback processor loading from `VIT_PRETRAINED` if checkpoint lacks processor config
- Returns top-k results with class name + confidence score
- Runs in `inference_mode()` (no gradients)

---

## 3. Core Module: `nutri_vision/segmentor.py` (99 lines)

**Purpose:** Mask R-CNN food portion segmentor using Detectron2.

### Key Classes & Methods:

```python
@dataclass
class PortionResult:
    """Segmentation result for one detected food region."""
    mask: np.ndarray              # boolean H×W mask
    area_pixels: int
    weight_grams: float
    bbox: tuple[float, float, float, float]  # x1, y1, x2, y2
    score: float


class PortionSegmentor:
    """Mask R-CNN wrapper for food portion estimation."""
    
    __init__(
        score_threshold: float = MASK_RCNN_SCORE_THRESH,
        pixel_to_gram: float = PIXEL_TO_GRAM_RATIO,
        device: str | None = None,
    )
    
    segment(image_bgr: np.ndarray) -> list[PortionResult]
        # Run segmentation on BGR numpy image (OpenCV format)
        # Returns one PortionResult per detected instance
    
    total_weight(results: list[PortionResult]) -> float
        # Sum estimated weights across all portions
```

**Details:**
- Lazy-imports detectron2 (not required if only using classifier)
- Uses pre-trained `mask_rcnn_R_50_FPN_3x` from COCO dataset
- Accepts BGR numpy arrays (OpenCV format)
- Converts pixel areas to gram estimates using `pixel_to_gram` ratio
- Default threshold: 0.5 (configurable)
- Raises `ImportError` with installation instructions if detectron2 missing

---

## 4. Core Module: `nutri_vision/pipeline.py` (164 lines)

**Purpose:** End-to-end inference pipeline: image → classification → segmentation → calories.

### Key Classes & Methods:

```python
@dataclass
class PortionDetail:
    """Calorie breakdown for one detected food portion."""
    portion_index: int
    weight_grams: float
    calories_kcal: float
    bbox: tuple[float, float, float, float]
    mask: np.ndarray | None = field(default=None, repr=False)


@dataclass
class PipelineResult:
    """Full result returned by the NutriVision pipeline."""
    food_name: str
    food_index: int
    classification_confidence: float
    top_k_predictions: list[ClassificationResult]
    portions: list[PortionDetail]
    total_weight_grams: float
    total_calories_kcal: float
    calories_per_gram: float


class NutriVisionPipeline:
    """Orchestrates classification + segmentation + calorie estimation."""
    
    __init__(config: PredictConfig | None = None)
        # Initializes classifier, segmentor, calorie DB
    
    analyse(image_path: str | Path) -> PipelineResult
        # Run full pipeline on an image file
        # Loads image in PIL (RGB) + OpenCV (BGR) formats
    
    analyse_image(
        pil_image: Image.Image,
        bgr_image: np.ndarray | None = None,
    ) -> PipelineResult
        # Run pipeline on already-loaded image objects
        # Synthesizes BGR image from PIL if not provided
```

**Pipeline Flow:**
1. Load image (PIL RGB + OpenCV BGR)
2. Classify → get top-k predictions
3. Segment → get portions with masks & bboxes
4. Lookup calorie density for top prediction
5. Calculate calories per portion
6. Return aggregated result with breakdown

---

## 5. Core Module: `nutri_vision/config.py` (77 lines)

**Purpose:** Centralized configuration for training & inference.

### Key Constants:

```python
# Paths
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = _PROJECT_ROOT / "data"
CLASSES_FILE = DATA_DIR / "classes.txt"
CALORIES_FILE = DATA_DIR / "food_calories.csv"

# Model defaults
VIT_PRETRAINED = "google/vit-base-patch16-224"  # ← HuggingFace model ID
NUM_FOOD_CLASSES = 251
IMAGE_SIZE = 224

MASK_RCNN_CONFIG = "COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"
MASK_RCNN_SCORE_THRESH = 0.5
PIXEL_TO_GRAM_RATIO = 100 / 10_000  # 100 g ≈ 10,000 pixels (adjustable)
```

### Config Dataclasses:

```python
@dataclass
class TrainConfig:
    """Training hyper-parameters (all overridable via CLI)."""
    train_dir: str = ""
    val_dir: str = ""
    output_dir: str = "checkpoints"
    pretrained: str = VIT_PRETRAINED
    num_labels: int = NUM_FOOD_CLASSES
    image_size: int = IMAGE_SIZE
    batch_size: int = 64
    num_workers: int = 4
    epochs: int = 10
    lr: float = 2e-5
    weight_decay: float = 0.01
    warmup_steps: int = 500
    patience: int = 3  # early-stopping patience
    use_amp: bool = True  # automatic mixed-precision
    seed: int = 42
    log_every_n_steps: int = 50
    resume: bool = False  # resume from training_state.pt checkpoint


@dataclass
class PredictConfig:
    """Inference settings."""
    vit_model_path: str = VIT_PRETRAINED
    score_threshold: float = MASK_RCNN_SCORE_THRESH
    pixel_to_gram: float = PIXEL_TO_GRAM_RATIO
    device: str = field(default_factory=lambda: "cuda" if torch.cuda.is_available() else "cpu")
    top_k: int = 5  # return top-k predictions


def get_device(requested: str | None = None) -> torch.device:
    """Resolve torch.device, falling back to CUDA when available."""
```

---

## 6. Checkpoint Inventory

### ✅ `checkpoints/food101/best_model/` (4 files)
```
class_names.txt           1.2 KB
config.json               5.4 KB    (ViT config)
model.safetensors        344 MB    (Fine-tuned ViT weights)
preprocessor_config.json  351 B    (Image processor config)
```
**Status:** ✅ Model checkpoint exists & ready to load

### ✅ `checkpoints/food101/training_state.pt` (687 MB)
**Status:** ✅ Exists — stores training state for resumption

### ✅ `checkpoints/inference_food101_2026-03-27/food101_inference_results.json`
**Status:** ✅ Exists — contains 40 test samples
**Sample Entry:**
```json
{
  "image": "data/food-101/test/apple_pie/1011328.jpg",
  "ground_truth": "apple_pie",
  "top1_pred": "apple_pie",
  "top1_conf": 0.5037,
  "top3": [...],
  "correct_top1": true
}
```
**Overall Accuracy:** 95% (38/40 correct)

---

## 7. Data Files

### ✅ `data/food_calories.csv` (exists)
**Format:** Predicted Food Class, Estimated Portion Size, Estimated Calories
**Sample rows:**
```
Macaron,100 grams,404 cal
Beignet,100 grams,450 cal
Cruller,100 grams,400 cal
Cockle (Food),100 grams,70 cal
```

### ❌ `notebooks/` directory
**Status:** Does NOT exist (no Jupyter notebooks in project)

---

## 8. Additional Core Modules (Not Requested)

### `nutri_vision/calorie_db.py` (5.2 KB)
- `CalorieDB` class: loads `food_calories.csv`, provides calorie lookups
- Key method: `calories_per_gram(class_index: int) -> float`

### `nutri_vision/utils.py` (2.9 KB)
- Helper utilities (image loading, path handling, etc.)

### `nutri_vision/vl.py` (3.3 KB)
- Vision-language utilities or additional model wrappers

---

## 9. Entry Points

### `inference.py` (2.7 KB)
Batch inference script for running predictions on datasets

### `app.py` (7.7 KB)
Streamlit web app for interactive inference

### `backend/` directory
Backend API (FastAPI/Flask) for server deployment

---

## Summary Table

| Component | Lines | Status | Purpose |
|-----------|-------|--------|---------|
| classifier.py | 110 | ✅ Complete | ViT food classification |
| segmentor.py | 99 | ✅ Complete | Mask R-CNN portion segmentation |
| pipeline.py | 164 | ✅ Complete | End-to-end orchestration |
| config.py | 77 | ✅ Complete | Configuration & constants |
| calorie_db.py | 5.2 KB | ✅ Complete | Calorie database |
| best_model/ | 344 MB | ✅ Ready | Fine-tuned ViT checkpoint |
| training_state.pt | 687 MB | ✅ Ready | Training state checkpoint |
| inference_results.json | Present | ✅ 95% acc | Test inference results |
| food_calories.csv | Present | ✅ Ready | Calorie lookup table |
| notebooks/ | — | ❌ Missing | No Jupyter notebooks |

---

## Key Takeaways

1. **Architecture:** Three-stage pipeline: Image → Classification → Segmentation → Calorie Estimation
2. **Models:** ViT (251-class) + Mask R-CNN (COCO pretrained)
3. **State:** Fully trained model ready (`best_model/`), recent inference results (95% accuracy)
4. **Config:** Centralized, dataclass-based, device-aware (CUDA/CPU)
5. **Dependencies:** transformers, detectron2 (lazy-loaded), torch, numpy, PIL, cv2
6. **Scale:** 251 food classes, supports batch inference
7. **Deployment:** Ready for inference; backend API + Streamlit app available

---

## Unresolved Questions

- [ ] What's in `backend/` directory? (FastAPI vs Flask?)
- [ ] Mobile app structure (`mobile/`)?
- [ ] How are training checkpoints managed (multi-epoch saves)?
- [ ] Inference batch size limits?
- [ ] Calibration status of pixel-to-gram ratio?
- [ ] Food-101 vs FoodX dataset? (251 classes suggests neither vanilla)

