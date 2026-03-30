"""Centralised configuration for NutriVision."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import torch

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = _PROJECT_ROOT / "data"
CLASSES_FILE = DATA_DIR / "classes.txt"
CALORIES_FILE = DATA_DIR / "food_calories.csv"

# ---------------------------------------------------------------------------
# Model defaults
# ---------------------------------------------------------------------------
VIT_PRETRAINED = "google/vit-base-patch16-224"
NUM_FOOD_CLASSES = 251
IMAGE_SIZE = 224

MASK_RCNN_CONFIG = "COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"
MASK_RCNN_SCORE_THRESH = 0.5

PIXEL_TO_GRAM_RATIO = 100 / 10_000  # 100 g ≈ 10 000 pixels (adjustable)


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
    resume: bool = False  # resume from last training_state.pt checkpoint


@dataclass
class PredictConfig:
    """Inference settings."""

    vit_model_path: str = VIT_PRETRAINED
    score_threshold: float = MASK_RCNN_SCORE_THRESH
    pixel_to_gram: float = PIXEL_TO_GRAM_RATIO
    device: str = field(default_factory=lambda: "cuda" if torch.cuda.is_available() else "cpu")
    top_k: int = 5  # return top-k predictions


def get_device(requested: str | None = None) -> torch.device:
    """Resolve a ``torch.device``, falling back to CUDA when available."""
    if requested:
        return torch.device(requested)
    if torch.cuda.is_available():
        logger.info("CUDA available — using GPU")
        return torch.device("cuda")
    logger.info("CUDA not available — using CPU")
    return torch.device("cpu")
