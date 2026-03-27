"""
NutriVision — ViT fine-tuning script.

Usage:
    uv run nutri-train \
        --train-dir data/FoodX-251/organized_train_set \
        --val-dir   data/FoodX-251/organized_val_set \
        --epochs 10 --batch-size 32

    # Resume from last checkpoint:
    uv run nutri-train --train-dir ... --val-dir ... --resume
"""

from __future__ import annotations

import argparse
import logging
import random
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn, optim
from torch.amp import GradScaler, autocast  # non-deprecated API (PyTorch >=2.0)
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from transformers import ViTForImageClassification, ViTImageProcessor

from nutri_vision.config import VIT_PRETRAINED, TrainConfig
from nutri_vision.utils import setup_logging
from scripts.train_report_generator import generate_training_report

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def build_loaders(cfg: TrainConfig) -> tuple[DataLoader, DataLoader, list[str]]:
    """Build train/val DataLoaders and return detected class names."""
    processor = ViTImageProcessor.from_pretrained(cfg.pretrained)

    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(cfg.image_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=processor.image_mean, std=processor.image_std),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(cfg.image_size + 32),
        transforms.CenterCrop(cfg.image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=processor.image_mean, std=processor.image_std),
    ])

    train_ds = datasets.ImageFolder(cfg.train_dir, transform=train_tf)
    val_ds = datasets.ImageFolder(cfg.val_dir, transform=val_tf)

    class_names = train_ds.classes
    cfg.num_labels = len(class_names)  # auto-detect from folder structure
    logger.info("Detected %d classes in %s", cfg.num_labels, cfg.train_dir)

    train_loader = DataLoader(
        train_ds, batch_size=cfg.batch_size, shuffle=True,
        num_workers=cfg.num_workers, pin_memory=True, drop_last=True,
    )
    val_loader = DataLoader(
        val_ds, batch_size=cfg.batch_size, shuffle=False,
        num_workers=cfg.num_workers, pin_memory=True,
    )
    return train_loader, val_loader, class_names


def _save_checkpoint(
    model: ViTForImageClassification,
    processor: ViTImageProcessor,
    class_names: list[str],
    optimizer: optim.Optimizer,
    scheduler: optim.lr_scheduler.LRScheduler,
    scaler: GradScaler,
    epoch: int,
    best_val_acc: float,
    history: dict,
    out_dir: Path,
) -> None:
    """Save model + processor + class names + full training state for resume."""
    best_path = out_dir / "best_model"

    # Persist id2label / label2id in model config before saving
    model.config.id2label = {i: name for i, name in enumerate(class_names)}
    model.config.label2id = {name: i for i, name in enumerate(class_names)}

    model.save_pretrained(str(best_path))
    processor.save_pretrained(str(best_path))
    (best_path / "class_names.txt").write_text("\n".join(class_names), encoding="utf-8")

    # Full training state for --resume
    torch.save(
        {
            "epoch": epoch,
            "best_val_acc": best_val_acc,
            "optimizer": optimizer.state_dict(),
            "scheduler": scheduler.state_dict(),
            "scaler": scaler.state_dict(),
            "history": history,
        },
        out_dir / "training_state.pt",
    )
    logger.info("✓ Checkpoint saved (epoch=%d, val_acc=%.4f) → %s", epoch, best_val_acc, best_path)


# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------
def train(cfg: TrainConfig) -> Path:
    """Fine-tune ViT, save checkpoint, generate report. Returns path to best model."""
    setup_logging()
    seed_everything(cfg.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Device: %s", device)

    train_loader, val_loader, class_names = build_loaders(cfg)
    processor = ViTImageProcessor.from_pretrained(cfg.pretrained)

    model = ViTForImageClassification.from_pretrained(
        cfg.pretrained, num_labels=cfg.num_labels, ignore_mismatched_sizes=True,
    ).to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    total_steps = len(train_loader) * cfg.epochs
    scheduler = optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=cfg.lr, total_steps=total_steps, pct_start=0.1,
    )
    scaler = GradScaler("cuda", enabled=cfg.use_amp)

    out_dir = Path(cfg.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Training state
    best_val_acc = 0.0
    patience_counter = 0
    global_step = 0
    start_epoch = 1
    history: dict = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    # Resume from checkpoint if requested
    state_path = out_dir / "training_state.pt"
    if cfg.resume and state_path.exists():
        state = torch.load(state_path, map_location=device)
        start_epoch = state["epoch"] + 1
        best_val_acc = state["best_val_acc"]
        history = state["history"]
        optimizer.load_state_dict(state["optimizer"])
        scheduler.load_state_dict(state["scheduler"])
        scaler.load_state_dict(state["scaler"])
        # Load model weights from saved best_model
        best_path = out_dir / "best_model"
        model = ViTForImageClassification.from_pretrained(str(best_path)).to(device)
        logger.info("Resumed from epoch %d (best_val_acc=%.4f)", state["epoch"], best_val_acc)
    elif cfg.resume:
        logger.warning("--resume requested but no training_state.pt found — starting fresh")

    for epoch in range(start_epoch, cfg.epochs + 1):
        # ---- Train ----
        model.train()
        run_loss, correct, total = 0.0, 0, 0
        t0 = time.time()

        for batch_idx, (images, labels) in enumerate(train_loader, 1):
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)

            with autocast("cuda", enabled=cfg.use_amp):
                logits = model(images).logits
                loss = criterion(logits, labels)

            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()

            preds = logits.argmax(dim=-1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            run_loss += loss.item()
            global_step += 1

            if global_step % cfg.log_every_n_steps == 0:
                logger.info(
                    "Epoch %d [%d/%d]  loss=%.4f  acc=%.4f  lr=%.2e",
                    epoch, batch_idx, len(train_loader),
                    run_loss / batch_idx, correct / total,
                    scheduler.get_last_lr()[0],
                )

        train_loss = run_loss / len(train_loader)
        train_acc = correct / total

        # ---- Validate ----
        model.eval()
        val_correct, val_total, val_loss_sum = 0, 0, 0.0
        with torch.inference_mode():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                logits = model(images).logits
                val_loss_sum += criterion(logits, labels).item()
                val_correct += (logits.argmax(-1) == labels).sum().item()
                val_total += labels.size(0)

        val_loss = val_loss_sum / len(val_loader)
        val_acc = val_correct / val_total
        elapsed = time.time() - t0

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        logger.info(
            "Epoch %d/%d  train_loss=%.4f  train_acc=%.4f  val_loss=%.4f  val_acc=%.4f  %.0fs",
            epoch, cfg.epochs, train_loss, train_acc, val_loss, val_acc, elapsed,
        )

        # ---- Checkpoint ----
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            _save_checkpoint(
                model, processor, class_names,
                optimizer, scheduler, scaler,
                epoch, best_val_acc, history, out_dir,
            )
        else:
            patience_counter += 1
            if patience_counter >= cfg.patience:
                logger.info("Early stopping after %d epochs without improvement", cfg.patience)
                break

    logger.info("Training complete. Best val_acc=%.4f", best_val_acc)
    generate_training_report(history, best_val_acc, cfg, out_dir)
    return out_dir / "best_model"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune ViT on FoodX-251 and generate report")
    parser.add_argument("--train-dir", required=True, help="Path to organized training images")
    parser.add_argument("--val-dir", required=True, help="Path to organized validation images")
    parser.add_argument("--output-dir", default="checkpoints")
    parser.add_argument("--pretrained", default=VIT_PRETRAINED)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-amp", action="store_true", help="Disable mixed precision")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    args = parser.parse_args()

    cfg = TrainConfig(
        train_dir=args.train_dir,
        val_dir=args.val_dir,
        output_dir=args.output_dir,
        pretrained=args.pretrained,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience,
        seed=args.seed,
        use_amp=not args.no_amp,
        resume=args.resume,
    )
    train(cfg)


if __name__ == "__main__":
    main()
