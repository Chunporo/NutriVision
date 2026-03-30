# Phase 03: Validate Configs and Run Training

## Context Links
- Parent plan: [plan.md](plan.md)
- Scout report: [reports/scout-report.md](reports/scout-report.md)
- Phase 02: [phase-02-review-and-fix-train-script.md](phase-02-review-and-fix-train-script.md)
- Train script: `scripts/train.py`
- Dataset downloader: `scripts/download_dataset.py`

## Overview
- **Date:** 2026-03-27
- **Priority:** P1
- **Status:** in_progress (full 10-epoch training running in background)
- **Description:** Validate dataset structure, run training end-to-end (small scale first, then full), verify outputs.

## Key Insights
- FoodX-251 expects `ImageFolder` layout: `train_dir/class_name/*.jpg`
- README references Google Drive folder IDs as dir names — may need reorganization after download
- Existing checkpoint is 3-class test → will be overwritten by full 251-class run
- Batch size 64 with ViT-Base needs ~16GB VRAM; reduce if OOM
- `OneCycleLR` scheduler is NOT cosine annealing (report text is misleading)

## Requirements
### Functional
- Dataset in correct `ImageFolder` structure (251 class subdirectories)
- Successful training run producing valid checkpoint
- Generated `TRAINING_REPORT.md` with correct class count
- Checkpoint loadable by `FoodClassifier` at inference time

### Non-Functional
- Training completes without OOM errors
- Val accuracy >50% on full 251-class (sanity check)
- Checkpoint size reasonable (~350MB for ViT-Base)

## Architecture
No changes — validate existing training pipeline works end-to-end.

## Related Code Files
| File | Role |
|---|---|
| `scripts/train.py` | Training entry point (after Phase 02 fixes) |
| `scripts/download_dataset.py` | Dataset download helper |
| `nutri_vision/config.py` | `TrainConfig` defaults |
| `nutri_vision/classifier.py` | `FoodClassifier` — loads checkpoint at inference |
| `data/classes.txt` | 251 class names |

## Implementation Steps

### Step 1: Verify Dataset Structure
```bash
# Check train set has 251 subdirectories
ls data/FoodX-251/organized_train_set/ | wc -l  # Should be 251
ls data/FoodX-251/organized_val_set/ | wc -l    # Should be 251

# Check sample counts
find data/FoodX-251/organized_train_set -name "*.jpg" | wc -l  # ~120k
find data/FoodX-251/organized_val_set -name "*.jpg" | wc -l    # ~12k
```

If dataset not in `ImageFolder` format, reorganize:
- Each class must have its own subdirectory
- Directory name = class name (matches `data/classes.txt`)

### Step 2: Smoke Test (Small Run)
Quick 1-epoch run to verify pipeline works:
```bash
uv run nutri-train \
  --train-dir data/FoodX-251/organized_train_set \
  --val-dir data/FoodX-251/organized_val_set \
  --epochs 1 --batch-size 16 --lr 2e-5 \
  --output-dir checkpoints/smoke_test
```
Verify:
- No errors or OOM
- `checkpoints/smoke_test/best_model/` created
- `checkpoints/smoke_test/TRAINING_REPORT.md` generated
- `config.json` shows 251 labels (not 3)

### Step 3: Validate Checkpoint Loads
```python
from nutri_vision.classifier import FoodClassifier
clf = FoodClassifier(model_path="checkpoints/smoke_test/best_model")
print(f"Model loaded, {len(clf.class_names)} classes")
```

### Step 4: Full Training Run
```bash
uv run nutri-train \
  --train-dir data/FoodX-251/organized_train_set \
  --val-dir data/FoodX-251/organized_val_set \
  --epochs 10 --batch-size 64 --lr 2e-5 \
  --output-dir checkpoints
```
If OOM → reduce batch_size to 32 or 16.

### Step 5: Verify Outputs
- [ ] `checkpoints/best_model/config.json` — 251 labels with real class names
- [ ] `checkpoints/best_model/model.safetensors` — model weights
- [ ] `checkpoints/best_model/preprocessor_config.json` — processor config (after Phase 02 fix)
- [ ] `checkpoints/best_model/class_names.txt` — 251 class names (after Phase 02 fix)
- [ ] `checkpoints/training_curves.png` — loss/accuracy plots
- [ ] `checkpoints/TRAINING_REPORT.md` — report with 251 classes
- [ ] `checkpoints/training_state.pt` — resume checkpoint (after Phase 02 fix)

### Step 6: Integration Test
Run prediction with new checkpoint:
```bash
uv run nutri-predict test_image.jpg --model checkpoints/best_model
```
Verify output shows real food class names (not `LABEL_0`).

## Todo List
- [ ] Download FoodX-251 dataset (if not present)
- [ ] Verify `ImageFolder` structure (251 subdirs)
- [ ] Smoke test: 1 epoch, batch_size=16
- [ ] Verify checkpoint has 251 labels
- [ ] Verify checkpoint loads in `FoodClassifier`
- [ ] Full training run: 10 epochs, batch_size=64
- [ ] Check training report accuracy
- [ ] Integration test with `nutri-predict`
- [ ] Backup final checkpoint

## Success Criteria
- Training completes all epochs (or early stops) without errors
- `config.json` contains 251 `id2label` entries with real food names
- `TRAINING_REPORT.md` reports 251 classes
- `FoodClassifier` loads checkpoint and produces sensible predictions
- Val accuracy > 50% (sanity baseline for 251-class)

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| OOM with batch_size=64 | Training crashes | Reduce to 32 or 16; use gradient accumulation |
| Dataset not in ImageFolder format | DataLoader fails | Script to reorganize from raw download structure |
| Slow training (120k images × 10 epochs) | Hours/days | Monitor first 2 epochs, early stop if diverging |
| Disk space exhaustion | Checkpoint save fails | Check free space before training (need ~2GB) |
| Incorrect class-to-folder mapping | Wrong predictions | Cross-check `data/classes.txt` vs folder names |

## Security Considerations
- No credentials or API keys needed
- Training runs locally, no network calls after model download
- Checkpoints are large binary files — do not commit to git

## Next Steps
- If training succeeds → update `PredictConfig.vit_model_path` default to new checkpoint
- Consider Mask R-CNN fine-tuning on food segmentation data (separate plan)
- Update `docs/codebase-summary.md` with new training results
- Consider adding TensorBoard logging for better monitoring
