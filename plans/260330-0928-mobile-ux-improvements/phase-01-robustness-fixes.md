# Phase 01 — Robustness & Critical Fixes

## Context Links
- Parent plan: [plan.md](./plan.md)
- API service: `mobile/src/services/api.ts`
- Storage service: `mobile/src/services/storage.ts`
- Overlay component: `mobile/src/components/analyzing-overlay.tsx`

---

## Overview

| Field | Value |
|---|---|
| Priority | P1 — MUST DO |
| Status | Complete |
| Effort | ~4h |
| Description | Fix the four critical robustness gaps: no API retry, silent storage failures, fragile cache invalidation, and misleading analyzing overlay. |

---

## Key Insights

- **`analyzeFood()`** (api.ts:156–191) catches network errors and throws immediately — no retry. A single transient failure shows a cryptic error alert to the user.
- **`persist()`** (storage.ts:66–69) is `async` but the `setItem` call has no try/catch. A storage write failure silently corrupts the in-memory cache (cache set to new value, but AsyncStorage holds the old one).
- **Cache invalidation** (storage.ts:40–41): `getAllMeals()` returns `this.cache` indefinitely after first load — if the app is backgrounded and another process writes storage, it never re-reads. Simple TTL or invalidation flag fixes this.
- **AnalyzingOverlay** (analyzing-overlay.tsx:13–64): already has 4-step cycling — component is fine. However, it lacks a visual progress indicator (dots/bar) so the step progression isn't obvious. Low effort to add.

---

## Requirements

### Functional
1. Network failures on `/analyze/quick` retry up to 2 times with 2s delay before surfacing error.
2. `persist()` wraps `AsyncStorage.setItem` in try/catch; on failure rolls back cache to previous value.
3. `getAllMeals()` invalidates in-memory cache after configurable TTL (5 min) to stay fresh.
4. `AnalyzingOverlay` shows step-dot progress indicator alongside existing cycling text.

