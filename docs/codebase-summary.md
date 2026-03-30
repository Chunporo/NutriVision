# NutriVision Codebase Summary

Overview of project structure, key components, and architectural decisions.

---

## Project Layers

### 1. Python Core (`nutri_vision/`)
**Inference library** with two analysis modes:

| Module | Purpose |
|---|---|
| `config.py` | Constants, paths, dataclass configs (TrainConfig with `resume` flag, PredictConfig) |
| `vl.py` | Qwen3-VL model loading, inference, JSON parsing |
| `pipeline.py` | ViT + Mask R-CNN orchestration, end-to-end analysis |
| `classifier.py` | ViT-Base-Patch16-224 food classifier wrapper |
| `segmentor.py` | Mask R-CNN segmentation + portion estimation |
| `calorie_db.py` | Fuzzy-match calorie CSV lookup |
| `utils.py` | Visualization (overlay, save PNG), I/O helpers |

**Inference Modes:**
- **VL mode** (5–30 s) — Qwen3-VL-2B direct JSON output
- **Pipeline mode** (10–60 s) — ViT classification + Mask R-CNN segmentation
- **Both** (15–90 s) — Runs both for comparison

### 2. Backend (`backend/`)
**FastAPI REST API** for mobile clients:

| File | Purpose |
|---|---|
| `main.py` | 3 endpoints, GPU mutex, image validation, CORS |
| `test_main.py` | pytest suite (22 tests, all inference mocked) |
| `requirements.txt` | Extends root dependencies |

**Endpoints:**
- `GET /health` — Status, device, CUDA availability, uptime
- `POST /analyze/quick` — Qwen3-VL only (primary mobile endpoint)
- `POST /analyze` — Mode selection (vl/pipeline/both)

### 3. Mobile App (`mobile/`)
**Expo React Native app** with TypeScript:

#### Screens (`app/`)
| Screen | Purpose |
|---|---|
| `_layout.tsx` | Root layout with `GestureHandlerRootView`, tab navigation |
| `(tabs)/index.tsx` | Home screen with time-of-day greeting, Analyze button, loading skeleton, zero-state hint |
| `(tabs)/history.tsx` | Meal history list with search/filter, pull-to-refresh, swipe-to-delete, date grouping, calorie summary |
| `camera.tsx` | Camera/gallery capture UI |
| `results.tsx` | Analysis results modal (slides from bottom); portion multiplier (0.5×/1×/1.5×/2×), share button, animated calorie counter |
| `details.tsx` | Full nutrition breakdown with skeleton loader |
| `settings.tsx` | API URL configuration, daily goal setting |

#### Services (`src/services/`)
| Service | Purpose |
|---|---|
| `api.ts` | API client (fetch, AbortController timeouts, 20 MB image validation, fetchWithRetry with up to 2 retries on network/5xx errors, sleep helper) |
| `storage.ts` | AsyncStorage meal history (200-meal cap, oldest auto-pruned, 5-min TTL cache, fixed persist() error handling, invalidateCache() public method) |

#### Utilities (`src/utils/`)
| Utility | Purpose |
|---|---|
| `helpers.ts` | Formatting (calories, grams, confidence, dates), buildShareText() for share button, extraction functions |
| `theme.ts` | Design tokens (colors, spacing, typography) |

#### Components (`src/components/`)
| Component | Purpose |
|---|---|
| `animated-progress-bar.tsx` | Reanimated v4 progress bar with smooth value interpolation |
| `analyzing-overlay.tsx` | 4-step cycling progress indicator with step-dot progress row |
| `skeleton-loader.tsx` | Shimmer-animated skeleton replacing `ActivityIndicator` |
| `quick-macro-card.tsx` | Extracted macro card component (extracted from results.tsx) with staggered animation |

### 4. Web UI (`app.py`)
**Gradio dual-mode interface** for desktop/browser comparison:
- Side-by-side VL and pipeline analysis
- File upload, image display, result visualization

### 5. Training & Scripts (`scripts/`)
| Script | Purpose |
|---|---|
| `train.py` | PyTorch ViT fine-tuning, checkpoint management, model/processor/training_state saving, --resume flag support |
| `train_report_generator.py` | Report + plot generation (extracted from train.py for reusability) |
| `predict.py` | CLI prediction utility |
| `download_dataset.py` | FoodX-251 downloader (Google Drive links) |
| `download_food101.py` | Food-101 downloader |

---

## Key Dependencies

### Python
- **ML:** torch 2.1+, transformers, peft (LoRA), detectron2, timm
- **Backend:** fastapi, uvicorn, pydantic v2
- **Utilities:** pillow, numpy, pandas, pyyaml

### Node.js (Mobile)
- **Framework:** expo 55, react-native 0.83.2, react-navigation
- **Animation:** react-native-reanimated (v4), expo-haptics
- **Gesture:** react-native-gesture-handler
- **Storage:** @react-native-async-storage/async-storage
- **UI:** expo-camera, expo-image-picker, react-native-gesture-handler

