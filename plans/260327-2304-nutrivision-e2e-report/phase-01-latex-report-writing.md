---
phase: 1
title: "Write LaTeX E2E Report"
status: pending
priority: P1
---

# Phase 1: Write LaTeX E2E Report

## Context Links

- Template: `report_template/ai_food_app_report.tex` (423 lines, SelfArx.cls 2-column)
- Class file: `report_template/SelfArx.cls`
- Bibliography: `report_template/references.bib` (411 lines, 40+ entries)
- Figures dir: `report_template/Figures/` — DiagramSystemArchitecture.png, eda_plot_{1..5}.png, fpt_uni.png, results.pdf, view.jpg
- Codebase docs: `docs/codebase-summary.md`

## Overview

Write `report_template/nutrivision_e2e_report.tex` following the existing template's document class, preamble, and formatting. Report documents the **actual implementation** (ViT + Mask R-CNN + CalorieDB pipeline), not the original proposal (Swin + DPF).

## Key Insights

- Original report proposed Swin Transformer + DPF-Nutrition; actual build uses **ViT-Base** + **Mask R-CNN** + **CalorieDB CSV**
- Report must reflect reality: simpler architecture, better results on Food-101
- Existing `references.bib` has entries for ViT, food recognition, market context — add new refs for ViT-base, Mask R-CNN, Detectron2, Food-101 dataset if missing
- Figures already available for architecture + EDA; training curves need to be presented as table (or generate plot if time allows)

## Requirements

### Functional
- 9 complete sections with real metrics
- Proper LaTeX tables for hyperparams, training curves, eval results, latency
- Figure references to existing images
- Full bibliography with biber compilation

### Non-functional
- Follows SelfArx.cls 2-column format
- Professional academic tone
- Under 15 pages compiled

## Architecture

Same preamble structure as `ai_food_app_report.tex`:
- `\documentclass[fleqn,10pt]{SelfArx}`
- `biblatex` with `biber` backend, IEEE style
- `\addbibresource{references.bib}`
- FPT logo overlay via tikz

## Related Code Files

### Files to Create
- `report_template/nutrivision_e2e_report.tex`

### Files to Modify
- `report_template/references.bib` — add ViT, Mask R-CNN, Detectron2, Food-101 refs if missing

### Files to Reference (read-only)
- `report_template/ai_food_app_report.tex` — template structure
- `report_template/SelfArx.cls` — document class
- `docs/codebase-summary.md` — system components

## Implementation Steps

### Step 1: Create LaTeX file with preamble
Copy preamble from `ai_food_app_report.tex`. Update:
- `\PaperTitle{NutriVision: End-to-End Food Recognition and Calorie Estimation Using Vision Transformer and Instance Segmentation}`
- `\Keywords{Food Recognition --- Vision Transformer --- Mask R-CNN --- Instance Segmentation --- Calorie Estimation --- Deep Learning}`
- `\Abstract{...}` — summarize ViT 89.7% top-1, Mask R-CNN segmentation, 3-stage pipeline, Food-101 dataset

### Step 2: Write Section 1 — Introduction & Project Overview
- Motivation: manual calorie logging friction, AI automation
- Contribution: 3-stage pipeline (classify → segment → lookup)
- Brief system overview
- Reference market stats from existing bib

### Step 3: Write Section 2 — Related Work
- Vision Transformers (ViT, DeiT, Swin) for food classification
- Instance segmentation (Mask R-CNN, YOLO variants)
- Food calorie estimation apps (SnapCalorie, Cal AI)
- Gap: no open-source ViT + segmentation pipeline for food

### Step 4: Write Section 3 — Dataset & EDA
- Food-101: 101 classes, 1000 images/class, 101K total
- Train/test split: 75,750 / 25,250
- food_calories.csv: 251 entries, fuzzy matching
- Reference eda_plot figures
- Class distribution analysis

### Step 5: Write Section 4 — System Architecture
- 3-stage pipeline: ViT classify → Mask R-CNN segment → CalorieDB lookup
- NutriVisionPipeline orchestration
- Component diagram: reference DiagramSystemArchitecture.png
- FastAPI backend, Streamlit UI, mobile app layers
- GPU mutex serialization

