"""End-to-end NutriVision inference pipeline.

Chains: image → ViT classification → Mask R-CNN segmentation → calorie estimate.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from .calorie_db import CalorieDB
from .classifier import ClassificationResult, FoodClassifier
from .config import PredictConfig
from .segmentor import PortionResult, PortionSegmentor

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pipeline result
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------
class NutriVisionPipeline:
    """Orchestrates classification + segmentation + calorie estimation."""

    def __init__(self, config: PredictConfig | None = None) -> None:
        self.cfg = config or PredictConfig()

        # Calorie database
        self.calorie_db = CalorieDB()

        # Classifier
        self.classifier = FoodClassifier(
            model_path=self.cfg.vit_model_path,
            class_names=self.calorie_db.class_names,
            device=self.cfg.device,
        )

        # Segmentor
        self.segmentor = PortionSegmentor(
            score_threshold=self.cfg.score_threshold,
            pixel_to_gram=self.cfg.pixel_to_gram,
            device=self.cfg.device,
        )

        logger.info("NutriVision pipeline initialised")

    # ------------------------------------------------------------------
    def analyse(self, image_path: str | Path) -> PipelineResult:
        """Run the full pipeline on an image file.

        Parameters
        ----------
        image_path:
            Path to a food image (JPEG / PNG).

        Returns
        -------
        PipelineResult
            Contains food name, portions, and calorie estimates.
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        # 1. Load image in both formats
        pil_image = Image.open(image_path).convert("RGB")
        bgr_image = cv2.imread(str(image_path))
        if bgr_image is None:
            raise ValueError(f"OpenCV could not read: {image_path}")

        return self.analyse_image(pil_image, bgr_image)

    # ------------------------------------------------------------------
    def analyse_image(
        self,
        pil_image: Image.Image,
        bgr_image: np.ndarray | None = None,
    ) -> PipelineResult:
        """Run the pipeline on already-loaded image objects.

        Parameters
        ----------
        pil_image:
            RGB PIL image for the classifier.
        bgr_image:
            BGR numpy array for the segmentor. If ``None``, one is
            synthesised from *pil_image*.
        """
        if bgr_image is None:
            rgb = np.array(pil_image)
            bgr_image = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

        # 2. Classify
        predictions = self.classifier.predict(pil_image, top_k=self.cfg.top_k)
        top = predictions[0]

        # 3. Segment
        portions_raw: list[PortionResult] = self.segmentor.segment(bgr_image)

        # 4. Calorie density for predicted class
        cpg = self.calorie_db.calories_per_gram(top.class_index)

        # 5. Build portion details
        portions: list[PortionDetail] = []
        total_weight = 0.0
        total_cal = 0.0
        for i, p in enumerate(portions_raw):
            cal = p.weight_grams * cpg
            portions.append(
                PortionDetail(
                    portion_index=i + 1,
                    weight_grams=round(p.weight_grams, 2),
                    calories_kcal=round(cal, 2),
                    bbox=p.bbox,
                    mask=p.mask,
                )
            )
            total_weight += p.weight_grams
            total_cal += cal

        return PipelineResult(
            food_name=top.class_name,
            food_index=top.class_index,
            classification_confidence=round(top.confidence, 4),
            top_k_predictions=predictions,
            portions=portions,
            total_weight_grams=round(total_weight, 2),
            total_calories_kcal=round(total_cal, 2),
            calories_per_gram=round(cpg, 4),
        )
