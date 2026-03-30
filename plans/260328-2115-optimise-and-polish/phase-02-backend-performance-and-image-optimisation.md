---
phase: 2
title: "Backend Performance & Image Optimisation"
status: pending
priority: P2
effort: ~2h
---

# Phase 2: Backend Performance & Image Optimisation

## Context Links

- Parent plan: [plan.md](plan.md)
- Backend API: `backend/main.py` (~465 lines)
- Mobile API service: `mobile/src/services/api.ts` (~234 lines)
- Backend tests: `backend/test_main.py` (22 tests)

## Overview

- **Priority:** P2
- **Status:** Pending
- **Description:** Add server-side response caching for repeated identical images, client-side image compression before upload, and request deduplication to prevent double-submit.

## Key Insights (from codebase analysis)

1. **No caching exists.** Every `/analyze/quick` call runs full Qwen3-VL inference (5–30s). Repeated identical images re-run from scratch.
2. **No client-side compression.** `camera.tsx` captures at `quality: 0.8` via ImagePicker, but raw image is uploaded as-is. Images can be 5–15 MB. The `expo-image-manipulator` package is in Expo SDK (free) for resize/compress.
3. **No deduplication.** `camera.tsx` has no guard against double-tap on "Analyze Food" button — could trigger two simultaneous uploads.
4. **GPU lock (`_gpu_lock`) already serializes.** Adding cache before the lock avoids queue wait for cache hits.
5. **Backend returns `QuickAnalysisResponse` with unique `id` + `timestamp`.** Cache should return a new ID/timestamp but reuse the cached `nutrition` and approximate `processing_time_ms`.
6. **Image validation already reads full bytes.** Hash computation can reuse same bytes buffer — no extra I/O.
7. **`backend/main.py` is ~465 lines.** Adding cache logic + cache endpoint could push it over. May need to extract cache module to `backend/cache.py`.

## Requirements

### Functional
- F1: Identical image uploads return cached nutrition result within <50ms
- F2: Cache uses SHA-256 hash of raw image bytes as key
- F3: Cache is bounded (LRU, max 100 entries) to prevent memory bloat
- F4: New `/cache/stats` endpoint returns hit/miss counts and size
- F5: Mobile compresses images to max 1280px longest edge, JPEG 80% quality before upload
- F6: Double-tap on "Analyze Food" button prevented via `isSubmitting` guard

### Non-functional
- NF1: Cache is in-memory only — no disk/Redis (KISS)
- NF2: Cache clears on server restart (acceptable for dev)
- NF3: No breaking API changes — cached responses have same schema
- NF4: Image compression transparent to user — same UX flow

## Architecture

### Backend Cache Design

```
backend/
├── main.py          — integrate cache check before GPU lock
├── cache.py (NEW)   — LRUCache class, hash util, stats
```

**Flow with cache:**
```
POST /analyze/quick
  → read image bytes
  → sha256(bytes) → cache_key
  → if cache_key in LRU: return cached nutrition (new id/timestamp, ~0ms)
  → else: acquire GPU lock → run inference → store result in LRU → return
```

**LRUCache implementation:**
- Use `collections.OrderedDict` (stdlib, no deps)
- Max 100 entries; evicts oldest on overflow
- Store: `{ hash: { nutrition: dict, processing_time_ms: float } }`
- Thread-safe via the existing `_gpu_lock` flow (cache check before lock, cache write after inference)

### Mobile Image Compression

```
camera.tsx
  → pickFromCamera / pickFromGallery → imageUri
  → compressImage(imageUri) → compressedUri  (NEW)
  → analyzeImage(compressedUri) → API call
```

**Compression function** (new in `mobile/src/utils/image-compression.ts`):
- Uses `expo-image-manipulator` (already in Expo SDK, no install needed)
- Resize to max 1280px longest edge (maintains aspect ratio)
- JPEG compress at 0.8 quality
- Returns new file URI

### Request Deduplication

- `camera.tsx` already has `analyzingRef.current` boolean
- Add `isSubmitting` state that disables the "Analyze Food" button during upload
- Double protection: ref for back-button blocking + state for button disable

## Related Code Files

### Modify
| File | Change |
|------|--------|
| `backend/main.py` | Integrate cache check in `analyze_quick`, add `/cache/stats` endpoint |
| `mobile/app/camera.tsx` | Add image compression before upload, disable button during submit |

### Create
| File | Purpose |
|------|---------|
| `backend/cache.py` | `LRUImageCache` class + `hash_image_bytes()` utility |
| `mobile/src/utils/image-compression.ts` | `compressImage(uri)` wrapper around expo-image-manipulator |

