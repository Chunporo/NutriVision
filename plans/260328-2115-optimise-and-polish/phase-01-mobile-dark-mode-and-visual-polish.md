---
phase: 1
title: "Mobile Dark Mode & Visual Polish"
status: pending
priority: P2
effort: ~2h
---

# Phase 1: Mobile Dark Mode & Visual Polish

## Context Links

- Parent plan: [plan.md](plan.md)
- Theme tokens: `mobile/src/utils/theme.ts`
- Root layout: `mobile/app/_layout.tsx`
- All screens: `mobile/app/(tabs)/index.tsx`, `(tabs)/history.tsx`, `camera.tsx`, `results.tsx`, `details.tsx`, `settings.tsx`
- Components: `mobile/src/components/*.tsx` (4 files)

## Overview

- **Priority:** P2
- **Status:** Pending
- **Description:** Add system dark mode support via `useColorScheme()` + dual color tokens. Currently all colors are hardcoded light-only in `theme.ts`. Also fix StatusBar style to adapt.

## Key Insights (from codebase analysis)

1. `theme.ts` exports flat `Colors` object — no dark variant. All screens import `Colors.*` directly in `StyleSheet.create()` which runs at module-load time (static).
2. `_layout.tsx` sets `<StatusBar style="dark" />` — hardcoded, needs dynamic.
3. Camera modal header has `backgroundColor: Colors.primary` — works in both themes.
4. All 6 screens use `Colors.background`, `Colors.surface`, `Colors.text`, `Colors.textSecondary`, `Colors.textTertiary`, `Colors.border` for layout — these are the tokens that need dark variants.
5. Semantic colors (error, success, warning, macro colors) can stay the same in both themes.
6. `Elevation` shadows use `shadowColor: "#000"` — fine for light, but invisible on dark surfaces. Dark mode should use lighter shadow or rely on surface tint differentiation.
7. Screens use `StyleSheet.create()` with static Colors refs — need to switch to runtime `useThemeColors()` hook pattern.

## Requirements

### Functional
- F1: App auto-detects system appearance (light/dark)
- F2: All 6 screens + 4 components render correctly in dark mode
- F3: StatusBar text color adapts (light in dark mode, dark in light mode)
- F4: Header bars adapt to current theme

### Non-functional
- NF1: No flicker on theme switch
- NF2: No manual toggle (YAGNI — system pref only for v1)
- NF3: Keep files under 200 lines

## Architecture

### Approach: `useThemeColors()` Hook + Dual Token Map

```
theme.ts
├── LightColors (current Colors object, renamed)
├── DarkColors  (new dark palette)
├── useThemeColors() — hook using useColorScheme()
├── Spacing, FontSize, Radius, AnimationDuration, Elevation (unchanged)
```

**Why hook pattern instead of React context:**
- `useColorScheme()` is already reactive (RN built-in)
- No Provider needed; each component calls the hook
- Minimal refactor — just swap `Colors.x` → `colors.x` in each screen

**Dark palette strategy:**
- background: `#0F172A` (slate-900)
- surface: `#1E293B` (slate-800)
- surfaceTint: `#1E293B`
- surfaceSecondary: `#334155` (slate-700)
- text: `#F8FAFC` (slate-50)
- textSecondary: `#94A3B8` (slate-400)
- textTertiary: `#64748B` (slate-500)
- border: `#334155`
- borderLight: `#1E293B`
- primary/accent/semantic colors: unchanged (vibrant on dark bg)

### Screen Refactor Pattern

Each screen changes from:
```tsx
// BEFORE — static at module load
import { Colors } from "../src/utils/theme";
const styles = StyleSheet.create({ container: { backgroundColor: Colors.background } });
```

To:
```tsx
// AFTER — dynamic inside component
import { useThemeColors } from "../src/utils/theme";
export default function Screen() {
  const colors = useThemeColors();
  // Use colors.background etc. in inline or useMemo styles
}
```

For performance, move static styles (spacing, radius, layout) to `StyleSheet.create()` and only override color props inline or via `useMemo`.

## Related Code Files

