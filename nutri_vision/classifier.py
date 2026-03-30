"""ViT-based food image classifier.

Wraps HuggingFace ``ViTForImageClassification`` with convenience methods
for loading pre-trained / fine-tuned weights, preprocessing, and batched
inference with top-k results.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import torch
from PIL import Image
from transformers import ViTForImageClassification, ViTImageProcessor

from .config import NUM_FOOD_CLASSES, VIT_PRETRAINED, get_device

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------
@dataclass
class ClassificationResult:
    """Single classification prediction."""

    class_index: int
    class_name: str
    confidence: float


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _read_checkpoint_id2label(model_path: Path) -> dict[int, str]:
    """Read id2label mapping from a local checkpoint's config.json.

    Returns an empty dict if the file is absent or has no id2label.
    """
    cfg_file = model_path / "config.json"
    if not cfg_file.exists():
        return {}
    try:
        raw = json.loads(cfg_file.read_text())
        return {int(k): v for k, v in raw.get("id2label", {}).items()}
    except Exception as exc:
        logger.warning("Could not parse id2label from %s: %s", cfg_file, exc)
        return {}


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------
class FoodClassifier:
    """Vision Transformer food classifier.

    Supports any number of food classes — ``num_labels`` is auto-detected
    from the checkpoint's ``id2label`` mapping so the fine-tuned head is
    never accidentally re-initialised.
    """

    def __init__(
        self,
        model_path: str | Path = VIT_PRETRAINED,
        class_names: list[str] | None = None,
        device: str | None = None,
    ) -> None:
        self.device = get_device(device)
        model_path_obj = Path(model_path)
        model_path_str = str(model_path)
        logger.info("Loading ViT model from %s", model_path_str)

        # --- Processor -------------------------------------------------------
        # Use ViTImageProcessor (modern replacement for deprecated ViTFeatureExtractor)
        try:
            self.processor = ViTImageProcessor.from_pretrained(model_path_str)
        except Exception:
            # Fine-tuned checkpoints sometimes lack processor config — fall back
            self.processor = ViTImageProcessor.from_pretrained(VIT_PRETRAINED)

        # --- Model -----------------------------------------------------------
        # For local fine-tuned checkpoints, let HuggingFace read num_labels
        # from config.json so the trained classification head is preserved.
        # Only fall back to NUM_FOOD_CLASSES for hub IDs (no local config.json).
        is_local = model_path_obj.is_dir()
        id2label = _read_checkpoint_id2label(model_path_obj) if is_local else {}

        if id2label:
            # Checkpoint has explicit id2label — use it to set num_labels
            num_labels = len(id2label)
            self.model = ViTForImageClassification.from_pretrained(
                model_path_str,
                num_labels=num_labels,
            ).to(self.device)
        else:
            # HuggingFace hub or checkpoint without id2label — use global default
            self.model = ViTForImageClassification.from_pretrained(
                model_path_str,
                num_labels=NUM_FOOD_CLASSES,
                ignore_mismatched_sizes=True,
            ).to(self.device)

        # --- Class names -----------------------------------------------------
        # Priority: explicit caller list > id2label > placeholder names
        if class_names:
            self.class_names = class_names
        elif id2label:
            self.class_names = [id2label[i] for i in range(len(id2label))]
        else:
            self.class_names = []

        self.model.eval()
        logger.info(
            "Classifier ready on %s (%d classes)", self.device, len(self.class_names)
        )

    # ------------------------------------------------------------------
    @torch.inference_mode()
    def predict(
        self,
        image: Image.Image,
        top_k: int = 5,
    ) -> list[ClassificationResult]:
        """Return the top-*k* predictions for a single PIL image."""
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        logits = self.model(**inputs).logits.squeeze(0)
        probs = torch.softmax(logits, dim=-1)

        topk = torch.topk(probs, k=min(top_k, probs.shape[0]))
        results: list[ClassificationResult] = []
        for idx, prob in zip(topk.indices.tolist(), topk.values.tolist()):
            name = self.class_names[idx] if idx < len(self.class_names) else f"class_{idx}"
            results.append(ClassificationResult(class_index=idx, class_name=name, confidence=prob))
        return results

    # ------------------------------------------------------------------
    @torch.inference_mode()
    def predict_batch(
        self,
        images: list[Image.Image],
        top_k: int = 5,
    ) -> list[list[ClassificationResult]]:
        """Batched prediction for multiple images."""
        inputs = self.processor(images=images, return_tensors="pt").to(self.device)
        logits = self.model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)

        batch_results: list[list[ClassificationResult]] = []
        for row in probs:
            topk = torch.topk(row, k=min(top_k, row.shape[0]))
            results = []
            for idx, prob in zip(topk.indices.tolist(), topk.values.tolist()):
                name = self.class_names[idx] if idx < len(self.class_names) else f"class_{idx}"
                results.append(
                    ClassificationResult(class_index=idx, class_name=name, confidence=prob)
                )
            batch_results.append(results)
        return batch_results
