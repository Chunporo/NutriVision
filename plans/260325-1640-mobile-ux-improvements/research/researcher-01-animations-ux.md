# React Native Animation APIs & UX Best Practices Research
**Expo 55 (React Native 0.83.2) | react-native-reanimated 4.2.1**

---

## 1. Reanimated v4 vs React Native Animated API

### Performance Comparison
| Aspect | Animated API | Reanimated v4 |
|--------|--------------|---------------|
| **Thread Execution** | JavaScript thread (blocks JS) | Native thread (non-blocking) |
| **Performance** | ~416ms benchmark | ~123ms benchmark (3.4x faster) |
| **Complex Animations** | Struggles with 60fps | Maintains 60fps+ consistently |

### API Differences & Use Case Mapping

**Animated API (Built-in RN):**
- Simple, synchronous animations
- Uses `Animated.Value`, `timing()`, `spring()`
- Good for: Simple fade, scale, or position shifts
- **Limitation**: Blocks JS thread during animation

**Reanimated v4 (Worklet-based):**
- Asynchronous, worklet-driven (JS + native)
- Uses `useSharedValue()`, `useAnimatedStyle()`, `withTiming()`, `withSpring()`
- Good for: Complex, 60fps animations
- **Advantage**: Native thread execution, no JS blocking

### Recommended Use Cases (Your App)
- **Progress bar animation** → Reanimated (`withTiming()`)
- **Animated number counter** → Reanimated (`useSharedValue()` + `useAnimatedStyle()`)
- **Entrance animations (fade+slide)** → Reanimated (`withSequence()`, `withDelay()`)
- **Pulse/breathe loading** → Reanimated (`withRepeat()` + `withTiming()`)

### Expo 55 Compatibility ✅
Both fully compatible. Reanimated 4.2.1 included; use it for smooth UX.

---

## 2. expo-haptics SDK 55 API

### Status: ✅ Available
Part of Expo SDK 55 (not removed as some sources claim).

### Core API
```javascript
import * as Haptics from 'expo-haptics';

// Impact feedback (3 intensities)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);      // Subtle
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);     // Standard
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);      // Strong

// Notification feedback (3 types)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);   // ✓
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);   // ⚠️
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);     // ✗

// Selection (light click)
Haptics.selectionAsync();
```

### Recommended Patterns
- **Button press** → `Haptics.impactAsync(Medium)` (immediate feedback)
- **Analysis completion** → `Haptics.notificationAsync(Success)` (confirms action)
- **Error states** → `Haptics.notificationAsync(Error)` + visual alert

### Expo 55 Compatibility ✅
Fully compatible; no breaking changes.

---

## 3. Skeleton Loading Pattern (Shimmer without Library)

### Simple Reanimated Approach
```javascript
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import Animated, { Easing } from 'react-native-reanimated';
import { View } from 'react-native';

export function SkeletonLoader() {
  const shimmerX = useSharedValue(-200);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(400, { duration: 1500, easing: Easing.linear }),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View style={{ width: 300, height: 100, backgroundColor: '#e0e0e0', overflow: 'hidden' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 100,
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}
```

### Replace ActivityIndicator
- Skeleton fills actual content space (better UX)
- Animated width slide from left→right at 1500ms interval
- No external library; pure Reanimated

### Expo 55 Compatibility ✅
Works with Reanimated 4.2.1.

---

## 4. Swipe-to-Delete in FlatList

### Comparison: Gesture Handler vs PanResponder

| Approach | Complexity | Gesture Handler | PanResponder |
|----------|-----------|-----------------|--------------|
| **Setup** | Low | Wrap in `GestureHandlerRootView` | Built-in RN |
| **FlatList** | Swipeable wrapping | ⭐ Simpler | Manual tracking |
| **Expo 55** | Included via expo | ✅ Yes | ✅ Yes |

### Recommended: gesture-handler + Swipeable
Already in your Expo bundle via `react-native-gesture-handler`.

```javascript
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function FoodItem({ item, onDelete }) {
  const renderRightActions = () => (
    <TouchableOpacity onPress={() => onDelete(item.id)} style={{ backgroundColor: '#ff4444', justifyContent: 'center', paddingHorizontal: 20 }}>
      <Text style={{ color: '#fff' }}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <Text>{item.name}</Text>
      </View>
    </Swipeable>
  );
}
```

### Expo 55 Compatibility ✅
`react-native-gesture-handler` included; simpler than PanResponder.

---

## 5. Expo Router v4 Modal Presentation

### Stack Configuration in _layout.tsx
Modal screens (Results, Details) slide from bottom.

```typescript
// app/(tabs)/food/_layout.tsx (or results/_layout.tsx)
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        animationEnabled: true,
        headerShown: false, // or customize
      }}
    >
      <Stack.Screen name="results" options={{ title: 'Analysis Results' }} />
      <Stack.Screen name="details" options={{ title: 'Food Details' }} />
    </Stack>
  );
}
```

### Key Options
- `presentation: 'modal'` → Slide-up animation (iOS), top-sheet (Android)
- `animationEnabled: true` → Smooth transition
- `gestureEnabled: true` → Swipe-down to dismiss (iOS default)
- `headerShown: false` → Cleaner modal UX

### Navigation Usage
```javascript
router.push('food/results');  // Push regular screen
router.push('food/results?modal=true');  // Alternative: conditionally modal
```

### Expo 55 Compatibility ✅
Expo Router v4 (built-in); standard React Navigation Stack API.

---

## Summary: Recommended Stack for Food-Logging App

| Feature | Tech | Reason |
|---------|------|--------|
| Progress bar, counters, entrance, pulse | Reanimated 4.2.1 | 3.4x faster, native thread |
| Button haptics, success feedback | expo-haptics | Built-in SDK 55 |
| Skeleton loading | Reanimated shimmer | No extra deps, lightweight |
| Swipe-to-delete | gesture-handler Swipeable | Already bundled, simple |
| Modal screens (Results) | Expo Router modal | Native stack presentation |

---

## Unresolved Questions
- Exact animation frame rate targets (60fps target on budget devices)?
- Loading skeleton percentage/styling specifics for food items?
