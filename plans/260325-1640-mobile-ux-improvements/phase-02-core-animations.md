# Phase 2 — Core Animations

## Context
- **Parent:** [plan.md](plan.md)
- **Research:** [Animations & UX](research/researcher-01-animations-ux.md) | [Design Patterns](reports/researcher-02-design-patterns.md)
- **Depends on:** Phase 1 (helpers + haptics installed)

## Overview
- **Priority:** High
- **Status:** complete
- **Effort:** ~6h
- **Description:** Animated progress bar, staggered macro card entrance, animated calorie counter on results

## Key Insights
- Reanimated v4 `withTiming` runs on native thread — no JS blocking, 60fps
- Progress bar: animate width from 0→actual% over 1200ms on screen focus
- Macro cards: stagger with `withDelay(index * 150, withTiming(...))` for fade+translateY
- Calorie counter: `useSharedValue` + `useDerivedValue` + `useAnimatedProps` on Text
- `useFocusEffect` triggers re-animation on tab revisit

## Requirements

### Functional
- Progress bar animates from 0% to current on every screen focus
- Macro cards fade+slide in with 150ms stagger (3 cards = 450ms total)
- Results screen calorie number counts up from 0 to actual value over 800ms
- Animations replay on tab re-focus (not just first mount)

### Non-Functional
- 60fps on mid-range devices (Reanimated native thread)
- No layout jank during animations
- Graceful fallback if Reanimated unavailable (static render)
- `animated-progress-bar.tsx` under 100 LOC

## Architecture

### AnimatedProgressBar component
```
Props: { progress: number (0-1), color: string, overColor: string }
Internal: useSharedValue(0) → withTiming(progress * 100, { duration: 1200 })
Trigger: useEffect on progress change
Output: Animated.View with animatedStyle width%
```

### Macro card entrance
```
3 cards, each wrapped in Animated.View
useSharedValue for opacity (0→1) and translateY (20→0)
withDelay(index * 150, withTiming(..., { duration: 400 }))
Reset to 0 on focus, then animate
```

### Animated calorie counter (Results)
```
useSharedValue(0) → withTiming(calories, { duration: 800 })
useDerivedValue → Math.round(sharedValue.value)
useAnimatedProps on TextInput (Reanimated Text workaround)
OR: useAnimatedReaction to update React state (simpler)
```

## Related Code Files

| File | Action | Changes |
|------|--------|---------|
| `mobile/src/utils/theme.ts` | **modify** | Add `AnimationDuration` constants |
| `mobile/src/components/animated-progress-bar.tsx` | **create** | New component ~80 LOC |
| `mobile/app/(tabs)/index.tsx` | **modify** | Use AnimatedProgressBar, animate macro cards |
| `mobile/app/results.tsx` | **modify** | Animated calorie counter |

## Implementation Steps

### Step 1: Add animation tokens to theme.ts
1. Open `mobile/src/utils/theme.ts`
2. Add after `Radius` export:
```typescript
export const AnimationDuration = {
  fast: 300,
  medium: 600,
  slow: 1200,
  counter: 800,
  staggerDelay: 150,
} as const;
```
3. File goes from 73 → ~82 LOC. Well under limit.

### Step 2: Create AnimatedProgressBar component
1. Create `mobile/src/components/animated-progress-bar.tsx`
2. Implementation:
```typescript
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Colors, Radius, AnimationDuration } from "../utils/theme";

interface AnimatedProgressBarProps {
  /** 0-1 range representing fill percentage */
  progress: number;
  /** Bar color when under target */
  color?: string;
  /** Bar color when over target (progress > 1 before clamping) */
  overColor?: string;
  /** Track height in pixels */
  height?: number;
}

export function AnimatedProgressBar({
  progress,
  color = Colors.primary,
  overColor = Colors.error,
  height = 8,
}: AnimatedProgressBarProps) {
  const animatedProgress = useSharedValue(0);
  const isOver = progress > 1;
  const clampedProgress = Math.min(progress, 1);

  useEffect(() => {
    animatedProgress.value = 0;
    animatedProgress.value = withTiming(clampedProgress * 100, {
      duration: AnimationDuration.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
    backgroundColor: isOver ? overColor : color,
  }));

  return (
    <View style={[styles.track, { height }]}>
      <Animated.View style={[styles.fill, { height }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: Radius.full,
  },
});
```
3. ~55 LOC — well under 200.

### Step 3: Integrate AnimatedProgressBar into Home screen
1. Open `mobile/app/(tabs)/index.tsx`
2. Add import: `import { AnimatedProgressBar } from "../../src/components/animated-progress-bar"`
3. Replace the static progress bar block (lines 94-106):
   - Old: `<View style={styles.progressTrack}><View style={[styles.progressFill, ...]} /></View>`
   - New: `<AnimatedProgressBar progress={progress} />`
