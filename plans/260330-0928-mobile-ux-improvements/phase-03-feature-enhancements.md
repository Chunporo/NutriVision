# Phase 03 — Feature Enhancements

## Context Links
- Parent plan: [plan.md](./plan.md)
- Phase 01: [phase-01-robustness-fixes.md](./phase-01-robustness-fixes.md)
- Phase 02: [phase-02-ux-polish.md](./phase-02-ux-polish.md)
- Results screen: `mobile/app/results.tsx`
- Details screen: `mobile/app/details.tsx`
- Storage service: `mobile/src/services/storage.ts`
- Helpers: `mobile/src/utils/helpers.ts`

---

## Overview

| Field | Value |
|---|---|
| Priority | P3 — MEDIUM |
| Status | Complete |
| Effort | ~5h |
| Description | Add share results, portion multiplier adjustment, and extract inline components from results/details for long-term maintainability. |

---

## Key Insights

- **Share results** (`results.tsx`): Expo SDK includes `expo-sharing` + `expo-file-system` — no new npm installs. Approach: build a formatted text summary and share via native share sheet. Sharing image+text is possible but complex; share text summary first (KISS).
- **Portion adjust** (`results.tsx`): The VL model returns `portion_size` as a named object (e.g. `{ rice: 180, chicken: 120 }`). The calorie display is a single number from `extractCalories()`. A simple multiplier slider (0.5×–2×) lets users scale all nutrients without re-analyzing. No backend call needed.
- **Inline `QuickMacro`** component (`results.tsx:222–247`): Already extracted as a local function in the same file — it's fine at this size. However `results.tsx` is 347 lines. The `QuickMacro` function + styles can be moved to `src/components/quick-macro-card.tsx` to keep `results.tsx` under 200 lines.
- **`details.tsx`**: Need to read before writing — referenced in audit but not yet read. Check for inline components there too.

---

## Requirements

### Functional
1. Results screen has a "Share" button that opens native share sheet with a formatted nutrition summary.
2. Results screen has a portion multiplier (×0.5, ×1, ×1.5, ×2) that scales displayed calories and macros.
3. `QuickMacro` component is extracted to `mobile/src/components/quick-macro-card.tsx`.
4. Any inline components in `details.tsx` over ~40 lines extracted similarly.

### Non-functional
- Share text must be human-readable (not raw JSON).
- Multiplier only affects display — does not mutate stored `MealEntry`.
- Extracted components must maintain identical visual output.
- No new npm packages (use `expo-sharing` from Expo SDK).

---

## Architecture

### Share Results

```
[Share Button] ──► buildShareText(meal, multiplier) ──► Share.share({ message })
```

`buildShareText()` helper in `helpers.ts`:
```
NutriVision — {dishName}
━━━━━━━━━━━━━━━━━━━━━
🔥 Calories:  {calories × multiplier} kcal
💪 Protein:   {protein}g
🌾 Carbs:     {carbs}g
🫙 Fat:       {fat}g
─────────────────────
Portion: {multiplier}× · {time}
Analyzed by NutriVision
```

Use `Share` from `react-native` (built-in, no extra package). `expo-sharing` is for files — plain text share works with native `Share.share()`.

### Portion Multiplier

State: `const [multiplier, setMultiplier] = useState(1);`

Preset buttons (not a slider — simpler, no new component needed):
```
[½×]  [1×]  [1½×]  [2×]
```

Display-derived values:
```ts
const scaledCalories = Math.round(calories * multiplier);
const scaledMacros = { protein: ...*multiplier, carbs: ...*multiplier, fat: ...*multiplier };
```

Replace `displayCalories` driven by animation with `displayCalories = scaledCalories` when multiplier ≠ 1 (skip animation for multiplier changes — re-animating on every tap is jarring).

### Component Extraction

`QuickMacro` → `mobile/src/components/quick-macro-card.tsx`
- Props interface: `QuickMacroCardProps`
- Export named: `export function QuickMacroCard(...)`
- Import in `results.tsx` replaces local function

Check `details.tsx` — extract any inline component > 40 lines.

---

## Related Code Files

