# Code Review — Mobile UX Improvements (Phases 1–4)
**Date:** 2026-03-26
**Reviewer:** code-reviewer agent
**Scope:** Reanimated v4 API correctness · Memory leaks · Hook-in-loop violations · TypeScript · Performance

---

## File Ratings

| File | Score | Critical Issues |
|---|---|---|
| `src/utils/helpers.ts` | 9/10 | None |
| `src/utils/theme.ts` | 10/10 | None |
| `src/components/animated-progress-bar.tsx` | 7/10 | `isOver`/`color` read on JS thread inside `useAnimatedStyle` |
| `src/components/analyzing-overlay.tsx` | 9/10 | None |
| `src/components/skeleton-loader.tsx` | 8/10 | Missing `shimmerX` in `useEffect` deps; `Dimensions` is static |
| `app/(tabs)/index.tsx` | **3/10** | **CRITICAL: `useAnimatedStyle` called inside `.map()` — Rules of Hooks violation** |
| `app/(tabs)/history.tsx` | 8/10 | `Swipeable` ref leak risk; `any` cast |
| `app/camera.tsx` | 9/10 | Minor: `useCallback` second import; haptics not awaited on error |
| `app/results.tsx` | 7/10 | Hooks declared after early returns (order instability); `useAnimatedReaction` always running |
| `app/_layout.tsx` | 10/10 | None |

**Overall: 6.5/10** — One blocking Rules-of-Hooks violation must be fixed before shipping; two medium-severity Reanimated threading issues.

---

## Critical Issues

### 🔴 C1 — Hook inside `.map()` — `app/(tabs)/index.tsx` lines 156–159
```tsx
// ILLEGAL — called conditionally inside .map()
{MACRO_CARDS.map((card, i) => {
  const animStyle = useAnimatedStyle(() => ({ ... }));
  ...
})}
```
`useAnimatedStyle` is a hook. Calling any hook inside an array iterator violates the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks). React hook call count changes if the array length ever differs, causing a crash. **Must be extracted to a child component** (e.g. `AnimatedMacroCard`) that receives its own `opacity`/`translateY` shared values as props.

---

## Medium Issues

### 🟡 M1 — JS-thread read inside `useAnimatedStyle` — `animated-progress-bar.tsx` lines 48–51
```tsx
const fillStyle = useAnimatedStyle(() => ({
  width: `${animatedProgress.value}%`,
  backgroundColor: isOver ? overColor : color,  // ← JS-side props read on worklet thread
}));
```
`isOver`, `overColor`, `color` are plain JS values, not shared values. Reanimated worklets capture them by value at creation time. The `backgroundColor` will **not** update reactively if `progress` crosses 1.0 after initial render. Fix: derive `isOver` as a `useSharedValue` or pass it through `useDerivedValue`.

### 🟡 M2 — Missing dependency in `useEffect` — `skeleton-loader.tsx` line 37
```tsx
useEffect(() => {
  shimmerX.value = withRepeat(...);
}, []); // shimmerX missing from deps
```
Reanimated shared values are stable references and won't change identity, so this is safe in practice. However, ESLint/exhaustive-deps will flag it and could confuse future maintainers. Add `shimmerX` to the dep array — it has no functional downside.

### 🟡 M3 — Hooks declared after early returns — `results.tsx` lines 84–97
```tsx
if (loading) return <...>;  // early return at line 55
if (!meal)   return <...>;  // early return at line 63

// hooks start here:
const [displayCalories, setDisplayCalories] = useState(0);
const animatedCalories = useSharedValue(0);
useAnimatedReaction(...);
```
Hook call order is preserved only because `loading` and `meal` never re-order hooks between renders — `useState(loading)` starts as `true` then goes `false`, so the early returns mean the hooks below are called a **different number of times** on the first render vs subsequent renders. This will throw a React error in strict mode or when `mealId` changes. All hooks must move to before the first `return`.