### Non-functional
- Retry logic must not retry on 4xx errors (user/server errors not worth retrying).
- Retry only on network errors (`AbortError` excluded — that's a real timeout) and 5xx.
- Storage error should propagate to caller so `saveMeal()` can surface it.
- No new npm packages.

---

## Architecture

### API Retry (api.ts)

```
analyzeFood(imageUri)
  └─ buildImageFormData()
  └─ fetchWithRetry(url, options, retries=2, delay=2000)
       ├─ fetchWithTimeout(...)
       ├─ on network error → wait delay → retry
       ├─ on 5xx → wait delay → retry
       └─ on 4xx / AbortError → throw immediately
```

Extract a `fetchWithRetry()` helper inside `api.ts`. Keeps the surface area small — no new files needed.

### Storage Error Handling (storage.ts)

```
persist(meals)
  ├─ this.cache = meals  ← set AFTER success, not before
  └─ try {
       await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(meals))
       this.cache = meals  ← commit cache only on success
     } catch (e) {
       // cache stays as previous value
       throw new Error(`Failed to save meal history: ${e.message}`)
     }
```

Reorder: set cache **after** successful write, not before.

### Cache TTL (storage.ts)

```ts
private cache: MealEntry[] | null = null;
private cacheTimestamp: number = 0;
private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

getAllMeals():
  if cache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS → return cache
  // otherwise re-read from AsyncStorage
```

Add `invalidateCache()` public method called after `deleteMeal()` / `clearHistory()` / `saveMeal()` — so mutations always force re-read on next get.

### AnalyzingOverlay step dots

Add a row of 4 dot indicators below the step text:
```
● ● ○ ○   (filled = completed steps)
```
Simple `View` row with conditional `backgroundColor`. No animation lib needed.

---

## Related Code Files

| File | Action | Change |
|---|---|---|
| `mobile/src/services/api.ts` | Modify | Add `fetchWithRetry()`, use in `analyzeFood()` and `analyzeFoodFull()` |
| `mobile/src/services/storage.ts` | Modify | Fix `persist()` error handling + cache ordering; add TTL + `invalidateCache()` |
| `mobile/src/components/analyzing-overlay.tsx` | Modify | Add step-dot progress row |

---

## Implementation Steps

### Step 1 — API retry logic (`api.ts`)

1. Add `fetchWithRetry()` function after `fetchWithTimeout()` (line ~81):
   ```ts
   async function fetchWithRetry(
     url: string,
     options: RequestInit,
     timeoutMs: number,
     retries = 2,
     delayMs = 2000
   ): Promise<Response> {
     for (let attempt = 0; attempt <= retries; attempt++) {
       try {
         const res = await fetchWithTimeout(url, options, timeoutMs);
         // Don't retry 4xx — client/server contract errors
         if (res.status >= 400 && res.status < 500) return res;
         // Retry 5xx
         if (res.status >= 500 && attempt < retries) {
           await sleep(delayMs);
           continue;
         }
         return res;
       } catch (err: any) {
         // AbortError = intentional timeout — don't retry
         if (err.name === "AbortError") throw err;
         // Network error — retry if attempts remain
         if (attempt < retries) {
           await sleep(delayMs);
           continue;
         }
         throw err;
       }
     }
     throw new Error("Unexpected retry loop exit");
   }

   function sleep(ms: number): Promise<void> {
     return new Promise((r) => setTimeout(r, ms));
   }
   ```
2. In `analyzeFood()`: replace `fetchWithTimeout(...)` call with `fetchWithRetry(...)`.
3. In `analyzeFoodFull()`: same replacement.
4. Keep existing error message format — just wraps the inner fetch.

### Step 2 — Storage error handling (`storage.ts`)

1. In `persist()`, reorder to commit cache **after** successful write:
   ```ts
   private async persist(meals: MealEntry[]): Promise<void> {
     try {
       await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(meals));
       this.cache = meals; // ← commit only on success
     } catch (e: any) {
       throw new Error(`Failed to save meal history: ${e?.message ?? e}`);
     }
   }
   ```
2. Add `private cacheTimestamp = 0` and `private static readonly CACHE_TTL_MS = 5 * 60 * 1000`.
3. Update `getAllMeals()` to check TTL:
   ```ts
   if (this.cache !== null && Date.now() - this.cacheTimestamp < StorageService.CACHE_TTL_MS) {
     return this.cache;
   }
   ```
4. After `this.cache = parsed`, also set `this.cacheTimestamp = Date.now()`.
5. Add `invalidateCache()` method:
   ```ts
   invalidateCache(): void { this.cache = null; this.cacheTimestamp = 0; }
   ```
6. Call `this.invalidateCache()` after every mutation in `saveMeal()`, `deleteMeal()`, `clearHistory()`.
   - Note: `persist()` sets cache after write, so mutations that call `persist()` can set `cacheTimestamp` there instead of calling invalidate.

### Step 3 — AnalyzingOverlay step dots (`analyzing-overlay.tsx`)

1. Add step-dot row below the subtext:
   ```tsx
   <View style={styles.dotsRow}>
     {STEPS.map((_, i) => (
       <View
         key={i}
         style={[
           styles.dot,
           { backgroundColor: i <= stepIndex ? colors.textOnPrimary : "rgba(255,255,255,0.3)" },
         ]}
       />
     ))}
   </View>
   ```
2. Add styles:
   ```ts
   dotsRow: { flexDirection: "row", gap: 8, marginTop: Spacing.md },
   dot: { width: 8, height: 8, borderRadius: 4 },
   ```
3. File stays well under 80 lines.

---

## Todo List

- [x] Add `fetchWithRetry()` + `sleep()` helpers in `api.ts`
- [x] Replace `fetchWithTimeout` calls in `analyzeFood()` with `fetchWithRetry()`
- [x] Replace `fetchWithTimeout` calls in `analyzeFoodFull()` with `fetchWithRetry()`
- [x] Fix `persist()` cache commit order in `storage.ts`
- [x] Add TTL fields and check in `getAllMeals()`
- [x] Add `invalidateCache()` and call after mutations
- [x] Add step-dot row to `AnalyzingOverlay`
- [x] Run `npm run typecheck` in `mobile/` — verify no TS errors
- [x] Run `npm test` in `mobile/` — verify existing 28 tests still pass

---

## Success Criteria

- Transient network hiccup during analysis auto-retries → user sees fewer false error alerts
- 5xx backend errors retry twice before surfacing
- 4xx / timeout errors surface immediately (no wasted retries)
- `saveMeal()` propagates storage failure — caller can show an error toast
- Cache is never stale by more than 5 min
- `AnalyzingOverlay` shows 4 dots, filled up to current step
- All 28 existing Jest tests pass

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Retry adds latency to real failures | Low | Max 2 retries × 2s = 4s added; acceptable for a 30s+ analysis |
| `persist()` rollback breaks state | Low | Cache not committed until write succeeds — no rollback needed |
| TTL causes re-reads to be slow | Very Low | AsyncStorage reads are fast (~5ms); 5-min TTL is conservative |

---

## Security Considerations

- No auth tokens in retry payloads — same request replayed (safe for idempotent POST to `/analyze/quick`)
- No sensitive data logged in retry error paths

---

## Next Steps

- Phase 02 (UX Polish) can begin in parallel once Phase 01 storage changes are merged
- Update Jest tests in `mobile/__tests__/` to cover retry logic and storage error handling
