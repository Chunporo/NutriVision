# Mobile UX Design Patterns Research
**NutriVision — Food/Health Tracking Apps (React Native/Expo)**

Research Date: 2026-03-25 | Effort Scope: 3-5 days

---

## 1. Time-of-Day Greeting Patterns

**Recommended Logic:**
- **Morning (5-12):** "Good morning! Start strong today" + motivational tone
- **Afternoon (12-17):** "Keep it up!" + hydration/nutrition reminders
- **Evening (17-21):** "Great day! How'd you do?" + reflection/summary
- **Night (21-5):** "Get some rest" + optional sleep tips

**Implementation (React Native):**
```javascript
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning!", icon: "sunrise", color: "#FBBF24" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon!", icon: "sun", color: "#10B981" };
  if (hour >= 17 && hour < 21) return { text: "Good evening!", icon: "sunset", color: "#F97316" };
  return { text: "Good night!", icon: "moon", color: "#6366F1" };
};
```

**Health Context:** For NutriVision, tie greetings to recent meals logged or daily calorie progress. Morning = set today's goal; Afternoon = nudge if under target; Evening = celebrate progress.

**Status:** ✅ Ready to implement

---

## 2. Animated Calorie Progress Bar

**Pattern: Reanimated withTiming**

```javascript
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export const CalorieProgressBar = ({ current, target }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Animate from 0 to actual percentage on mount
    progress.value = withTiming((current / target) * 100, { duration: 1200 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
    backgroundColor: progress.value > 100 ? '#EF4444' : '#10B981', // Red if over
  }));

  return (
    <View style={styles.container}>
      <Reanimated.View style={[styles.bar, animStyle]} />
      <Text>{Math.round(current)} / {target} kcal</Text>
    </View>
  );
};
```

**Overage State:** Smoothly transition to red (#EF4444) when over target. Show warning text: "You've exceeded your goal by X kcal".

**Status:** ✅ Ready to implement (uses Reanimated v3, already in Expo 55)

---

## 3. Empty State Best Practices

**Core Pattern:**
- Large icon or emoji (48-64px) representing food/tracking
- 2-line headline: "No meals logged yet" + secondary "Start tracking to see nutrition insights"
- 1 primary CTA: "Log Your First Meal" (emerald green #10B981)
- Optional: Small illustration (emoji combo: 🍎 + 📊) instead of large image (faster load)

**Don't Use:**
- Generic "No data" message
- No CTA button
- Empty white space without context

**Example Component:**
```javascript
<View style={styles.emptyContainer}>
  <Text style={styles.emoji}>🍽️</Text>
  <Text style={styles.headline}>Start Your Day</Text>
  <Text style={styles.subtext}>Log your first meal and let AI analyze it</Text>
  <Button title="Log Meal" color="#10B981" onPress={navigateToCamera} />
</View>
```

**Status:** ✅ Ready to implement

---

## 4. Long AI Operation Loading Screen (10-30s)

**Best UX Pattern:**
1. **Progress Steps** (linear sequence):
   - "📸 Analyzing image..." (2-3s)
   - "🔍 Detecting food..." (3-4s)
   - "⚕️ Calculating nutrition..." (3-4s)
   - "✅ Ready!" (1s)

2. **Visual Feedback:**
   - Pulsing icon or dot animation per step
   - Horizontal progress bar (0-100%) that fills slowly
   - Optional: "Est. 5 sec remaining" (refresh every 2s)

3. **Keep Users Engaged:**
   - Change text every 2-3 seconds
   - Show percentage: "45% complete"
   - Avoid complete silence/stalling feeling

**Implementation Pattern (Expo):**
```javascript
const [step, setStep] = useState(0);
const steps = ["Analyzing...", "Detecting...", "Calculating..."];

useEffect(() => {
  const interval = setInterval(() => {
    setStep(s => s < steps.length - 1 ? s + 1 : s);
  }, 3000);
  return () => clearInterval(interval);
}, []);
```

**Status:** ✅ Ready to implement (3-4 day effort)

---

## 5. First-Launch Onboarding Tooltip

**Minimal Show-Once Pattern:**

```javascript
const FirstLaunchTip = ({ onDismiss }) => {
  const [hasSeenTip, setHasSeenTip] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenFirstTip').then(val => {
      if (val !== 'true') setHasSeenTip(true);
    });
  }, []);

  const handleDismiss = async () => {
    await AsyncStorage.setItem('hasSeenFirstTip', 'true');
    onDismiss();
  };

  return hasSeenTip ? (
    <View style={styles.tooltipArrow}>
      <Text style={styles.tip}>👈 Tap to log a meal</Text>
      <TouchableOpacity onPress={handleDismiss}>
        <Text>Got it</Text>
      </TouchableOpacity>
    </View>
  ) : null;
};
```

**Button Highlight Overlay:**
- Use `react-native-spotlight` or custom SVG overlay with cutout circle
- Darken rest of screen (opacity: 0.6)
- Arrow pointer to button
- Disappears after tap

**Note:** Full onboarding screens (3+ steps) hurt retention. Use single contextual tooltip instead.

**Status:** ✅ Ready to implement (2-3 day effort)

---

## Summary: Effort & Priority

| Pattern | Effort | Priority | Notes |
|---------|--------|----------|-------|
| Time-of-day greeting | 0.5 days | High | Quick win, UX polish |
| Calorie progress bar | 1 day | High | Core feature, uses Reanimated |
| Empty state | 0.5 days | High | Improves first-time UX |
| AI loading UX | 1.5 days | Medium | Nice-to-have, 10-30s waits |
| Onboarding tooltip | 1 day | Low | Polish feature |
| **Total** | **4.5 days** | — | Fits 3-5 day scope ✅ |

---

## Theme Integration
All patterns use NutriVision emerald green (#10B981) primary + light background (#F9FAFB). Consistency across all 5 patterns maintains cohesive design language.

---

**Next:** Implement Phase 1 (greeting + empty state) as quick wins to establish theme consistency.
