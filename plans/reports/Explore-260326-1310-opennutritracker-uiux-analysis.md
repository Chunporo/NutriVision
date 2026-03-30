# OpenNutriTracker UI/UX Design Analysis

**Date:** 2026-03-26  
**Analyzed:** https://github.com/simonoppowa/OpenNutriTracker  
**Framework:** Flutter (Dart)  
**Status:** Detailed research complete

---

## Executive Summary

OpenNutriTracker is a clean, privacy-focused calorie/nutrition tracker built with Flutter. UI design emphasizes simplicity with a **Material Design 3 (M3)** approach. The app uses a **green-primary color palette** with clear hierarchy, prominent progress indicators, and card-based layouts. Navigation is bottom-tab based with floating action button for primary actions.

---

## Color Palette

### Light Mode (Primary Scheme)
- **Primary:** `#006E2B` (Dark Green) - Main brand color, CTAs, progress indicators
- **Primary Container:** `#69FF89` (Light Green) - Subtle backgrounds, highlights
- **Secondary:** `#516351` (Muted Gray-Green) - Secondary UI elements
- **Secondary Container:** `#D4E8D1` (Pale Green) - Card backgrounds, chips
- **Tertiary:** `#39656C` (Teal) - Accent elements, activity icons
- **Tertiary Container:** `#BDEAF3` (Pale Cyan) - Energy/activity badges
- **Surface:** `#FCFDF7` (Off-white) - Main background
- **Error:** `#BA1A1A` (Red) - Destructive actions, delete drag targets
- **Outline:** `#727970` (Gray) - Borders, dividers

### Dark Mode (Primary Scheme)
- **Primary:** `#33E36A` (Bright Green) - Inverted for dark backgrounds
- **Primary Container:** `#00531F` (Deep Green) - Dark surface containers
- **Secondary:** `#B8CCB5` (Light Gray-Green)
- **Surface:** `#1A1C19` (Near-black) - Dark background
- **On Surface:** `#E2E3DD` (Off-white text)
- **Error:** `#FFB4AB` (Light coral) - Destructive actions in dark mode

**Design Pattern:** Material 3 dynamic color system with theme support. Purposeful green emphasizes health/nutrition theme.

---

## Typography

**Font Family:** Poppins (Google Font)  
**Full weights:** Thin, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black (with Italics)

### Text Scale
| Style | Size | Weight | Letter Spacing |
|-------|------|--------|-----------------|
| Display Large | 93px | 300 (Light) | -1.5 |
| Display Medium | 58px | 400 (Regular) | -0.5 |
| Display Small | 46px | 400 (Regular) | 0 |
| Headline Medium | 33px | 400 (Regular) | 0.25 |
| Headline Small | 23px | 400 (Regular) | 0 |
| **Title Large** | **19px** | **500 (Medium)** | **0.15** |
| **Title Medium** | **15px** | **500 (Medium)** | **0** |
| Title Small | 13px | 500 (Medium) | 0.1 |
| **Body Large** | **16px** | **400 (Regular)** | **0.5** |
| **Body Medium** | **14px** | **400 (Regular)** | **0** |
| Body Small | 12px | 400 (Regular) | 0.4 |
| Label Large | 14px | 500 (Medium) | 1.25 |
| Label Small | 10px | 500 (Medium) | 1.5 |

**Typography Philosophy:** Modern, readable hierarchy. Medium weight (500) used for labels/calls-to-action. Body text at 14-16px. Generous letter-spacing in larger headlines for premium feel.

---

## Key UI Components

### 1. Dashboard Widget (Home Screen Hero)
**Purpose:** Central calorie tracking display

**Visual Structure:**
- **Card-based container** with 1px elevation, 16px padding
- **Circular Progress Indicator**
  - Radius: 90px
  - Line width: 13px
  - Full arc (360°)
  - Progress color: Primary green
  - Background: Primary with 50 alpha transparency
  - Stroke cap: Rounded
- **Center Content:**
  - Animated flip counter for remaining kcal (animated over 1000ms)
  - Primary color text, headline-medium size
  - "kcal left" label below
- **Top/Bottom Columns:** Show supplied & burned kcal with icons
  - Consumed: `↑` Icon + number + "Supplied" label
  - Burned: `↓` Icon + number + "Burned" label

**Interaction:** Static display, updates in real-time as meals added/removed

### 2. Macro Nutrients Widget
**Purpose:** Protein/Carbs/Fat progress display

**Visual Structure:**
- **Three horizontal groups** (Carbs, Fats, Proteins)
- **Each group contains:**
  - Small circular progress indicator (radius 15px, line 6px)
  - Text: `{current}/{goal} g`
  - Label: "Carbs", "Fats", "Proteins"
  - Font: Title Small (13px) + Body Medium (14px)