### Delete
_None._

## Implementation Steps

### Backend (cache)

1. **Create `backend/cache.py`**
   - `hash_image_bytes(data: bytes) -> str` — SHA-256 hex digest
   - `class LRUImageCache`:
     - `__init__(max_size=100)`
     - `get(key: str) -> dict | None` — returns cached nutrition or None, updates LRU order
     - `put(key: str, nutrition: dict, processing_time_ms: float)`
     - `stats() -> dict` — `{ hits, misses, size, max_size }`
   - Thread-safe: use `threading.Lock` for cache operations (separate from GPU lock)

2. **Integrate cache in `main.py`**
   - Import `LRUImageCache`, `hash_image_bytes` from `cache`
   - Instantiate `_image_cache = LRUImageCache(max_size=100)` at module level
   - In `analyze_quick`:
     - After `_read_and_validate_image`, compute hash from raw bytes
     - Modify `_read_and_validate_image` to also return raw bytes (or hash separately)
     - Check cache before acquiring `_gpu_lock`
     - On hit: return immediately with cached nutrition, new id/timestamp, original processing_time_ms
     - On miss: after inference, store result in cache
   - Add `GET /cache/stats` endpoint

3. **Update `_read_and_validate_image`**
   - Return `(pil_image, raw_bytes)` tuple instead of just `pil_image`
   - Update both `/analyze` and `/analyze/quick` callers

4. **Run backend tests**
   - All 22 existing tests should pass (inference is mocked)
   - Add 2–3 new tests for cache behavior (hit, miss, eviction)

### Mobile (compression + dedup)

5. **Create `mobile/src/utils/image-compression.ts`**
   ```ts
   import * as ImageManipulator from 'expo-image-manipulator';

   const MAX_DIMENSION = 1280;
   const JPEG_QUALITY = 0.8;

   export async function compressImage(uri: string): Promise<string> {
     // Resize to max dimension, compress as JPEG
     const result = await ImageManipulator.manipulateAsync(
       uri,
       [{ resize: { width: MAX_DIMENSION } }],  // maintains aspect ratio
       { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
     );
     return result.uri;
   }
   ```

6. **Integrate compression in `camera.tsx`**
   - Import `compressImage`
   - In `analyzeImage()`, compress before calling `apiService.analyzeFood()`
   - Add `isSubmitting` state, set true at start of `analyzeImage`, false in finally
   - Disable "Analyze Food" button when `isSubmitting` or `state === 'analyzing'`

7. **Run mobile typecheck**
   - `npm run typecheck` — zero errors

## Todo List

- [ ] Create `backend/cache.py` with `LRUImageCache` + `hash_image_bytes`
- [ ] Update `_read_and_validate_image` to return raw bytes alongside PIL image
- [ ] Integrate cache check in `analyze_quick` endpoint
- [ ] Add `GET /cache/stats` endpoint
- [ ] Add backend tests for cache (hit, miss, eviction)
- [ ] Run all 22+ backend tests — pass
- [ ] Create `mobile/src/utils/image-compression.ts`
- [ ] Integrate compression in `camera.tsx` before upload
- [ ] Add `isSubmitting` guard to prevent double-submit
- [ ] Run `npm run typecheck` — pass
- [ ] Verify compressed upload works end-to-end (manual test)

## Success Criteria

- Cache hit for identical image returns in <50ms (vs 5–30s uncached)
- `/cache/stats` shows hits, misses, size
- Compressed images are <500KB for typical phone photos
- Double-tap on Analyze button doesn't trigger two requests
- All backend tests pass (22 existing + new cache tests)
- `npm run typecheck` passes

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cache memory bloat | Low | LRU cap at 100 entries (~100 dicts ≈ <1MB) |
| Hash collision (SHA-256) | Negligible | SHA-256 collision probability is astronomically low |
| Compression degrades image quality | Low | 1280px + 80% JPEG is plenty for food recognition |
| expo-image-manipulator not available | Low | Part of Expo SDK, no extra install needed |
| Cache returns stale result if model is updated | Low | Cache clears on restart; model updates require restart |

## Security Considerations

- Cache stores only nutrition dicts, not image bytes (no PII retention)
- SHA-256 hash is one-way — cannot reconstruct image from cache key
- `/cache/stats` endpoint: no sensitive data exposed; stats only
- Image compression happens locally on device — no extra network exposure

## Next Steps

- Future: configurable cache TTL (not needed for v1 — YAGNI)
- Future: disk-based cache for persistence across restarts
- Future: cache `/analyze` endpoint too (currently only `/analyze/quick`)
