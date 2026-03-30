"""Model evaluation script for NutriVision ViT classifier.

Usage:
    python evaluate.py                         # 25 images/class (2,525 total)
    python evaluate.py --sample 250            # full test set (25,250 total)
    python evaluate.py --sample 0              # full test set (alias)
    python evaluate.py --checkpoint path/to/checkpoint
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from sklearn.metrics import confusion_matrix
from transformers import ViTForImageClassification, ViTImageProcessor

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT         = Path(__file__).resolve().parent
CHECKPOINT_DIR    = REPO_ROOT / "checkpoints" / "food101" / "best_model"
TEST_DATA_DIR     = REPO_ROOT / "data" / "food-101" / "test"
TRAINING_STATE    = REPO_ROOT / "checkpoints" / "food101" / "training_state.pt"
INFERENCE_JSON    = (REPO_ROOT / "checkpoints" /
                    "inference_food101_2026-03-27" / "food101_inference_results.json")

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


# ---------------------------------------------------------------------------
# Model loader
# ---------------------------------------------------------------------------
def load_model(checkpoint_dir: Path, device: torch.device):
    """Load ViT model from local checkpoint without overriding num_labels.

    Loading without num_labels lets HuggingFace infer the correct output size
    from id2label in config.json, preserving the fine-tuned classification head.
    """
    try:
        processor = ViTImageProcessor.from_pretrained(str(checkpoint_dir))
    except Exception:
        from nutri_vision.config import VIT_PRETRAINED
        processor = ViTImageProcessor.from_pretrained(VIT_PRETRAINED)

    model = ViTForImageClassification.from_pretrained(str(checkpoint_dir)).to(device)
    model.eval()

    id2label = model.config.id2label  # {int: str}
    class_names = [id2label[i] for i in range(len(id2label))] if id2label else []
    return model, processor, class_names


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
def build_sample_list(
    test_dir: Path,
    class_names: list[str],
    n_per_class: int,
    seed: int = 42,
) -> list[tuple[Path, int]]:
    """Return list of (image_path, true_class_index) for evaluation."""
    samples: list[tuple[Path, int]] = []
    rng = random.Random(seed)

    name_to_idx = {name: i for i, name in enumerate(class_names)}

    for class_dir in sorted(test_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        true_idx = name_to_idx.get(class_dir.name, -1)
        if true_idx == -1:
            continue
        images = sorted(class_dir.glob("*.jpg"))
        chosen = rng.sample(images, min(n_per_class or len(images), len(images)))
        for img_path in chosen:
            samples.append((img_path, true_idx))

    return samples


def run_eval(
    model,
    processor,
    class_names: list[str],
    samples: list[tuple[Path, int]],
    device: torch.device,
    top_k: int = 5,
):
    """Run inference and return results dict."""
    y_true, y_pred, top5_hits = [], [], 0
    t0 = time.perf_counter()

    for i, (img_path, true_idx) in enumerate(samples):
        if (i + 1) % 200 == 0:
            elapsed = time.perf_counter() - t0
            print(f"  [{i+1}/{len(samples)}]  {elapsed:.1f}s  "
                  f"({elapsed/(i+1)*1000:.0f}ms/img)")

        try:
            img = Image.open(img_path).convert("RGB")
        except Exception as exc:
            print(f"  SKIP {img_path.name}: {exc}")
            continue

        inputs = processor(images=img, return_tensors="pt").to(device)
        with torch.inference_mode():
            logits = model(**inputs).logits.squeeze(0)

        probs = torch.softmax(logits, dim=-1)
        top5_idx = torch.topk(probs, k=min(top_k, probs.shape[0])).indices.tolist()

        pred_idx = top5_idx[0]
        y_true.append(true_idx)
        y_pred.append(pred_idx)
        if true_idx in top5_idx:
            top5_hits += 1

    elapsed = time.perf_counter() - t0
    n = len(y_true)
    top1_acc = sum(t == p for t, p in zip(y_true, y_pred)) / n
    top5_acc = top5_hits / n

    return {
        "n": n,
        "elapsed": elapsed,
        "top1_acc": top1_acc,
        "top5_acc": top5_acc,
        "y_true": y_true,
        "y_pred": y_pred,
        "class_names": class_names,
    }


def print_report(results: dict) -> None:
    """Print evaluation summary to stdout."""
    n          = results["n"]
    elapsed    = results["elapsed"]
    top1_acc   = results["top1_acc"]
    top5_acc   = results["top5_acc"]
    y_true     = results["y_true"]
    y_pred     = results["y_pred"]
    class_names = results["class_names"]

    print("\n" + "=" * 60)
    print("  NutriVision ViT — Evaluation Report")
    print("=" * 60)
    print(f"  Images evaluated : {n}")
    print(f"  Elapsed          : {elapsed:.1f}s  ({elapsed/n*1000:.0f}ms/img)")
    print(f"  Top-1 accuracy   : {top1_acc:.4f}  ({top1_acc*100:.2f}%)")
    print(f"  Top-5 accuracy   : {top5_acc:.4f}  ({top5_acc*100:.2f}%)")
    print("=" * 60)

    # Per-class accuracy
    class_correct: dict[int, int] = defaultdict(int)
    class_total:   dict[int, int] = defaultdict(int)
    for t, p in zip(y_true, y_pred):
        class_total[t] += 1
        if t == p:
            class_correct[t] += 1

    per_class = {class_names[i]: class_correct[i] / class_total[i]
                 for i in class_total}
    sorted_cls = sorted(per_class, key=per_class.get)  # ascending → worst first

    print("\n  Worst 10 classes:")
    for name in sorted_cls[:10]:
        print(f"    {name:35s}  {per_class[name]*100:5.1f}%")

    print("\n  Best 10 classes:")
    for name in sorted_cls[-10:][::-1]:
        print(f"    {name:35s}  {per_class[name]*100:5.1f}%")

    above_80 = sum(1 for a in per_class.values() if a >= 0.8)
    print(f"\n  ≥ 80% accuracy: {above_80}/{len(per_class)} classes")

    # Top confused pairs
    eval_labels = sorted(set(y_true))
    label_names  = [class_names[i] for i in eval_labels]
    cm = confusion_matrix(y_true, y_pred, labels=eval_labels)
    np.fill_diagonal(cm, 0)
    flat = np.argsort(cm.ravel())[::-1][:10]
    print("\n  Top-10 confused pairs (true → predicted):")
    for idx in flat:
        r, c = divmod(idx, len(eval_labels))
        count = cm[r, c]
        if count == 0:
            break
        print(f"    {label_names[r]:30s} → {label_names[c]:30s}  ({count}x)")


# ---------------------------------------------------------------------------
# Training state summary
# ---------------------------------------------------------------------------
def print_training_summary() -> None:
    if not TRAINING_STATE.exists():
        return
    state = torch.load(TRAINING_STATE, map_location="cpu", weights_only=False)
    history = state.get("history", {})
    best_val = state.get("best_val_acc")
    epoch    = state.get("epoch")
    print("\n  Training history:")
    for key in ("train_loss", "val_loss", "train_acc", "val_acc"):
        vals = history.get(key, [])
        if vals:
            print(f"    {key:15s}: {[round(v, 4) for v in vals]}")
    if best_val:
        print(f"  Best val accuracy: {best_val:.4f}  (epoch {epoch})")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Evaluate NutriVision ViT on Food-101 test set")
    p.add_argument("--checkpoint", type=Path, default=CHECKPOINT_DIR,
                   help="Path to fine-tuned checkpoint directory")
    p.add_argument("--test-dir", type=Path, default=TEST_DATA_DIR,
                   help="Path to test image directory (ImageFolder layout)")
    p.add_argument("--sample", type=int, default=25,
                   help="Images per class (0 = all, default 25)")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--device", type=str, default=None,
                   help="cuda / cpu (auto-detected if omitted)")
    p.add_argument("--save-json", type=Path, default=None,
                   help="Save full results to JSON file")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    device = torch.device(args.device or ("cuda" if torch.cuda.is_available() else "cpu"))
    n_per_class = args.sample  # 0 means all

    print(f"Checkpoint : {args.checkpoint}")
    print(f"Test data  : {args.test_dir}")
    print(f"Sample     : {n_per_class or 'all'} images/class")
    print(f"Device     : {device}")

    print_training_summary()

    print("\nLoading model...")
    model, processor, class_names = load_model(args.checkpoint, device)
    print(f"Loaded: {len(class_names)} classes")

    if not args.test_dir.exists():
        print(f"\nERROR: Test directory not found: {args.test_dir}")
        sys.exit(1)

    print(f"\nBuilding sample list...")
    samples = build_sample_list(args.test_dir, class_names, n_per_class, args.seed)
    n_classes = len(set(idx for _, idx in samples))
    print(f"Evaluating {len(samples)} images across {n_classes} classes...")

    results = run_eval(model, processor, class_names, samples, device)
    print_report(results)

    if args.save_json:
        out = {
            "checkpoint": str(args.checkpoint),
            "n_images": results["n"],
            "top1_accuracy": results["top1_acc"],
            "top5_accuracy": results["top5_acc"],
            "elapsed_s": results["elapsed"],
        }
        args.save_json.write_text(json.dumps(out, indent=2))
        print(f"\nResults saved to {args.save_json}")


if __name__ == "__main__":
    main()
