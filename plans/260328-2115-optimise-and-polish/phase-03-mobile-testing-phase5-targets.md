---
phase: 3
title: "Mobile Testing — Phase 5 Targets"
status: pending
priority: P2
effort: ~2h
---

# Phase 3: Mobile Testing — Phase 5 Targets

## Context Links

- Parent plan: [plan.md](plan.md)
- Existing tests: `mobile/__tests__/helpers.test.ts` (204 lines, 25 test cases)
- Jest config: `mobile/jest.config.js` (ts-jest preset, node env)
- Target files: `mobile/src/utils/helpers.ts`, `mobile/src/services/storage.ts`, `mobile/src/services/api.ts`
- Components: `mobile/src/components/*.tsx` (4 files)
- Phase 5 targets from roadmap: ≥80% mobile component coverage, ≥85% backend

## Overview

- **Priority:** P2
- **Status:** Pending
- **Description:** Expand mobile Jest test suite from current helpers-only coverage to ≥80% across utilities, services, and components. Add mocks for AsyncStorage, fetch, and Reanimated.

## Key Insights (from codebase analysis)

1. **Current state:** Only `helpers.test.ts` exists (25 tests for formatter/extractor functions). No service or component tests.
2. **Jest config:** `ts-jest` with `testEnvironment: "node"` — works for pure logic tests. Component tests with React need `@testing-library/react-native` or shallow rendering.
3. **`storage.ts`** (180 lines): Uses `AsyncStorage` — easy to mock with `jest.mock()`. Has 10 public methods. In-memory cache makes testing straightforward.
4. **`api.ts`** (234 lines): Uses `fetch` + `AsyncStorage`. `fetchWithTimeout` wrapper uses `AbortController`. Can mock `global.fetch` and `AsyncStorage`.
5. **Components use Reanimated v4:** `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withRepeat`. Need `react-native-reanimated/mock` or manual mock. Jest + Reanimated requires `jest.setup.js` config.
6. **No `@testing-library/react-native` in devDeps.** Need to add for component rendering tests.
7. **`helpers.ts`** already well tested (25 tests), but missing: `extractDishName`, `extractMacros`, `extractPortions`, `extractFoodMeta`, `getGreeting`.
8. **`useThemeColors()` hook** (from Phase 1) will need tests if implemented.

## Requirements

### Functional
- F1: Test all public functions in `helpers.ts` (currently missing 5 functions)
- F2: Test all public methods in `storage.ts` (10 methods)
- F3: Test core methods in `api.ts` (init, setBaseUrl, getBaseUrl, analyzeFood error paths)
- F4: Test component rendering for all 4 components
- F5: Target ≥80% combined coverage

### Non-functional
- NF1: Tests run in <10s total
- NF2: No network calls or real AsyncStorage in tests
- NF3: Tests pass in CI environment (node, no emulator required)
- NF4: Jest config remains simple — no Detox, no e2e

## Architecture

### Test File Structure

```
mobile/__tests__/
├── helpers.test.ts              (existing — extend with missing functions)
├── storage.test.ts              (NEW — AsyncStorage mock)
├── api.test.ts                  (NEW — fetch mock)
├── components/
│   ├── analyzing-overlay.test.tsx   (NEW)
│   ├── skeleton-loader.test.tsx     (NEW)
│   ├── animated-progress-bar.test.tsx (NEW)
│   └── circular-calorie-gauge.test.tsx (NEW)
├── setup.ts                     (NEW — Reanimated mock, AsyncStorage mock)
```

### Mock Strategy

