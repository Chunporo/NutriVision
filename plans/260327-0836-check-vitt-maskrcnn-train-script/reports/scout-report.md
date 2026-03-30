# Scout Report: ViT + Mask R-CNN Training Pipeline

**Date:** 2026-03-27
**Scope:** Analyze existing train scripts, model definitions, configs, dependencies

---

## Files Found

### Training Scripts
| File | Lines | Purpose |
|---|---|---|
| `scripts/train.py` | 342 | **ViT-only** fine-tuning on FoodX-251; CLI entry + report gen |
| `scripts/predict.py` | 116 | CLI prediction (ViT + Mask R-CNN pipeline) |
| `scripts/download_dataset.py` | 54 | Opens Google Drive links for FoodX-251 |
| `scripts/download_food101.py` | — | Food-101 downloader (not read, secondary) |
| `scripts/download_pizza_steak_sushi.py` | — | Small subset downloader (not read, secondary) |

### Model Definition Files
| File | Lines | Purpose |
|---|---|---|
| `nutri_vision/config.py` | 76 | `TrainConfig`, `PredictConfig` dataclasses, constants |
| `nutri_vision/classifier.py` | 110 | `FoodClassifier` — ViT-Base-Patch16-224 wrapper |
| `nutri_vision/segmentor.py` | 99 | `PortionSegmentor` — Mask R-CNN (R50-FPN) via Detectron2 |
| `nutri_vision/pipeline.py` | 164 | `NutriVisionPipeline` — chains classifier + segmentor + calorie DB |
| `nutri_vision/calorie_db.py` | 143 | Fuzzy-match calorie CSV lookup |
| `nutri_vision/utils.py` | 118 | `setup_logging`, `load_image`, `draw_results` |

### Config Files
- **No YAML/JSON training configs exist.** All config is in `nutri_vision/config.py` dataclasses + CLI args.
- `checkpoints/best_model/config.json` — HF model card (3-class model from test run)

### Dependencies
| File | Key Packages |
|---|---|
| `requirements.txt` | torch>=2.1, torchvision>=0.16, transformers>=4.36, detectron2 (git), opencv, gradio |
| `pyproject.toml` | Same core deps + `[train]` optional: tensorboard; CLI: `nutri-train`, `nutri-predict` |
| `backend/requirements.txt` | Backend-specific (fastapi, uvicorn) |

### Dataset
- `data/classes.txt` — 251 food class names
- `data/food_calories.csv` — calorie density DB
- `data/FoodX-251/` — Only contains `Dataset_images_link.txt` (dataset NOT downloaded)

### Existing Checkpoints
- `checkpoints/best_model/` — **3-class test model** (not 251-class); `config.json` shows `id2label` with 3 labels
- `checkpoints/training_curves.png` — from test run
- `checkpoints/TRAINING_REPORT.md` — auto-generated, 96% acc on 3-class, 2 epochs, batch 16

---

## Train Script Analysis (`scripts/train.py`)

### Entry Point
- **CLI:** `python -m scripts.train --train-dir ... --val-dir ... --epochs 10 --batch-size 64 --lr 2e-5`
- **Registered CLI:** `nutri-train` (via `pyproject.toml [project.scripts]`)
- README example: `uv run nutri-train --train-dir data/FoodX-251/1Dm1V... --val-dir data/FoodX-251/1yyZv...`

### Architecture
- **Model:** `ViTForImageClassification` from HuggingFace (`google/vit-base-patch16-224`)
- **Head:** Linear classification head auto-created by HF with `num_labels` from folder structure
- **NO Mask R-CNN training** — segmentor uses pre-trained COCO weights only (no fine-tuning)

### Data Pipeline
- `torchvision.datasets.ImageFolder` — expects `train_dir/class_name/img.jpg` structure
- Train augmentation: RandomResizedCrop(224), HFlip, ColorJitter, Normalize(ViT stats)
- Val augmentation: Resize(256) → CenterCrop(224) → Normalize
- `num_workers=4`, `pin_memory=True`, `drop_last=True` (train)

### Training Loop
- Loss: `CrossEntropyLoss(label_smoothing=0.1)`
- Optimizer: `AdamW(lr=2e-5, weight_decay=0.01)`
- Scheduler: `OneCycleLR(max_lr=lr, pct_start=0.1)` — not cosine despite report claiming it
- AMP: `GradScaler` + `autocast` (default enabled, `--no-amp` to disable)
- Grad clipping: `clip_grad_norm_(max_norm=1.0)`
- Early stopping: patience=3 epochs

