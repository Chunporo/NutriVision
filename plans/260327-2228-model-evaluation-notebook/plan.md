---
title: "Model Evaluation Notebook — ViT + Mask R-CNN + Pipeline"
description: "Jupyter notebook covering training analysis, ViT Food-101 evaluation, Mask R-CNN segmentation review, and end-to-end pipeline benchmarking."
status: complete
priority: P2
effort: 3h
branch: model
tags: [evaluation, vit, mask-rcnn, pipeline, food101, notebook]
created: 2026-03-27
---

# Model Evaluation Notebook — ViT + Mask R-CNN + Pipeline

## Overview

Create `notebooks/model_evaluation.ipynb` covering three evaluation layers for the trained NutriVision system.

**Artefacts consumed:**
| Artefact | Path |
|---|---|
| ViT food101 checkpoint | `checkpoints/food101/best_model/` |
| Training state (history) | `checkpoints/food101/training_state.pt` |
| Inference results (40-sample) | `checkpoints/inference_food101_2026-03-27/food101_inference_results.json` |
| Food-101 test images | `data/food-101/test/<class>/*.jpg` |
| Mask R-CNN | Detectron2 pretrained `mask_rcnn_R_50_FPN_3x` (COCO) |
| Calorie DB | `data/food_calories.csv` |

---

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Notebook Implementation](phase-01-notebook-implementation.md) | ✅ complete | ~3h |

---

## Dependencies

- `.venv` with torch, transformers, Pillow, matplotlib, pandas, numpy, scikit-learn
- Detectron2 installed (for Mask R-CNN section — graceful skip if absent)
- GPU recommended (CUDA) for Section 3 & 4; CPU fallback supported

---

## Success Criteria

- Notebook runs top-to-bottom without unhandled exceptions
- Section 2: top-1 + top-5 accuracy, per-class chart, confusion matrix
- Section 3: segmentation mask overlays on ≥5 sample images
- Section 4: end-to-end result (food + segments + calories) on ≥3 images
- Latency stats reported per section
