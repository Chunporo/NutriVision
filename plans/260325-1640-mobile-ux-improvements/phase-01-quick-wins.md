# Phase 1 — Quick Wins

## Context
- **Parent:** [plan.md](plan.md)
- **Research:** [Animations & UX](research/researcher-01-animations-ux.md) | [Design Patterns](reports/researcher-02-design-patterns.md)

## Overview
- **Priority:** High
- **Status:** complete
- **Effort:** ~4h
- **Description:** Time-of-day greeting, improved empty state with CTA, haptic feedback on buttons

## Key Insights
- Greeting pattern: 4 time brackets (morning/afternoon/evening/night) with emoji+color per bracket
- Empty state best practice: large icon + headline + subtitle + primary CTA button
- expo-haptics available in SDK 55; `impactAsync(Medium)` for buttons, `notificationAsync(Success/Error)` for completion
- `getGreeting()` added to helpers.ts — existing 28 tests test OTHER functions; new function won't break them

## Requirements

### Functional
- Home screen greeting changes based on time of day (morning/afternoon/evening/night)
- History empty state has "Log Your First Meal" CTA navigating to `/camera`
- All primary buttons have haptic feedback on press
- Camera analysis complete/fail triggers success/error haptic

### Non-Functional
- Haptics degrade gracefully on simulator (expo-haptics is no-op)
- `getGreeting()` is pure function, easily unit-testable
- No visual regressions on existing screens

## Architecture

### `getGreeting()` helper
```typescript
// Returns { text: string; emoji: string; subtitle: string }
// 5-12 → "Good morning" + sunrise emoji
// 12-17 → "Good afternoon" + sun emoji
// 17-21 → "Good evening" + sunset emoji
// 21-5 → "Good night" + moon emoji
```

### Haptics wrapper (inline, no separate file)
```typescript
import * as Haptics from 'expo-haptics';
// On button press: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
// On success: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
// On error: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
```

## Related Code Files

| File | Action | Changes |
|------|--------|---------|
| `mobile/src/utils/helpers.ts` | **modify** | Add `getGreeting()` export at end of file |
| `mobile/app/(tabs)/index.tsx` | **modify** | Import+use greeting; add haptics to capture button |
| `mobile/app/(tabs)/history.tsx` | **modify** | Improve empty state with CTA button |
| `mobile/app/camera.tsx` | **modify** | Add haptics to action buttons + analysis completion |
| `package.json` (mobile) | **modify** | expo-haptics added via `npx expo install` |

## Implementation Steps

### Step 1: Install expo-haptics
1. `cd mobile && npx expo install expo-haptics`
2. Verify `expo-haptics` appears in `mobile/package.json` dependencies
3. No native rebuild needed (Expo Go compatible)

### Step 2: Add `getGreeting()` to helpers.ts
1. Open `mobile/src/utils/helpers.ts`
2. Add at END of file (after all existing exports, before no existing content is modified):
```typescript
/**
 * Time-of-day greeting with emoji and subtitle.
 */
export function getGreeting(): { text: string; emoji: string; subtitle: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "🌅", subtitle: "Start your day strong!" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "☀️", subtitle: "Keep fueling your body!" };
  if (hour >= 17 && hour < 21) return { text: "Good evening", emoji: "🌇", subtitle: "How was your day?" };
  return { text: "Good night", emoji: "🌙", subtitle: "Rest well tonight!" };
}
```
3. Run `cd mobile && npx jest` — confirm all 28 tests still pass (new export adds no side effects)

### Step 3: Update Home screen greeting
1. Open `mobile/app/(tabs)/index.tsx`
2. Add import: `import { getGreeting } from "../../src/utils/helpers"` (add to existing import)
3. Add import: `import * as Haptics from 'expo-haptics'`
4. Inside `HomeScreen()`, add: `const greeting = getGreeting();`
5. Replace greeting JSX:
   - Old: `<Text style={styles.greeting}>🥗 NutriVision</Text>`
   - New: `<Text style={styles.greeting}>{greeting.emoji} {greeting.text}</Text>`
6. Replace date subtitle:
   - Keep the date line but add greeting subtitle below:
   ```tsx
   <Text style={styles.subtitle}>{greeting.subtitle}</Text>
   ```
7. Add `subtitle` style: `{ fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 }`
8. Add haptic to capture button `onPress`:
   ```tsx
   onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/camera"); }}
   ```

### Step 4: Improve History empty state
1. Open `mobile/app/(tabs)/history.tsx`
2. Add import: `import { useRouter } from "expo-router"` — already imported
3. In empty state JSX, replace current block with:
```tsx
<View style={styles.emptyContainer}>
  <Text style={styles.emptyEmoji}>🍽️</Text>
  <Text style={styles.emptyTitle}>No meals logged yet</Text>
  <Text style={styles.emptySubtitle}>
    Log your first meal and let AI analyze your nutrition
  </Text>
  <Pressable
    style={styles.emptyCta}
    onPress={() => router.push("/camera")}
  >
    <Ionicons name="camera" size={20} color={Colors.textOnPrimary} />
    <Text style={styles.emptyCtaText}>Log Your First Meal</Text>
  </Pressable>
</View>
```
4. Add styles:
   - `emptyEmoji: { fontSize: 64 }`
   - `emptyCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, gap: Spacing.sm, marginTop: Spacing.xl }`
   - `emptyCtaText: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.textOnPrimary }`
5. Remove the old `<Ionicons name="fast-food-outline" size={64} .../>` (replaced by emoji)

### Step 5: Add haptics to Camera screen
1. Open `mobile/app/camera.tsx`
2. Add import: `import * as Haptics from 'expo-haptics'`
3. In `ActionButton` component, add haptic before `onPress`:
```tsx
onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
```
   Wait — `onPress` is already the prop. Wrap it:
   - Change ActionButton's internal onPress to fire haptic then call the prop
4. In `analyzeImage()`:
   - After success (before router.replace): `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
   - In catch block (before setState error): `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)`

### Step 6: Verify
1. `cd mobile && npx jest` — all 28 tests pass
2. `cd mobile && npx tsc --noEmit` — no type errors
3. Manual test on Expo Go: greeting changes, empty state has CTA, buttons have haptic

## Todo List
- [x] Install expo-haptics
- [x] Add `getGreeting()` to helpers.ts
- [x] Update Home screen greeting + haptics on capture button
- [x] Improve History empty state with CTA
- [x] Add haptics to Camera screen buttons + analysis callbacks
- [x] Run tests (28 Jest tests must pass)
- [x] TypeScript type check

## Success Criteria
- `getGreeting()` returns correct bracket for any hour
- Empty state CTA navigates to `/camera` on press
- Haptic fires on every primary button press (Medium) and analysis result (Success/Error)
- All 28 existing tests pass unchanged
- No new TypeScript errors

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `getGreeting()` breaks existing helpers.ts exports | Low | High | Add at EOF; don't touch existing code |
| expo-haptics fails on web/simulator | Low | Low | expo-haptics is no-op on unsupported platforms |
| Home screen LOC exceeds 200 after changes | Medium | Medium | Only adds ~10 lines; still ~340 — will reduce in Phase 2 via component extraction |

## Security Considerations
- No sensitive data involved
- expo-haptics requests no permissions
- No network calls added

## Next Steps
- Phase 2 depends on theme.ts animation tokens added here (none needed for Phase 1)
- Phase 2 will extract AnimatedProgressBar from index.tsx, reducing its LOC
