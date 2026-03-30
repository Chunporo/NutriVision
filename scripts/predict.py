"""
NutriVision — CLI prediction script.

Usage:
    python -m scripts.predict image.jpg
    python -m scripts.predict image.jpg --model checkpoints/best_model --top-k 3
    python -m scripts.predict images_dir/ --save-dir results/
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from nutri_vision.config import PredictConfig
from nutri_vision.pipeline import NutriVisionPipeline
from nutri_vision.utils import draw_results, load_image, setup_logging

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def predict_single(pipeline: NutriVisionPipeline, image_path: Path, save_dir: Path | None):
    """Predict and optionally save results for a single image."""
    result = pipeline.analyse(image_path)

    print(f"\n{'='*60}")
    print(f"  Image : {image_path.name}")
    print(f"  Food  : {result.food_name} ({result.classification_confidence:.1%})")
    print(f"  Weight: {result.total_weight_grams:.1f} g")
    print(f"  Kcal  : {result.total_calories_kcal:.1f} kcal")
    print(f"  Kcal/g: {result.calories_per_gram:.2f}")
    print(f"{'='*60}")

    if result.top_k_predictions:
        print("  Top predictions:")
        for p in result.top_k_predictions:
            print(f"    {p.class_index:3d}  {p.class_name:<30s}  {p.confidence:.2%}")

    if result.portions:
        print(f"\n  {len(result.portions)} portion(s) detected:")
        for p in result.portions:
            print(f"    #{p.portion_index}: {p.weight_grams:.1f}g  →  {p.calories_kcal:.1f} kcal")

    if save_dir:
        save_dir.mkdir(parents=True, exist_ok=True)
        _, bgr = load_image(image_path)
        save_path = save_dir / f"{image_path.stem}_annotated.jpg"
        draw_results(
            bgr, result.food_name, result.portions, result.total_calories_kcal,
            show=False, save_path=save_path,
        )
        # Also save JSON
        json_path = save_dir / f"{image_path.stem}_result.json"
        json_data = {
            "image": str(image_path),
            "food_name": result.food_name,
            "confidence": result.classification_confidence,
            "total_weight_grams": result.total_weight_grams,
            "total_calories_kcal": result.total_calories_kcal,
            "portions": [
                {"index": p.portion_index, "grams": p.weight_grams, "kcal": p.calories_kcal}
                for p in result.portions
            ],
        }
        json_path.write_text(json.dumps(json_data, indent=2))
        logger.info("Results saved to %s", save_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description="NutriVision — food calorie prediction")
    parser.add_argument("input", help="Image file or directory of images")
    parser.add_argument("--model", default=None, help="Path to fine-tuned ViT checkpoint")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--threshold", type=float, default=0.5, help="Segmentation score threshold")
    parser.add_argument("--save-dir", default=None, help="Directory to save annotated images + JSON")
    parser.add_argument("--device", default=None, help="Force device (cuda/cpu)")
    args = parser.parse_args()

    setup_logging()

    cfg = PredictConfig(
        vit_model_path=args.model or PredictConfig.vit_model_path,
        score_threshold=args.threshold,
        top_k=args.top_k,
    )
    if args.device:
        cfg.device = args.device

    pipeline = NutriVisionPipeline(config=cfg)

    input_path = Path(args.input)
    save_dir = Path(args.save_dir) if args.save_dir else None

    if input_path.is_file():
        predict_single(pipeline, input_path, save_dir)
    elif input_path.is_dir():
        images = sorted(
            p for p in input_path.iterdir() if p.suffix.lower() in SUPPORTED_EXTENSIONS
        )
        logger.info("Found %d images in %s", len(images), input_path)
        for img_path in images:
            try:
                predict_single(pipeline, img_path, save_dir)
            except Exception as exc:
                logger.error("Failed on %s: %s", img_path.name, exc)
    else:
        raise FileNotFoundError(f"Not found: {input_path}")


if __name__ == "__main__":
    main()
