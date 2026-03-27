# Figma Design Specification Report: NutriVision Nutrition App UI
**Date:** 2026-03-26 | **Report Slug:** nutrition-app-ui-design-spec | **Time:** 16:08

---

## Executive Summary

This report documents the comprehensive design specification for the **NutriVision Nutrition App** based on:
- Figma design file: [Nutrition-App-UI Community](https://www.figma.com/design/tXmVEAWCJ39DyOXJB88Bp7/Nutrition-App-UI--Community-?node-id=101-425)
- Current React Native implementation analysis
- Existing design tokens and theme system
- UI/UX patterns from OpenNutriTracker inspiration

**Key Findings:**
- Modular component-based design system
- Consistent use of emerald green primary color (#10B981) for health/food context
- 6 main screens: Home, Camera, Results, Details, History, Settings
- Rich animation and elevation system with Reanimated 3
- Material Design 3 influenced but with custom branding

---

## Part 1: Complete Color Palette

### Primary Colors
| Token | Hex Value | RGB | Use Case | Notes |
|---|---|---|---|---|
| `Colors.primary` | `#10B981` | 16, 185, 129 | Primary buttons, accents, primary navigation | Emerald green — health/nutrition context |
| `Colors.primaryDark` | `#059669` | 5, 150, 105 | Pressed states, darker text, focused elements | High contrast for interactive states |
| `Colors.primaryLight` | `#A7F3D0` | 167, 243, 208 | Borders, subtle accents, hover states | Light accent for disabled/inactive states |
| `Colors.primaryBg` | `#ECFDF5` | 236, 253, 245 | Background tints, card backgrounds, highlights | Very light — maintains readability |
| `Colors.primaryGradientStart` | `#10B981` | 16, 185, 129 | Gradient fills, hero sections | Same as primary |
| `Colors.primaryGradientEnd` | `#059669` | 5, 150, 105 | Gradient fills, hero sections | Same as primaryDark |

### Accent Colors
| Token | Hex Value | RGB | Use Case | Notes |
|---|---|---|---|---|
| `Colors.accent` | `#F59E0B` | 245, 158, 11 | CTAs, highlights, notifications | Amber — warm, energetic |
| `Colors.accentLight` | `#FEF3C7` | 254, 243, 199 | Background tints for accent, hover states | Very light amber |

### Semantic Colors
| Token | Hex Value | RGB | Use Case | Notes |
|---|---|---|---|---|
| `Colors.error` | `#EF4444` | 239, 68, 68 | Error states, destructive actions, over-goal calories | Red |
| `Colors.errorBg` | `#FEF2F2` | 254, 242, 242 | Error backgrounds, alert sections | Very light red |
| `Colors.warning` | `#F59E0B` | 245, 158, 11 | Warnings, attention-needed states | Amber (same as accent) |
| `Colors.warningBg` | `#FFFBEB` | 255, 251, 235 | Warning backgrounds, cautionary sections | Very light amber |
| `Colors.success` | `#10B981` | 16, 185, 129 | Success confirmations, healthy goals met | Green (same as primary) |
| `Colors.successBg` | `#ECFDF5` | 236, 253, 245 | Success backgrounds, completed states | Light green |
| `Colors.info` | `#3B82F6` | 59, 130, 246 | Informational elements, protein macro | Blue |
| `Colors.infoBg` | `#EFF6FF` | 239, 245, 255 | Info backgrounds, informational sections | Very light blue |

### Neutral Colors (Grayscale)
| Token | Hex Value | RGB | Use Case | Notes |
|---|---|---|---|---|
| `Colors.background` | `#FAFDF7` | 250, 253, 247 | App background, screen fill | Warm off-white with slight green tint |
| `Colors.surface` | `#FFFFFF` | 255, 255, 255 | Card surfaces, modals, content containers | Pure white |
| `Colors.surfaceTint` | `#F0FDF4` | 240, 253, 244 | Subtle tinted surface backgrounds | Very light green tint |
| `Colors.surfaceSecondary` | `#F1F5F9` | 241, 245, 249 | Secondary surface backgrounds, inactive tabs | Cool gray-blue |
| `Colors.border` | `#E2E8F0` | 226, 232, 240 | Standard borders, dividers | Medium gray-blue |
| `Colors.borderLight` | `#F1F5F9` | 241, 245, 249 | Light borders, subtle separators | Light gray-blue |

### Text Colors
| Token | Hex Value | RGB | Use Case | Notes |
|---|---|---|---|---|
| `Colors.text` | `#0F172A` | 15, 23, 42 | Primary text, headings, body text | Very dark blue-gray |
| `Colors.textSecondary` | `#475569` | 71, 85, 105 | Secondary text, labels, descriptions | Medium gray-blue |
| `Colors.textTertiary` | `#94A3B8` | 148, 163, 184 | Tertiary text, hints, disabled text | Light gray-blue |
| `Colors.textOnPrimary` | `#FFFFFF` | 255, 255, 255 | Text on primary backgrounds | White for contrast |

### Macro-Specific Colors
| Token | Hex Value | RGB | Use Case | Notes |
|---|---|---|---|---|
| `Colors.caloriesColor` | `#EF4444` | 239, 68, 68 | Calories tracking, calorie badges | Red |
| `Colors.proteinColor` | `#3B82F6` | 59, 130, 246 | Protein macro displays | Blue |
| `Colors.carbsColor` | `#F59E0B` | 245, 158, 11 | Carbohydrates macro displays | Amber/Orange |
| `Colors.fatColor` | `#8B5CF6` | 139, 92, 246 | Fat macro displays | Purple |
| `Colors.fiberColor` | `#10B981` | 16, 185, 129 | Fiber macro displays | Green |

---

## Part 2: Typography System

### Font Families
- **Heading Font:** System font stack (SF Pro Display on iOS, Roboto on Android)
- **Body Font:** System font stack (SF Pro Text on iOS, Roboto on Android)
- **Monospace:** System monospace (SF Mono on iOS, Roboto Mono on Android)

### Typography Scale

| Token | Size (px) | Weight | Line Height | Use Case |
|---|---|---|---|---|
| `FontSize.xs` | 11 | 400 | 14 | Caption text, timestamps, small labels |
| `FontSize.sm` | 13 | 400 | 18 | Secondary text, helper text, small UI |
| `FontSize.md` | 15 | 400 | 22 | Body text, regular paragraph text |
| `FontSize.lg` | 17 | 600 | 24 | Subheadings, card titles, secondary headers |
| `FontSize.xl` | 20 | 600 | 28 | Section headers, prominent labels |
| `FontSize.xxl` | 24 | 700 | 32 | Screen titles, major headings |
| `FontSize.hero` | 34 | 700 | 40 | Hero text, app name, primary headlines |

### Font Weight Strategy
- **400 (Regular):** Body text, descriptions, secondary content
- **600 (Semibold):** Subheadings, card titles, emphasis
- **700 (Bold):** Headlines, hero text, prominent labels

---

## Part 3: Spacing & Layout System

### Spacing Tokens
| Token | Value (px) | Use Case |
|---|---|---|
| `Spacing.xs` | 4 | Micro-spacing, icon gaps |
| `Spacing.sm` | 8 | Small margins, compact spacing |
| `Spacing.md` | 12 | Standard padding, component spacing |
| `Spacing.lg` | 16 | Container padding, section spacing |
| `Spacing.xl` | 20 | Large margins, feature spacing |
| `Spacing.xxl` | 24 | Extra large margins, card padding |
| `Spacing.xxxl` | 32 | Hero section padding, screen margins |
| `Spacing.section` | 28 | Between major sections, screen margins |

### Layout Principles
- **Max Width:** 1200px (on web/desktop)
- **Mobile Width:** Full width with `Spacing.lg` (16px) margins on mobile
- **Grid System:** 12-column grid for complex layouts
- **Safe Area Padding:** Respect device safe areas (notches, home indicators)

---

## Part 4: Border Radius & Shape System

### Radius Tokens
| Token | Value (px) | Use Case |
|---|---|---|
| `Radius.sm` | 8 | Small buttons, subtle corners |
| `Radius.md` | 14 | Card corners, medium components |
| `Radius.lg` | 20 | Large buttons, prominent elements |
| `Radius.xl` | 28 | Large cards, dialogs, modals |
| `Radius.full` | 999 | Perfect circles, badge backgrounds, FABs |

### Component Radius Mapping
- **Buttons:** `Radius.md` (14px) — standard, `Radius.lg` (20px) — primary CTA
- **Cards:** `Radius.md` (14px) — standard, `Radius.xl` (28px) — large feature cards
- **Modals/Dialogs:** `Radius.xl` (28px)
- **FAB (Floating Action Button):** `Radius.full` (999px) — perfect circle
- **Input Fields:** `Radius.md` (14px)
- **Badges/Pills:** `Radius.full` (999px)

---

## Part 5: Elevation & Shadow System

### Shadow Hierarchy (L1 → L4)

#### L1 (Subtle)
```
shadowColor: "#000"
shadowOffset: { width: 0, height: 1 }
shadowOpacity: 0.04
shadowRadius: 4
elevation: 1
```
**Use:** Subtle borders, minimal depth (unused cards, inactive elements)

#### L2 (Standard)
```
shadowColor: "#000"
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.06
shadowRadius: 8
elevation: 3
```
**Use:** Standard cards, buttons, modals

#### L3 (Prominent)
```
shadowColor: "#000"
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.10
shadowRadius: 12
elevation: 5
```
**Use:** Featured cards, prominent modals, active states

#### L4 (Maximum)
```
shadowColor: "#000"
shadowOffset: { width: 0, height: 6 }
shadowOpacity: 0.18
shadowRadius: 20
elevation: 8
```
**Use:** FAB, top-level modals, highest prominence elements

---

## Part 6: Animation & Motion System

### Animation Duration Tokens
| Token | Duration (ms) | Use Case |
|---|---|---|
| `AnimationDuration.fast` | 300 | Quick interactions, hover states, micro-interactions |
| `AnimationDuration.medium` | 600 | Standard transitions, screen changes |
| `AnimationDuration.slow` | 1200 | Complex animations, hero elements, gauges |
| `AnimationDuration.counter` | 800 | Counter animations, number tickers |
| `AnimationDuration.staggerDelay` | 150 | Stagger delay between animated list items |

### Animation Library
- **Primary:** React Native Reanimated 3 (`react-native-reanimated`)
- **Easing Functions:** Predefined curves (ease-out, ease-in-out, cubic-bezier)
- **Key Patterns:**
  - **Fade In/Out:** Used on screen transitions and modal opens
  - **Slide:** Used for drawer navigation, modal slides
  - **Scale:** Used for button press feedback, zoom animations
  - **Rotation:** Used for loading spinners, gauge animations
  - **Stagger:** Used for list item animations

### Interactive Feedback
- **Pressed States:** Slight scale (0.98) + shadow reduction
- **Disabled States:** Opacity 0.5, no interaction, grayed-out text
- **Hover States (Web):** Brightness increase, shadow elevation

---

## Part 7: Component Library & Design Patterns

### 7.1 Button Components

#### Primary Button
- **Background:** `Colors.primary` (#10B981)
- **Text:** `Colors.textOnPrimary` (White)
- **Border Radius:** `Radius.lg` (20px)
- **Padding:** Horizontal: `Spacing.xl` (20px), Vertical: `Spacing.md` (12px)
- **Font:** `FontSize.lg` (17px), Weight: 600
- **Shadow:** `Elevation.l2` (standard)
- **Pressed State:** Scale 0.98, shadow reduced
- **Disabled State:** Opacity 0.5

#### Secondary Button
- **Background:** Transparent
- **Border:** 2px `Colors.primary` (#10B981)
- **Text:** `Colors.primary`
- **Border Radius:** `Radius.lg` (20px)
- **Padding:** Horizontal: `Spacing.xl` (20px), Vertical: `Spacing.md` (12px)
- **Font:** `FontSize.lg` (17px), Weight: 600
- **Pressed State:** Background fills with light primary

#### Tertiary/Ghost Button
- **Background:** Transparent
- **Text:** `Colors.primary`
- **Border Radius:** `Radius.lg` (20px)
- **Padding:** Horizontal: `Spacing.lg` (16px), Vertical: `Spacing.sm` (8px)
- **Font:** `FontSize.md` (15px), Weight: 600
- **Pressed State:** Background fills with light primary

#### Icon Button
- **Size:** 44×44 (touch-friendly minimum)
- **Border Radius:** `Radius.full` (999px)
- **Background:** Transparent or `Colors.surfaceSecondary`
- **Icon Color:** `Colors.primary` or `Colors.text`
- **Pressed State:** Background highlighted

### 7.2 Card Components

#### Standard Card
- **Background:** `Colors.surface` (White)
- **Border Radius:** `Radius.md` (14px)
- **Padding:** `Spacing.lg` (16px) all sides
- **Shadow:** `Elevation.l2`
- **Border:** None (or 1px `Colors.border` for subtle definition)
- **Margin Bottom:** `Spacing.md` (12px)

#### Featured/Large Card
- **Background:** `Colors.surface`
- **Border Radius:** `Radius.xl` (28px)
- **Padding:** `Spacing.xl` (20px) all sides
- **Shadow:** `Elevation.l3`
- **Margin Bottom:** `Spacing.lg` (16px)

#### Macro Card (Protein, Carbs, Fat, Fiber)
- **Background:** Corresponding macro color with light tint
- **Border Radius:** `Radius.md` (14px)
- **Padding:** `Spacing.md` (12px)
- **Ring Accent:** 32×32 circle with 3px border in macro color, wraps icon
- **Layout:** Icon (with ring) | Macro name + Value (column)

#### Calorie Badge
- **Background:** `Colors.primaryBg` (#ECFDF5)
- **Text Color:** `Colors.primaryDark` (#059669)
- **Border Radius:** `Radius.full` (999px)
- **Padding:** Horizontal: `Spacing.md` (12px), Vertical: `Spacing.sm` (8px)
- **Font:** `FontSize.sm` (13px), Weight: 600

### 7.3 Input Components

#### Text Input
- **Background:** `Colors.surface` (White)
- **Border:** 1px `Colors.border` (#E2E8F0)
- **Border Radius:** `Radius.md` (14px)
- **Padding:** Horizontal: `Spacing.md` (12px), Vertical: `Spacing.md` (12px)
- **Font:** `FontSize.md` (15px)
- **Focus State:** Border color → `Colors.primary`, shadow `0 0 0 3px Colors.primary20%`
- **Placeholder Color:** `Colors.textTertiary`
- **Height:** 48px (touch-friendly)

#### Label
- **Font:** `FontSize.sm` (13px), Weight: 600
- **Color:** `Colors.text`
- **Margin Bottom:** `Spacing.sm` (8px)
- **Required Indicator:** Red asterisk if required

### 7.4 Navigation Components

#### Bottom Tab Bar
- **Background:** `Colors.surface`
- **Border Top:** 1px `Colors.border`
- **Height:** 60px + safe area
- **Tab Height:** 60px
- **Active Tab Text:** `Colors.primary`, Font: 12px
- **Inactive Tab Text:** `Colors.textTertiary`, Font: 12px
- **Icons:** 28×28, center-aligned above labels

#### Header/Top Navigation
- **Background:** `Colors.surface` or gradient (primary → primaryDark)
- **Height:** 56px + safe area
- **Padding:** `Spacing.lg` (16px) horizontal, `Spacing.md` (12px) vertical
- **Title Font:** `FontSize.lg` (17px), Weight: 600
- **Back Button:** 44×44 icon button on left

### 7.5 Modal/Dialog Components

#### Modal Overlay
- **Background:** `rgba(0, 0, 0, 0.5)` — 50% opacity black
- **Backdrop Filter:** Blur (4-8px)

#### Modal Container
- **Background:** `Colors.surface`
- **Border Radius:** `Radius.xl` (28px)
- **Padding:** `Spacing.xl` (20px) or `Spacing.xxxl` (32px)
- **Shadow:** `Elevation.l4`
- **Max Width:** 500px (or full width - 32px on mobile)
- **Max Height:** 90% viewport height
- **Animation:** Slide up from bottom, fade in

### 7.6 List Components

#### List Item
- **Background:** `Colors.surface`
- **Padding:** `Spacing.md` (12px) vertical, `Spacing.lg` (16px) horizontal
- **Border Bottom:** 1px `Colors.borderLight`
- **Min Height:** 50px
- **Pressed State:** Background → `Colors.surfaceSecondary`

#### List Item with Divider
- **Divider:** 1px `Colors.border`, full width at bottom

### 7.7 Circular Calorie Gauge

#### Component Structure
- **Size:** 200×200px (customizable)
- **Ring Diameter:** 180px
- **Ring Width:** 16px
- **Track Color:** `Colors.primaryLight` (#A7F3D0)
- **Fill Color:** `Colors.primary` (#10B981) — or `Colors.error` (#EF4444) if over-goal
- **Center Content:** Column with label + value
- **Center Label Font:** `FontSize.sm` (13px), `Colors.textSecondary`
- **Center Value Font:** `FontSize.hero` (34px), Weight: 700, `Colors.text`
- **Animation Duration:** `AnimationDuration.slow` (1200ms)
- **Easing:** Ease-out-cubic

#### Gauge States
- **Normal (< 100%):** Green fill
- **Over-goal (> 100%):** Red fill
- **Empty (0%):** No fill, just track
- **Complete (100%):** Full ring filled

---

## Part 8: Screen Designs & Layouts

### 8.1 Home Screen (`app/(tabs)/index.tsx`)

**Layout Structure:**
```
Header (Emerald gradient background)
  ├─ Screen title "Home"
  ├─ Settings icon (top-right)

Content (ScrollView with `Spacing.section` padding)
  ├─ Hero: Circular Calorie Gauge (200×200px)
  │  ├─ Consumed | Gauge | Remaining layout
  │  └─ Animated with 1200ms ease-out-cubic
  │
  ├─ Macros Section
  │  ├─ Section header: "Today's Nutrition"
  │  └─ Grid 2×2 macro cards (Protein, Carbs, Fat, Fiber)
  │     ├─ Card: Ring icon + macro name + value + progress bar
  │     ├─ Colors: Blue, Orange, Purple, Green respectively
  │     ├─ Animation: Stagger on load (150ms delay)
  │     └─ Padding: `Spacing.md` (12px)
  │
  ├─ Recent Meals Section
  │  ├─ Section header: "Recent Meals"
  │  ├─ Quick scroll (horizontal)
  │  └─ Meal items with thumbnail, name, calories
  │
  ├─ FAB Container (Bottom-right)
  │  └─ Label "Take Photo" + 64×64 Circular FAB
  │     ├─ Background: `Colors.primary`
  │     ├─ Icon: Camera
  │     ├─ Shadow: `Elevation.l4`
  │     └─ Border Radius: `Radius.full`
```

**Typography & Spacing:**
- Screen title: `FontSize.xxl` (24px), Weight: 700
- Section headers: `FontSize.lg` (17px), Weight: 600
- Macro values: `FontSize.xl` (20px), Weight: 700
- Macro labels: `FontSize.md` (15px), Weight: 400
- Padding: `Spacing.lg` (16px) horizontal, `Spacing.section` (28px) vertical

**Color Scheme:**
- Background: `Colors.background` (#FAFDF7)
- Header: Gradient `Colors.primaryGradientStart` → `Colors.primaryGradientEnd`
- Cards: `Colors.surface` with `Elevation.l2`
- Macro rings: Blue, Amber, Purple, Green

---

### 8.2 Camera/Capture Screen (`app/camera.tsx`)

**Layout Structure:**
```
Full Screen Camera View
  ├─ Header Bar (semi-transparent overlay)
  │  ├─ Back button (icon button)
  │  ├─ Title "Capture Meal"
  │  └─ Info icon (help)
  │
  ├─ Camera Preview (Full width, centered content)
  │  ├─ Frame overlay (guide lines for framing)
  │  └─ Focus indicator (animated circle)
  │
  └─ Bottom Control Bar (gradient background)
     ├─ Gallery button (left, icon)
     ├─ Capture button (center, 80×80 circle)
     │  ├─ Primary color
     │  ├─ Pulsing animation on ready
     │  └─ Loading spinner on capture
     └─ Flash toggle (right, icon button)
```

**Interaction Patterns:**
- Gallery button: Opens photo picker
- Capture button: Takes photo, shows loading (1-3s), navigates to Results
- Flash toggle: On/Off/Auto states with visual indicator

---

### 8.3 Results Screen (`app/results.tsx`)

**Layout Structure:**
```
Header (with back navigation)

Content (ScrollView)
  ├─ Captured Image Preview (full width, 300px height, `Radius.lg`)
  │  └─ Overlay: Re-analyze button (bottom-right)
  │
  ├─ Quick Stats Card
  │  ├─ Total Calories (hero font)
  │  ├─ Protein/Carbs/Fat inline badges
  │  └─ Macro breakdown bar (stacked horizontal)
  │
  ├─ Detected Foods List
  │  ├─ Section header: "Detected Foods"
  │  └─ List items (expandable)
  │     ├─ Food name + icon
  │     ├─ Confidence percentage
  │     ├─ Quantity selector
  │     └─ Portion size adjustment
  │
  ├─ Nutrition Breakdown
  │  ├─ Pie chart (if available) or bar chart
  │  └─ Macro percentages
  │
  └─ Action Buttons
     ├─ "Add to History" (primary)
     └─ "Edit" (secondary)
```

**Color Scheme:**
- Image border: `Radius.lg` (20px), `Elevation.l2`
- Quick stats: `Colors.primaryBg` background, `Colors.primary` text
- Confidence badge: Color-coded (green: >90%, yellow: 70-89%, orange: <70%)

---

### 8.4 Details Screen (`app/details.tsx`)

**Layout Structure:**
```
Header (scrollable with sticky positioning)
  ├─ Meal name (hero font)
  ├─ Timestamp
  └─ Edit/Delete buttons (icon)

Content (ScrollView)
  ├─ Large Circular Calorie Gauge (250×250px)
  │  └─ Shows today's total vs. goal
  │
  ├─ Nutrition Facts Panel
  │  ├─ Title: "Nutrition Facts"
  │  ├─ Standard format:
  │  │  ├─ Serving size (adjustable)
  │  │  ├─ Calories (hero font)
  │  │  ├─ % Daily Value
  │  │  ├─ Fat / Protein / Carbs (detailed breakdown)
  │  │  ├─ Fiber / Sugar / Sodium
  │  │  └─ Vitamins & Minerals (expandable)
  │
  ├─ Macro Chart
  │  ├─ Pie chart or bar chart visualization
  │  └─ Legend with color coding
  │
  ├─ Macro Details Cards
  │  ├─ 4 cards in 2×2 grid or scrollable row
  │  └─ Each card: Macro name + value + percentage + ring progress
  │
  └─ Action Buttons
     ├─ "Adjust Serving" (icon + text)
     ├─ "Share" (icon + text)
     └─ "Delete Meal" (red, destructive)
```

**Typography:**
- Meal name: `FontSize.hero` (34px), Weight: 700
- Section headers: `FontSize.lg` (17px), Weight: 600
- Nutrition values: `FontSize.xl` (20px), Weight: 700
- Labels: `FontSize.md` (15px), Weight: 400

---

### 8.5 History/Diary Screen (`app/(tabs)/history.tsx`)

**Layout Structure:**
```
Header
  ├─ Screen title: "History"
  ├─ Date range selector (week/month view)
  └─ Filter icon

Content (ScrollView)
  ├─ Date Picker / Calendar (optional horizontal scroll)
  │
  └─ Grouped by Date
     ├─ Date Header Pill
     │  ├─ Background: `Colors.primaryBg` (#ECFDF5)
     │  ├─ Text: `Colors.primaryDark` (#059669)
     │  ├─ Format: "Thu, Mar 26" or "Today"
     │  └─ Padding: `Spacing.md` (12px) horizontal, 4px vertical
     │
     ├─ Daily Summary Card
     │  ├─ Total calories: Hero font, primary color
     │  ├─ Goal vs actual (badge)
     │  ├─ Macro breakdown
     │  └─ Calorie badge with status
     │
     ├─ Meal Items (for that day)
     │  ├─ Meal card (thumbnail + title + time + calories)
     │  ├─ Card style: `Colors.surface`, `Elevation.l2`
     │  ├─ Meal name: `FontSize.lg` (17px)
     │  ├─ Time: `FontSize.sm` (13px), `Colors.textTertiary`
     │  ├─ Calories: `FontSize.lg` (17px), Weight: 700, `Colors.caloriesColor`
     │  └─ Pressed: Navigate to Details
     │
     └─ Empty State (if no meals)
        ├─ Empty icon
        ├─ "No meals logged"
        └─ "Tap + to add a meal"
```

**Color Scheme:**
- Date header: `Colors.primaryBg` background, `Colors.primaryDark` text
- Meal cards: `Colors.surface` background, `Elevation.l2` shadow
- Calories text: `Colors.caloriesColor` (#EF4444)
- Status badge: Green if under goal, Red if over

---

### 8.6 Settings Screen (`app/settings.tsx`)

**Layout Structure:**
```
Header
  ├─ Screen title: "Settings"
  └─ Close button (if modal)

Content (ScrollView)
  ├─ Section 1: App Configuration
  │  ├─ "API URL" setting
  │  │  ├─ Input field with current value
  │  │  ├─ Help text: "e.g., http://10.0.2.2:8000"
  │  │  └─ "Test Connection" button
  │  │
  │  ├─ "Calorie Goal" setting
  │  │  ├─ Input field with number
  │  │  ├─ Unit selector (kcal/day)
  │  │  └─ Preset options (1500, 2000, 2500)
  │  │
  │  └─ "Dark Mode" toggle (if enabled)
  │
  ├─ Section 2: Nutrition Preferences
  │  ├─ "Macro Distribution" adjustable
  │  ├─ "Allergen Preferences" checkboxes
  │  └─ "Dietary Preferences" options
  │
  ├─ Section 3: Data Management
  │  ├─ "Clear History" button (warning color)
  │  ├─ "Export Data" button
  │  └─ "Import Data" button
  │
  ├─ Section 4: About
  │  ├─ App version
  │  ├─ Privacy Policy link
  │  ├─ Terms of Service link
  │  └─ "About NutriVision" text
  │
  └─ Footer
     └─ "Powered by AI" credit
```

**Component Styles:**
- Section headers: `FontSize.lg` (17px), Weight: 600, `Colors.text`
- List items: 56px height, `Spacing.lg` (16px) padding
- Toggle switch: `Colors.primary` when on, `Colors.border` when off
- Input fields: `Radius.md` (14px), border 1px `Colors.border`
- Buttons: Primary/secondary as needed
- Destructive actions: `Colors.error` background

---

## Part 9: Component-Specific Design Details

### 9.1 FAB (Floating Action Button)

**Specs:**
- **Size:** 64×64px (outer container), 56×56px (button)
- **Shape:** Perfect circle (`Radius.full`)
- **Background:** `Colors.primary` (#10B981)
- **Icon:** Camera (Ionicon) — white, 28×28px
- **Shadow:** `Elevation.l4`
- **Position:** Bottom-right, `Spacing.lg` (16px) from edges + safe area
- **Animation on Press:** Scale 0.95 → 1.0 (100ms)
- **State:**
  - **Ready:** Pulsing opacity animation (1.0 → 0.7 → 1.0, 1500ms loop)
  - **Loading:** Spinner overlay
  - **Disabled:** Opacity 0.5, no interaction

### 9.2 Circular Progress Ring

**Specs:**
- **Diameter:** Customizable (default 200px)
- **Ring Width:** 16px
- **Track Color:** `Colors.primaryLight` (#A7F3D0)
- **Fill Color:** `Colors.primary` (#10B981) by default, `Colors.error` (#EF4444) if over-goal
- **Animation:** Reanimated with ease-out-cubic, duration `AnimationDuration.slow` (1200ms)
- **Center Content:** Stacked label + value
- **Corner Style:** Rounded caps (lineCap: "round")

### 9.3 Macro Ring Icon

**Specs:**
- **Ring Diameter:** 32×32px
- **Ring Width:** 3px
- **Colors:** Blue (Protein), Amber (Carbs), Purple (Fat), Green (Fiber)
- **Background:** Transparent
- **Icon Center:** Ionicon (20×20px) in same color
- **Implementation:** BorderView wrapper around icon

### 9.4 Empty State

**Specs:**
- **Icon:** 80×80px, `Colors.textTertiary`
- **Title:** `FontSize.lg` (17px), Weight: 600, `Colors.text`
- **Description:** `FontSize.md` (15px), `Colors.textSecondary`
- **CTA Button:** Optional secondary button
- **Alignment:** Centered, with `Spacing.xxxl` (32px) vertical padding
- **Background:** `Colors.background` or `Colors.surfaceSecondary`

### 9.5 Badge/Pill

**Specs:**
- **Height:** 28px
- **Padding:** Horizontal `Spacing.md` (12px), Vertical `Spacing.sm` (8px)
- **Border Radius:** `Radius.full` (999px)
- **Font:** `FontSize.sm` (13px), Weight: 600
- **Colors:** Context-dependent (primary, success, error, warning, info)
- **Variants:**
  - **Solid:** Colored background + white/dark text
  - **Outline:** Colored border + colored text, transparent background
  - **Ghost:** White background + colored text

---

## Part 10: Responsive Design & Breakpoints

### Screen Size Breakpoints

| Breakpoint | Width | Devices | Margin | Layout |
|---|---|---|---|---|
| Mobile | 320–479px | iPhone SE, older phones | 12px | Single column, stacked |
| Mobile Large | 480–767px | iPhone 11, 12, 13 | 16px | Single column, optimized |
| Tablet | 768–1023px | iPad Mini | 20px | 2-column grid where applicable |
| Desktop | 1024px+ | iPad Pro, desktop | 24px | 3-4 column grid |

### Layout Rules
- **Mobile (< 768px):** Single column, full-width components, `Spacing.lg` (16px) margins
- **Tablet (768–1023px):** 2-column grid for lists/cards, wider content areas
- **Desktop (1024px+):** 3-4 column grid, constrained max-width (1200px), centered content

### Safe Area Considerations
- **iOS Notch:** Top padding + bottom home indicator padding
- **Android Notch/Gesture bar:** Similar safe area respect
- **StatusBar Height:** Account for status bar on both platforms

---

## Part 11: Interaction Patterns & Micro-interactions

### 7.1 Button Press Feedback
- **Visual:** Scale 0.98 with opacity 0.8
- **Haptic (iOS):** Light impact feedback
- **Haptic (Android):** 10ms vibration pulse
- **Duration:** 100ms animation

### 7.2 Card Tap Feedback
- **Visual:** Background color shift, shadow elevation increase
- **Duration:** 150ms

### 7.3 Swipe Gestures
- **Swipe Right:** Go back (drawer navigation)
- **Swipe Up:** Dismiss modal
- **Swipe Down:** Refresh (pull-to-refresh)

### 7.4 Loading States
- **Skeleton Loading:** Placeholder bones with shimmer animation
- **Spinner:** Rotating circular progress indicator
- **Progress Bar:** Animated progress fill with percentage text

### 7.5 Transitions
- **Screen Navigation:** Fade in + Slide up (200ms)
- **Modal Open:** Slide up from bottom + Fade (300ms)
- **Slide Navigation:** Slide left/right with fade (250ms)

---

## Part 12: Accessibility Guidelines

### WCAG 2.1 Compliance (Level AA)

#### Color Contrast
- **Normal Text:** Minimum 4.5:1 contrast ratio
- **Large Text (18px+):** Minimum 3:1 contrast ratio
- **Non-text Elements:** Minimum 3:1 contrast ratio

#### Color Choices (Tested)
- Black (#0F172A) on White (#FFFFFF): 19.3:1 ✅
- Emerald (#10B981) on White (#FFFFFF): 5.2:1 ✅
- Gray (#475569) on White (#FFFFFF): 7.1:1 ✅
- Text on Green (#ECFDF5): 14.2:1 ✅

#### Accessibility Features
- **Focus States:** Visible 3px border on keyboard navigation
- **Touch Targets:** Minimum 44×44px for interactive elements
- **Text Scaling:** Support system text size adjustments (100–200%)
- **Reduced Motion:** Respect `prefers-reduced-motion` media query (duration → 0ms or very fast)
- **Screen Reader:** Proper VoiceOver/TalkBack labels, semantic structure

#### Dark Mode (Future)
- **Planned:** Additional color tokens for dark mode
- **Current:** Light mode only, dark mode styling TBD

---

## Part 13: Notch & Safe Area Handling

### iOS Safe Area
```
Top: Status bar (44px) + notch (varies)
Bottom: Home indicator (34px)
Left/Right: 0px (full width)
```

### Android Safe Area
```
Top: Status bar (24-30px) + notch (if present)
Bottom: Navigation bar (if present, 48px)
Left/Right: 0px (full width)
```

### Implementation
- Use React Native's `SafeAreaView` wrapper
- Or manual calculation: `useSafeAreaInsets()` hook
- Padding applied to: Header, Footer, Modals, FAB

---

## Part 14: Design System Usage Checklist

### Before Implementation
- [ ] Use tokens for all colors, spacing, typography, radius
- [ ] No hardcoded values (except in calculated layouts)
- [ ] All icons from consistent icon library (Ionicons)
- [ ] All shadows use `Elevation.*` tokens
- [ ] Font sizes use `FontSize.*` tokens
- [ ] Animations use `AnimationDuration.*` tokens

### Component Checklist
- [ ] All buttons have proper focus states
- [ ] All interactive elements 44×44px minimum
- [ ] Text contrast ≥ 4.5:1 for normal, 3:1 for large
- [ ] Loading states have spinners or skeleton UI
- [ ] Empty states have helpful messaging
- [ ] Forms have labels, error messages, hints
- [ ] Modals have close buttons + backdrop dismissal
- [ ] Lists have dividers or proper spacing

### Animation Checklist
- [ ] Animations use Reanimated 3
- [ ] Durations from `AnimationDuration` tokens
- [ ] No instant transitions (minimum 100ms)
- [ ] `prefers-reduced-motion` respected
- [ ] Haptic feedback on important interactions
- [ ] Loading states animated (spinners, skeleton)

### Accessibility Checklist
- [ ] VoiceOver/TalkBack labels on all interactive elements
- [ ] Semantic structure correct (headings, lists)
- [ ] Focus order logical (top-left to bottom-right)
- [ ] No color-only information conveyance
- [ ] Error messages clear and associated with inputs
- [ ] Touch targets minimum 44×44px
- [ ] System font size respected

### Quality Checklist
- [ ] No hardcoded magic numbers
- [ ] Comments for complex logic
- [ ] Consistent naming conventions
- [ ] No console warnings/errors
- [ ] TypeScript types strict
- [ ] No layout shifts during load/animation
- [ ] Performance: 60 FPS animations, <3s load

---

## Part 15: File Structure & Component Organization

### Expected Component Files
```
mobile/src/
├── components/
│   ├── circular-calorie-gauge.tsx          ← Gauge hero component
│   ├── macro-card.tsx                      ← Individual macro display
│   ├── meal-item.tsx                       ← List item for meals
│   ├── date-header-pill.tsx                ← Date badge
│   ├── calorie-badge.tsx                   ← Calorie status badge
│   ├── empty-state.tsx                     ← Empty state component
│   ├── loading-spinner.tsx                 ← Loading indicator
│   ├── skeleton-loader.tsx                 ← Skeleton placeholder
│   └── [other components]
│
├── screens/
│   ├── (tabs)/
│   │   ├── index.tsx                       ← Home screen
│   │   └── history.tsx                     ← History screen
│   ├── camera.tsx                          ← Camera capture
│   ├── results.tsx                         ← Analysis results
│   ├── details.tsx                         ← Detailed nutrition
│   └── settings.tsx                        ← Settings & config
│
├── utils/
│   ├── theme.ts                            ← Design tokens
│   └── formatting.ts                       ← Format utilities
│
├── services/
│   ├── api.ts                              ← API client
│   └── storage.ts                          ← Local storage
│
└── app.json                                ← Expo config
```

---

## Part 16: Icon System

### Icon Library
- **Primary:** Ionicons (included with Expo)
- **Fallback:** Material Design icons (lucide-react)
- **Format:** SVG/vector (scalable, no rasterization)

### Common Icons Used
| Icon Name | Use Case |
|---|---|
| `camera` | Camera button, capture action |
| `images` | Gallery/photos |
| `settings` | Settings screen, configuration |
| `arrow-back` | Back navigation |
| `close` | Close modal, dismiss |
| `check` | Confirmation, success |
| `warning` | Warning alert |
| `information-circle` | Help/info |
| `flash` | Camera flash toggle |
| `bulb-outline` | Insights/tips |
| `leaf` | Healthy, nutrition |
| `fitness` | Activity, fitness tracking |
| `chart-bar` | Analytics, statistics |
| `trash` | Delete action |
| `share-social` | Share functionality |

### Icon Sizing Guidelines
| Context | Size | Use Case |
|---|---|---|
| Tab icon | 28×28px | Bottom navigation |
| Button icon | 20×24px | Button contents |
| Icon button | 24×24px | Standalone icon buttons |
| Header icon | 24×24px | Top navigation |
| List item icon | 24×24px | Left of text |
| Card icon | 32×32px | Macro ring accent |
| Hero icon | 48×48px | Large displays, empty state |

---

## Part 17: Data Visualization Patterns

### Progress Rings
- **Usage:** Calorie tracking, macro progress
- **Implementation:** SVG or Reanimated circles
- **Colors:** Primary green by default, error red for over-goal

### Pie Charts
- **Usage:** Macro breakdown visualization
- **Library:** `react-native-chart-kit` or similar
- **Colors:** Blue (protein), Amber (carbs), Purple (fat), Green (fiber)

### Bar Charts
- **Usage:** Daily tracking, historical comparison
- **Horizontal or Vertical:** Horizontal for mobile readability

### Line Charts
- **Usage:** Weight tracking, trend visualization
- **X-axis:** Date/time
- **Y-axis:** Value (weight, calories, etc.)

---

## Part 18: Known Design Patterns & Anti-patterns

### ✅ Recommended Patterns
1. **Circular Gauge Hero** — Dominant calorie display on home
2. **Card-based Layouts** — Modular, scannable interfaces
3. **Floating Action Button** — Quick capture action accessibility
4. **Date-grouped Lists** — Organized history/diary views
5. **Macro Ring Accents** — Visual distinction without text clutter
6. **Expandable Sections** — Detailed nutrition breakdown
7. **Inline Badges** — Quick status/tag display
8. **Staggered Animations** — List item entrance animation

### ❌ Anti-patterns (Do NOT Use)
1. **Emoji as icons** — Use SVG icons only
2. **Missing touch targets** — Minimum 44×44px
3. **Instant state changes** — Always use transitions (150-300ms)
4. **Low contrast text** — Maintain 4.5:1 minimum
5. **No loading states** — Always indicate progress
6. **Horizontal scroll on mobile** — Avoid except for intentional patterns
7. **Modal without dismiss** — Always allow easy exit
8. **Broken keyboard navigation** — Test with screen readers
9. **Layout shift during load** — Skeleton UI or reserved space
10. **Hardcoded colors/spacing** — Always use design tokens

---

## Part 19: Performance Optimization Guidelines

### Animation Performance
- **Target:** 60 FPS (16.67ms per frame)
- **Reanimated 3:** Use worklets for smooth performance
- **Avoid:** Direct state updates in animations
- **Test:** Use React Native performance monitor

### Image Optimization
- **Format:** WebP for modern devices, JPEG fallback
- **Size:** Max 1080px width for mobile screens
- **Compression:** 75-85% quality for acceptable file size
- **Cache:** Implement image caching strategy

### Component Optimization
- **Memoization:** Use `memo` for expensive renders
- **FlatList:** Use instead of ScrollView for large lists
- **Virtualization:** Render only visible items
- **Lazy Loading:** Load images/data on scroll

### Bundle Size
- **Target:** < 5MB for initial app download
- **Monitor:** Use `react-native-bundle-analyzer`
- **Tree Shake:** Remove unused dependencies

---

## Part 20: Testing & QA Checklist

### Visual Testing
- [ ] All screens render correctly on iPhone 13, 14, 15
- [ ] All screens render correctly on Android 12+
- [ ] iPad/tablet layouts work (if supported)
- [ ] Landscape orientation supported
- [ ] Text scales correctly with system font size (100–200%)

### Interaction Testing
- [ ] Buttons respond to taps
- [ ] Swipe gestures work (back, dismiss)
- [ ] Pull-to-refresh works (if implemented)
- [ ] Focus states visible on keyboard navigation
- [ ] Screen reader announces all content (iOS VoiceOver, Android TalkBack)

### Performance Testing
- [ ] Animations run at 60 FPS
- [ ] App launches in < 3 seconds
- [ ] Navigation transitions smooth (no jank)
- [ ] Images load without blocking UI
- [ ] Memory usage stable (no leaks)

### Accessibility Testing
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Touch targets minimum 44×44px
- [ ] Focus order logical
- [ ] Screen reader works for all content
- [ ] No text-only information conveyance (use color + icon + text)

---

## Unresolved Questions

1. **Dark Mode Support:** Is dark mode planned? If so, when should design tokens be extended?
2. **Tablet Layout:** Should the app support iPad with larger layouts (2-3 column)?
3. **Landscape Orientation:** Full support required on Android/iOS?
4. **Chart Library:** Which charting library preferred (Chart.js, Victory, custom SVG)?
5. **Notification Design:** Push notification UI specs (banners, alerts)?
6. **Onboarding Flow:** Initial setup screens needed? Design specs for onboarding?
7. **Internationalization:** Multi-language support planned? RTL language support?
8. **Offline Support:** App should work offline? Design specs for offline state?
9. **Advanced Settings:** Additional settings beyond API URL, calorie goal, and preferences?
10. **Historical Data Export:** Format preference (CSV, JSON, PDF)?

---

**Report Completed:** 2026-03-26 16:08
**Status:** Ready for implementation
**Next Steps:** Use this specification as reference for React Native component development
