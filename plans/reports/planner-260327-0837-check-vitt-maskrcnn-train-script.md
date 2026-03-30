# Planner Report: ViT + Mask RCNN Train Script Analysis

**Date:** 2026-03-27
**Plan:** `plans/260327-0836-check-vitt-maskrcnn-train-script/`

---

## Executive Summary

Analyzed the full training pipeline. **Only ViT classification is trained** — Mask R-CNN uses pre-trained COCO weights (no food-specific fine-tuning). The existing `scripts/train.py` is functional but has deprecated API usage, missing checkpoint metadata, and no resume support. The current saved checkpoint is a 3-class test run, not a production 251-class model.

## Files Delivered

| File | Purpose |
|---|---|
| `reports/scout-report.md` | Detailed codebase analysis, file inventory, issues found |
| `plan.md` | Overview plan with 3 phases |
| `phase-01-verify-environment-and-dependencies.md` | Env/deps verification checklist |
| `phase-02-review-and-fix-train-script.md` | Code fixes: AMP, resume, processor/label saving |
| `phase-03-validate-configs-and-run-training.md` | Smoke test → full training → integration verification |

## Key Findings

1. **ViT-only training** — `scripts/train.py` fine-tunes `ViTForImageClassification`. Mask R-CNN is inference-only (COCO pretrained).
2. **Deprecated AMP API** — uses `torch.cuda.amp.*` (deprecated PyTorch 2.4+), needs `torch.amp.*`
3. **Incomplete checkpointing** — no optimizer/scheduler state, no processor config, no class names, generic `id2label`
4. **3-class test checkpoint** — `checkpoints/best_model/` has 3 labels, not 251
5. **Dataset not downloaded** — `data/FoodX-251/` only has link file
6. **No "ViTT" variant** — codebase uses standard ViT-Base-Patch16-224

## Recommended Fix Effort

| Phase | Effort | Blocking |
|---|---|---|
| Phase 01: Env verification | 15 min | Nothing |
| Phase 02: Script fixes | 45 min | Phase 01 |
| Phase 03: Training run | 30 min setup + training time | Phase 01, 02, dataset |

**Total implementation effort: ~1.5h** (excluding dataset download and training GPU time)

## Unresolved Questions

1. **Mask R-CNN fine-tuning** — current COCO model detects generic objects (person, car), not food. Is food-specific segmentation training planned?
2. **Dataset availability** — needs manual Google Drive download (120k+ images). Already available somewhere?
3. **GPU resources** — batch_size=64 needs ~16GB VRAM. What's available?
4. **Target val accuracy** — minimum acceptable for 251-class?
5. **Organized dir structure** — download produces raw folder IDs, does a reorganization script exist to create `ImageFolder` layout?
