# Code Review — `data/eda_food101.ipynb`

**Reviewer:** code-reviewer
**Date:** 2026-03-27
**Score: 7.5 / 10**

---

## Summary

Solid EDA notebook overall. Paths use `pathlib`, seed is set, figures are labelled, and the structure is clean. Several subtle correctness bugs and minor quality issues prevent a higher score.

---

## Critical Issues

### 1. `PIL.verify()` does NOT reset the file pointer (Cell 10 — corrupt scan)
`Image.verify()` reads the file internally and leaves the file in an unusable state. Any subsequent `im.decode()` / `im.show()` / `im.convert()` on the **same** opened object after `verify()` will silently return corrupt data or raise an error.

The current code uses `with Image.open(img_path) as im: im.verify()` which is the correct pattern (re-opening is required after verify), so this is actually fine here — but the exception clause `except (UnidentifiedImageError, Exception)` is redundant: `UnidentifiedImageError` is a subclass of `Exception`, so listing both is dead code.

**Fix:**
```python
except Exception:   # UnidentifiedImageError is already a subclass
    corrupt.append(img_path)
```

### 2. Aspect ratio formula is inverted for portrait images (Cell 5)
`aspect = round(w / h, 3)` yields values **< 1.0** for portrait images (h > w). The summary in Section 8 then states _"Most images are wider than tall (aspect ratio > 1)"_ — but the describe() output shows `min=0.6`, confirming portrait images exist. The formula itself is the standard W/H convention, but the comment in the final summary is misleading/wrong if any portrait images are present.

This is a documentation bug, not a formula bug, but it could mislead downstream decisions about `RandomResizedCrop` vs `CenterCrop` defaults.

### 3. `im.resize((THUMB, THUMB))` in mosaic ignores aspect ratio (Cell 7)
`Image.resize()` with equal W/H forces a square crop that distorts non-square images. For a display-only EDA mosaic this is cosmetically acceptable, but it misrepresents native image shapes. Prefer `im.thumbnail((THUMB, THUMB))` or `ImageOps.fit()` for a faithful preview.

### 4. CWD-sniff path detection is fragile (Cell 1)
```python
if _THIS_DIR.name == "data":
    DATA_ROOT = _THIS_DIR / "food-101"
else:
    DATA_ROOT = _THIS_DIR / "data" / "food-101"
```
Only handles exactly two cases. Running from `data/food-101/`, a CI working directory, or any nested path silently produces a wrong `DATA_ROOT` with no early assertion.

**Stronger pattern:**
```python
# Walk up until we find the marker file
_repo_root = next(p for p in [Path().resolve(), *Path().resolve().parents]
                  if (p / "data" / "food-101").exists())
DATA_ROOT = _repo_root / "data" / "food-101"
assert DATA_ROOT.exists(), f"DATA_ROOT not found: {DATA_ROOT}"
```

---

## Minor Issues

| # | Cell | Issue |
|---|------|-------|
| M1 | Cell 7 (mosaic) | No `try/except` around `Image.open()` — a single corrupt file aborts the entire 10×10 grid |
| M2 | Cell 3 (class grid) | Same: no error handling on `Image.open()` in the 5×5 grid |
| M3 | Cell 3 (class grid) | No `fig.suptitle()` added for the 5×5 grid — title is in `fig.suptitle` with `y=1.01` but axis labels (`ax.set_xlabel`/`ax.set_ylabel`) are absent; axes are `off`, which is intentional but inconsistent with the "figures must have axis labels" standard for non-image grids |
| M4 | Cell 7 (mosaic) | `GRID = 10` → 100 cells for 101 classes → last class (`waffles`) is silently dropped; comment says "last cell empty" but it's the last **class** that's lost, not a cell |
| M5 | Cell 5 (stats) | `except Exception: pass` with only a comment to see Section 7 — should at least log the skipped path for auditability |
| M6 | Cell 6 (histograms) | Histogram bins `bins=30` hard-coded; for `aspect` the range is narrow (0.6–1.8) so 30 bins is fine, but for `filesize_kb` the range is 15–160 KB with a spike at 512 px images; `bins="auto"` per column would be more informative |
| M7 | Cell 4 (class table) | Padding logic `classes + [""] * (-len(classes) % n_cols)` is clever but obscure — a single comment explaining the modular-arithmetic padding would help |
| M8 | General | `random.seed(SEED)` and `np.random.seed(SEED)` are set once at top but cells using `random.sample()` / `random.choice()` can still diverge on re-run if cells are executed out of order — seeding before each sampling cell would guarantee full reproducibility |

---

## What Works Well

- `pathlib` used consistently — no bare string paths ✓
- `SEED = 42` declared and applied to both `random` and `numpy` ✓
- All bar/histogram figures have `set_title`, `set_xlabel`, `set_ylabel` ✓
- `Image.open()` used as context manager (`with`) throughout ✓
- Cell lengths all ≤ 30 lines ✓
- YAGNI/KISS compliant — no unnecessary abstractions ✓
- `count_images()` helper avoids duplication ✓
- Expected-value assertions give immediate feedback on dataset integrity ✓
- Summary table in Section 8 is accurate and actionable ✓

---

## Recommended Fixes (priority order)

1. **[Critical]** Fix `GRID = 10` → 100 cells dropping `waffles`; change to `math.ceil(len(classes)/10)` rows or use `GRID=11` (11×10=110 cells) with range guard already present
2. **[High]** Add `assert DATA_ROOT.exists()` immediately after path resolution to fail fast
3. **[High]** Replace `im.resize()` with `im.thumbnail()` or `ImageOps.fit()` in mosaic for non-distorted display
4. **[Medium]** Wrap `Image.open()` in mosaic/class-grid cells with `try/except` to avoid full-grid abort on one bad file
5. **[Low]** Remove redundant `UnidentifiedImageError` from except clause
6. **[Low]** Correct Section 8 comment: portrait images _do_ exist (aspect < 1.0 confirmed in describe output)

---

## Unresolved Questions

- Should reproducibility guarantee hold across out-of-order cell execution? If yes, seed must be re-applied before every `random.*` sampling call.
- Is the mosaic intentionally dropping `waffles` (class 101) due to the 10×10 grid, or is an 11-row grid acceptable?