- **Colors:** Primary progress color, semi-transparent background

**Interaction:** Animated progress updates

### 3. Intake Card (Meal Items)
**Purpose:** Display individual meal entries

**Visual Structure:**
- **120×120px card** container
  - Border radius: 16px
  - Elevation: 1
  - Long-press: Edit/delete actions
  - Tap: Edit amount dialog
- **Card content layers:**
  1. **Image layer:** Cached meal photo or restaurant icon (fallback)
  2. **Kcal badge:** Semi-transparent overlay (secondary container with 0.5 alpha)
     - Position: Top-left, 8px margin
     - Padding: 8px horizontal, 4px vertical
     - Radius: 20px pill shape
     - Text: Black on tertiary container (0.8 alpha)
     - Format: "{kcal} kcal"
  3. **Info section (below image):** 
     - Meal name (AutoSizeText, max 2 lines, titleMedium weight)
     - Serving size/amount (muted secondary container)

**Interaction:**
- **Drag:** Initiates drag-to-delete over red zone
- **Long press:** Delete confirmation dialog
- **Tap:** Edit amount slider dialog

### 4. Activity Card
**Purpose:** Exercise/activity entries

**Visual Structure:**
- **Card with rounded corners** (radius 12px)
- **Top section:** Activity icon + burned kcal badge
  - Badge: "🔥 {kcal} kcal" format
  - Background: Tertiary container (0.8 alpha)
  - Font: Body Small
- **Bottom section:** Activity name + duration
  - Name: Body Medium
  - Duration: "{duration} min" in Body Small (muted)

**Interaction:**
- **Long press:** Delete with confirmation

### 5. Navigation Bar (Bottom Navigation)
**Purpose:** Tab-based primary navigation

**Components:**
- **3 destinations:**
  1. Home (icon: filled home / outlined home)
  2. Diary (icon: filled book / outlined book)
  3. Profile (icon: filled person / outlined person)
- **Material 3 NavigationBar** with:
  - Selected indicator animation
  - Label text below icons
  - Bottom safe area padding
  - Colors: Primary for selected, secondary for unselected

**Interaction:** Instant tab switching

### 6. Floating Action Button (FAB)
**Purpose:** Quick add meal/activity

**Details:**
- **Icon:** `Icons.add`
- **Visible on:** Home tab only
- **Action:** Shows bottom sheet with quick-add options
- **Color:** Primary green
- **Size:** Standard 56×56px

### 7. Bottom Sheet (Add Item)
**Purpose:** Quick meal/activity selection modal

**Visual Structure:**
- **Rounded top corners** (radius 16px)
- **Two action buttons/sections:**
  - Add meal (with icon)
  - Add activity (with icon)
- **Material 3 styling** with proper shadows

### 8. Dialogs
**Types Used:**
- **Delete confirmation:** Simple yes/no, red error styling
- **Edit amount:** Slider for portion size adjustment
- **Info dialogs:** Disclaimer (shown once on first use)
- **Error dialogs:** Network/validation errors
- **Copy/Delete day:** For diary feature

---

## Screen Layouts

### Home Screen (Dashboard)
**Structure:**
```
[AppBar - Dynamic, with logo/title]
[ListView Container]
├─ Dashboard Widget (64px height + padding)
│  └─ Circular progress + macro nutrients
├─ Activities Section
│  └─ Horizontal scrollable activity cards
├─ Meal Sections (4x)
│  ├─ Breakfast
│  ├─ Lunch
│  ├─ Dinner
│  └─ Snacks
│  └─ Each: Title + icon + horizontal scrollable cards
└─ Bottom padding (48px safe area)

[FAB - bottom right]
[BottomNavigationBar - 3 tabs]
```

**Key Features:**
- Infinite scroll showing all meals + activities
- Real-time updates with BLoC state management
- Empty state shows placeholder cards (no items yet)
- Drag-to-delete red zone appears at bottom when dragging

### Diary Screen (Calendar View)
**Structure:**
```
[AppBar - "Diary" title]
[Calendar widget - Monthly grid]
[Selected day details - ListView]
├─ Daily summary card
├─ Meals (collapsed by meal type)
└─ Activities list

[BottomNavigationBar]
```

**Features:**
- Table calendar integration (table_calendar package)
- Swipe/tap to change date
- Copy entire day to another date

### Profile Screen
**Structure:**
```
[AppBar - "Profile" title]
[ListView]
├─ User info section
├─ Settings/preferences
├─ Statistics (weekly/monthly)
├─ About/help section
└─ Privacy notice

[BottomNavigationBar]
```

