"""Training report generator — plots + Markdown report for NutriVision ViT training."""

from __future__ import annotations

import logging
from pathlib import Path

import matplotlib.pyplot as plt

from nutri_vision.config import TrainConfig

logger = logging.getLogger(__name__)


def generate_training_report(
    history: dict,
    best_val_acc: float,
    cfg: TrainConfig,
    out_dir: Path,
) -> None:
    """Generate loss/accuracy plots and a Markdown training report."""
    logger.info("Generating evaluation plots and Markdown report...")

    # --- Plots ---
    epochs = range(1, len(history["train_loss"]) + 1)
    plt.figure(figsize=(14, 5))

    plt.subplot(1, 2, 1)
    plt.plot(epochs, history["train_loss"], label="Train Loss", marker="o")
    plt.plot(epochs, history["val_loss"], label="Val Loss", marker="s")
    plt.title("Training vs Validation Loss")
    plt.xlabel("Epochs")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True)

    plt.subplot(1, 2, 2)
    plt.plot(epochs, history["train_acc"], label="Train Acc", marker="o")
    plt.plot(epochs, history["val_acc"], label="Val Acc", marker="s")
    plt.title("Training vs Validation Accuracy")
    plt.xlabel("Epochs")
    plt.ylabel("Accuracy")
    plt.legend()
    plt.grid(True)

    plt.tight_layout()
    plt.savefig(out_dir / "training_curves.png")
    plt.close()

    # --- Markdown report ---
    report = f"""# NutriVision Model Training Report

## 1. Model Development
This project builds a visual food recognition system spanning `{cfg.num_labels}` classes.
The core architecture uses a pre-trained Vision Transformer (`{cfg.pretrained}`).
ViT extracts non-local attention features across `{cfg.image_size}x{cfg.image_size}` image patches.

## 2. Fine-Tuning
The pre-trained transformer was fine-tuned on the FoodX-251 dataset.
- **Techniques**: Automatic Mixed Precision (AMP), Gradient Scaling, Label Smoothing, OneCycleLR.
- **Augmentation**: Random scaled crops, horizontal flips, color jitter.

**Hyperparameters**:
- Base Model: `{cfg.pretrained}`
- Epochs: `{cfg.epochs}` (Early stopping patience: `{cfg.patience}`)
- Batch Size: `{cfg.batch_size}`
- Peak Learning Rate: `{cfg.lr}`

## 3. Training Dynamics

![Training Curves](./training_curves.png)

## 4. Model Evaluation
- **Peak Validation Accuracy**: `{best_val_acc:.4f}` ({best_val_acc * 100:.2f}%)
- **Classes**: {cfg.num_labels}

## 5. Next Steps
1. **Deployment**: Load checkpoint via `ViTForImageClassification.from_pretrained('{cfg.output_dir}/best_model')`.
2. **Further Tuning**: Hard-negative mining for visually similar classes (e.g. soups, curries).
3. **Integration**: Pipe outputs through Mask R-CNN for portion estimation in NutriVision dashboard.
"""
    report_path = out_dir / "TRAINING_REPORT.md"
    report_path.write_text(report, encoding="utf-8")
    logger.info("Report saved at %s", report_path)