### Modify
| File | Change |
|------|--------|
| `mobile/src/utils/theme.ts` | Add `DarkColors`, `useThemeColors()` hook |
| `mobile/app/_layout.tsx` | Dynamic `<StatusBar style>`, theme-aware header |
| `mobile/app/(tabs)/index.tsx` | Use `useThemeColors()` |
| `mobile/app/(tabs)/history.tsx` | Use `useThemeColors()` |
| `mobile/app/camera.tsx` | Use `useThemeColors()` |
| `mobile/app/results.tsx` | Use `useThemeColors()` |
| `mobile/app/details.tsx` | Use `useThemeColors()` |
| `mobile/app/settings.tsx` | Use `useThemeColors()` |
| `mobile/src/components/analyzing-overlay.tsx` | Use `useThemeColors()` for text |
| `mobile/src/components/skeleton-loader.tsx` | Use `useThemeColors()` for placeholder bg |
| `mobile/src/components/animated-progress-bar.tsx` | Use `useThemeColors()` for track bg |
| `mobile/src/components/circular-calorie-gauge.tsx` | Use `useThemeColors()` for track/label |

### Create
_None — all changes in existing files._

### Delete
_None._

## Implementation Steps

1. **Add dark palette + hook to `theme.ts`**
   - Define `LightColors` (rename current `Colors`)
   - Define `DarkColors` with slate palette
   - Export `useThemeColors()` hook: `useColorScheme() === 'dark' ? DarkColors : LightColors`
   - Keep `Colors` export as alias to `LightColors` for backward compat during migration

2. **Update `_layout.tsx`**
   - Import `useColorScheme` from `react-native`
   - Set `<StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />`
   - Pass `headerStyle.backgroundColor` from `useThemeColors()` to `Stack.screenOptions`

3. **Refactor each screen (6 screens)**
   - Replace `import { Colors }` → `import { useThemeColors }`
   - Add `const colors = useThemeColors()` at top of component
   - Convert color-dependent styles from static `StyleSheet.create()` to dynamic style objects
   - Keep non-color styles (spacing, radius, flex layout) static
   - Refactor one screen at a time, test each

4. **Refactor each component (4 components)**
   - Same pattern: add `useThemeColors()` call, pass `colors` to styled elements
   - `AnalyzingOverlay`: overlay rgba stays same, text color from theme
   - `SkeletonLoader`: placeholder bg from `colors.surfaceSecondary`, shimmer rgba ok
   - `AnimatedProgressBar`: track bg from `colors.surfaceSecondary`
   - `CircularCalorieGauge`: track ring from `colors.surfaceSecondary`, label colors from theme

5. **Visual polish pass**
   - Verify elevation shadows work in dark mode (may need to increase opacity slightly)
   - Check all border colors adapt
   - Ensure primary/accent buttons remain vibrant in both modes

6. **Run typecheck + existing tests**
   - `npm run typecheck` — zero errors
   - `npm run test` — existing helpers.test.ts passes

## Todo List

- [ ] Add `DarkColors` + `useThemeColors()` to `theme.ts`
- [ ] Update `_layout.tsx` with dynamic StatusBar + header theming
- [ ] Refactor `(tabs)/index.tsx` to use theme hook
- [ ] Refactor `(tabs)/history.tsx` to use theme hook
- [ ] Refactor `camera.tsx` to use theme hook
- [ ] Refactor `results.tsx` to use theme hook
- [ ] Refactor `details.tsx` to use theme hook
- [ ] Refactor `settings.tsx` to use theme hook
- [ ] Refactor `analyzing-overlay.tsx`
- [ ] Refactor `skeleton-loader.tsx`
- [ ] Refactor `animated-progress-bar.tsx`
- [ ] Refactor `circular-calorie-gauge.tsx`
- [ ] Run `npm run typecheck` — pass
- [ ] Run `npm run test` — pass
- [ ] Visual spot-check in dark mode (emulator or device)

## Success Criteria

- All screens render readable text/backgrounds in dark mode
- StatusBar text inverts with theme
- No hardcoded light-only colors remain (grep for `#FAFDF7`, `#FFFFFF`, `#0F172A` in style objects)
- `npm run typecheck` + `npm run test` pass
- No flicker on system theme change

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Performance hit from dynamic styles | Low | Only color props are dynamic; layout stays static |
| StyleSheet.create cannot be called conditionally | Medium | Use inline style overrides or `useMemo` for computed styles |
| Elevation shadows invisible in dark mode | Low | Bump `shadowOpacity` slightly or use border for separation |
| Component re-renders on theme change | Low | `useColorScheme` is optimized by RN core |

## Security Considerations

- No security impact — purely visual changes
- No new network calls or data handling

## Next Steps

- After dark mode lands, Phase 3 tests should cover `useThemeColors()` hook
- Future: manual light/dark/system toggle in Settings (not in this plan — YAGNI)
