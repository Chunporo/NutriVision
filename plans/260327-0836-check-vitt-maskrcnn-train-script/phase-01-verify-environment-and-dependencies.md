# Phase 01: Verify Environment and Dependencies

## Context Links
- Parent plan: [plan.md](plan.md)
- Scout report: [reports/scout-report.md](reports/scout-report.md)
- Requirements: `requirements.txt`, `pyproject.toml`
- Config: `nutri_vision/config.py`

## Overview
- **Date:** 2026-03-27
- **Priority:** P1
- **Status:** completed
- **Description:** Verify Python env, CUDA, PyTorch, HuggingFace transformers, Detectron2, and dataset readiness before attempting training.

## Key Insights
- Project uses `uv` as package manager with `.venv/` virtualenv
- Detectron2 requires special install: `git+https://github.com/facebookresearch/detectron2.git --no-build-isolation`
- CUDA toolkit version must match PyTorch CUDA version for Detectron2
- Dataset requires manual Google Drive download (120k+ images)

## Requirements
### Functional
- Python 3.10+ with CUDA-enabled PyTorch >=2.1
- All packages from `requirements.txt` installed
- Detectron2 installed and importable
- FoodX-251 dataset organized in `ImageFolder` structure

### Non-Functional
- GPU with >=16GB VRAM (for batch_size=64 with ViT-Base)
- Sufficient disk space for dataset (~10GB) + checkpoints

## Architecture
No architectural changes in this phase. Verification only.

## Related Code Files
- `requirements.txt` — dependency list
- `pyproject.toml` — package config, CLI entry points
- `nutri_vision/config.py` — model constants, dataclass configs
- `scripts/download_dataset.py` — dataset download helper

## Implementation Steps

1. **Verify Python environment**
   ```bash
   python --version  # Must be 3.10+
   which python      # Should be .venv/bin/python
   ```

2. **Check PyTorch + CUDA**
   ```bash
   python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
   ```

3. **Check transformers version**
   ```bash
   python -c "import transformers; print(transformers.__version__)"  # Must be >=4.36
   ```

4. **Check Detectron2**
   ```bash
   python -c "import detectron2; print(detectron2.__version__)"
   ```
   If missing, install: `uv pip install 'git+https://github.com/facebookresearch/detectron2.git' --no-build-isolation`

5. **Verify nutri_vision package importable**
   ```bash
   python -c "from nutri_vision.config import TrainConfig; print('OK')"
   ```

6. **Check dataset availability**
   ```bash
   ls -la data/FoodX-251/
   # Expect organized_train_set/ and organized_val_set/ with class subdirs
   ```

7. **Verify CLI entry point**
   ```bash
   nutri-train --help
   ```

8. **Check GPU memory**
   ```bash
   nvidia-smi
   ```

## Todo List
- [ ] Python 3.10+ in virtualenv
- [ ] PyTorch >=2.1 with CUDA
- [ ] transformers >=4.36
- [ ] Detectron2 installed
- [ ] nutri_vision package importable
- [ ] Dataset downloaded and organized
- [ ] `nutri-train` CLI works
- [ ] GPU memory sufficient

## Success Criteria
- All imports succeed without errors
- `nutri-train --help` displays usage
- Dataset exists in correct ImageFolder structure
- `nvidia-smi` shows available GPU with >=16GB

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| CUDA version mismatch | Detectron2 build fails | Match CUDA toolkit to PyTorch CUDA |
| Dataset not downloaded | Cannot train | Run `download_dataset.py`, manual download |
| Insufficient GPU memory | OOM during training | Reduce batch_size to 32 or 16 |
| Package version conflicts | Import errors | Use isolated venv, pin versions |

## Security Considerations
- No API keys or credentials needed for this phase
- Dataset download uses Google Drive (public links)

## Next Steps
- If all checks pass → proceed to Phase 02
- If dataset missing → download before Phase 03
- If Detectron2 fails → fix CUDA/build toolchain first
