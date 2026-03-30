# NutriVision Project Exploration Report

**Date:** 2026-03-30  
**Scope:** Full codebase analysis — core package, backend, mobile, scripts, documentation  
**Thoroughness:** Very thorough

---

## 1. CURRENT CODEBASE STATE

### Project Overview
**NutriVision** is a complete end-to-end food recognition system with three integrated components:
- **Python inference library** (`nutri_vision/`) — 875 LOC across 7 modules
- **FastAPI backend** (`backend/`) — 489 LOC main API + 349 LOC tests
- **Expo React Native mobile app** (`mobile/`) — TypeScript/TSX UI layer
- **Web interfaces** — Gradio (`app.py`: 216 LOC) + standalone inference scripts

### Architecture Pattern
**Three-tier design:**
1. **Inference Layer**: Python core library with two competing approaches (ViT+MaskRCNN vs Qwen3-VL)
2. **API Layer**: FastAPI wrapping inference with caching, error handling, lazy-loading
3. **Client Layer**: Mobile app + web UI consuming the API

### Key File Inventory

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Core Package** | `nutri_vision/` | 875 | Python inference library |
| | `pipeline.py` | 164 | ViT+MaskRCNN orchestration |
| | `classifier.py` | 162 | ViT image classifier wrapper |
| | `calorie_db.py` | 142 | Fuzzy-matched nutrition database |
| | `vl.py` | 113 | Qwen3-VL model loading + inference |
| | `segmentor.py` | 98 | Mask R-CNN segmentation wrapper |
| | `utils.py` | 117 | Visualization & I/O helpers |
| | `config.py` | 76 | Centralized configuration |
| **Backend** | `backend/main.py` | 489 | FastAPI REST API |
| | `backend/test_main.py` | 349 | Test suite (22 tests) |
| | `backend/cache.py` | 80 | LRU image cache (SHA-256 keyed) |
| **Web Apps** | `app.py` | 216 | Gradio dual-mode interface |
| | `evaluate.py` | 280 | Model evaluation script |
| | `inference.py` | 100 | Standalone Qwen3-VL script |
| **Mobile** | `mobile/` | 9 screens | Expo/React Native app |
| **Config** | `pyproject.toml` | 47 | Package metadata + CLI entry points |
| | `requirements.txt` | 42 | Unified Python dependencies |

---

## 2. CODE QUALITY ISSUES

### ✅ Strengths
- **Modular design**: Clean separation of concerns (classifier, segmentor, calorie DB)
- **Type hints**: Extensive use of `from __future__ import annotations` and dataclasses
- **Error handling**: Comprehensive validation in FastAPI (image size, format, dimensions)
- **GPU safety**: Proper async/thread pool execution with `asyncio.Lock()` for GPU contention
- **Logging**: Structured logging throughout with ISO timestamps
- **Testing**: 22 tests covering endpoints, caching, error cases (mocked inference)

### ⚠️ Code Quality Concerns

#### 1. **Files Approaching/Over 200 Lines**
- `backend/main.py`: **489 lines** — Too large, mixed concerns (validation, analysis, error handling)
  - Consider: Extract error handlers to separate module, move validation helpers to separate utility file
- `backend/test_main.py`: **349 lines** — Long but acceptable for test suite
- `evaluate.py`: **280 lines** — Could be split into training/evaluation submodules

#### 2. **Code Smells & Technical Debt**

**Issue: Global mutable state without clear lifecycle**
```python
# backend/main.py & app.py
_pipeline = None  # Global lazy-loaded singleton
_start_time: float = 0.0
_vl_model = None  # In vl.py
_vl_processor = None
```
- **Problem**: Race condition risk in multi-threaded scenarios (mitigated by `_gpu_lock` but could be cleaner)
- **Fix**: Use dependency injection or a proper singleton pattern with thread-safe initialization

**Issue: String-based error handling**
```python
# backend/main.py, lines 206-209
if "out of memory" in str(e).lower():  # brittle pattern
    torch.cuda.empty_cache()
```
- **Problem**: Fragile — depends on specific error message wording
- **Fix**: Catch `torch.cuda.OutOfMemoryError` directly

