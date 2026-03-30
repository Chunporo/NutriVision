---
title: "NutriVision E2E Academic Report (LaTeX)"
description: "Write full LaTeX e2e report covering data, model training, eval results, and pipeline for FPT DSP391m submission."
status: completed
priority: P1
effort: 2h
branch: model
tags: [report, latex, evaluation, vit, pipeline]
created: 2026-03-27
---

# NutriVision E2E Academic Report

## Objective

Create `report_template/nutrivision_e2e_report.tex` — a complete LaTeX academic report documenting what was actually built: ViT fine-tuned on Food-101, Mask R-CNN segmentation, CalorieDB lookup, and the end-to-end NutriVisionPipeline.

## Context

- **Template**: `report_template/ai_food_app_report.tex` (SelfArx.cls, 2-column)
- **Class/Bib**: `report_template/SelfArx.cls`, `report_template/references.bib`
- **Figures**: `report_template/Figures/` — architecture diagram, EDA plots, results.pdf
- **Authors**: Huynh Quoc Trung (QE180038), Pham Ngo Dinh Khoi (QE180110), Nhu Quang Anh (QE180003)
- **Course**: FPT University, DSP391m, Spring 2026

## Phases

| # | Phase | Status | Description |
|---|-------|--------|-------------|
| 1 | Write LaTeX report | ✅ completed | All 9 sections, compile to PDF |

## Report Sections (9 total)

1. Introduction & Project Overview
2. Related Work (ViT, Mask R-CNN, food calorie apps)
3. Dataset & EDA (Food-101 101K images; food_calories.csv 251 entries)
4. System Architecture (3-stage pipeline, component diagram)
5. Model Training (ViT fine-tuning, hyperparams, training curves)
6. Evaluation Results (89.7% top-1, 98.2% top-5, per-class analysis)
7. Pipeline Integration (latency table, end-to-end flow)
8. Limitations & Future Work
9. Conclusion + References

## Key Data Points

- **ViT**: google/vit-base-patch16-224, batch=64, lr=2e-5, 3 epochs
- **Training**: train_loss=[3.09,1.34,1.16], val_acc=[0.85,0.89,0.8987]
- **Test**: 89.7% top-1, 98.2% top-5 on 2525 images, 13ms/img GPU
- **Mask R-CNN**: Detectron2 mask_rcnn_R_50_FPN_3x, threshold=0.5
- **Pipeline latency**: ~14ms classify, ~400ms segment (first), ~60-80ms cached
- **Bug fixed**: num_labels=251 randomly re-initing 101-class head

## Success Criteria

- [x] PDF compiles without errors via `latexmk -pdf` or `pdflatex+biber`
- [x] All 9 sections populated with real metrics (no placeholder data)
- [x] Figures referenced correctly (architecture, EDA, results)
- [x] Bibliography compiles with biber, all citations resolve

## Deliverable

`report_template/nutrivision_e2e_report.tex` + compiled PDF
