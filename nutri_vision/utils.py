"""Shared visualisation and I/O utilities."""

from __future__ import annotations

import logging
from pathlib import Path

import cv2
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger with a clean format."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
        datefmt="%H:%M:%S",
    )


def load_image(path: str | Path) -> tuple[Image.Image, np.ndarray]:
    """Load an image as both PIL (RGB) and OpenCV (BGR).

    Returns
    -------
    tuple[Image.Image, np.ndarray]
    """
    path = Path(path)
    pil_img = Image.open(path).convert("RGB")
    bgr_img = cv2.imread(str(path))
    if bgr_img is None:
        raise ValueError(f"OpenCV could not read: {path}")
    return pil_img, bgr_img


def draw_results(
    bgr_image: np.ndarray,
    food_name: str,
    portions: list,
    total_cal: float,
    *,
    show: bool = True,
    save_path: str | Path | None = None,
) -> np.ndarray:
    """Draw bounding boxes and calorie labels on the image.

    Parameters
    ----------
    bgr_image:
        Original BGR image.
    food_name:
        Predicted food class name.
    portions:
        List of ``PortionDetail`` objects.
    total_cal:
        Total estimated calories.
    show:
        Whether to display with matplotlib.
    save_path:
        Optional path to save the annotated image.

    Returns
    -------
    np.ndarray
        Annotated BGR image.
    """
    annotated = bgr_image.copy()

    for p in portions:
        x1, y1, x2, y2 = [int(v) for v in p.bbox]
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

        label = f"#{p.portion_index}: {p.weight_grams:.0f}g | {p.calories_kcal:.0f} kcal"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), (0, 255, 0), -1)
        cv2.putText(
            annotated,
            label,
            (x1 + 2, y1 - 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 0, 0),
            1,
            cv2.LINE_AA,
        )

    # Header
    header = f"{food_name}  —  Total: {total_cal:.0f} kcal"
    cv2.putText(
        annotated,
        header,
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (0, 200, 255),
        2,
        cv2.LINE_AA,
    )

    if save_path:
        cv2.imwrite(str(save_path), annotated)
        logger.info("Saved annotated image to %s", save_path)

    if show:
        rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        plt.figure(figsize=(12, 8))
        plt.imshow(rgb)
        plt.axis("off")
        plt.title(header, fontsize=14)
        plt.tight_layout()
        plt.show()

    return annotated
