# Phase 02: Review and Fix Train Script

## Context Links
- Parent plan: [plan.md](plan.md)
- Scout report: [reports/scout-report.md](reports/scout-report.md)
- Train script: `scripts/train.py` (342 lines)
- Config: `nutri_vision/config.py`

## Overview
- **Date:** 2026-03-27
- **Priority:** P1
- **Status:** completed
- **Description:** Fix deprecated APIs, add checkpoint resume, save processor + class names with model, persist proper `id2label` mapping.

## Key Insights
- `torch.cuda.amp.GradScaler` / `autocast` deprecated in PyTorch 2.4+ → use `torch.amp.*`
- Checkpoint only saves model weights — no optimizer, scheduler, epoch state
- `ViTImageProcessor` not saved with fine-tuned model → fragile fallback at load time
- `id2label` in saved config uses generic `LABEL_0..N` instead of actual class names
- Script is 342 lines — over 200-line limit, consider splitting report gen into separate module

## Requirements
### Functional
- Fix deprecated AMP imports for PyTorch 2.4+ compatibility
- Save full training state (optimizer, scheduler, epoch, best_acc) for resume
- Save processor config + class names alongside model checkpoint
- Persist `id2label` / `label2id` mapping in model config
- Add `--resume` CLI flag to continue from checkpoint

### Non-Functional
- Keep backward compat with existing CLI args
- Maintain clean logging output
- Keep files under 200 lines after refactor

## Architecture
No architecture change — same ViT fine-tuning pipeline. Improvements are operational (resume, proper saving).

### Current Flow
```
CLI args → TrainConfig → build_loaders() → train loop → save_pretrained() → generate_report()
```

### Proposed Flow
```
CLI args → TrainConfig → build_loaders() → [load_checkpoint if resume] → train loop → save_full_checkpoint() → generate_report()
```

## Related Code Files

### Files to Modify
| File | Changes |
|---|---|
| `scripts/train.py` | Fix AMP, add resume, save processor/labels, split if >200 lines |
| `nutri_vision/config.py` | No changes needed (TrainConfig already sufficient) |

### Files to Create (if splitting)
| File | Purpose |
|---|---|
| `scripts/train_report_generator.py` | Extract `generate_training_report()` (~70 lines) |

## Implementation Steps

### Step 1: Fix Deprecated AMP API
Replace:
```python
from torch.cuda.amp import GradScaler, autocast
# ...
scaler = GradScaler(enabled=cfg.use_amp)
with autocast(enabled=cfg.use_amp):
```
With:
```python
from torch.amp import GradScaler, autocast
# ...
scaler = GradScaler("cuda", enabled=cfg.use_amp)
with autocast("cuda", enabled=cfg.use_amp):
```

### Step 2: Save Processor + Class Names with Checkpoint
After `model.save_pretrained(best_path)`, add:
```python
processor.save_pretrained(str(best_path))
# Save class names
(best_path / "class_names.txt").write_text("\n".join(class_names))
```

### Step 3: Persist id2label Mapping
Before saving, set model config:
```python
model.config.id2label = {i: name for i, name in enumerate(class_names)}
model.config.label2id = {name: i for i, name in enumerate(class_names)}
```

### Step 4: Add Full Checkpoint Save for Resume
Save training state alongside model:
```python
torch.save({
    "epoch": epoch,
    "best_val_acc": best_val_acc,
    "optimizer": optimizer.state_dict(),
    "scheduler": scheduler.state_dict(),
    "scaler": scaler.state_dict(),
    "history": history,
}, out_dir / "training_state.pt")
```

### Step 5: Add --resume CLI Flag
```python
parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
```
Load state in `train()` before loop if `cfg.resume and (out_dir / "training_state.pt").exists()`.

### Step 6: Extract Report Generator (if >200 lines)
Move `generate_training_report()` to `scripts/train_report_generator.py`. Import in `train.py`.

### Step 7: Verify Changes Compile
```bash
python -c "from scripts.train import main; print('OK')"
nutri-train --help
```

## Todo List
- [ ] Fix `torch.cuda.amp` → `torch.amp` imports
- [ ] Save `ViTImageProcessor` with checkpoint
- [ ] Save `class_names.txt` with checkpoint
- [ ] Set `id2label`/`label2id` on model config before save
- [ ] Add training state checkpoint (`training_state.pt`)
- [ ] Add `--resume` CLI argument + load logic
- [ ] Extract report generator if file exceeds 200 lines
- [ ] Run `python -c "from scripts.train import main"` to verify
- [ ] Test `nutri-train --help` still works

## Success Criteria
- `scripts/train.py` uses non-deprecated `torch.amp` API
- Checkpoints include processor config, class names, id2label
- `--resume` flag loads optimizer/scheduler state and continues
- All files under 200 lines
- No import errors, CLI help works

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| `torch.amp` not available in older PyTorch | Import fails | Version gate: check `torch.__version__` or try/except |
| Resume with different hyperparams | Silent bugs | Log warning if loaded config differs from CLI |
| Breaking existing checkpoint format | Old checkpoints unusable | Backward-compat: check if `training_state.pt` exists before loading |

## Security Considerations
- No credentials involved
- Checkpoint files are local-only, not committed to git

## Next Steps
- After fixes applied → Phase 03: validate configs and run actual training
- If modularization done → update imports in any files referencing `scripts.train`
