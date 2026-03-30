# NutriVision Design System — Quick Reference Guide

**📋 Full Spec:** `plans/reports/figma-260326-1608-nutrition-app-ui-design-spec.md` (1059 lines)

---

## 🎨 Color Tokens Quick Lookup

### Primary & Semantic
```typescript
Colors.primary          → #10B981 (Emerald green)
Colors.primaryDark      → #059669 (Dark emerald)
Colors.error            → #EF4444 (Red)
Colors.background       → #FAFDF7 (Warm off-white)
Colors.surface          → #FFFFFF (Pure white)
```

### Macro Colors
```typescript
Colors.caloriesColor    → #EF4444 (Red)
Colors.proteinColor     → #3B82F6 (Blue)
Colors.carbsColor       → #F59E0B (Amber)
Colors.fatColor         → #8B5CF6 (Purple)
Colors.fiberColor       → #10B981 (Green)
```

---

## 📏 Spacing & Typography Tokens

### Spacing
```typescript
Spacing.xs = 4      Spacing.md = 12     Spacing.xl = 20     Spacing.xxxl = 32
Spacing.sm = 8      Spacing.lg = 16     Spacing.xxl = 24    Spacing.section = 28
```

### Font Sizes
```typescript
FontSize.xs = 11    FontSize.md = 15    FontSize.xl = 20
FontSize.sm = 13    FontSize.lg = 17    FontSize.xxl = 24    FontSize.hero = 34
```

### Border Radius
```typescript
Radius.sm = 8       Radius.md = 14      Radius.lg = 20      Radius.xl = 28      Radius.full = 999
```

---

## 🎬 Animation Tokens

```typescript
AnimationDuration.fast = 300              // Micro-interactions, hovers
AnimationDuration.medium = 600            // Standard transitions
AnimationDuration.slow = 1200             // Complex animations, gauges
AnimationDuration.counter = 800           // Number tickers
AnimationDuration.staggerDelay = 150      // List item stagger
```

---

## 🌟 Shadow/Elevation System

| Level | Use Case | Offset | Opacity | Radius |
|---|---|---|---|---|
| **L1** | Subtle borders, inactive | (0,1) | 4% | 4 |
| **L2** | Standard cards, buttons | (0,2) | 6% | 8 |
| **L3** | Featured cards, active | (0,4) | 10% | 12 |
| **L4** | FAB, top-level modals | (0,6) | 18% | 20 |

---

## 🎯 Component Quick Specs

### Buttons
- **Primary:** Background `Colors.primary`, Padding `xl/md`, BorderRadius `lg`
- **Secondary:** Border 2px, transparent background
- **Icon Button:** 44×44px, `Radius.full` or `Radius.md`

### Cards
- **Standard:** `Radius.md`, Padding `lg`, `Elevation.l2`
- **Featured:** `Radius.xl`, Padding `xl`, `Elevation.l3`

### FAB
- **Size:** 64×64px
- **Border Radius:** `Radius.full` (perfect circle)
- **Shadow:** `Elevation.l4`
- **Position:** Bottom-right, `Spacing.lg` margin + safe area

### Inputs
- **Height:** 48px (touch-friendly)
- **Border Radius:** `Radius.md`
- **Border:** 1px `Colors.border`
- **Focus:** Border → `Colors.primary`, shadow with 3px `Colors.primary20%`

### Gauge Ring
- **Diameter:** 200px (customizable)
- **Ring Width:** 16px
- **Track:** `Colors.primaryLight`
- **Fill:** `Colors.primary` (or `Colors.error` if over-goal)
- **Animation:** 1200ms ease-out-cubic

---

## 📱 Screen Checklist

- [ ] **Home** — Calorie gauge hero + macro cards + recent meals + FAB
- [ ] **Camera** — Full screen camera + capture button + flash toggle
- [ ] **Results** — Image preview + quick stats + detected foods list
- [ ] **Details** — Large gauge + nutrition facts + macro breakdown
- [ ] **History** — Date-grouped meals + daily summary + empty state
- [ ] **Settings** — API URL + calorie goal + preferences + data management

---

## ✅ Pre-Implementation Checklist

### Design Tokens
- [ ] All colors use `Colors.*` tokens (no hardcoded hex)
- [ ] All spacing uses `Spacing.*` tokens (no magic numbers)
- [ ] All font sizes use `FontSize.*` tokens
- [ ] All border radius uses `Radius.*` tokens
- [ ] All shadows use `Elevation.*` tokens
- [ ] All animations use `AnimationDuration.*` tokens

### Component Quality
- [ ] All buttons have 44×44px minimum
- [ ] All shadows properly applied
- [ ] Focus states visible (keyboard nav)
- [ ] Loading states animated
- [ ] Empty states with helpful messaging
- [ ] Modals have dismiss buttons

### Accessibility
- [ ] Text contrast ≥ 4.5:1
- [ ] VoiceOver/TalkBack labels present
- [ ] `prefers-reduced-motion` respected
- [ ] Semantic structure correct
- [ ] Touch targets 44×44px minimum

### Performance
- [ ] Animations 60 FPS
- [ ] No layout shifts during load
- [ ] Images optimized (< 1080px width)
- [ ] FlatList for large lists (not ScrollView)
- [ ] Memoized expensive components

---

## 🚫 Anti-Patterns (Do NOT Use)

- ❌ **Emojis as icons** — Use SVG (Ionicons)
- ❌ **Hardcoded colors** — Always use tokens
- ❌ **Missing cursor:pointer** — Add to all interactive elements
- ❌ **Instant state changes** — Min 100ms transitions
- ❌ **Low contrast text** — 4.5:1 minimum required
- ❌ **No loading states** — Always show progress
- ❌ **Touch targets < 44px** — Accessibility requirement
- ❌ **Horizontal scroll on mobile** — Avoid unless intentional
- ❌ **Modal without dismiss** — Always allow easy exit
- ❌ **Layout shift during load** — Use skeleton UI

---

## 🎨 Reference Files

| File | Purpose |
|---|---|
| `mobile/src/utils/theme.ts` | Design tokens (existing) |
| `plans/reports/figma-260326-1608-nutrition-app-ui-design-spec.md` | Full specification |
| This file | Quick reference guide |

---

## 📞 Questions?

Refer to **Part 18: Unresolved Questions** in the full spec for outstanding design decisions.

---

**Last Updated:** 2026-03-26 16:13
**Status:** Ready for implementation