| File | Action | Change |
|---|---|---|
| `mobile/app/results.tsx` | Modify | Add share button, portion multiplier, import `QuickMacroCard` |
| `mobile/src/components/quick-macro-card.tsx` | Create | Extract `QuickMacro` from `results.tsx` |
| `mobile/src/utils/helpers.ts` | Modify | Add `buildShareText()` helper |
| `mobile/app/details.tsx` | Read + possibly modify | Check for extractable inline components |
| `mobile/src/services/storage.ts` | Read only | Understand `MealEntry` shape for share text |

---

## Implementation Steps

### Step 1 — Read `details.tsx` first

Before writing any code, read `mobile/app/details.tsx` to check:
- File line count
- Any inline components > 40 lines to extract
- Confirm no conflicts with Phase 01/02 changes

### Step 2 — Extract `QuickMacroCard` component

1. Create `mobile/src/components/quick-macro-card.tsx`:
   ```tsx
   import { View, Text, StyleSheet } from "react-native";
   import { FontSize, Spacing, Radius } from "../utils/theme";
   import { formatGrams } from "../utils/helpers";

   export interface QuickMacroCardProps {
     label: string;
     value: number | string | undefined;
     color: string;
     surfaceColor: string;
     textColor: string;
     secondaryColor: string;
   }

   export function QuickMacroCard({ label, value, color, surfaceColor, textColor, secondaryColor }: QuickMacroCardProps) {
     return (
       <View style={[styles.macroItem, { backgroundColor: surfaceColor }]}
             accessibilityLabel={`${label}: ${formatGrams(value)}`}>
         <View style={[styles.macroDot, { backgroundColor: color }]} />
         <Text style={[styles.macroValue, { color: textColor }]}>{formatGrams(value)}</Text>
         <Text style={[styles.macroLabel, { color: secondaryColor }]}>{label}</Text>
       </View>
     );
   }

   const styles = StyleSheet.create({
     macroItem: { alignItems: "center", borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 80 },
     macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
     macroValue: { fontSize: FontSize.md, fontWeight: "700" },
     macroLabel: { fontSize: FontSize.xs, marginTop: 2 },
   });
   ```
2. In `results.tsx`: remove the local `QuickMacro` function and its styles; import `QuickMacroCard`; rename usage from `<QuickMacro` to `<QuickMacroCard`.

### Step 3 — Add `buildShareText()` to `helpers.ts`

```ts
export function buildShareText(
  dishName: string,
  calories: number,
  macros: { protein?: number; carbs?: number; fat?: number },
  multiplier: number,
  timestamp: string
): string {
  const scale = (v?: number) => v !== undefined ? Math.round(v * multiplier) : undefined;
  const fmt = (v?: number) => v !== undefined ? `${v}g` : "—";

  const lines = [
    `NutriVision — ${dishName || "Food Analysis"}`,
    "━━━━━━━━━━━━━━━━━━━━━",
    `🔥 Calories:  ${Math.round(calories * multiplier)} kcal`,
    `💪 Protein:   ${fmt(scale(macros.protein))}`,
    `🌾 Carbs:     ${fmt(scale(macros.carbs))}`,
    `🫙 Fat:       ${fmt(scale(macros.fat))}`,
    "─────────────────────",
    `Portion: ${multiplier}× · ${formatTime(timestamp)}`,
    "Analyzed by NutriVision",
  ];
  return lines.join("\n");
}
```

### Step 4 — Add portion multiplier to `results.tsx`

1. Add state: `const [multiplier, setMultiplier] = useState<0.5 | 1 | 1.5 | 2>(1);`
2. Derive scaled values:
   ```ts
   const scaledCalories = Math.round(calories * multiplier);
   const scaledMacros = {
     protein: macros.protein !== undefined ? macros.protein * multiplier : undefined,
     carbs:   macros.carbs   !== undefined ? macros.carbs   * multiplier : undefined,
     fat:     macros.fat     !== undefined ? macros.fat     * multiplier : undefined,
   };
   ```
3. Update `displayCalories` to use `scaledCalories` (keep animation on initial load, reset on multiplier change without re-animating):
   - When multiplier changes, set `animatedCalories.value = scaledCalories` directly (no `withTiming`).
