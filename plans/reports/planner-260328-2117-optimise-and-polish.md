# Planner Report: Optimise & Polish

**Date:** 2026-03-28 21:17
**Plan dir:** `/home/aoi/Projects/nutri_vision/plans/260328-2115-optimise-and-polish/`
**Branch:** `model`

## Summary

Created 3-phase implementation plan for NutriVision polish pass. No new features — purely dark mode, caching, and test coverage.

## Files Created

| File | Purpose |
|------|---------|
| `plan.md` | Overview with phase table, constraints, success criteria |
| `phase-01-mobile-dark-mode-and-visual-polish.md` | Dark mode via `useThemeColors()` hook + slate dark palette across 6 screens + 4 components |
| `phase-02-backend-performance-and-image-optimisation.md` | SHA-256 LRU cache in `backend/cache.py`, image compression via expo-image-manipulator, double-submit guard |
| `phase-03-mobile-testing-phase5-targets.md` | ~48 new tests across helpers, storage, api, and 4 components targeting ≥80% coverage |

## Key Decisions

1. **Dark mode: hook pattern, not Context** — `useColorScheme()` is already reactive; adding a Provider is YAGNI. Each screen calls `useThemeColors()`.
2. **Cache: in-memory LRU (OrderedDict), 100 entries** — no Redis/disk. Clears on restart. Cache check happens before GPU lock so hits skip the queue entirely.
3. **Image compression: 1280px max + JPEG 80%** — uses `expo-image-manipulator` (already in Expo SDK, zero install). Typical phone photos drop from ~8MB to ~300KB.
4. **Component tests: `@testing-library/react-native`** — need to install. Reanimated v4 requires mock setup. Component tests focus on behavior/text, not pixel styles.
5. **Parallel execution:** Phase 1 (dark mode) and Phase 2 (backend cache) are independent. Phase 3 (tests) depends on Phase 1 for theme hook coverage.

## Effort Estimate

| Phase | Effort | Parallelizable |
|-------|--------|---------------|
| Phase 1: Dark Mode | ~2h | Yes (with Phase 2) |
| Phase 2: Backend Cache + Compression | ~2h | Yes (with Phase 1) |
| Phase 3: Testing | ~2h | After Phase 1 |
| **Total** | **~6h** | |

## Codebase Observations

- `theme.ts` (118 lines) — all light-only flat tokens, no dark variant
- `_layout.tsx` — hardcoded `<StatusBar style="dark" />`
- `backend/main.py` (~465 lines) — no caching, every request runs inference
- `camera.tsx` — no image compression, no double-submit guard
- Only 1 test file exists: `helpers.test.ts` (25 tests, formatters + extractCalories)
- 4 Reanimated components have zero test coverage
- `storage.ts` has 10 public methods with zero tests

## Unresolved Questions

1. **expo-image-manipulator import path** — Expo 55 may use `expo-image-manipulator` or `expo-image-manipulator/ImageManipulator`. Needs verification at implementation time.
2. **Reanimated v4 mock compatibility** — the official `react-native-reanimated/mock` may not cover all v4 APIs (e.g., `useAnimatedReaction`). May need manual mock extensions.
3. **`@testing-library/react-native` version** — need to verify compatible version for React 19.2 + RN 0.83.2.
