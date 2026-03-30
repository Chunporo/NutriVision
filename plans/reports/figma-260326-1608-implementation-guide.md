# Figma Design Specification — Implementation Guide

**📋 Reports Created:**
- `figma-260326-1608-nutrition-app-ui-design-spec.md` — Full 1059-line specification
- `figma-260326-1608-quick-reference.md` — Quick lookup guide

**Work Context:** `/home/aoi/Projects/nutri_vision`
**Date:** 2026-03-26 | **Time:** 16:08

---

## 📊 Report Overview

### What Was Delivered

A comprehensive design specification for the **NutriVision Nutrition App** derived from:
1. **Figma Source:** [Nutrition-App-UI Community](https://www.figma.com/design/tXmVEAWCJ39DyOXJB88Bp7/Nutrition-App-UI--Community-?node-id=101-425)
2. **Existing Implementation:** Current React Native `mobile/src/utils/theme.ts` design tokens
3. **UI Patterns:** OpenNutriTracker-inspired design applied in recent updates
4. **Screen Architecture:** 6 main screens (Home, Camera, Results, Details, History, Settings)

### Contents of Full Specification (1059 lines)

| Section | Content | Key Artifacts |
|---|---|---|
| **Part 1** | Complete Color Palette | 50+ color tokens with hex values, RGB, and use cases |
| **Part 2** | Typography System | Font families, size scale (xs–hero), weights, line heights |
| **Part 3** | Spacing & Layout | 8 spacing tokens, grid system, responsive breakpoints |
| **Part 4** | Border Radius | 5 radius tokens (8–999px) with component mapping |
| **Part 5** | Elevation & Shadows | 4-level shadow hierarchy (L1–L4) with specifications |
| **Part 6** | Animation & Motion | Duration tokens (300–1200ms), easing patterns, interaction feedback |
| **Part 7** | Component Library | 7 component categories with full design specs |
| **Part 8** | Screen Designs | Layout breakdowns for all 6 screens |
| **Part 9** | Component Details | FAB, gauges, badges, empty states, etc. |
| **Part 10** | Responsive Design | Breakpoints (320–1440px), safe area handling |
| **Part 11** | Interaction Patterns | Button feedback, swipes, transitions, loading states |
| **Part 12** | Accessibility | WCAG 2.1 AA compliance, contrast, touch targets, focus states |
| **Part 13** | Safe Area Handling | iOS/Android notch, home indicator, status bar specs |
| **Part 14** | Design System Checklist | Pre-implementation, component, animation, accessibility checks |
| **Part 15** | File Structure | Expected component organization |
| **Part 16** | Icon System | Ionicons library, sizing guidelines |
| **Part 17** | Data Visualization | Charts, gauges, progress indicators |
| **Part 18** | Patterns & Anti-patterns | Do's ✅ and Don'ts ❌ |
| **Part 19** | Performance Optimization | FPS targets, image optimization, bundle size |
| **Part 20** | Testing & QA | Visual, interaction, performance, accessibility testing |

---

## 🎯 Key Design Decisions

### Color Palette
- **Primary:** Emerald green `#10B981` — health/nutrition context
- **Accent:** Amber `#F59E0B` — CTAs, highlights
- **Semantic:** Red (error), Blue (info), Purple (fat macro), Orange (carbs)
- **Neutrals:** Warm off-white `#FAFDF7` background, pure white `#FFFFFF` cards

### Typography Scale
```
Hero: 34px (700)     ← App name, headlines
xxl:  24px (700)     ← Screen titles
xl:   20px (600)     ← Section headers
lg:   17px (600)     ← Card titles, subheadings
md:   15px (400)     ← Body text
sm:   13px (400)     ← Secondary text
xs:   11px (400)     ← Captions, timestamps
```

### Spacing System
Modular 4px baseline:
```
xs(4) → sm(8) → md(12) → lg(16) → xl(20) → xxl(24) → xxxl(32) → section(28)
```

### Animation Philosophy
- **Fast (300ms):** Micro-interactions, hovers
- **Medium (600ms):** Screen transitions
- **Slow (1200ms):** Complex hero animations (gauges, complex lists)
- **Library:** React Native Reanimated 3 with worklets

### Accessibility Standards
- **WCAG 2.1 Level AA** compliance
- **Contrast:** 4.5:1 for normal text, 3:1 for large (18px+)
- **Touch targets:** Minimum 44×44px
- **Focus states:** Visible on keyboard navigation
- **Motion:** Respects `prefers-reduced-motion`

---

## 🔨 Implementation Workflow

### Step 1: Review & Understand
```bash
# Read the quick reference first (5-10 min)
cat plans/reports/figma-260326-1608-quick-reference.md

# Then study the full spec sections relevant to your task (20-30 min)
# Focus on: Colors, Typography, Spacing, Components, Your Screen
```

### Step 2: Use Design Tokens
**All values must come from `src/utils/theme.ts`:**

```typescript
// ✅ CORRECT
import { Colors, Spacing, FontSize, Radius, AnimationDuration } from '@/utils/theme';

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,        // #10B981
    paddingHorizontal: Spacing.xl,          // 20px
    paddingVertical: Spacing.md,            // 12px
    borderRadius: Radius.lg,                // 20px
    fontSize: FontSize.lg,                  // 17px
  }
});

// ❌ INCORRECT (hardcoded values)
const badStyles = StyleSheet.create({
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    fontSize: 17,
  }
});
```

### Step 3: Follow Component Specs
For each component, refer to **Part 7** (Component Library) or **Part 8** (Screen Designs):

**Example: Primary Button**
- Background: `Colors.primary`
- Text: `Colors.textOnPrimary` (white)
- Border Radius: `Radius.lg` (20px)
- Padding: `Spacing.xl` (20px) H × `Spacing.md` (12px) V
- Font: `FontSize.lg` (17px), Weight 600
- Shadow: `Elevation.l2`
- Pressed: Scale 0.98 + reduced shadow
- Disabled: Opacity 0.5

### Step 4: Implement with Reanimated
Use **Reanimated 3** for all animations:

```typescript
import Reanimated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AnimationDuration } from '@/utils/theme';

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: progress.value }],
}));

// Animate with tokens
const animate = () => {
  progress.value = withTiming(1, {
    duration: AnimationDuration.slow,      // 1200ms
    easing: Easing.out(Easing.cubic),
  });
};
```

### Step 5: Test Accessibility
Before committing, verify:

```bash
# Color contrast (minimum 4.5:1 for normal text)
# Touch targets (minimum 44×44px)
# Focus states (visible keyboard navigation)
# Screen reader (VoiceOver/TalkBack labels present)
# Reduced motion (animations respect prefers-reduced-motion)
```

### Step 6: Verify Quality Checklist
Use **Part 14** checklist before push:

- [ ] All colors from `Colors.*` tokens
- [ ] All spacing from `Spacing.*` tokens
- [ ] All font sizes from `FontSize.*` tokens
- [ ] All animations use `AnimationDuration.*`
- [ ] All shadows use `Elevation.*`
- [ ] Focus states visible
- [ ] Loading states animated
- [ ] Text contrast ≥ 4.5:1
- [ ] Touch targets ≥ 44×44px
- [ ] No console warnings/errors
- [ ] Animations 60 FPS (no jank)

---

## 📱 Screen-by-Screen Implementation

### Home Screen (`app/(tabs)/index.tsx`)
**Status:** ✅ Recently updated with circular gauge & macro cards

**Components needed:**
- Circular Calorie Gauge (200×200px) — see **Part 9.2**
- Macro Ring Icons (32×32px) — see **Part 9.3**
- Macro Cards (2×2 grid) — see **Part 7.2**
- FAB (64×64px, bottom-right) — see **Part 9.1**
- Recent Meals horizontal scroll

**Reference:** Part 8.1 (Home Screen Designs)

### Camera Screen (`app/camera.tsx`)
**Status:** 🔄 Needs design review

**Key specs:**
- Full-screen camera preview
- Header bar (semi-transparent, safe area top)
- Bottom controls: Gallery (left), Capture (center 80×80), Flash (right)
- Capture button: Pulsing animation when ready
- Loading spinner on capture

**Reference:** Part 8.2 (Camera Screen Designs)

### Results Screen (`app/results.tsx`)
**Status:** 🔄 Needs design implementation

**Key specs:**
- Image preview (full width, 300px height, rounded)
- Quick stats card (calories hero + macro badges)
- Detected foods list (expandable items)
- Nutrition breakdown (pie/bar chart)
- Action buttons (Primary: "Add to History", Secondary: "Edit")

**Reference:** Part 8.3 (Results Screen Designs)

### Details Screen (`app/details.tsx`)
**Status:** 🔄 Needs design implementation

**Key specs:**
- Large calorie gauge (250×250px)
- Nutrition facts panel (standard format)
- Macro details cards (4 cards, 2×2 grid or scroll)
- Macro chart (pie or bar)
- Action buttons (Adjust, Share, Delete)

**Reference:** Part 8.4 (Details Screen Designs)

### History Screen (`app/(tabs)/history.tsx`)
**Status:** ✅ Recently updated with date pills & cards

**Components verified:**
- Date header pills (`Colors.primaryBg` background, `Colors.primaryDark` text)
- Daily summary cards
- Meal list items with thumbnails
- Empty state

**Reference:** Part 8.5 (History Screen Designs)

### Settings Screen (`app/settings.tsx`)
**Status:** 🔄 Needs design implementation

**Key specs:**
- Section 1: API URL input, Calorie Goal input, Dark Mode toggle
- Section 2: Nutrition preferences (macros, allergens, diet)
- Section 3: Data management (Clear, Export, Import)
- Section 4: About (version, links, credit)

**Reference:** Part 8.6 (Settings Screen Designs)

---

## 🚀 Quick Start for Developers

### 1. Clone the Design Tokens
The design tokens are **already in place** at `mobile/src/utils/theme.ts`. Use them everywhere:

```typescript
import { Colors, Spacing, FontSize, Radius, Elevation, AnimationDuration } from '@/utils/theme';
```

### 2. Reference the Spec While Coding
Keep these open in a split view:
- `plans/reports/figma-260326-1608-quick-reference.md` (quick lookup)
- `plans/reports/figma-260326-1608-nutrition-app-ui-design-spec.md` (detailed reference)

### 3. Follow the Component Specs
For any component, go to **Part 7** (Component Library) or **Part 8** (Screen Designs) for exact specifications.

### 4. Test Before Commit
Run through the **Part 14** checklist:
- Design tokens ✅
- Accessibility ✅
- Performance ✅
- Quality ✅

### 5. Use Reanimated 3 for Animations
All animations must use React Native Reanimated 3:
- No `Animated` API (legacy)
- No direct state updates in animations
- Use worklets for performance

---

## 📋 File Reference

| File | Size | Purpose |
|---|---|---|
| `figma-260326-1608-nutrition-app-ui-design-spec.md` | 38KB, 1059 lines | **Complete specification** — all design details |
| `figma-260326-1608-quick-reference.md` | 5.5KB | **Quick lookup** — color, spacing, typography tokens |
| `mobile/src/utils/theme.ts` | 117 LOC | **Existing tokens** — use as single source of truth |

---

## ⚠️ Important Reminders

### ✅ DO
- ✅ Use design tokens for **all** values
- ✅ Test accessibility (contrast, focus, screen reader)
- ✅ Animate with Reanimated 3
- ✅ Follow component specs exactly
- ✅ Respect safe areas (notches, home indicators)
- ✅ Use SVG icons (Ionicons), never emojis
- ✅ Provide loading states & empty states
- ✅ Test on device (not just web preview)

### ❌ DON'T
- ❌ Hardcode colors, spacing, or font sizes
- ❌ Use emojis as icons
- ❌ Create touch targets < 44×44px
- ❌ Skip focus states
- ❌ Ignore text contrast (< 4.5:1)
- ❌ Instant state changes (no transitions)
- ❌ Animate without Reanimated 3
- ❌ Commit without running the quality checklist

---

## 🎯 Next Steps

1. **Review** the quick reference guide (5 min)
2. **Study** the full spec for your assigned screens (20 min)
3. **Implement** components using tokens from `theme.ts`
4. **Test** accessibility & performance before push
5. **Verify** against Part 14 checklist
6. **Commit** with clear messages referencing this spec

---

## 📞 Questions?

Unresolved design questions are listed in **Part 18** of the full specification. If you need clarification on any design decision, refer there first.

---

**Status:** ✅ Ready for Implementation
**Last Updated:** 2026-03-26 16:13
**Work Context:** `/home/aoi/Projects/nutri_vision`