**Issue: Inconsistent image validation**
```python
# app.py line 71: cv2.cvtColor(image, cv2.COLOR_RGB2BGR)  # manual conversion
# backend/main.py line 193: pil_image.convert("RGB")  # PIL conversion
```
- **Problem**: Multiple code paths for the same operation
- **Fix**: Centralize image preprocessing in `utils.py`

#### 3. **Missing Input Validation**
- **`nutri_vision/classifier.py`**: No validation that `model_path` exists before loading
- **`nutri_vision/calorie_db.py`**: No handling for missing `classes.txt` or malformed CSV
- **`app.py` line 31**: Returns `{"error": "..."}` inconsistently (dict vs structured response)

#### 4. **Circular Dependencies Risk**
```
backend/main.py imports nutri_vision.vl
app.py imports nutri_vision.vl
backend/main.py → cache.py (local import without explicit module path)
```
- **Problem**: `from cache import ...` in backend/main.py requires being run from backend directory
- **Status**: Partially mitigated by sys.path manipulation (line 37), but fragile

#### 5. **Incomplete Error Messages**
```python
# backend/main.py line 376
raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
```
- **Problem**: Logs and returns raw exception strings (may leak internals)
- **Fix**: Sanitize error messages, log full trace separately

### 🔴 Potential Bugs

#### Bug 1: Image Cache Key Collision Risk
**File:** `backend/cache.py`  
**Issue:** SHA-256 is theoretically collision-resistant but still has <1e-77 probability
```python
cache_key = hash_image_bytes(raw_bytes)  # SHA-256
```
**Severity:** CRITICAL in production (multiple users same food)  
**Fix:** Add timestamp + user_id to cache key, or use full image metadata

#### Bug 2: Async Timeout on Inference Only (Not Model Load)
**File:** `backend/main.py` lines 368-370
```python
result_future = asyncio.get_event_loop().run_in_executor(None, _run_analysis, ...)
result = await asyncio.wait_for(result_future, timeout=180)  # Only covers analysis
```
**Issue:** Model loading happens on first request outside timeout scope
**Severity:** MEDIUM (first request hangs indefinitely if load fails)  
**Fix:** Pre-warm models on startup or add timeout to model load

#### Bug 3: Cache Hit Returns Stale Timestamp
**File:** `backend/main.py` lines 422-427
```python
if cached is not None:
    return QuickAnalysisResponse(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),  # NEW timestamp, old result
        nutrition=cached["nutrition"],
        processing_time_ms=cached["processing_time_ms"],  # Stale timing
    )
```
**Issue:** Cache hit shows current time but returns old analysis time (confusing)  
**Severity:** LOW (informational only)  
**Fix:** Store original timestamp in cache, or mark as cached

#### Bug 4: Detectron2 Not in requirements.txt
**File:** `requirements.txt` line 19-20
```python
# Notice: Detectron2 must be installed via git due to its build system!
# git+https://github.com/facebookresearch/detectron2.git
```
**Issue:** User must install manually — not enforced, `pip install -r requirements.txt` incomplete  
**Severity:** MEDIUM (hidden dependency)  
**Fix:** Create separate `requirements-detectron2.txt` or document in setup script

#### Bug 5: Hardcoded Model Paths (No Fallback)
**File:** `nutri_vision/config.py` line 15-16
```python
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = _PROJECT_ROOT / "data"
```
**Issue:** Breaks if code is installed as package; assumes repo structure  
**Severity:** MEDIUM (breaks in production deployment)  
**Fix:** Use `importlib.resources` or check multiple paths

---

## 3. MISSING FEATURES (README vs Implementation)

### Claimed Features ✓ Implemented
- ✅ Two inference approaches (ViT+MaskRCNN, Qwen3-VL)
- ✅ FastAPI REST API with `/health`, `/analyze`, `/analyze/quick`
- ✅ Expo React Native mobile app
- ✅ Gradio web interface
- ✅ Image caching
- ✅ Calorie database fuzzy matching

