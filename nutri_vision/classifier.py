"""ViT-based food image classifier.

Wraps HuggingFace ``ViTForImageClassification`` with convenience methods
for loading pre-trained / fine-tuned weights, preprocessing, and batched
inference with top-k results.
"""

from __future__ import annotations

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
# Classifier
# ---------------------------------------------------------------------------
class FoodClassifier:
    """Vision Transformer food classifier (251 FoodX classes)."""

    def __init__(
        self,
        model_path: str | Path = VIT_PRETRAINED,
        class_names: list[str] | None = None,
        device: str | None = None,
    ) -> None:
        self.device = get_device(device)
        self.class_names = class_names or []

        model_path = str(model_path)
        logger.info("Loading ViT model from %s", model_path)

        # Use ViTImageProcessor (modern replacement for deprecated ViTFeatureExtractor)
        try:
            self.processor = ViTImageProcessor.from_pretrained(model_path)
        except Exception:
            # Fine-tuned checkpoints sometimes lack processor config — fall back
            self.processor = ViTImageProcessor.from_pretrained(VIT_PRETRAINED)

        self.model = ViTForImageClassification.from_pretrained(
            model_path,
            num_labels=NUM_FOOD_CLASSES,
            ignore_mismatched_sizes=True,
        ).to(self.device)
        self.model.eval()
        logger.info("Classifier ready on %s", self.device)

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
