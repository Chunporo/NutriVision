"""
NutriVision — Gradio web interface.

Dual-mode food analysis:
  • Mode 1 (VL): Qwen3-VL with LoRA adapter for detailed nutritional JSON
  • Mode 2 (Pipeline): ViT classification + Mask R-CNN segmentation + calorie DB

Launch:
    python app.py
    python app.py --share
"""

from __future__ import annotations

import logging
import inspect
from typing import Any

import gradio as gr
import numpy as np
from PIL import Image

from nutri_vision.vl import analyze_vl_image

logger = logging.getLogger(__name__)

def analyze_food_vl(image: Image.Image | None) -> dict:
    """Analyse a food image using the Qwen3-VL + LoRA model."""
    if image is None:
        return {"error": "Please upload an image."}

    try:
        return analyze_vl_image(image)
    except Exception as exc:
        return {"error": str(exc)}


# ───────────────────────────────────────────────────────────────────
# Pipeline Model (ViT + Mask R-CNN) — lazy-loaded
# ───────────────────────────────────────────────────────────────────
_pipeline = None


def _load_pipeline():
    """Load the ViT + Mask R-CNN pipeline on first use."""
    global _pipeline

    if _pipeline is not None:
        return _pipeline

    from nutri_vision.config import PredictConfig
    from nutri_vision.pipeline import NutriVisionPipeline

    logger.info("Loading ViT + Mask R-CNN pipeline...")
    _pipeline = NutriVisionPipeline(config=PredictConfig())
    logger.info("Pipeline ready")
    return _pipeline


def analyze_food_pipeline(
    image: np.ndarray | None,
) -> tuple[np.ndarray | None, str, str]:
    """Analyse using ViT classification + Mask R-CNN segmentation."""
    import cv2

    if image is None:
        return None, "⚠️ Please upload an image.", ""

    try:
        pipeline = _load_pipeline()
        pil_image = Image.fromarray(image)
        bgr_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        result = pipeline.analyse_image(pil_image, bgr_image)

        # Draw annotations on image
        annotated = bgr_image.copy()
        for p in result.portions:
            x1, y1, x2, y2 = [int(v) for v in p.bbox]
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"#{p.portion_index}: {p.weight_grams:.0f}g | {p.calories_kcal:.0f} kcal"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), (0, 255, 0), -1)
            cv2.putText(
                annotated, label, (x1 + 2, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1, cv2.LINE_AA,
            )
        header = f"{result.food_name} — {result.total_calories_kcal:.0f} kcal"
        cv2.putText(
            annotated, header, (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 200, 255), 2, cv2.LINE_AA,
        )
        annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)

        # Summary
        summary = (
            f"## 🍽️ {result.food_name}\n\n"
            f"| Metric | Value |\n"
            f"|--------|-------|\n"
            f"| **Confidence** | {result.classification_confidence:.1%} |\n"
            f"| **Weight** | {result.total_weight_grams:.1f} g |\n"
            f"| **Calories** | {result.total_calories_kcal:.1f} kcal |\n"
            f"| **Density** | {result.calories_per_gram:.2f} kcal/g |\n"
            f"| **Portions** | {len(result.portions)} |\n"
        )

        # Details
        lines = ["### Top Predictions\n", "| # | Food | Confidence |", "|---|------|------------|"]
        for i, p in enumerate(result.top_k_predictions, 1):
            lines.append(f"| {i} | {p.class_name} | {p.confidence:.2%} |")
        if result.portions:
            lines += ["\n### Portions\n", "| # | Weight | Calories |", "|---|--------|----------|"]
            for p in result.portions:
                lines.append(f"| {p.portion_index} | {p.weight_grams:.1f}g | {p.calories_kcal:.1f} kcal |")

        return annotated_rgb, summary, "\n".join(lines)

    except Exception as exc:
        logger.exception("Pipeline prediction failed")
        return None, f"❌ Error: {exc}", ""


# ───────────────────────────────────────────────────────────────────
# Gradio App
# ───────────────────────────────────────────────────────────────────
CSS = """
body { font-family: 'Inter', sans-serif; }
.gradio-container { max-width: 1100px !important; margin: auto; }
"""


def analyze_all(pil_image: Image.Image | None) -> dict:
    if pil_image is None:
        return {"error": "Please upload an image."}

    # Run VL Model
    vl_res = analyze_food_vl(pil_image)

    return vl_res


def build_app() -> Any:
    blocks_cls = getattr(gr, "Blocks", None)
    if blocks_cls is None:
        # Compatibility fallback for very old Gradio versions.
        return gr.Interface(
            fn=analyze_all,
            inputs=gr.Image(type="pil", label="Upload Food Image"),
            outputs=gr.JSON(label="Nutritional Information"),
            title="NutriVision: AI Food Analyzer",
            description="Upload a food photo for instant nutritional analysis.",
            allow_flagging="never",
        )

    with blocks_cls(title="NutriVision") as app:

        gr.Markdown(
            "# 🥗 NutriVision: AI Food Analyzer\n"
            "*Upload a food photo for instant nutritional analysis.*"
        )

        with gr.Row():
            with gr.Column(scale=1):
                image_input = gr.Image(
                    type="pil", label="Upload Food Image",
                    sources=["upload", "clipboard", "webcam"],
                )
                analyze_btn = gr.Button("Analyze Food 🔍", variant="primary", size="lg")

            with gr.Column(scale=1):
                gr.Markdown("### 🤖 Nutrition Analysis")
                vl_json = gr.JSON(label="Nutritional Information")

        analyze_btn.click(
            fn=analyze_all,
            inputs=image_input,
            outputs=[vl_json]
        )

        gr.Markdown(
            "---\n"
            "*Tip: Use well-lit photos with food clearly visible for best results.*"
        )

    return app


if __name__ == "__main__":
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="NutriVision Gradio App")
    parser.add_argument("--share", action="store_true", help="Create public link")
    parser.add_argument("--port", type=int, default=7860)
    args = parser.parse_args()

    demo = build_app()
    launch_kwargs = {
        "server_name": "0.0.0.0",
        "server_port": args.port,
        "share": args.share,
        "css": CSS,
    }

    # Older Gradio versions do not support all launch-time parameters.
    launch_params = inspect.signature(demo.launch).parameters
    launch_kwargs = {k: v for k, v in launch_kwargs.items() if k in launch_params}

    if hasattr(gr, "themes") and hasattr(gr.themes, "Soft"):
        launch_kwargs["theme"] = gr.themes.Soft(primary_hue="emerald")

    demo.launch(**launch_kwargs)