### Claimed Features ⚠️ Partially Implemented
- ⚠️ **"Pixel-to-gram calibration"** (README) → Hardcoded `PIXEL_TO_GRAM_RATIO = 100/10000` (no user calibration UI)
- ⚠️ **"Multiple inference endpoints"** → Only VL endpoint actually works in mobile app (pipeline endpoint exists but mobile has no toggle)
- ⚠️ **"Model evaluation metrics"** → `evaluate.py` exists but not integrated with training pipeline

### Missing Features ❌ NOT Implemented
- ❌ **Authentication/authorization** — API open to all (`allow_origins=["*"]`)
- ❌ **Rate limiting** — No throttling on `/analyze/quick` (could DOS)
- ❌ **Persistent meal history** — Mobile app uses AsyncStorage (in-memory), no cloud sync
- ❌ **Batch analysis** — Single image per request only
- ❌ **Model versioning** — No way to specify model version or rollback
- ❌ **Image preprocessing options** — No user control over compression/quality
- ❌ **Nutritional profile customization** — Hardcoded 251 food classes
- ❌ **Export/reporting** — No PDF/CSV export of meal logs
- ❌ **Offline mode** — Mobile app requires always-on API connection
- ❌ **A/B testing framework** — No model versioning for A/B tests

---

## 4. TEST COVERAGE

### Test Summary
| Layer | Coverage | Status |
|-------|----------|--------|
| **Backend API** | 22 tests | ✅ Good (mocked inference) |
| **Core inference** | Minimal | ⚠️ Ad-hoc only (no pytest suite) |
| **Mobile app** | ~28 tests | ✅ Jest for utilities |
| **Web interface** | None | ❌ No tests |

### Backend Tests (`backend/test_main.py`)
**Coverage: Endpoints, caching, validation**
- ✅ `/health` returns correct schema
- ✅ `/analyze/quick` with JPEG, PNG, WebP
- ✅ Cache hit/miss behavior
- ✅ Image validation (size, format, dimensions)
- ✅ Error responses (400, 413, 503, 504)
- ✅ Timeout handling

**Gaps:**
- ❌ No integration tests (real model inference)
- ❌ No `/analyze` pipeline endpoint tests (only quick tests)
- ❌ No concurrent request stress tests
- ❌ No memory leak tests
- ❌ No malformed file tests (corrupted JPEG headers)

### Core Package Tests
- ❌ No dedicated test suite for `pipeline.py`, `classifier.py`, `segmentor.py`, `vl.py`
- ⚠️ Validation done ad-hoc via `evaluate.py` and Jupyter notebooks (in `notebooks/` dir)

### Mobile Tests
- ✅ Jest tests for utility functions (`__tests__/`)
- ✅ TypeScript type checking
- ❌ No E2E tests (Detox/Appium)
- ❌ No snapshot tests for UI components

### Recommendations
1. Add pytest suite for `nutri_vision/` package (at least basic imports + data validation)
2. Add integration tests for backend (with small test image)
3. Add E2E mobile tests (at least happy path)
4. Add performance regression tests (inference time benchmarks)

---

## 5. DOCUMENTATION GAPS

### Documentation That Exists ✅
| File | Lines | Quality |
|------|-------|---------|
| `README.md` | 283 | ⭐⭐⭐⭐ Comprehensive |
| `docs/USER_GUIDE.md` | 17k | ⭐⭐⭐⭐ Detailed setup |
| `docs/development-roadmap.md` | 12k | ⭐⭐⭐ Roadmap |
| `docs/codebase-summary.md` | 6.8k | ⭐⭐⭐ Overview |
| `docs/project-changelog.md` | 6.1k | ⭐⭐ Minimal entries |

### Documentation Gaps ❌
- ❌ **Architecture diagram** — No visual system design
- ❌ **API schema documentation** — Only via `/docs` endpoint (no static OpenAPI)
- ❌ **Model training guide** — How to fine-tune on custom dataset
- ❌ **Deployment guide** — Docker? Cloud? Production checklist?
- ❌ **Troubleshooting guide** — Only brief README section
- ❌ **Performance tuning** — No guidance on batch size, quantization, etc.
- ❌ **Contributing guide** — No CONTRIBUTING.md
- ❌ **Data format specification** — CSV schema for `food_calories.csv` not documented
- ❌ **API versioning strategy** — No v1/v2 planning
- ❌ **Inline code documentation** — Many functions lack docstrings
  - `nutri_vision/utils.py`: Only 2 docstrings for 5 functions
  - `nutri_vision/segmentor.py`: Missing class docstring
  - `backend/cache.py`: Good (has docstrings)