### Scanner Screen (Camera Barcode)
**Structure:**
```
[AppBar - "Scan" title]
[Mobile scanner widget - Full screen]
├─ Camera preview
└─ Barcode detection overlay

[Find result screen - Food details + amount input]
[Add to meal type selector]
```

**Features:**
- Real-time barcode detection
- Auto-lookup in Open Food Facts database
- Manual fallback search

### Add Meal Screen
**Structure:**
```
[AppBar - "Add Meal" / "Breakfast" etc]
[Search bar - expandable]
[Food list - ListView]
├─ Categories
├─ Recent foods
├─ Search results
└─ Custom meals

[Food detail sheet]
├─ Image
├─ Nutrition facts
├─ Amount selector
└─ Add button
```

**Features:**
- Real-time search from food database
- Portion/serving size selector
- Quick-add recent meals

---

## Navigation Pattern

**Type:** Bottom Tab Navigation + Modal Stack

**Route Structure:**
```
Main Routes:
├─ /main (3-tab navigation)
│  ├─ Home (HomePage)
│  ├─ Diary (DiaryPage)
│  └─ Profile (ProfilePage)
├─ /settings
├─ /add-meal
├─ /scanner
├─ /meal-detail
├─ /edit-meal
├─ /add-activity
├─ /activity-detail
└─ /image-fullscreen

Initial Route:
├─ OnboardingScreen (if first time)
└─ MainScreen (if user initialized)
```

**Navigation Mechanics:**
- **Bottom bar:** Stateful navigation with page index tracking
- **Modals:** Bottom sheets for quick actions, dialogs for confirmations
- **Transitions:** Material slide animations
- **Back behavior:** Standard Android/iOS back gestures

---

## Notable UX Patterns

### 1. Drag-to-Delete
**Purpose:** Intuitive meal removal  
**Implementation:**
- Long-press holds card
- Drag downward reveals red delete zone
- Red zone labeled "Delete"
- Drop to confirm, drag away to cancel
- Uses Flutter DragTarget widget

### 2. Animated Counters
**Purpose:** Smooth value transitions  
**Implementation:**
- `AnimatedFlipCounter` package
- 1000ms animation on kcal updates
- Headline text size (visual prominence)

### 3. Auto-Updating on App Resume
**Purpose:** Keep data fresh when returning to app  
**Implementation:**
- `WidgetsBindingObserver` listens to app lifecycle
- On `resumed`, checks if day has changed
- Auto-refreshes data if date differs

### 4. Material 3 Theme Mode Provider
**Purpose:** Theme persistence + dark mode support  
**Implementation:**
- Saved in Hive local storage
- Light/dark/system modes supported
- Real-time theme switching via Provider

### 5. Disclaimer Dialog
**Purpose:** Legal/medical disclaimer  
**Implementation:**
- Shows once on first app use
- Presented via `WidgetsBinding.addPostFrameCallback`
- Requires explicit acceptance before dismissal

### 6. Real-time Validation
**Purpose:** Form feedback  
**Implementation:**
- Amount inputs validated immediately
- Error messages in dialogs
- Snackbar confirmations (item added/deleted/updated)

### 7. Empty States
**Purpose:** Guide new users  
**Implementation:**
- Placeholder cards shown when no items
- FAB hint encourages first action
- Welcome/onboarding screens for setup

### 8. Context-Aware UI
**Purpose:** Relevant displays based on data  
**Implementation:**
- Cards only show when meals/activities exist
- Imperial vs metric units based on profile
- Calorie gauge adjusts based on daily goal

---

## Loading & Error States

### Loading State
- **Indicator:** Center-positioned CircularProgressIndicator
- **Color:** Primary green
- **Size:** Default (standard 56px)
- **Context:** Shown while fetching meals/activities on initial load

### Empty State
- **UI:** Placeholder cards (gray outlines, no content)
- **Message:** Implicit (users understand "add something")
- **CTA:** FAB prominently displayed

### Error State
- **Type:** Dialog-based
- **Color:** Red (error color scheme)
- **Message:** User-friendly copy
- **Actions:** Retry / Dismiss buttons

### Success States
- **Snackbar:** "Item added", "Item updated", "Item deleted"
- **Position:** Bottom (above nav bar)
- **Duration:** 2-3 seconds
- **Animation:** Slide-in from bottom

---

## Design System Tokens

### Spacing Scale
- **Core unit:** 4px grid
- **Common values:** 8, 12, 16, 24, 32, 48, 64px
- **Card padding:** 16px (horizontal), 12-16px (vertical)
- **Section gaps:** 12-16px
- **Safe areas:** 16px horizontal, 48px bottom

### Border Radius
- **Cards:** 12-16px
- **Buttons:** 8-12px
- **Pills/Badges:** 20px
- **Dialogs:** 12-16px

