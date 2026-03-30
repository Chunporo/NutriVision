# Phase 01 — Notebook Implementation

## Context Links
- Parent plan: [plan.md](plan.md)
- ViT checkpoint: `checkpoints/food101/best_model/`
- Training state: `checkpoints/food101/training_state.pt`
- Inference results: `checkpoints/inference_food101_2026-03-27/food101_inference_results.json`
- Core modules: `nutri_vision/classifier.py`, `nutri_vision/segmentor.py`, `nutri_vision/pipeline.py`

---

## Overview

| Field | Value |
|---|---|
| Date | 2026-03-27 |
| Priority | P2 |
| Status | ✅ complete |
| Effort | ~3h |

Create `notebooks/model_evaluation.ipynb` — comprehensive evaluation notebook covering training history analysis, ViT classifier evaluation on Food-101, Mask R-CNN segmentation review, and end-to-end pipeline benchmarking.

---

## Key Insights

**ViT Classifier (`checkpoints/food101/best_model/`):**
- 101-class Food-101, fine-tuned `google/vit-base-patch16-224`
- `training_state.pt` has `history` dict: `train_loss`, `train_acc`, `val_loss`, `val_acc` (3 epochs)
- Recorded `best_val_acc = 0.8987` (epoch 3); existing 40-sample inference shows 95% top-1

**Mask R-CNN:**
- Pretrained Detectron2 `mask_rcnn_R_50_FPN_3x` (COCO weights, **not fine-tuned**)
- Detects general objects; pixel area → grams via `PIXEL_TO_GRAM_RATIO` constant
- Requires `detectron2` installed — section must gracefully skip if absent

**End-to-End Pipeline:**
- `NutriVisionPipeline`: ViT → Mask R-CNN → `CalorieDB` fuzzy lookup
- Returns `PipelineResult` with food name, confidence, portions, total weight + kcal

**Test set:** 25,250 images (101 classes × 250) — full eval may take 10–30 min on GPU;
use `EVAL_SAMPLE` constant (default 25 per class = 2,525 total) for interactive runs.

---

## Requirements

**Functional:**
- 6 sections, each with markdown header + explanation cell
- Section 2: training curves (loss + accuracy), hyperparameter table
- Section 3: top-1 + top-5 accuracy, per-class accuracy bar chart, 10×10 confusion matrix (most-confused classes), sample correct/incorrect predictions grid
- Section 4: Mask R-CNN on ≥5 test images, overlay masks + bboxes, show pixel→gram conversion, detection rate stat
- Section 5: end-to-end pipeline on 3 images, full result display (class, conf, segments, weight, kcal), per-stage latency
- Section 6: summary table of all metrics

**Non-functional:**
- `EVAL_SAMPLE = 25` constant (images per class) — easy to set to `250` for full eval
- All model loading behind `@functools.lru_cache` or module-level cache to avoid reload
- Graceful `try/except ImportError` for detectron2 sections
- `pathlib.Path` throughout; paths relative to repo root resolved via `_find_repo_root()`

---

## Architecture

```
notebooks/model_evaluation.ipynb
│
├── [MD] # 1 — Setup & Imports
├── [Code] imports, _find_repo_root(), paths, EVAL_SAMPLE=25, device detection
│
├── [MD] # 2 — Training Analysis (ViT)
├── [Code] load training_state.pt → extract history + config → print hyperparams table
├── [Code] 2×1 subplot: train/val loss + train/val accuracy per epoch
│
├── [MD] # 3 — ViT Classifier Evaluation (Food-101)
├── [Code] load model + processor from checkpoints/food101/best_model/
├── [Code] build test DataLoader (EVAL_SAMPLE images per class, standard val transforms)
├── [Code] inference loop → collect (y_true, y_pred, top5, confidences), print top-1 + top-5
├── [Code] per-class accuracy bar chart (sorted descending)
├── [Code] confusion matrix heatmap (top-20 most confused class pairs)
├── [Code] 4×4 grid: 8 correct + 8 incorrect predictions with confidence labels
│
├── [MD] # 4 — Mask R-CNN Segmentation Evaluation
├── [Code] try: load PortionSegmentor; except ImportError: skip with warning
├── [Code] sample 5 test images across 5 classes; run segmentation; overlay masks
├── [Code] print detection rate, avg segments/image, avg confidence, pixel→gram stats
│
├── [MD] # 5 — End-to-End Pipeline Benchmarking
├── [Code] load NutriVisionPipeline; pick 3 diverse test images
├── [Code] run pipeline per image; display: image | class+conf | segments | weight | kcal
├── [Code] latency breakdown table: classification / segmentation / calorie lookup / total
│
├── [MD] # 6 — Summary
└── [MD] Metrics table, key findings, next steps
```