---

## 6. PERFORMANCE CONCERNS

### Bottlenecks Identified

#### 1. **Model Loading on First Request** (CRITICAL)
**File:** `backend/main.py` line 137-154 + `app.py` line 44-57
```python
def _load_pipeline():
    if _pipeline is not None:
        return _pipeline
    # Loads ViT + Mask R-CNN + Detectron2 — takes ~30-60 seconds
    _pipeline = NutriVisionPipeline(config=PredictConfig())
```
**Impact:** First request to `/analyze` hangs for 30-60 seconds  
**Fix:** Pre-warm on startup, or use a health-check endpoint before analysis

#### 2. **Synchronous GPU Operations Blocking Event Loop** (MEDIUM)
**File:** `backend/main.py` line 365-370
```python
async with _gpu_lock:
    result_future = asyncio.get_event_loop().run_in_executor(
        None, _run_analysis, pil_image, mode  # Blocks entire thread pool
    )
```
**Impact:** Concurrent requests queue up even on separate threads  
**Fix:** Use a process pool instead of thread pool for CPU-bound inference

#### 3. **No Input Image Downsampling** (MEDIUM)
**File:** `backend/main.py` only validates max dimension (8192px) but doesn't downscale
```python
if w > MAX_IMAGE_DIMENSION or h > MAX_IMAGE_DIMENSION:
    raise HTTPException(...)  # Just rejects, doesn't resize
```
**Impact:** 8K images can be uploaded but processing them is slow  
**Fix:** Auto-downscale to reasonable size (e.g., 1024px max)

#### 4. **Naive LRU Cache** (LOW)
**File:** `backend/cache.py` uses OrderedDict with linear eviction
```python
if len(self._store) > self._max_size:
    self._store.popitem(last=False)  # O(1) but rebuilds on access
```
**Impact:** Cache miss on every new image (different users)  
**Fix:** Consider Redis for distributed caching

### Performance Metrics from README
| Metric | Value | Assessment |
|--------|-------|------------|
| ViT+MaskRCNN latency | 10-60 s | Acceptable for batch processing, poor for mobile |
| Qwen3-VL latency | 5-30 s | Better but still 5+ seconds (poor UX) |
| Top-3 accuracy | 88% | Good |
| Segmentation IoU | >75% | Good |
| E2E latency | 2-3 s | ⚠️ Inconsistent with model latencies above |

---

## 7. ARCHITECTURE ISSUES

### Design Weaknesses

#### 1. **Two Competing Inference Approaches** (Fragmentation)
**Problem:** System supports two orthogonal approaches (ViT+MaskRCNN vs Qwen3-VL)
```python
# pipeline.py: ViT + Mask R-CNN (slow, segmentation-based)
# vl.py: Qwen3-VL (faster, end-to-end)
```
- **Code duplication**: Calorie estimation logic in both paths
- **Unclear winner**: No guidance on which to use when
- **Testing burden**: Must test both paths independently
- **Maintenance risk**: Bug fix needed in one path often forgotten in other

**Fix:** 
- Unify result types (both return same nutritional output)
- Add benchmarking to recommend approach per device/OS
- Document tradeoffs clearly (accuracy vs latency)

#### 2. **Hardcoded Dataset Assumptions** (Brittleness)
**Files:** `config.py`, `calorie_db.py`, `classifier.py`
```python
NUM_FOOD_CLASSES = 251  # FoodX-251 specific
CLASSES_FILE = DATA_DIR / "classes.txt"  # Hardcoded path
```
**Problem:** System tightly coupled to FoodX-251 dataset
- Cannot swap datasets without code changes
- No pluggable food database abstraction
- Calorie DB lookup assumes matching class names

**Fix:**
- Extract dataset definition to config
- Support multiple food databases
- Add dataset version metadata