### Elevation (Z-depth)
- **Cards:** 1 (subtle shadow)
- **FAB:** 6 (prominent)
- **Navigation:** 3
- **Dialogs:** 24 (modal focus)

### Shadows
- **Small:** `elevation: 1` (cards, subtle depth)
- **Medium:** `elevation: 3` (navigation bars)
- **Large:** `elevation: 6` (FAB, floating)

### Opacity/Alpha
- **Active:** 1.0 (full)
- **Secondary:** 0.7-0.8 (disabled text, secondary info)
- **Tertiary:** 0.5 (backgrounds, overlays)
- **Disabled:** 0.38 (disabled buttons)

### Animation Timing
- **Fast:** 200-300ms (state changes, interactions)
- **Medium:** 500-800ms (page transitions)
- **Slow:** 1000ms (counter animations, emphasis)
- **Curve:** EaseInOut (standard M3 easing)

---

## Package Dependencies (UI-Related)

| Package | Version | Purpose |
|---------|---------|---------|
| `flutter_svg` | 2.0.16 | SVG icons/graphics |
| `cached_network_image` | 3.4.1 | Meal photos with caching |
| `percent_indicator` | 4.2.4 | Circular progress indicators |
| `auto_size_text` | 3.0.0 | Responsive text sizing |
| `animated_flip_counter` | 0.3.4 | Animated value counters |
| `table_calendar` | 3.1.3 | Diary calendar widget |
| `introduction_screen` | 3.1.14 | Onboarding flow |
| `horizontal_picker` | 1.2.0 | Date/value selection |
| `mobile_scanner` | 6.0.2 | Barcode scanning camera |

---

## Onboarding / Setup Screens

**Flow:**
1. **Welcome screen** - App intro, call-to-action
2. **User info** - Name, age, gender
3. **Health goals** - Weight target, calorie goal
4. **Unit preference** - Metric or Imperial (added in recent update)
5. **Done** - Redirect to home

**Design:**
- Full-screen cards with illustrations
- Large CTAs (primary green buttons)
- Progress indicator (dots at bottom)
- Swipe/button navigation between steps

---

## Accessibility Considerations

**Observed Implementations:**
- **Icon labels:** All icons paired with text labels
- **Color contrast:** Good contrast on light/dark modes
- **Touch targets:** Minimum 48dp (cards/buttons meet spec)
- **Semantic widgets:** Proper Material widgets used
- **Localization:** Full i18n support (S.of(context).appTitle pattern)
- **Dynamic text:** AutoSizeText for responsive fonts
- **Reader support:** Material components have semantic containers

---

## Performance & Optimization

**Strategies Used:**
- **Image caching:** CachedNetworkImage with cache manager
- **BLoC state management:** Efficient rebuild patterns
- **Hive local storage:** Fast local persistence
- **Lazy loading:** ListView with item builders
- **Hot reload support:** Clean separation of concerns

---

## Theme Architecture

**File:** `lib/core/styles/color_schemes.dart` + `fonts.dart`

**Implementation:**
```dart
MaterialApp(
  theme: ThemeData(
    useMaterial3: true,
    colorScheme: lightColorScheme,
    textTheme: appTextTheme
  ),
  darkTheme: ThemeData(
    colorScheme: darkColorScheme,
    textTheme: appTextTheme
  ),
  themeMode: Provider.of<ThemeModeProvider>(context).themeMode,
)
```

**Benefits:**
- Centralized color management
- Dark mode support
- Easy theme switching
- Material 3 compliance

---

## Notable Design Decisions

1. **Green Primary Color:** Aligned with health/wellness/nutrition brand identity
2. **Bottom Navigation:** Better thumb-reach accessibility on large phones
3. **Card-based Layout:** Scannable, organized content structure
4. **Drag-to-Delete:** Satisfying, intuitive interaction for destructive actions
5. **Real-time Updates:** No need to refresh—live data reflection
6. **Privacy-Focused UI:** No ads, no dark patterns, straightforward flows
7. **Material 3 Adoption:** Modern, consistent with platform expectations
8. **Poppins Font:** Modern, friendly, high readability
9. **Animated Counters:** Adds personality, smooth value transitions
10. **Modal Patterns:** Bottom sheets for non-blocking actions

---

## Unresolved Design Questions

- [ ] Material You dynamic theming support (TODO in README)
- [ ] Custom theme/color picker UI (if added in future)
- [ ] Tablet/landscape layout optimization (current design is mobile-first)
- [ ] Accessibility testing beyond WCAG color contrast
- [ ] Animation performance on older devices
- [ ] Gesture customization (pinch-zoom for meal photos?)

