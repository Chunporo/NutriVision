# NutriVision Project Changelog

All notable changes to NutriVision are documented here. This file tracks features, enhancements, bug fixes, and significant updates.

---

## [Unreleased]

### Training Pipeline Improvements — In Progress
**Training Enhancements** (2026-03-27)

#### Added
- **Training Resume Support** — `--resume` flag in `nutri-train` CLI, resumable from `training_state.pt`
- **Enhanced Model Checkpoint** — Model config now includes `id2label` and `label2id` mappings for downstream inference
- **Processor Serialization** — `ViTImageProcessor` saved alongside model checkpoint for consistent preprocessing
- **Class Mapping Export** — `class_names.txt` generated and saved with checkpoint for reference
- **Report Generation Module** — Extracted `train_report_generator.py` for reusable report + plot generation

#### Changed
- **torch.cuda.amp → torch.amp** — Migrated to modern PyTorch 2.0+ AMP API (non-deprecated)
- **Checkpoint Structure** — Now saves: `{checkpoint}/pytorch_model.bin`, `processor.json`, `class_names.txt`, `training_state.pt`

#### Modified Files
- `scripts/train.py` — Updated AMP API, added --resume flag, checkpoint serialization logic
- `scripts/train_report_generator.py` — NEW file extracted from train.py
- `nutri_vision/config.py` — Added `resume: bool = False` field to TrainConfig

#### Training Results
- **Model:** ViT-Base-Patch16-224
- **Dataset:** Food-101 (101 classes)
- **Smoke Test (1 epoch):** val_acc=87.8%
- **Full Run (10 epochs):** In progress, targeting `checkpoints/food101/best_model`

---

### Mobile UX Improvements — Complete
**Phase 1–4 Implementation** (2026-03-26)

#### Added
- **Time-of-day Greeting** — Replaces static header; dynamically greets based on time (Morning/Afternoon/Evening)
- **Improved Empty History State** — Enhanced CTA messaging encouraging users to analyze their first meal
- **Haptic Feedback Integration** — `expo-haptics` enabled on all primary buttons and analysis results
- **Animated Progress Bar** — `AnimatedProgressBar` component using Reanimated v4 for smooth progress visualization
- **Staggered Macro Card Animations** — Cards enter with offset animation on Results screen
- **Animated Calorie Counter** — Fluid numeric animation on Results screen calorie total
- **Analyzing Overlay** — `AnalyzingOverlay` component with 4-step cycling progress indicator
- **Skeleton Loader** — `SkeletonLoader` component with shimmer animation replacing `ActivityIndicator` on Details screen
- **Modal Results Navigation** — Results screen now slides from bottom as modal
- **Swipe-to-Delete Gestures** — Swipeable cards on History list using React Native Gesture Handler

#### New Components
- `mobile/src/components/animated-progress-bar.tsx` — Reanimated v4 progress bar with value smoothing
- `mobile/src/components/analyzing-overlay.tsx` — Cycling 4-step analyzer visualization with text
- `mobile/src/components/skeleton-loader.tsx` — Shimmer-animated skeleton loader replacing ActivityIndicator

#### New Dependencies
- `expo-haptics` — Haptic feedback for tactile user interactions
- `react-native-gesture-handler` — Gesture system for swipe-to-delete functionality

#### Modified Files
- `mobile/app/results.tsx` — Results screen navigation changed to modal; animated calorie counter added
- `mobile/app/details.tsx` — SkeletonLoader integration; animated macro cards
- `mobile/app/history.tsx` — Swipe-to-delete gestures; improved empty state
- `mobile/app/(tabs)/index.tsx` — Time-of-day greeting; haptic feedback on analyze button
- `mobile/app/_layout.tsx` — `GestureHandlerRootView` added at app root
- `mobile/package.json` — New dependencies + transitive react-native-gesture-handler

---

## [v1.0.0] — 2026-03-20

### Initial Release

#### Features
- **Qwen3-VL 2B Fast Inference** — 5–30 s food analysis with nutritional breakdown
- **ViT + Mask R-CNN Pipeline** — Pixel-level segmentation + calorie database lookup (10–60 s)
- **Mobile App (Expo)** — React Native app with camera/gallery capture, meal history, settings
- **FastAPI Backend** — `/analyze/quick` and `/analyze` endpoints with GPU mutex serialization
- **Gradio Web UI** — Dual-mode analysis comparison (VL vs. pipeline)
- **Dataset Training** — FoodX-251 (161K images, 251 classes) fine-tuning script
- **AsyncStorage History** — Local meal history (200-meal retention)
- **End-to-End Setup Script** — `start.sh` for one-command deployment

#### Tech Stack
- **Mobile:** React Native 0.83.2, Expo 55, TypeScript 5.9
- **Backend:** FastAPI, Uvicorn, Pydantic v2, Python 3.10+
- **ML:** PyTorch 2.1+, HuggingFace Transformers, Qwen3-VL-2B-Instruct (LoRA)
- **Segmentation:** Detectron2, Mask R-CNN (ResNet-50 + FPN)
- **Package Manager:** uv (Python), npm (Node)

---

## Legend
- **Added** — New features or functionality
- **Changed** — Updates to existing functionality
- **Fixed** — Bug fixes
- **Deprecated** — Features scheduled for removal
- **Removed** — Deleted features or components
- **Security** — Security patches or improvements
