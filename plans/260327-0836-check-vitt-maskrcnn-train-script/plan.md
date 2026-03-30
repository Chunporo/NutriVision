---
title: "Check & Fix ViT + Mask RCNN Train Script"
description: "Verify and fix training pipeline for Vision Transformer + Mask RCNN model"
status: completed
priority: P1
effort: 2h
branch: main
tags: [training, vit, mask-rcnn, deep-learning]
created: 2026-03-27
---

# Check & Fix ViT + Mask RCNN Train Script

## Context
- Scout report: [reports/scout-report.md](reports/scout-report.md)
- Train script: `scripts/train.py`
- Model defs: `nutri_vision/classifier.py`, `nutri_vision/segmentor.py`
- Config: `nutri_vision/config.py`

## Summary
Existing `scripts/train.py` fine-tunes **ViT-Base-Patch16-224 only**. Mask R-CNN uses pre-trained COCO weights at inference (no food-specific training). Current checkpoint is a 3-class test run, not production 251-class.

## Key Issues Found
1. Deprecated PyTorch AMP API (`torch.cuda.amp` → `torch.amp`)
2. No training resume support (optimizer/scheduler not checkpointed)
3. ViTImageProcessor + class names not saved with checkpoint
4. Mask R-CNN not fine-tuned on food data (COCO generic)
5. `id2label` mapping not persisted properly
6. Dataset not downloaded locally

## Phases

| # | Phase | Status | File |
|---|---|---|---|
| 1 | Verify environment & dependencies | completed | [phase-01](phase-01-verify-environment-and-dependencies.md) |
| 2 | Review & fix train script | completed | [phase-02](phase-02-review-and-fix-train-script.md) |
| 3 | Validate configs & run training | in_progress | [phase-03](phase-03-validate-configs-and-run-training.md) |

## Dependencies
- FoodX-251 dataset must be downloaded before Phase 3
- GPU with >=16GB VRAM recommended for batch_size=64

## Unresolved Questions
1. Is Mask R-CNN fine-tuning on food data planned?
2. Is full FoodX-251 dataset available or needs download?
3. Target accuracy for 251-class model?
4. Available GPU resources?