### Checkpointing
- Saves best model via `model.save_pretrained()` (HF format) to `checkpoints/best_model/`
- Does NOT save optimizer/scheduler state → cannot resume training
- Does NOT save ViTImageProcessor → must fall back to base pretrained at inference

### Report Generation
- Auto-generates `training_curves.png` (loss + accuracy) + `TRAINING_REPORT.md`
- Markdown report is template-based with interpolated metrics

### Logging
- Uses Python `logging` with custom format from `setup_logging()`
- Logs every `log_every_n_steps=50` batches

---

## Critical Findings

### 1. Train Script Covers ViT ONLY
`scripts/train.py` fine-tunes the ViT classifier. Mask R-CNN is used **only at inference** with pre-trained COCO weights (no domain-specific training). The "pipeline" is:
- **Training time:** ViT classification only
- **Inference time:** ViT classification + COCO Mask R-CNN segmentation → calorie estimation

### 2. No "ViTT" Model Exists
The codebase uses standard **ViT** (Vision Transformer), not "ViTT." The nomenclature may be a user shorthand. No custom transformer variant found.

### 3. Existing Checkpoint is 3-Class Test
`checkpoints/best_model/config.json` shows only 3 labels (`LABEL_0`, `LABEL_1`, `LABEL_2`). Was trained as a quick test, NOT on full FoodX-251 (251 classes).

### 4. Dataset Not Downloaded
`data/FoodX-251/` only has a link file. Full dataset (120k+ images) must be manually downloaded from Google Drive.

### 5. Resume Training Not Supported
No optimizer/scheduler checkpoint saved → retraining from scratch if interrupted.

### 6. Deprecated API Usage
- `torch.cuda.amp.GradScaler` and `torch.cuda.amp.autocast` — deprecated in PyTorch 2.4+; should use `torch.amp.GradScaler("cuda")` and `torch.amp.autocast("cuda")`

### 7. ViTImageProcessor Not Saved with Checkpoint
`model.save_pretrained()` only saves model weights. Processor config not saved → fallback to base pretrained processor at load time (works but fragile).

### 8. Label Mapping Not Saved
`id2label` in saved `config.json` is generic (`LABEL_0`, `LABEL_1`...). Class names from `ImageFolder` are not persisted with the checkpoint.

### 9. Mask R-CNN Uses Generic COCO Classes
`PortionSegmentor` uses `mask_rcnn_R_50_FPN_3x` pretrained on COCO. Detects 80 COCO categories (person, car, etc.), NOT food-specific classes. Segmentation quality on food images is suboptimal — relies on generic instance detection.

---

## Run Commands

```bash
# Download dataset (opens browser)
uv run python scripts/download_dataset.py

# Train ViT classifier (full FoodX-251)
uv run nutri-train \
  --train-dir data/FoodX-251/organized_train_set \
  --val-dir data/FoodX-251/organized_val_set \
  --epochs 10 --batch-size 64 --lr 2e-5

# Train on small test set (pizza/steak/sushi)
uv run nutri-train \
  --train-dir data/pizza_steak_sushi/train \
  --val-dir data/pizza_steak_sushi/test \
  --epochs 2 --batch-size 16

# Predict
uv run nutri-predict image.jpg --model checkpoints/best_model
```

---

## Unresolved Questions

1. **Is Mask R-CNN fine-tuning needed?** Current pipeline uses COCO-pretrained Mask R-CNN — food segmentation quality is likely poor. Is the plan to fine-tune Mask R-CNN on food-specific data?
2. **"ViTT" clarification** — Is this standard ViT or a custom variant? Nothing in codebase suggests a modified transformer.
3. **Dataset availability** — Is the full FoodX-251 already downloaded somewhere else, or does it need fresh download?
4. **Organized directory structure** — The download script references folder IDs, but README references `organized_train_set` / `organized_val_set`. Is there a reorganization step needed after download?
5. **Target accuracy** — What's the minimum acceptable val accuracy for the 251-class model?
6. **GPU resources** — What GPU is available? Batch size 64 with ViT-Base requires ~16GB VRAM.