**AsyncStorage:**
```ts
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

**global.fetch:**
```ts
global.fetch = jest.fn();
```

**Reanimated v4:**
```ts
// In setup.ts
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
```

**react-native (Platform, Dimensions, etc.):**
```ts
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  StyleSheet: { create: (s) => s, absoluteFillObject: {} },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  // ... other needed mocks
}));
```

### New DevDependencies

- `@testing-library/react-native` — component rendering + queries
- `react-test-renderer` — peer dep for testing-library

## Related Code Files

### Modify
| File | Change |
|------|--------|
| `mobile/__tests__/helpers.test.ts` | Add tests for `extractDishName`, `extractMacros`, `extractPortions`, `extractFoodMeta`, `getGreeting` |
| `mobile/jest.config.js` | Add `setupFilesAfterSetup: ['./\_\_tests\_\_/setup.ts']`, update transform for tsx |
| `mobile/package.json` | Add `@testing-library/react-native`, `react-test-renderer` to devDeps |

### Create
| File | Purpose |
|------|---------|
| `mobile/__tests__/setup.ts` | Global mocks for Reanimated, AsyncStorage, RN modules |
| `mobile/__tests__/storage.test.ts` | StorageService unit tests |
| `mobile/__tests__/api.test.ts` | ApiService unit tests |
| `mobile/__tests__/components/analyzing-overlay.test.tsx` | AnalyzingOverlay render tests |
| `mobile/__tests__/components/skeleton-loader.test.tsx` | SkeletonLoader render tests |
| `mobile/__tests__/components/animated-progress-bar.test.tsx` | AnimatedProgressBar render tests |
| `mobile/__tests__/components/circular-calorie-gauge.test.tsx` | CircularCalorieGauge render tests |

### Delete
_None._

## Implementation Steps

1. **Install test dependencies**
   ```bash
   cd mobile && npm install --save-dev @testing-library/react-native react-test-renderer
   ```

2. **Create `__tests__/setup.ts`**
   - Mock `react-native-reanimated` (use `react-native-reanimated/mock`)
   - Mock `@react-native-async-storage/async-storage`
   - Mock `expo-haptics` (no-op functions)
   - Mock `react-native` partially (Dimensions, Platform, Alert)

3. **Update `jest.config.js`**
   - Add `setupFilesAfterSetup: ['<rootDir>/__tests__/setup.ts']`
   - Ensure `testEnvironment: "jsdom"` for component tests (or use separate project config)
   - Add `moduleNameMapper` for asset files if needed
   - Ensure `tsx` transform works (already in config)

4. **Extend `helpers.test.ts`**
   - `extractDishName`: test `dish_name`, `food_name`, empty
   - `extractMacros`: test `nutritional_summary` nested fields, flat fallback, mixed
   - `extractPortions`: test valid object, empty, array input
   - `extractFoodMeta`: test `food_type`, `cooking_method`, missing fields
   - `getGreeting`: mock `Date` to test all 4 time periods

5. **Create `storage.test.ts`**
   - Mock `AsyncStorage` before each test
   - Test: `getAllMeals` (empty, cached, parsed from storage)
   - Test: `saveMeal` (adds to front, respects MAX_MEALS cap)
   - Test: `getMealsByDate` (filters correctly)
   - Test: `getMealById` (found, not found)
   - Test: `getDailySummary` (aggregates calories/macros correctly)
   - Test: `deleteMeal` (removes correct entry)
   - Test: `clearHistory` (empties everything)
   - Test: `getDailyGoal` / `setDailyGoal` (default 2000, custom)

6. **Create `api.test.ts`**
   - Mock `global.fetch` and `AsyncStorage`
   - Test: `init()` loads URL from storage
   - Test: `setBaseUrl()` strips trailing slash, persists
   - Test: `getBaseUrl()` returns current
   - Test: `healthCheck()` success path
   - Test: `healthCheck()` failure (non-ok response)
   - Test: `analyzeFood()` success path (mock FormData)
   - Test: `analyzeFood()` timeout (AbortError)
   - Test: `analyzeFood()` network error
   - Test: `analyzeFood()` server error (400/500)

7. **Create component tests** (4 files)
   - `analyzing-overlay.test.tsx`:
     - Renders initial step text ("Capturing image details...")
     - Shows "Step 1 of 4"
     - Advances step after timer (use `jest.advanceTimersByTime`)
   - `skeleton-loader.test.tsx`:
     - Renders image placeholder when `showImage=true`
     - Renders correct number of lines
     - Hides image when `showImage=false`
   - `animated-progress-bar.test.tsx`:
     - Renders without crash
     - Accepts progress prop
   - `circular-calorie-gauge.test.tsx`:
     - Renders center label text
     - Renders "Goal" label
     - Accepts custom size prop

8. **Run full test suite**
   ```bash
   cd mobile && npm run test -- --coverage
   ```
   - Verify ≥80% coverage
   - All tests pass

9. **Run typecheck**
   ```bash
   cd mobile && npm run typecheck
   ```

## Todo List

- [ ] Install `@testing-library/react-native` + `react-test-renderer`
- [ ] Create `__tests__/setup.ts` with Reanimated/AsyncStorage/Haptics mocks
- [ ] Update `jest.config.js` with setup file + jsdom env
- [ ] Extend `helpers.test.ts` with 5 missing function tests (~15 new test cases)
- [ ] Create `storage.test.ts` (~12 test cases)
- [ ] Create `api.test.ts` (~10 test cases)
- [ ] Create `components/analyzing-overlay.test.tsx` (~3 test cases)
- [ ] Create `components/skeleton-loader.test.tsx` (~3 test cases)
- [ ] Create `components/animated-progress-bar.test.tsx` (~2 test cases)
- [ ] Create `components/circular-calorie-gauge.test.tsx` (~3 test cases)
- [ ] Run `npm run test -- --coverage` — ≥80%
- [ ] Run `npm run typecheck` — pass
- [ ] Verify all tests pass in clean state

## Coverage Targets

| Module | Files | Current | Target | Est. Test Cases |
|--------|-------|---------|--------|-----------------|
| `src/utils/helpers.ts` | 1 | ~60% | 95%+ | +15 (extend existing) |
| `src/services/storage.ts` | 1 | 0% | 90%+ | ~12 |
| `src/services/api.ts` | 1 | 0% | 80%+ | ~10 |
| `src/components/*.tsx` | 4 | 0% | 70%+ | ~11 |
| **Total** | **7** | **~15%** | **≥80%** | **~48 new** |

## Success Criteria

- Total test count: 25 (existing) + ~48 (new) = ~73 tests
- All 73 tests pass
- Coverage ≥80% across measured files
- `npm run typecheck` passes
- Tests run in <10s
- No real network/storage calls in test suite

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Reanimated mock breaks with v4 API | Medium | Use official mock; fallback to manual mock of used APIs |
| `@testing-library/react-native` setup complexity | Medium | Start with simple `render` + `getByText` queries |
| Component tests fragile (style-dependent) | Low | Test behavior/text, not pixel-exact styles |
| jsdom vs node env conflict | Medium | Use `@jest-environment` docblock per-file if needed |
| FormData mock for api tests | Low | Mock `global.FormData` with jest.fn() |

## Security Considerations

- Tests should not include real API URLs or credentials
- Mock data should not contain PII
- Test files not bundled in production app

## Next Steps

- After coverage targets met, consider adding e2e tests (Maestro or Detox) in a future plan
- Backend test coverage already at ≥85% (22 tests) — add cache tests in Phase 2
- CI/CD integration: add `npm run test -- --coverage` to GitHub Actions