### 🟡 M4 — `useAnimatedReaction` runs forever — `results.tsx` lines 94–97
```tsx
useAnimatedReaction(
  () => Math.round(animatedCalories.value),
  (current) => { runOnJS(setDisplayCalories)(current); }
);
```
No dependency array equivalent — this reaction fires on every frame during the 800ms counter animation, bridging `Math.round(...)` calls across threads at ~60fps. After the animation ends, `animatedCalories` is static, but the reaction still exists. For a simple counter effect, consider `withTiming(..., {}, (finished) => { if (finished) runOnJS(setDisplayCalories)(Math.round(calories)); })` callback instead, which fires once. The current pattern is functional but wasteful.

---

## Minor Issues

### 🔵 m1 — `animateMacros` not in `useFocusEffect` dep array — `index.tsx` line 91
```tsx
useFocusEffect(
  useCallback(() => {
    loadData();
    animateMacros(); // not in deps
  }, [loadData])    // animateMacros missing
);
```
`animateMacros` closes over `macroAnimValues` array which is re-created each render. Functionally harmless (the function identity changes but shared values are stable), but linter will warn.

### 🔵 m2 — `Swipeable` instances not closed on delete — `history.tsx` lines 117–179
After a swipe-to-delete gesture is confirmed, the `Swipeable` row is removed from state but no `ref.close()` is called. On Android with gesture handler this can leave the row visually swiped open for a frame before unmount. Low severity, cosmetic.

### 🔵 m3 — `any` cast in history — `history.tsx` line 163
```tsx
(meal.nutrition.items as any)?.[0]?.name
```
Should use the existing `Array<Record<string, unknown>>` pattern from `results.tsx`.

### 🔵 m4 — Duplicate `useCallback` import — `camera.tsx` line 22
`useCallback` is imported twice (line 9 from React, line 22 as a second bare import). Harmless — bundler deduplicates — but should be cleaned up.

### 🔵 m5 — `Dimensions.get()` is static — `skeleton-loader.tsx` line 19
`SCREEN_WIDTH` captured once at module load time won't update on orientation change or window resize (iPadOS). For a shimmer component this is acceptable, but worth a comment.

### 🔵 m6 — `isOver` colour not animated — `animated-progress-bar.tsx`
`backgroundColor` changes only when the component re-renders (prop change), not as part of the smooth animation. When progress crosses 1.0 the fill colour will snap instantly from primary→error. Intentional design choice or animation gap — worth confirming.

---

## Positive Observations
- **`analyzing-overlay.tsx`**: `clearInterval` cleanup in `useEffect` is correct and complete. Step progression logic is clean.
- **`camera.tsx`**: `analyzingRef` + `BackHandler` guard is a solid UX safety net. Cleanup via `sub.remove()` is correct.
- **`_layout.tsx`**: `GestureHandlerRootView` wrapping at root level is the correct placement for `Swipeable`.
- **`results.tsx`**: Cancellation flag pattern (`cancelled = true`) in async `useEffect` correctly prevents state updates on unmounted components.
- **`helpers.ts`**: `getGreeting()` is a pure, side-effect-free function — correctly called at render time, not in a hook.
- **`theme.ts`**: `AnimationDuration` tokens are well-named and consistently used across all animation files.

---

## Fix Priority

| Priority | Issue | File |
|---|---|---|
| P0 — Block ship | C1: `useAnimatedStyle` in `.map()` | `index.tsx` |
| P1 — Fix soon | M3: Hooks after early returns | `results.tsx` |
| P1 — Fix soon | M1: JS props in `useAnimatedStyle` worklet | `animated-progress-bar.tsx` |
| P2 — Nice to have | M4: `useAnimatedReaction` always active | `results.tsx` |
| P3 — Cleanup | m1–m6 (lint/cosmetic) | Various |

---

## Unresolved Questions
- Is the snap-on-color-change behavior in `AnimatedProgressBar` (M1 / m6) intentional UX or an oversight?
- `results.tsx` presents as a modal (`presentation: "modal"`) but uses `router.replace` internally — verify back-navigation stack is correct on iOS when navigating Home → Camera → Results → Details → Back.