4. Add portion preset buttons in the result card, below the calorie block:
   ```tsx
   <View style={styles.portionRow}>
     <Text style={[styles.portionLabel, { color: colors.textSecondary }]}>Portion:</Text>
     {([0.5, 1, 1.5, 2] as const).map((m) => (
       <Pressable
         key={m}
         style={[styles.portionBtn, multiplier === m && { backgroundColor: colors.primary }]}
         onPress={() => setMultiplier(m)}
       >
         <Text style={[styles.portionBtnText, { color: multiplier === m ? colors.textOnPrimary : colors.textSecondary }]}>
           {m}×
         </Text>
       </Pressable>
     ))}
   </View>
   ```
5. Add styles: `portionRow`, `portionLabel`, `portionBtn`, `portionBtnText`.
6. Pass `scaledMacros` to `QuickMacroCard` instead of `macros`.

### Step 5 — Add share button to `results.tsx`

1. Import `Share` from `react-native`.
2. Import `buildShareText` from helpers.
3. Add share handler:
   ```ts
   const handleShare = async () => {
     const text = buildShareText(dishName, calories, macros, multiplier, meal.timestamp);
     await Share.share({ message: text });
   };
   ```
4. Add share button alongside the existing action buttons:
   ```tsx
   <Pressable
     style={({ pressed }) => [styles.shareButton, { borderColor: colors.primary }, pressed && styles.buttonPressed]}
     onPress={handleShare}
     accessibilityRole="button"
     accessibilityLabel="Share nutrition results"
   >
     <Ionicons name="share-outline" size={20} color={colors.primary} />
     <Text style={[styles.shareButtonText, { color: colors.primary }]}>Share Results</Text>
   </Pressable>
   ```
5. Add styles: `shareButton` (outline style, similar to `homeButton`), `shareButtonText`.

### Step 6 — Check `details.tsx` for inline component extraction

- If any inline component > 40 lines found → extract to `src/components/`
- If file total > 200 lines after other changes → split accordingly

---

## Todo List

- [x] Read `mobile/app/details.tsx` — assess inline components
- [x] Create `mobile/src/components/quick-macro-card.tsx`
- [x] Update `results.tsx` to import and use `QuickMacroCard`
- [x] Remove local `QuickMacro` function + duplicate styles from `results.tsx`
- [x] Add `buildShareText()` to `mobile/src/utils/helpers.ts`
- [x] Add `multiplier` state + scaled values to `results.tsx`
- [x] Add portion preset buttons UI in result card
- [x] Add share button + handler to `results.tsx`
- [x] Extract inline components from `details.tsx` if needed
- [x] Verify `results.tsx` < 200 lines after changes
- [x] Run `npm run typecheck` — no TS errors
- [x] Run `npm test` — all tests pass

---

## Success Criteria

- Tapping share opens native share sheet with formatted nutrition summary
- Portion buttons (0.5× / 1× / 1.5× / 2×) scale all displayed values correctly
- Changing multiplier updates share text accordingly
- `results.tsx` < 200 lines
- `QuickMacroCard` in `src/components/` renders identically to removed local function
- `buildShareText()` covered by a unit test in `mobile/__tests__/`
- All existing 28 tests pass

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `results.tsx` still > 200 lines after extraction | Medium | Also extract the `items` section into a `DetectedItemsList` component |
| Share sheet not available on Android emulator | Low | Test on physical device; `Share.share()` resolves with `dismissedAction` gracefully |
| Multiplier animation re-trigger causes flicker | Low | Skip `withTiming` when multiplier changes — direct assignment to shared value |
| `details.tsx` requires significant refactor | Low | Read first (Step 1) before committing to extraction scope |

---

## Security Considerations

- Share text contains only nutrition data — no location, no user ID, no API keys
- `Share.share()` is a native OS call — no data leaves the device except via user-chosen share target

---

## Next Steps

- After all three phases: run full `npm test` + `npm run typecheck`
- Update `docs/codebase-summary.md` — add new components to component inventory table
- Tag all completed items in the plan as done
