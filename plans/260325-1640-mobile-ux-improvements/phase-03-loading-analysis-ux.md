# Phase 3 — Loading & Analysis UX

## Context
- **Parent:** [plan.md](plan.md)
- **Research:** [Animations & UX](research/researcher-01-animations-ux.md) | [Design Patterns](reports/researcher-02-design-patterns.md)
- **Depends on:** Phase 1 (haptics), Phase 2 (Reanimated patterns established)

## Overview
- **Priority:** Medium-High
- **Status:** complete
- **Effort:** ~4h
- **Description:** Replace static analyzing overlay with cycling progress steps; replace ActivityIndicator with shimmer skeleton on details screen

## Key Insights
- Users perceive 10-30s waits as shorter when shown progressive steps (research §4)
- Cycling text every 3s keeps engagement during long API calls
- Skeleton loading fills actual content space — perceived as faster than spinner
- Reanimated `withRepeat` + `withTiming` creates shimmer without external libraries
- Extracting AnalyzingOverlay brings camera.tsx from 375→~310 LOC
- Extracting SkeletonLoader brings details.tsx from 471→~420 LOC (styles still long but acceptable)

## Requirements

### Functional
- Camera analyzing state shows 4 cycling text steps with icons
- Steps cycle every 3s: "Capturing image details" → "Identifying food items" → "Calculating nutrition" → "Almost done!"
- Details screen loading state shows skeleton placeholders matching content layout
- Skeleton has shimmer animation (left-to-right sweep)

### Non-Functional
- AnalyzingOverlay component under 100 LOC
- SkeletonLoader component under 100 LOC
- Shimmer runs at 60fps (Reanimated native thread)
- Steps auto-advance but don't block; actual completion navigates away regardless of step

## Architecture

### AnalyzingOverlay component
```
Props: none (self-contained state)
State: step index (0-3), cycles via setInterval(3000)
Renders: semi-transparent overlay with icon + text per step
Steps array: [
  { icon: "📸", text: "Capturing image details..." },
  { icon: "🔍", text: "Identifying food items..." },
  { icon: "⚕️", text: "Calculating nutrition..." },
  { icon: "✅", text: "Almost done!" },
]
Cleanup: clearInterval on unmount
```

### SkeletonLoader component
```
Props: { lines?: number, showImage?: boolean, showHeader?: boolean }
Internal: useSharedValue for shimmer translateX
Animation: withRepeat(withTiming(screenWidth, { duration: 1500 }), -1, false)
Renders: gray placeholder rectangles with animated shimmer overlay
```

## Related Code Files

| File | Action | Changes |
|------|--------|---------|
| `mobile/src/components/analyzing-overlay.tsx` | **create** | New component ~70 LOC |
| `mobile/src/components/skeleton-loader.tsx` | **create** | New component ~90 LOC |
| `mobile/app/camera.tsx` | **modify** | Replace inline overlay with AnalyzingOverlay component |
| `mobile/app/details.tsx` | **modify** | Replace ActivityIndicator with SkeletonLoader |

## Implementation Steps

### Step 1: Create AnalyzingOverlay component
1. Create `mobile/src/components/analyzing-overlay.tsx`
2. Implementation:
```typescript
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native";
import { Colors, FontSize, Spacing } from "../utils/theme";

const STEPS = [
  { icon: "📸", text: "Capturing image details..." },
  { icon: "🔍", text: "Identifying food items..." },
  { icon: "⚕️", text: "Calculating nutrition..." },
  { icon: "✅", text: "Almost done!" },
] as const;

const STEP_INTERVAL_MS = 3000;

export function AnalyzingOverlay() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) =>
        prev < STEPS.length - 1 ? prev + 1 : prev
      );
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const step = STEPS[stepIndex];

  return (
    <View style={styles.overlay}>
      <Text style={styles.icon}>{step.icon}</Text>
      <ActivityIndicator
        size="large"
        color={Colors.textOnPrimary}
        style={styles.spinner}
      />
      <Text style={styles.text}>{step.text}</Text>
      <Text style={styles.subtext}>
        Step {stepIndex + 1} of {STEPS.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 40, marginBottom: Spacing.sm },
  spinner: { marginBottom: Spacing.md },
  text: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textOnPrimary,
    textAlign: "center",
  },
  subtext: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.6)",
    marginTop: Spacing.xs,
  },
});
```
3. ~60 LOC — well under limit.

### Step 2: Integrate AnalyzingOverlay into camera.tsx
1. Open `mobile/app/camera.tsx`
2. Add import: `import { AnalyzingOverlay } from "../src/components/analyzing-overlay"`
3. Replace the inline analyzing overlay (lines 146-153):
   - Old:
   ```tsx
   <View style={styles.analyzingOverlay}>
     <ActivityIndicator size="large" color={Colors.textOnPrimary} />
     <Text style={styles.analyzingText}>Analyzing your food...</Text>
     <Text style={styles.analyzingSubtext}>This may take 10-30 seconds</Text>
   </View>
   ```
   - New:
   ```tsx
   <AnalyzingOverlay />
   ```
