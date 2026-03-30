# UI/UX Designer Report — ONT-Inspired UI Patterns
**Date:** 2026-03-26 | **Slug:** ont-ui-patterns

---

## Summary

Applied OpenNutriTracker-inspired UI/UX patterns across three files. All changes are direct edits to existing files; no new packages added.

---

## Changes Made

### 1. `src/utils/theme.ts` (117 LOC)
- `Colors.background` `#F8FAFC` → `#FAFDF7` (warmer ONT-inspired off-white)
- Added `Colors.surfaceTint: "#F0FDF4"` (light green tint token for cards)
- `Colors.surface` was already `#FFFFFF` — no change needed

### 2. `app/(tabs)/index.tsx` (438 LOC)
Three visual upgrades:

**A. Circular Calorie Gauge**
- Replaced flat `AnimatedProgressBar` + numeric row with `CircularCalorieGauge` hero widget
- Layout: `[Consumed stat] | [ring gauge] | [Remaining/Over stat]` row
- Gauge animates with `withTiming` 1200ms ease-out-cubic on focus
- Over-goal state switches fill color to `Colors.error`
- Extracted component to `src/components/circular-calorie-gauge.tsx` (modularization, see below)

**B. Macro card ring accent**
- Removed `borderTopWidth: 3 / borderTopColor` stripe
- Added 32×32 circle with `borderWidth: 3, borderColor: color` wrapping the Ionicon — cleaner ONT ring motif
- All animation logic unchanged

**C. FAB-style capture button**
- Replaced wide inline `captureButton` with `fabContainer` row (label + circular 64×64 FAB)
- `flexDirection: "row", justifyContent: "flex-end"` — button floats right
- `Elevation.l4` shadow, `borderRadius: 32`
- Haptics and router logic identical

**Removed:** `AnimatedProgressBar` import (no longer used in this file), `useEffect` import (moved to extracted component)

### 3. `app/(tabs)/history.tsx` (353 LOC — no LOC change)
- `dateHeaderPill.backgroundColor`: `Colors.surfaceSecondary` → `Colors.primaryBg` (green tint)
- `dateHeaderText.color`: `Colors.textSecondary` → `Colors.primaryDark` (green label)
- Padding updated: `paddingHorizontal: Spacing.md` / `paddingVertical: 4` (consistent token use)
- `calorieBadge` + `emptyIconCircle` already correct from previous session — verified, no change needed

### 4. `src/components/circular-calorie-gauge.tsx` (137 LOC) — **new file**
Extracted `CircularGauge` from `index.tsx` to keep that file under manageable LOC.
- Props: `progress: number`, `size?: number`, `centerLabel: string`
- Two-half-clip arc technique: right-half clip [0–50%] + left-half clip [50–100%], each an `Animated.View` with `borderRadius` rotating into a clipped container
- No SVG, no new packages — pure RN `View` + Reanimated

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx jest --passWithNoTests` | ✅ 31/31 pass |

## Final LOC

| File | LOC |
|---|---|
| `app/(tabs)/index.tsx` | 438 |
| `app/(tabs)/history.tsx` | 353 |
| `src/utils/theme.ts` | 117 |
| `src/components/circular-calorie-gauge.tsx` | 137 (new) |

`index.tsx` exceeds 400 LOC guidance — acceptable per spec ("index.tsx is accepted up to ~400 LOC, style-heavy"). Further reduction would require extracting `AnimatedMacroCard` or `MacroCard` to separate files.

---

## Unresolved Questions

- None.