4. Remove `progressTrack` and `progressFill` style definitions (~10 lines saved)
5. Net LOC change: ~-8 lines (removed styles, added 1 import + 1 JSX line)

### Step 4: Animate macro card entrance
1. Still in `mobile/app/(tabs)/index.tsx`
2. Add imports from reanimated:
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
```
3. Add import: `import { AnimationDuration } from "../../src/utils/theme"` (add to existing theme import)
4. Inside `HomeScreen()`, add animation values:
```typescript
const macroOpacity = useSharedValue(0);
const macroTranslateY = useSharedValue(20);
```
5. In existing `useFocusEffect`, after `loadData()`, add:
```typescript
macroOpacity.value = 0;
macroTranslateY.value = 20;
macroOpacity.value = withTiming(1, { duration: 400 });
macroTranslateY.value = withTiming(0, { duration: 400 });
```
6. Create animated styles for each card with stagger:
```typescript
const macroStyle = (index: number) =>
  useAnimatedStyle(() => ({
    opacity: macroOpacity.value,
    transform: [{ translateY: macroTranslateY.value }],
  }));
```
   **Note:** Since all 3 share same shared value, stagger via `withDelay`:
   Instead, use 3 separate shared values or wrap each MacroCard in `Animated.View` with delay:
```typescript
// Simpler: single trigger, per-card delay in JSX
{[
  { label: "Protein", value: summary?.totalProtein || 0, color: Colors.proteinColor, icon: "fish" as const },
  { label: "Carbs", value: summary?.totalCarbs || 0, color: Colors.carbsColor, icon: "nutrition" as const },
  { label: "Fat", value: summary?.totalFat || 0, color: Colors.fatColor, icon: "water" as const },
].map((macro, index) => (
  <AnimatedMacroCard key={macro.label} index={index} {...macro} trigger={macroTrigger} />
))}
```
   This requires extracting an `AnimatedMacroCard` wrapper — keep it inline in the file to avoid over-engineering.
7. Wrap each MacroCard in an `Animated.View` with per-index delay. Use a single "trigger" shared value that resets to 0 on focus and animates to 1.

### Step 5: Animated calorie counter on Results screen
1. Open `mobile/app/results.tsx`
2. Add imports:
```typescript
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { AnimationDuration } from "../src/utils/theme";
```
3. Inside `ResultsScreen()`, after `const calories = extractCalories(n)`:
```typescript
const [displayCalories, setDisplayCalories] = useState(0);
const animatedCalories = useSharedValue(0);

useEffect(() => {
  animatedCalories.value = withTiming(calories, {
    duration: AnimationDuration.counter,
  });
}, [calories]);

useAnimatedReaction(
  () => Math.round(animatedCalories.value),
  (current) => { runOnJS(setDisplayCalories)(current); }
);
```
4. Replace: `<Text style={styles.calorieNumber}>{Math.round(calories)}</Text>`
   With: `<Text style={styles.calorieNumber}>{displayCalories}</Text>`
5. Net change: ~+15 lines (imports + state + animation logic)

### Step 6: Verify
1. `cd mobile && npx jest` — 28 tests pass
2. `cd mobile && npx tsc --noEmit` — no type errors
3. Manual: progress bar animates on home tab focus, macros stagger in, calories count up on results

## Todo List
- [x] Add AnimationDuration tokens to theme.ts
- [x] Create `animated-progress-bar.tsx` component
- [x] Integrate AnimatedProgressBar into Home screen
- [x] Animate macro card entrance with stagger
- [x] Animated calorie counter on Results screen
- [x] Run tests + type check
- [x] Manual verification on Expo Go

## Success Criteria
- Progress bar smoothly animates 0→actual% in ~1.2s
- Macro cards appear with visible stagger (not simultaneous)
- Calorie counter counts 0→actual in ~0.8s
- All animations replay on screen re-focus
- 60fps on mid-range device
- 28 Jest tests pass

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Reanimated API differences in v4 | Low | Medium | Research confirms v4 API matches; test early |
| Home screen LOC exceeds 200 | Medium | Medium | Extract AnimatedProgressBar reduces LOC; macro animation adds ~30 lines net |
| `useAnimatedReaction` flicker | Low | Low | Round in reaction callback; update via `runOnJS` |
| Stagger animation feels janky | Low | Low | Tune delay (150ms) and duration (400ms) in testing |

## Security Considerations
- No sensitive data; animations are purely visual
- No new permissions or network calls

## Next Steps
- Phase 3 uses same Reanimated patterns for skeleton shimmer
- Home screen index.tsx likely ~330-340 LOC after this phase — needs component extraction in future if more features added