4. Remove unused styles: `analyzingOverlay`, `analyzingText`, `analyzingSubtext` (~15 lines saved)
5. Can also remove `ActivityIndicator` from RN imports if not used elsewhere in file
   - Check: used only in analyzing overlay → yes, remove from import
6. Net effect: camera.tsx drops from 375 → ~355 LOC

### Step 3: Create SkeletonLoader component
1. Create `mobile/src/components/skeleton-loader.tsx`
2. Implementation:
```typescript
import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Colors, Radius, Spacing } from "../utils/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SHIMMER_WIDTH = 120;
const SHIMMER_DURATION = 1500;

interface SkeletonLoaderProps {
  /** Show image placeholder at top */
  showImage?: boolean;
  /** Number of text line placeholders */
  lines?: number;
}

export function SkeletonLoader({
  showImage = true,
  lines = 4,
}: SkeletonLoaderProps) {
  const shimmerX = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(SCREEN_WIDTH, {
        duration: SHIMMER_DURATION,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const renderShimmer = () => (
    <Animated.View style={[styles.shimmer, shimmerStyle]} />
  );

  return (
    <View style={styles.container}>
      {showImage && (
        <View style={styles.imagePlaceholder}>
          {renderShimmer()}
        </View>
      )}
      <View style={styles.headerPlaceholder}>
        {renderShimmer()}
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.linePlaceholder,
            i % 2 === 0 ? styles.lineWide : styles.lineNarrow,
          ]}
        >
          {renderShimmer()}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  headerPlaceholder: {
    width: "60%",
    height: 24,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  linePlaceholder: {
    height: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  lineWide: { width: "100%" },
  lineNarrow: { width: "75%" },
  shimmer: {
    position: "absolute",
    width: SHIMMER_WIDTH,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: Radius.sm,
  },
});
```
3. ~95 LOC — under limit.

### Step 4: Integrate SkeletonLoader into details.tsx
1. Open `mobile/app/details.tsx`
2. Add import: `import { SkeletonLoader } from "../src/components/skeleton-loader"`
3. Replace the loading state block (lines 56-62):
   - Old:
   ```tsx
   return (
     <View style={styles.center}>
       <ActivityIndicator size="large" color={Colors.primary} />
     </View>
   );
   ```
   - New:
   ```tsx
   return <SkeletonLoader showImage lines={5} />;
   ```
4. Remove `ActivityIndicator` from RN imports if not used elsewhere in file
   - Check: only used in loading state → yes, remove
5. Can remove `center` style if not used elsewhere → check: used in empty state too → keep it
6. Net effect: details.tsx drops from 471 → ~468 LOC (minimal, mostly style-heavy file)

### Step 5: Verify
1. `cd mobile && npx jest` — 28 tests pass (no helper changes)
2. `cd mobile && npx tsc --noEmit` — no type errors
3. Manual test:
   - Camera: trigger analysis, see cycling steps
   - Details: navigate to details, see skeleton briefly before data loads

## Todo List
- [x] Create `analyzing-overlay.tsx` component
- [x] Integrate AnalyzingOverlay into camera.tsx, remove old inline overlay
- [x] Create `skeleton-loader.tsx` component
- [x] Integrate SkeletonLoader into details.tsx, remove ActivityIndicator
- [x] Run tests + type check
- [x] Manual verification: cycling steps visible, skeleton shimmer smooth

## Success Criteria
- Analyzing overlay cycles through 4 steps at 3s intervals
- Step counter shows "Step X of 4"
- Skeleton shows image+header+line placeholders with shimmer sweep
- Shimmer animation is smooth (60fps, native thread)
- Navigation away from camera happens on actual API completion (not tied to step state)
- 28 Jest tests pass

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `setInterval` not cleaned up causing memory leak | Low | Medium | `useEffect` cleanup returns `clearInterval` |
| Shimmer `Dimensions.get` returns 0 on some platforms | Low | Low | Fallback: use 400 default width |
| Details screen loads too fast for skeleton to show | Medium | Low | Acceptable — skeleton visible on slow connections; no harm if fast |
| camera.tsx still above 200 LOC after extraction | High | Low | ~355 LOC — style block is bulk; functional code is reasonable |

## Security Considerations
- No sensitive data in overlay text
- No permissions or network calls in new components

## Next Steps
- Phase 4 adds GestureHandlerRootView (needs to wrap above components)
- Consider further camera.tsx modularization if more features added later
