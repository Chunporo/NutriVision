---
title: "Mobile UX Improvements"
description: "Polish NutriVision mobile app with animations, improved loading states, haptics, and smoother navigation flows."
status: complete
priority: P2
effort: 16h
branch: main
tags: [frontend, feature, mobile, ux]
created: 2026-03-25
---

# Mobile UX Improvements Plan

## Context
- **Project:** NutriVision mobile app (Expo 55 / React Native 0.83.2 / TypeScript)
- **Scope:** UI/UX polish — animations, haptics, loading states, gestures
- **Effort:** 3-5 days (~16h)
- **Branch:** `main`

## Research
- [Animations & UX APIs](research/researcher-01-animations-ux.md) — Reanimated v4, expo-haptics, skeleton, swipe-to-delete, modal nav
- [Design Patterns](reports/researcher-02-design-patterns.md) — Greeting, progress bar, empty state, analyzing overlay patterns

## Phase Summary

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Quick Wins — greeting, empty state, haptics | 4h | complete | [phase-01](phase-01-quick-wins.md) |
| 2 | Core Animations — progress bar, macro entrance, calorie counter | 6h | complete | [phase-02](phase-02-core-animations.md) |
| 3 | Loading & Analysis UX — analyzing overlay, skeleton | 4h | complete | [phase-03](phase-03-loading-analysis-ux.md) |
| 4 | Navigation & Gestures — modal results, swipe-to-delete | 2h | complete | [phase-04](phase-04-navigation-gestures.md) |

## Key Dependencies
- **expo-haptics** — install in Phase 1 (`npx expo install expo-haptics`)
- **react-native-reanimated 4.2.1** — already installed, used in Phases 2-3
- **react-native-gesture-handler** — already bundled, used in Phase 4
- **GestureHandlerRootView** — must wrap app root in Phase 4

## New Components (all in `mobile/src/components/`)
| Component | File | Phase | Extracted From |
|-----------|------|-------|----------------|
| AnimatedProgressBar | `animated-progress-bar.tsx` | 2 | `index.tsx` progress bar |
| AnalyzingOverlay | `analyzing-overlay.tsx` | 3 | `camera.tsx` analyzing state |
| SkeletonLoader | `skeleton-loader.tsx` | 3 | `details.tsx` loading state |

## Files Modified
| File | LOC Now | Phases | Action |
|------|---------|--------|--------|
| `mobile/src/utils/helpers.ts` | 217 | 1 | Add `getGreeting()` |
| `mobile/src/utils/theme.ts` | 73 | 2 | Add animation duration tokens |
| `mobile/app/(tabs)/index.tsx` | 329 | 1,2 | Greeting, animated progress+macros, haptics |
| `mobile/app/(tabs)/history.tsx` | 261 | 1,4 | Empty state CTA, swipe-to-delete |
| `mobile/app/camera.tsx` | 375 | 1,3 | Haptics, extract AnalyzingOverlay |
| `mobile/app/results.tsx` | 401 | 2 | Animated calorie counter |
| `mobile/app/details.tsx` | 471 | 3 | Replace ActivityIndicator with SkeletonLoader |
| `mobile/app/_layout.tsx` | 59 | 4 | Modal presentation for results, GestureHandlerRootView |

## Constraints
- Every file stays under 200 LOC — extract components as needed
- **EXCEPTION:** `index.tsx` (~340 LOC) accepted — bulk is StyleSheet styles, functional logic clean ✅ (validated)
- DO NOT break `mobile/__tests__/helpers.test.ts` (28 tests on helpers.ts)
- `getGreeting()` is new export; existing exports unchanged
- Use Reanimated v4 API only (`useSharedValue`, `useAnimatedStyle`, `withTiming`, etc.)
- No new packages except expo-haptics

## Out of Scope (YAGNI)
- Dark mode
- Onboarding tooltip/screens
- Settings screen redesign
- Custom font loading

## Validation Log

### Session 1 — 2026-03-25
**Trigger:** Initial plan creation validation
**Questions asked:** 6

#### Questions & Answers

1. **[Navigation]** Phase 4 changes the Results screen to slide up as a modal (instead of push-right). Is this the desired navigation pattern?
   - Options: Yes, modal (slide-up) | No, keep push-right | Modal for both screens
   - **Answer:** Yes, modal (slide-up)
   - **Rationale:** Confirms Results as `presentation: "modal"` + `slide_from_bottom`. Details stays push-right. iOS swipe-down dismiss enabled.

2. **[UX]** For swipe-to-delete on History cards: should tapping the delete action still show an Alert confirmation, or delete immediately?
   - Options: Swipe + Alert confirm | Swipe = instant delete | Skip this feature
   - **Answer:** Swipe + Alert confirm
   - **Rationale:** Maintains existing `handleDelete()` pattern with Alert. No accidental deletions.

3. **[Architecture]** The analyzing overlay cycles through 4 steps every 3s (total 12s). If the API takes longer than 12s, the last step 'Almost done!' stays frozen. How should we handle this?
   - Options: Cycle then hold last step | Loop steps infinitely | Elapsed-time progress bar
   - **Answer:** Cycle then hold last step
   - **Rationale:** Simple `setInterval` that stops at `STEPS.length - 1`. No looping complexity needed.

4. **[Scope]** After Phase 2, index.tsx (Home) will be ~340 LOC. The bulk is StyleSheet styles. How should we handle this?
   - Options: Accept ~340 LOC | Extract MacroCard component | Skip macro animation
   - **Answer:** Accept ~340 LOC
   - **Rationale:** LOC guideline is about functional complexity, not style-heavy files. No extraction needed.

5. **[Scope]** Phase 1 adds haptic feedback. Which scope is preferred?
   - Options: All primary buttons + result | Camera flow only | Skip haptics
   - **Answer:** All primary buttons + result
   - **Rationale:** Haptics on all primary Pressable buttons (Home capture, Camera actions) + `notificationAsync` on analysis success/error.

6. **[Design]** Phase 1 replaces the static '🥗 NutriVision' header with a time-of-day greeting. What format do you prefer?
   - Options: Greeting + subtitle | Greeting only, no subtitle | Keep app name, add greeting below
   - **Answer:** Greeting + subtitle
   - **Rationale:** `{emoji} {greeting}` as main header + subtitle ("Start your day strong!") below date. Replaces static "🥗 NutriVision" entirely.

#### Confirmed Decisions
- **Modal Results:** `presentation: "modal"` + `slide_from_bottom` — confirmed ✅
- **Swipe delete:** Swipe reveals action → Alert confirmation → delete — confirmed ✅
- **Analyzing steps:** Hold last step if API > 12s — confirmed ✅
- **Home LOC:** Accept ~340 LOC — confirmed ✅
- **Haptics scope:** All primary buttons + analysis result — confirmed ✅
- **Greeting format:** Greeting emoji + text + subtitle row — confirmed ✅

#### Action Items
- [x] No plan changes needed — all decisions match existing plan spec

#### Impact on Phases
- Phase 1: Greeting format confirmed (greeting + subtitle replaces static header) — no change needed
- Phase 1: Haptics scope confirmed (all primary buttons) — matches existing step 5
- Phase 3: Analyzing steps hold at last step — matches existing `prev < STEPS.length - 1 ? prev + 1 : prev` logic ✅
- Phase 4: Modal results confirmed — matches existing spec ✅