#### 3. **Missing Dependency Injection** (Testability)
**Current pattern:** Global singletons with side effects
```python
# vl.py
_vl_model = None
def load_vl_model():
    global _vl_model
    if _vl_model is not None:
        return _vl_model
    # ... side effects on first call
```

**Problem:**
- Hard to test (can't inject mocks)
- Hidden dependencies (globals)
- Order-of-operations bugs (which loads first?)

**Fix:** Use dependency injection framework or at least factory functions

#### 4. **No Clear Request/Response Contract** (Versioning)
**File:** `backend/main.py`
```python
class QuickAnalysisResponse(BaseModel):
    nutrition: dict  # Untyped! What fields?
```

**Problem:**
- Mobile app must guess JSON structure
- Breaking changes on nutrition format not detected
- No API versioning strategy

**Fix:**
- Define strict Pydantic schema for `nutrition` dict
- Use API versioning (e.g., `/v1/analyze`)
- Add response validation tests

#### 5. **Image Caching Without Invalidation** (Staleness)
**File:** `backend/cache.py`
```python
cache_key = hash_image_bytes(raw_bytes)
# No invalidation, no TTL, no user separation
```

**Problem:**
- Multi-tenant: User A uploads image, User B gets same image → cached result for User B
- Model update: Old cached results even after model re-trains
- No cache busting mechanism

**Fix:**
- Add per-user cache isolation
- Add TTL to cache entries
- Add `/cache/clear` admin endpoint

---

## 8. SUMMARY TABLE

| Category | Status | Severity | Priority |
|----------|--------|----------|----------|
| **Code Quality** | ⚠️ Mixed | Medium | High |
| **Test Coverage** | ⚠️ Incomplete | Medium | High |
| **Documentation** | ⚠️ Gaps exist | Low | Medium |
| **Performance** | ⚠️ Bottlenecks | Medium | High |
| **Architecture** | ⚠️ Issues found | Medium | High |
| **Bugs** | 🔴 5 found | 1 Critical, 2 Medium | Very High |

---

## UNRESOLVED QUESTIONS

1. **Which inference approach to standardize on?**
   - ViT+MaskRCNN provides segmentation (useful for portion visualization)
   - Qwen3-VL is faster
   - Should one be deprecated?

2. **Is the pixel-to-gram calibration correct?**
   - `PIXEL_TO_GRAM_RATIO = 100/10000` seems arbitrary
   - No validation that weights are realistic
   - How was this ratio determined?

3. **How is the mobile app's `history` persisted?**
   - AsyncStorage is per-device, not synced
   - User switches phone → history lost
   - Is cloud sync planned?

4. **What's the production deployment strategy?**
   - Docker? Cloud Run? EC2?
   - How are models distributed? (HF Hub? S3?)
   - How does auto-scaling work?

5. **Are there privacy concerns with image caching?**
   - Food images cached without user consent
   - No user awareness that images cached
   - GDPR-compliant?

6. **What's the roadmap for authentication?**
   - Currently anyone can hit `/analyze/quick`
   - Rate limiting? Quotas? API keys?

---

## RECOMMENDATIONS (Prioritized)

### Tier 1: Critical (Week 1-2)
1. **Fix cache key collision** — Add user context to SHA-256 key
2. **Fix Detectron2 dependency** — Add to requirements, make installation foolproof
3. **Add input downsampling** — Auto-resize 8K images to 1024px max
4. **Add timeout to model loading** — Prevent first-request hangs

### Tier 2: Important (Week 3-4)
5. **Unify result types** — Make both inference paths return identical schema
6. **Add comprehensive test suite** — Core package pytest, E2E mobile tests
7. **Document API schema** — Static OpenAPI spec + versioning strategy
8. **Add error sanitization** — Don't leak raw exceptions to clients

### Tier 3: Nice-to-Have (Month 2)
9. **Implement authentication** — API key / JWT for mobile app
10. **Add rate limiting** — Redis + sliding window per IP/key
11. **Build admin dashboard** — Cache stats, model health, request monitoring
12. **Create deployment guide** — Docker, Kubernetes, cloud provider specifics

---

**Report Generated:** 2026-03-30 09:28 UTC  
**Analyst:** Explore Subagent  
**Confidence:** Very High (direct code inspection)
