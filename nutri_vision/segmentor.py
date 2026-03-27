"""Mask R-CNN food portion segmentor.

Uses Detectron2's pre-trained ``mask_rcnn_R_50_FPN_3x`` to produce
instance segmentation masks, then converts pixel areas to gram estimates.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from .config import MASK_RCNN_CONFIG, MASK_RCNN_SCORE_THRESH, PIXEL_TO_GRAM_RATIO, get_device

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------
@dataclass
class PortionResult:
    """Segmentation result for one detected food region."""

    mask: np.ndarray  # boolean H×W mask
    area_pixels: int
    weight_grams: float
    bbox: tuple[float, float, float, float]  # x1, y1, x2, y2
    score: float


# ---------------------------------------------------------------------------
# Segmentor
# ---------------------------------------------------------------------------
class PortionSegmentor:
    """Mask R-CNN wrapper for food portion estimation."""

    def __init__(
        self,
        score_threshold: float = MASK_RCNN_SCORE_THRESH,
        pixel_to_gram: float = PIXEL_TO_GRAM_RATIO,
        device: str | None = None,
    ) -> None:
        # Lazy-import detectron2 so the rest of the package works without it
        try:
            from detectron2 import model_zoo
            from detectron2.config import get_cfg
            from detectron2.engine import DefaultPredictor
        except ImportError as exc:
            raise ImportError(
                "detectron2 is required for segmentation. Install with:\n"
                "  uv pip install 'git+https://github.com/facebookresearch/detectron2.git' --no-build-isolation"
            ) from exc

        self.pixel_to_gram = pixel_to_gram
        _device = get_device(device)

        cfg = get_cfg()
        cfg.merge_from_file(model_zoo.get_config_file(MASK_RCNN_CONFIG))
        cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url(MASK_RCNN_CONFIG)
        cfg.MODEL.DEVICE = str(_device)
        cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = score_threshold
        self.predictor = DefaultPredictor(cfg)
        logger.info("Segmentor ready on %s (threshold=%.2f)", _device, score_threshold)

    # ------------------------------------------------------------------
    def segment(self, image_bgr: np.ndarray) -> list[PortionResult]:
        """Run segmentation on a BGR numpy image (OpenCV format).

        Returns one :class:`PortionResult` per detected instance.
        """
        outputs = self.predictor(image_bgr)
        instances = outputs["instances"].to("cpu")

        masks = instances.pred_masks.numpy() if instances.has("pred_masks") else []
        boxes = instances.pred_boxes.tensor.numpy() if instances.has("pred_boxes") else []
        scores = instances.scores.numpy() if instances.has("scores") else []

        results: list[PortionResult] = []
        for mask, box, score in zip(masks, boxes, scores):
            area = int(np.sum(mask))
            grams = area * self.pixel_to_gram
            results.append(
                PortionResult(
                    mask=mask,
                    area_pixels=area,
                    weight_grams=grams,
                    bbox=tuple(box.tolist()),
                    score=float(score),
                )
            )
        return results

    # ------------------------------------------------------------------
    def total_weight(self, results: list[PortionResult]) -> float:
        """Sum estimated weights across all portions."""
        return sum(r.weight_grams for r in results)
