# Phase 4 — Navigation & Gestures

## Context
- **Parent:** [plan.md](plan.md)
- **Research:** [Animations & UX](research/researcher-01-animations-ux.md) (§4 swipe-to-delete, §5 modal nav)
- **Depends on:** Phase 1-3 (all components in place; GestureHandlerRootView wraps everything)

## Overview
- **Priority:** Medium
- **Status:** complete
- **Effort:** ~2h
- **Description:** Results screen modal presentation (slide-up), swipe-to-delete on history meal cards

## Key Insights
- Results screen is outcome of camera action → modal (slide-up) feels more natural than push-right
- Details screen stays push-right (user explicitly navigates to it)
- `Swipeable` from `react-native-gesture-handler` already bundled via Expo
- `GestureHandlerRootView` MUST wrap app root for Swipeable to work
- Swipe reveals red delete button on right side; confirm via Alert (existing pattern)
- Long-press delete KEPT as secondary gesture (accessibility)

## Requirements

### Functional
- Results screen slides up from bottom (modal) instead of push-right
- Swipe-down to dismiss results on iOS (default modal gesture)
- History meal cards: swipe left reveals red "Delete" action
- Tapping delete action triggers existing `handleDelete()` with Alert confirmation
- Long-press delete still works (kept for accessibility)