### New Dependencies (Mobile UX Phase)
- **expo-haptics** — Tactile feedback on buttons and interactions
- **react-native-gesture-handler** — Gesture system for swipe-to-delete

---

## Mobile UX Components (Phase 1–5)

### Phase 1: Greetings & Feedback
- **Time-of-day Greeting** in Home header
- **Haptic Feedback** via `expo-haptics` (Trigger.Impact on buttons, results)
- **Improved History Empty State** with CTA

### Phase 2: Smooth Animations
- **AnimatedProgressBar** — Reanimated v4 interpolation
- **Staggered Macro Cards** — Offset + fade entrance on Results
- **Animated Calorie Counter** — Number animation on Results

### Phase 3: Loading States
- **AnalyzingOverlay** — 4-step cycling indicator with step-dot progress row
- **SkeletonLoader** — Shimmer placeholder on Details screen
- **Loading Skeleton** — Placeholder on Home screen during initial load
- Replaces `ActivityIndicator` for better UX

### Phase 4: Gestures & Navigation
- **GestureHandlerRootView** at app root (`_layout.tsx`)
- **Results as Modal** — Slides from bottom instead of stack push
- **Swipe-to-Delete** — Swipeable cards on History (React Native Gesture Handler)

### Phase 5: Advanced Features & Resilience
- **Pull-to-Refresh** on History screen
- **Search & Filter** on History (meal name, calorie range, date)
- **Portion Multiplier** on Results (0.5×/1×/1.5×/2×) for macro adjustment
- **Share Button** on Results (buildShareText() helper exports structured text)
- **API Retry Logic** — fetchWithRetry with up to 2 retries on network/5xx errors
- **Cache Invalidation** — 5-min TTL + invalidateCache() for manual refresh
- **QuickMacroCard Component** — Extracted from results.tsx for modularity
- **Zero-State Hints** on Home screen when no meals analyzed

---

## File Size & Modularization

| File | Lines | Status |
|---|---|---|
| `mobile/app/results.tsx` | ~120 | ✓ Modular (QuickMacroCard extracted, portion multiplier, share button) |
| `mobile/app/details.tsx` | ~130 | ✓ Modular (SkeletonLoader extracted) |
| `mobile/app/history.tsx` | ~160 | ✓ Modular (search/filter, pull-to-refresh, swipeable, SkeletonLoader) |
| `mobile/app/(tabs)/index.tsx` | ~110 | ✓ Modular (loading skeleton, zero-state hint) |
| `mobile/src/components/quick-macro-card.tsx` | ~80 | ✓ New component (extracted from results.tsx) |
| `mobile/src/services/api.ts` | ~110 | ✓ Enhanced (fetchWithRetry, sleep helper, retry logic) |
| `mobile/src/services/storage.ts` | ~130 | ✓ Enhanced (TTL cache, error handling, invalidateCache) |
| `mobile/src/utils/helpers.ts` | ~140 | ✓ Enhanced (buildShareText helper) |
| `backend/main.py` | ~180 | ✓ Modular (endpoints split, GPU mutex) |

All files maintained under 200-line limit with component extraction.

---

## Architecture Decisions

### GPU Mutex Serialization
The backend uses a threading lock to ensure only one inference runs at a time. Concurrent requests queue automatically. This prevents GPU OOM and ensures predictable performance.

### Reanimated v4 for Mobile Animations
- Smooth 60 FPS animations on native thread
- Synchronized progress bar + macro cards + calorie counter
- Better performance than pure React animation libraries

### Gesture Handler Root Wrap
`GestureHandlerRootView` wraps the entire app to enable gesture system. This is required for swipe-to-delete and other gesture-based interactions.

### Results Modal Navigation
Results screen changed from stack push to modal (slides from bottom). Improves UX by signaling temporary analysis view vs. permanent navigation.

### Portion Multiplier & Share
Results screen now supports portion adjustments (0.5×/1×/1.5×/2×) to recalculate macros in real-time. Share button exports formatted meal summary via buildShareText() helper.

### SkeletonLoader for Loading UX
Shimmer animation provides visual feedback while Details screen loads nutrition breakdown. Replaces spinner for modern, progressive disclosure pattern. Used on Home and Details screens.

### API Retry Logic with Exponential Backoff
fetchWithRetry ensures resilience on unreliable networks. Retries up to 2 times on network failures or 5xx errors with sleep helper for backoff. Reduces user-visible errors in poor connectivity scenarios.

### Cache Management with TTL
Storage service now enforces 5-minute TTL on cached meals, with public invalidateCache() method for manual refresh. Prevents stale data while reducing API calls for repeated views.

### History Search & Pull-to-Refresh
History screen supports real-time search/filter by meal name and date grouping. Pull-to-refresh reloads meal list and clears cache for fresh data.

---

## Next Steps & Future Enhancements

- [ ] Dark mode support for mobile
- [ ] Offline mode (local model inference caching)
- [ ] Advanced filters on History (calorie range, macro range)
- [ ] Barcode scanning integration
- [ ] Multi-meal combo analysis
- [ ] Cloud sync (optional login)
- [ ] Voice-to-meal logging
- [ ] Meal templates & quick re-analyze