---

## Related Code Files

**Create:**
- `notebooks/model_evaluation.ipynb`
- `notebooks/` directory (mkdir)

**Import from (read-only):**
- `nutri_vision/classifier.py` — `FoodClassifier`
- `nutri_vision/segmentor.py` — `PortionSegmentor`
- `nutri_vision/pipeline.py` — `NutriVisionPipeline`
- `nutri_vision/config.py` — `PredictConfig`, `VIT_PRETRAINED`
- `checkpoints/food101/training_state.pt`
- `checkpoints/food101/best_model/`
- `data/food-101/test/<class>/*.jpg`

---

## Implementation Steps

1. **Create `notebooks/` dir** and `notebooks/model_evaluation.ipynb` skeleton with all cell stubs
2. **Section 1:** imports (torch, transformers, torchvision, PIL, numpy, pandas, matplotlib, sklearn, time, functools); path resolver; `device = torch.device("cuda" if cuda else "cpu")`; `EVAL_SAMPLE = 25`
3. **Section 2:** `torch.load(training_state_path, map_location="cpu")`; pretty-print hyperparams; 2×1 epoch curves
4. **Section 3 — model load:** `ViTForImageClassification.from_pretrained(checkpoint_dir)` + `ViTImageProcessor`; move to device
5. **Section 3 — eval loop:** `torchvision.datasets.ImageFolder` on `test/`; standard val transforms; `torch.no_grad()` loop; collect top-1 + top-5; `tqdm` progress optional
6. **Section 3 — charts:** per-class accuracy (sorted bar); `sklearn.metrics.confusion_matrix` + seaborn heatmap for top-20 confused pairs; 4×4 correct/incorrect image grid
7. **Section 4:** `try: from nutri_vision.segmentor import PortionSegmentor` + run on 5 images + matplotlib overlay; `except ImportError: print("Detectron2 not installed – skipping")`
8. **Section 5:** `NutriVisionPipeline`; `time.perf_counter()` per stage; 3-image result display
9. **Section 6:** markdown summary table + bullet-point findings

---

## Todo List

- [x] Create `notebooks/` directory
- [x] Create `notebooks/model_evaluation.ipynb` skeleton
- [x] Section 1: Setup (imports, paths, constants, device)
- [x] Section 2: Training curves + hyperparams
- [x] Section 3: ViT eval loop + top-1/top-5
- [x] Section 3: Per-class accuracy chart
- [x] Section 3: Confusion matrix heatmap
- [x] Section 3: Correct/incorrect predictions grid
- [x] Section 4: Mask R-CNN overlay + stats (with graceful skip)
- [x] Section 5: End-to-end pipeline + latency breakdown
- [x] Section 6: Summary markdown
- [x] Validate notebook runs top-to-bottom without errors

---

## Success Criteria

- `notebooks/model_evaluation.ipynb` exists and executes without unhandled exceptions
- Section 2 renders 2-panel training curve plot
- Section 3 reports top-1 accuracy ≥ 85% on 2,525-image sample
- Section 4 shows at least 5 masked images (or graceful skip message)
- Section 5 displays kcal estimate for 3 food images with latency table
- Section 6 has consolidated metrics table

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Detectron2 not importable | Medium | `try/except ImportError` guard; section prints skip warning |
| Full test eval too slow (CPU) | Medium | `EVAL_SAMPLE = 25` default; note full eval command |
| `training_state.pt` config key missing | Low | `state.get("cfg", {})` with fallbacks |
| Mask R-CNN detects 0 objects on some food images | Medium | Report detection rate; show images with 0 detections labeled |
| Pipeline calorie lookup fails (unrecognised class) | Low | CalorieDB returns 0 with warning; handle in display |

---

## Security Considerations

- No network calls during evaluation (all models local)
- Read-only access to checkpoints and dataset
- No user input processed

---

## Next Steps

After notebook complete:
1. Use per-class accuracy chart to identify weakest classes → targeted augmentation
2. Pipeline latency numbers → inform mobile API timeout settings
3. Extend to full 25,250 test set for final benchmark before deployment