### Non-Functional
- GestureHandlerRootView at app root — no double-wrapping
- Swipeable threshold: ~80px reveal before snap
- Delete action background: `Colors.error` (#EF4444)
- No visual regression on other screens

## Architecture

### Modal Results
```
_layout.tsx → Stack.Screen name="results"
Add: presentation: "modal", animation: "slide_from_bottom"
Keeps: headerShown (default true), title "Analysis Results"
```

### GestureHandlerRootView
```
_layout.tsx → Wrap entire <Stack> in <GestureHandlerRootView style={{ flex: 1 }}>
Import from react-native-gesture-handler (already bundled)
```

### Swipeable History Cards
```
history.tsx → Wrap each meal card Pressable in <Swipeable>
renderRightActions → red background View with trash icon + "Delete" text
onSwipeableOpen → call handleDelete(meal.id)
No separate component needed — inline in renderItem
```

## Related Code Files

| File | Action | Changes |
|------|--------|---------|
| `mobile/app/_layout.tsx` | **modify** | Wrap Stack in GestureHandlerRootView; add modal presentation to results |
| `mobile/app/(tabs)/history.tsx` | **modify** | Wrap meal cards in Swipeable with delete action |

## Implementation Steps

### Step 1: Add GestureHandlerRootView to root layout
1. Open `mobile/app/_layout.tsx`
2. Add import:
```typescript
import { GestureHandlerRootView } from "react-native-gesture-handler";
```
3. Wrap the entire return JSX:
```tsx
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <StatusBar style="dark" />
    <Stack screenOptions={...}>
      {/* ... existing screens ... */}
    </Stack>
  </GestureHandlerRootView>
);
```
4. File goes from 59 → ~63 LOC.

### Step 2: Change Results screen to modal presentation
1. Still in `mobile/app/_layout.tsx`
2. Update the results Stack.Screen:
```tsx
<Stack.Screen
  name="results"
  options={{
    title: "Analysis Results",
    presentation: "modal",
    animation: "slide_from_bottom",
  }}
/>
```
3. This gives:
   - iOS: slide-up modal with swipe-down to dismiss
   - Android: bottom-sheet style animation
4. Camera already uses `router.replace("/results", ...)` — modal presentation works with both push and replace.

### Step 3: Add swipe-to-delete to History screen
1. Open `mobile/app/(tabs)/history.tsx`
2. Add imports:
```typescript
import { Swipeable } from "react-native-gesture-handler";
```
3. Create a `renderRightActions` function inside the component (or inline):
```typescript
const renderDeleteAction = (mealId: string) => (
  <Pressable
    style={styles.swipeDeleteAction}
    onPress={() => handleDelete(mealId)}
  >
    <Ionicons name="trash" size={22} color={Colors.textOnPrimary} />
    <Text style={styles.swipeDeleteText}>Delete</Text>
  </Pressable>
);
```
4. Wrap each meal card `Pressable` in `Swipeable`:
```tsx
<Swipeable
  key={meal.id}
  renderRightActions={() => renderDeleteAction(meal.id)}
  overshootRight={false}
>
  <Pressable
    style={({ pressed }) => [
      styles.mealCard,
      pressed && styles.mealCardPressed,
    ]}
    onPress={() => router.push({ pathname: "/details", params: { mealId: meal.id } })}
    onLongPress={() => handleDelete(meal.id)}
  >
    {/* ... existing card content ... */}
  </Pressable>
</Swipeable>
```
5. Move `key` from Pressable to Swipeable wrapper.
6. Add styles:
```typescript
swipeDeleteAction: {
  backgroundColor: Colors.error,
  justifyContent: "center",
  alignItems: "center",
  width: 80,
  borderRadius: Radius.md,
  marginBottom: Spacing.sm,
},
swipeDeleteText: {
  fontSize: FontSize.xs,
  fontWeight: "600",
  color: Colors.textOnPrimary,
  marginTop: 4,
},
```
7. Net LOC change for history.tsx: ~+25 lines (import, render function, wrapper, styles)
   261 + 25 = ~286 LOC — still under consideration but style-heavy. Acceptable.

### Step 4: Test modal dismiss behavior
1. Navigate: Home → Camera → analyze → Results
2. On iOS: swipe down should dismiss results modal and return to tabs
3. On Android: back button should close modal
4. Verify: Results → "View Full Details" → Details still works (push within modal context)
5. Verify: Results → "Back to Home" → navigates to tabs correctly

### Step 5: Test swipe-to-delete
1. Navigate to History tab with existing meals
2. Swipe a meal card left — red delete action appears
3. Tap delete — Alert confirmation appears
4. Confirm delete — meal removed, list updates
5. Long-press still works — Alert confirmation appears
6. Verify: swipe right does nothing (no left actions configured)

### Step 6: Verify
1. `cd mobile && npx jest` — 28 tests pass
2. `cd mobile && npx tsc --noEmit` — no type errors
3. Full manual flow test on Expo Go

## Todo List
- [x] Add GestureHandlerRootView wrapper to `_layout.tsx`
- [x] Change results screen to `presentation: "modal"` + `slide_from_bottom`
- [x] Add Swipeable wrapper to history meal cards
- [x] Add swipe delete action render function + styles
- [x] Test modal dismiss (iOS swipe-down, Android back)
- [x] Test swipe-to-delete (reveal, tap delete, confirm)
- [x] Test long-press delete still works
- [x] Run tests + type check

## Success Criteria
- Results screen slides up from bottom on navigation from camera
- iOS: swipe-down dismisses results modal
- History: swipe-left on card reveals red delete action (80px wide)
- Delete action triggers Alert confirmation (existing behavior)
- Long-press delete still works
- GestureHandlerRootView wraps entire app (no double-wrapping)
- 28 Jest tests pass

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GestureHandlerRootView conflicts with existing gestures | Low | Medium | Only wraps root; no existing gesture handlers in use |
| Modal results breaks "View Full Details" navigation | Medium | High | Test: push from modal context works in React Navigation |
| `router.replace` behavior changes with modal presentation | Medium | High | Test early; if broken, use `router.push` instead of replace |
| Swipeable conflicts with FlatList scroll | Low | Medium | `Swipeable` from RNGH handles this natively; no PanResponder conflicts |
| History screen LOC approaches limit | Low | Low | ~286 LOC — mostly styles; functional logic is clean |

## Security Considerations
- Delete action still goes through Alert confirmation — no accidental deletion
- No new permissions or network calls

## Next Steps
- All 4 phases complete after this
- Consider future: dark mode, onboarding (out of current scope)
- Run full integration test across all screens after all phases applied
- Code review by `code-reviewer` agent
