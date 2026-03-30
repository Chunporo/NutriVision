# Phase 01 — Notebook Implementation

## Context Links
- Parent plan: [plan.md](plan.md)
- Dataset: `data/food-101/`
- Project docs: `docs/codebase-summary.md`, `docs/development-roadmap.md`

---

## Overview

| Field | Value |
|---|---|
| Date | 2026-03-27 |
| Priority | P2 |
| Status | ✅ completed |
| Effort | ~2h |

Create `data/eda_food101.ipynb` — a single Jupyter notebook covering all 8 EDA sections for the Food-101 dataset. Designed to run top-to-bottom in the project's `.venv` environment using only stdlib + already-installed packages.

---

## Key Insights

- `images/` subdirs exist but are empty; actual images live in `train/<class>/` and `test/<class>/` (750/250 per class)
- Dataset is perfectly balanced by design: 101 classes × 750 train + 250 test = 101,000 total
- Split metadata available both as JSON (`train.json`) and flat txt (`train.txt`)
- All packages needed (numpy, pandas, matplotlib, Pillow) are already in `requirements.txt`
- No seaborn required — matplotlib sufficient for all plots
- Image sizes may vary; Food-101 original images are not pre-resized to a fixed resolution

---

## Requirements

**Functional:**
- 8 notebook sections, each prefaced by a markdown cell
- All cells runnable sequentially (top-to-bottom, no hidden state)
- Figures: titled, labeled axes, appropriate `figsize`
- Data quality: detect corrupt/unreadable images, verify counts match metadata

**Non-functional:**
- Each code cell ≤ 30 lines
- Use `pathlib.Path` exclusively (no `os.path` strings)
- Compatible with `.venv` Python ≥ 3.10
- No hardcoded absolute paths — all relative to `DATA_ROOT = Path("food-101")`

---

## Architecture

```
data/eda_food101.ipynb
│
├── [MD] # 1 — Setup & Imports
├── [Code] imports, DATA_ROOT = Path("food-101"), constants
│
├── [MD] # 2 — Dataset Overview
├── [Code] count train/test images, build summary DataFrame, print table
├── [Code] horizontal bar chart: images-per-split
│
├── [MD] # 3 — Class Exploration
├── [Code] load classes.txt → list of 101 names, display as table
├── [Code] 5×5 grid: one random image per class (first 25 classes)
│
├── [MD] # 4 — Image Statistics
├── [Code] sample 500 random images → collect (width, height, filesize)
├── [Code] histograms: width, height, aspect ratio, file size (2×2 subplot)
│
├── [MD] # 5 — Sample Visualization
├── [Code] 10×10 mosaic: 100 random images across all classes (resized to 128×128)
│
├── [MD] # 6 — Class-level Deep Dive
├── [Code] 3×5 grid: 5 random images each from 3 selected classes (apple_pie, sushi, pizza)
├── [Code] bar chart: images per class (confirm balance)
│
├── [MD] # 7 — Data Quality Checks
├── [Code] verify count: expected 101×750 train, 101×250 test
├── [Code] scan for corrupt images (PIL.Image.verify), report count
│
├── [MD] # 8 — Insights & Summary
└── [MD] Findings, class count, balance status, size stats, training recommendations
```

---

## Related Code Files

**Create:**
- `data/eda_food101.ipynb` — the notebook

**Reference (read-only):**
- `data/food-101/meta/classes.txt`
- `data/food-101/meta/train.json`
- `data/food-101/meta/test.json`
- `data/food-101/train/<class>/*.jpg`
- `data/food-101/test/<class>/*.jpg`

---

## Implementation Steps

1. **Create notebook skeleton** — `data/eda_food101.ipynb` with all cell stubs and markdown headers
2. **Section 1 — Setup:** imports block (pathlib, json, random, numpy, pandas, matplotlib, PIL); define `DATA_ROOT`, `TRAIN_DIR`, `TEST_DIR`, `META_DIR`
3. **Section 2 — Overview:** iterate class dirs, count files per split; build pandas DataFrame; print + plot
4. **Section 3 — Class Exploration:** read `classes.txt`; display sorted list; render 5×5 sample grid
5. **Section 4 — Image Stats:** random sample 500 images; collect width/height/size via `PIL.Image.open`; plot 2×2 histogram grid
6. **Section 5 — Sample Mosaic:** select 1 image/class × 100 classes; resize to 128×128; compose `matplotlib` mosaic (10×10)
7. **Section 6 — Deep Dive:** pick 3 representative classes; show 5 images each (3×5 grid); plot per-class count bar chart (all 101)
8. **Section 7 — Quality:** verify file counts vs metadata; iterate and attempt `PIL.Image.open(...).verify()` on all train images; report corrupt count
9. **Section 8 — Summary:** markdown cell with bullet-point findings

---

## Todo List

- [ ] Create `data/eda_food101.ipynb` notebook file
- [ ] Section 1: Setup & Imports cell
- [ ] Section 2: Dataset Overview (counts + bar chart)
- [ ] Section 3: Class Exploration (list + sample grid)
- [ ] Section 4: Image Statistics (histograms)
- [ ] Section 5: Sample Mosaic (10×10)
- [ ] Section 6: Class Deep Dive (per-class grid + balance chart)
- [ ] Section 7: Data Quality Checks (corrupt scan + count verification)
- [ ] Section 8: Insights & Summary markdown
- [ ] Verify notebook runs top-to-bottom without errors

---

## Success Criteria

- `data/eda_food101.ipynb` exists and runs without exception
- All 8 sections present with markdown headers
- Every figure has title + axis labels
- Section 7 outputs concrete quality metrics (0 corrupt, counts match)
- Section 8 summarizes findings actionable for ViT training

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Some images unreadable/corrupt | Low | `try/except` around PIL.verify; report count |
| Memory pressure loading 1000s of images | Low | Sample-based stats (500 random); resize to 128px for mosaic |
| `images/` subdirs empty (images only in train/test) | Known | Use `TRAIN_DIR` / `TEST_DIR` throughout, not `IMAGES_DIR` |
| Slow quality scan (101k files) | Medium | Scan only train split (~75k); add progress counter |

---

## Security Considerations

- Read-only dataset access — no writes to `data/food-101/`
- No network calls, no model loading
- PIL `verify()` resets file pointer; open fresh handle for actual display

---

## Next Steps

After notebook is complete and verified:
1. Reference findings in model training config (image resize target, augmentation strategy)
2. Optionally extend with augmentation previews for ViT preprocessing
