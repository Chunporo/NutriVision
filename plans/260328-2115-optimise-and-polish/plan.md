---
title: "NutriVision: Optimise & Polish"
description: "Quick-win optimisations across Mobile UI/UX (dark mode), Backend perf (caching), and Testing (Phase 5 targets)."
status: pending
priority: P2
effort: ~6h
branch: model
tags: [mobile, backend, testing, performance, dark-mode, polish]
created: 2026-03-28
---

# NutriVision: Optimise & Polish

Quick-win polish pass — no new features, focus on dark mode, perf caching, and test coverage.

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Mobile Dark Mode & Visual Polish | pending | ~2h | [phase-01](phase-01-mobile-dark-mode-and-visual-polish.md) |
| 2 | Backend Performance & Image Optimisation | pending | ~2h | [phase-02](phase-02-backend-performance-and-image-optimisation.md) |
| 3 | Mobile Testing — Phase 5 Targets | pending | ~2h | [phase-03](phase-03-mobile-testing-phase5-targets.md) |

## Key Dependencies

- Phase 1 & 2 are independent — can run in parallel
- Phase 3 depends on Phase 1 (dark-mode theme hook must exist before testing it)
- All phases on `model` branch

## Constraints

- Keep files under 200 lines; extract modules as needed
- YAGNI — no offline mode, no cloud sync, no new screens
- Dark mode: system auto-detect only (no manual toggle in v1)
- Cache: in-memory LRU only (no Redis/disk persistence)
- Tests: Jest + ts-jest (already configured), no Detox/Maestro yet

## Success Criteria

- Dark mode renders correctly on all 6 screens + 4 components
- Backend cache hit returns <50ms for repeated identical images
- Mobile test coverage ≥80% (helpers, storage, api, components)
- `npm run typecheck` passes with zero errors
- All 22 backend tests still pass