### Step 6: Write Section 5 — Model Training
- ViT fine-tuning on Food-101
- Hyperparams table:

| Param | Value |
|-------|-------|
| Base model | google/vit-base-patch16-224 |
| Batch size | 64 |
| Learning rate | 2e-5 |
| Weight decay | 0.01 |
| Warmup steps | 500 |
| Epochs | 3 |
| AMP | True |
| Checkpoint size | 344 MB |

- Training curves table:

| Epoch | Train Loss | Val Accuracy |
|-------|-----------|-------------|
| 1 | 3.09 | 0.8500 |
| 2 | 1.34 | 0.8900 |
| 3 | 1.16 | 0.8987 |

- Bug fix narrative: num_labels=251 vs 101 head re-initialization

### Step 7: Write Section 6 — Evaluation Results
- Test set: 2,525 images (25 per class)
- Results table:

| Metric | Value |
|--------|-------|
| Top-1 Accuracy | 89.7% |
| Top-5 Accuracy | 98.2% |
| Inference speed | 13 ms/img (GPU) |

- Per-class analysis discussion
- Top confused pairs discussion
- Reference results.pdf figure

### Step 8: Write Section 7 — Pipeline Integration
- End-to-end flow description
- Latency table:

| Component | Latency |
|-----------|---------|
| ViT Classification | ~14 ms |
| Mask R-CNN Segmentation (first) | ~400 ms |
| Mask R-CNN Segmentation (cached) | ~60-80 ms |
| CalorieDB Lookup | <1 ms |

- PipelineResult dataclass output format
- Pixel-to-gram conversion: threshold=0.5, pixel→gram=0.01

### Step 9: Write Section 8 — Limitations & Future Work
- Limitations: pixel-based portion estimation, 101-class constraint, single-item focus
- Future: multi-food detection, depth-based volume, larger dataset, on-device inference

### Step 10: Write Section 9 — Conclusion + References
- Summary of contributions
- Key results recap
- Acknowledgments to FPT University
- `\printbibliography`

### Step 11: Add missing bibliography entries
Add to `references.bib` if not present:
- ViT original paper (Dosovitskiy et al., 2020)
- Mask R-CNN (He et al., 2017)
- Detectron2 (Wu et al., 2019)
- Food-101 dataset (Bossard et al., 2014)
- Hugging Face Transformers (Wolf et al., 2020)

### Step 12: Compile and verify
```bash
cd report_template
latexmk -pdf nutrivision_e2e_report.tex
# or: pdflatex nutrivision_e2e_report.tex && biber nutrivision_e2e_report && pdflatex nutrivision_e2e_report.tex && pdflatex nutrivision_e2e_report.tex
```

## Todo List

- [ ] Create tex file with preamble (Step 1)
- [ ] Write Introduction & Project Overview (Step 2)
- [ ] Write Related Work (Step 3)
- [ ] Write Dataset & EDA (Step 4)
- [ ] Write System Architecture (Step 5)
- [ ] Write Model Training with tables (Step 6)
- [ ] Write Evaluation Results (Step 7)
- [ ] Write Pipeline Integration (Step 8)
- [ ] Write Limitations & Future Work (Step 9)
- [ ] Write Conclusion + References (Step 10)
- [ ] Add missing bib entries (Step 11)
- [ ] Compile PDF successfully (Step 12)

## Success Criteria

- PDF compiles without errors
- All 9 sections contain real data (no placeholders/lorem ipsum)
- All figures referenced and rendered correctly
- All citations resolve (no undefined references)
- Professional academic formatting (2-column, IEEE bibliography)
- Consistent with SelfArx.cls template style

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Missing LaTeX packages | Use same preamble as working template |
| Bib entries malformed | Validate with biber before full compile |
| Figures not found | Use relative paths matching template convention (no extension needed) |
| Overly long report | Keep tables compact, prose concise |
| Training curve figure missing | Present as table instead (data available) |

## Security Considerations

- No API keys or credentials in report
- No sensitive paths or server URLs
- Student IDs are public course info (approved for report)

## Next Steps

After PDF compiles:
- Proofread for consistency
- Verify page count
- Commit to `model` branch
