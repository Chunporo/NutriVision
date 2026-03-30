# Phase 02 — UX Polish

## Context Links
- Parent plan: [plan.md](./plan.md)
- Phase 01: [phase-01-robustness-fixes.md](./phase-01-robustness-fixes.md)
- History screen: `mobile/app/(tabs)/history.tsx`
- Home screen: `mobile/app/(tabs)/index.tsx`
- Storage service: `mobile/src/services/storage.ts`
- Skeleton component: `mobile/src/components/skeleton-loader.tsx`

---

## Overview

| Field | Value |
|---|---|
| Priority | P2 — HIGH |
| Status | Complete |
| Effort | ~5h |
| Description | Search/filter on history, pull-to-refresh on history, improved empty states, and loading skeleton on home stats. |

---

## Key Insights

- **History screen** (`history.tsx`, 309 lines) has no search/filter — users with 50+ meals can't find specific ones. The grouped `FlatList` can be adapted to filter in memory (no backend call needed).
- **Pull-to-refresh** is already implemented on Home (`index.tsx:98–102`) using `RefreshControl` — the same pattern is simply missing from History.
- **Home loading state**: `loadData()` (index.tsx:82–89) uses `Promise.all` but there's no `loading` state — the calorie gauge and macro cards show `0` while data loads, which looks like the user has eaten nothing. A skeleton or loading flag fixes this.
- **History empty state** already exists (history.tsx:87–109) and is already polished (icon circle + CTA button). No changes needed there.
- **Home empty/zero state**: when `summary.mealCount === 0`, the gauge shows `0/2000 kcal` — not wrong, but a subtle hint ("Log your first meal today!") below the gauge would improve first-time UX.

---

## Requirements

### Functional
1. History screen has a search bar that filters meal cards by food name in real time.
2. History screen supports pull-to-refresh (same pattern as Home).
3. Home screen shows a skeleton/loading state while `loadData()` is pending on focus.
4. Home screen shows a motivational hint when `mealCount === 0`.

### Non-functional
- Search is client-side only (no storage query changes).
- Skeleton matches the shape of the calorie card + macro row.
- No new npm packages (use existing `SkeletonLoader` component).
- History search bar dismisses keyboard on scroll.

---

## Architecture

### History Search/Filter

State flow:
```
[searchQuery: string] ──► filter(meals, query) ──► filteredMeals
                                                        └─► group by date ──► FlatList
```

- Add `searchQuery` state, `TextInput` search bar above the `FlatList`.
- Filter in the render path (not in `loadMeals`) — keeps logic simple.
- Case-insensitive match on `meal.nutrition.food_name`, `meal.nutrition.dish_name`, and first `items[0].name`.
- When search is active and no results → show "No meals match your search" inline (not the full empty state).

### History Pull-to-Refresh

Identical to Home pattern:
```tsx
const [refreshing, setRefreshing] = useState(false);
const onRefresh = async () => { setRefreshing(true); await loadMeals(); setRefreshing(false); };
<FlatList refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} .../>
```

### Home Loading Skeleton

Add `loading` state to `HomeScreen`. While `true`, render skeleton placeholders instead of calorie card + macro row:

```
[SkeletonLoader width="100%" height=160 radius=16]  ← calorie card placeholder
[row of 3 × SkeletonLoader width=33% height=80]     ← macro cards placeholder
```

After `loadData()` resolves, set `loading = false` and animate content in (existing `animateMacros()` already handles this).

### Home Zero-State Hint

Below the stats pill row, when `summary.mealCount === 0`:
```tsx
<Text style={styles.zeroHint}>📷 Log your first meal to start tracking!</Text>
```
Small, secondary-colored text. No visual complexity.

---

## Related Code Files

| File | Action | Change |
|---|---|---|
| `mobile/app/(tabs)/history.tsx` | Modify | Add search bar + filter logic + pull-to-refresh |
| `mobile/app/(tabs)/index.tsx` | Modify | Add `loading` state + skeleton render + zero-state hint |
| `mobile/src/components/skeleton-loader.tsx` | Read | Understand API before using in Home |

---

## Implementation Steps

### Step 1 — History search bar (`history.tsx`)

1. Add imports: `TextInput`, `KeyboardAvoidingView` (already have most).
2. Add state: `const [searchQuery, setSearchQuery] = useState("");`
3. Add filter logic before the group-by-date loop:
   ```ts
   const filtered = searchQuery.trim()
     ? meals.filter((m) => {
         const name = (
           (m.nutrition.dish_name as string) ||
           (m.nutrition.food_name as string) ||
           (m.nutrition.items as any)?.[0]?.name ||
           ""
         ).toLowerCase();
         return name.includes(searchQuery.trim().toLowerCase());
       })
     : meals;
   ```
4. Run the existing group-by-date loop over `filtered` instead of `meals`.
5. Add search bar UI above `FlatList` (inside the outer `View`):
   ```tsx
   <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
     <Ionicons name="search" size={16} color={colors.textTertiary} />
     <TextInput
       style={[styles.searchInput, { color: colors.text }]}
       placeholder="Search meals..."
       placeholderTextColor={colors.textTertiary}
       value={searchQuery}
       onChangeText={setSearchQuery}
       returnKeyType="search"
       clearButtonMode="while-editing"
     />
     {searchQuery.length > 0 && (
       <Pressable onPress={() => setSearchQuery("")}>
         <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
       </Pressable>
     )}
   </View>
   ```
6. Add "no results" inline state when `filtered.length === 0 && searchQuery.length > 0`:
   ```tsx
   <View style={styles.noResults}>
     <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
       No meals match "{searchQuery}"
     </Text>
   </View>
   ```
7. Add styles: `searchBar`, `searchInput`, `noResults`, `noResultsText`.
8. Add `keyboardDismissMode="on-drag"` to `FlatList`.

### Step 2 — History pull-to-refresh (`history.tsx`)

1. Add state: `const [refreshing, setRefreshing] = useState(false);`
2. Add handler:
   ```ts
   const onRefresh = async () => {
     setRefreshing(true);
     await loadMeals();
     setRefreshing(false);
   };
   ```
3. Add `refreshControl` prop to `FlatList`:
   ```tsx
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
   ```
4. Add `RefreshControl` to imports from `react-native`.

### Step 3 — Home loading skeleton (`index.tsx`)

1. Add state: `const [loading, setLoading] = useState(true);`
2. Wrap `loadData()` call:
   ```ts
   const loadData = useCallback(async () => {
     setLoading(true);
     const [s, g] = await Promise.all([...]);
     setSummary(s);
     setDailyGoal(g);
     setLoading(false);
   }, []);
   ```
3. In JSX, replace calorie card + macro row with skeletons when `loading`:
   ```tsx
   {loading ? (
     <>
       <SkeletonLoader width="100%" height={160} borderRadius={16} style={{ marginBottom: Spacing.lg }} />
       <View style={styles.macroRow}>
         <SkeletonLoader width="30%" height={88} borderRadius={12} />
         <SkeletonLoader width="30%" height={88} borderRadius={12} />
         <SkeletonLoader width="30%" height={88} borderRadius={12} />
       </View>
     </>
   ) : (
     // existing calorie card + macro row JSX
   )}
   ```
4. Import `SkeletonLoader` from `../../src/components/skeleton-loader`.
5. Keep `refreshing` path (`onRefresh`) — it does NOT set `loading = true`, only `refreshing = true`, so the pull-to-refresh spinner shows instead.

### Step 4 — Home zero-state hint (`index.tsx`)

1. After the stats pill row, add conditional hint:
   ```tsx
   {!loading && (summary?.mealCount ?? 0) === 0 && (
     <Text style={[styles.zeroHint, { color: colors.textSecondary }]}>
       📷 Log your first meal to start tracking!
     </Text>
   )}
   ```
2. Add style:
   ```ts
   zeroHint: { fontSize: FontSize.sm, textAlign: "center", marginBottom: Spacing.md }
   ```

---

## Todo List

- [x] Add `searchQuery` state + filter logic to `history.tsx`
- [x] Add search bar `TextInput` UI above `FlatList` in history
- [x] Add "no results" inline state in history
- [x] Add `keyboardDismissMode="on-drag"` to history `FlatList`
- [x] Add `refreshing` state + `RefreshControl` to history `FlatList`
- [x] Add `loading` state + skeleton render to `index.tsx`
- [x] Add `SkeletonLoader` import to `index.tsx`
- [x] Add zero-state hint to `index.tsx`
- [x] Verify `history.tsx` stays under 200 lines — extract if needed
- [x] Run `npm run typecheck` — no TS errors
- [x] Run `npm test` — all 28 tests pass

---

## Success Criteria

- Typing in history search filters meal cards in real time
- Clearing search restores full list
- Pull-to-refresh on history reloads data with spinner
- Home screen shows skeleton placeholders while data loads (not `0` values)
- When no meals today, home shows hint text below stats pill
- No visual regressions on existing screens

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `history.tsx` exceeds 200 lines after search bar addition | Medium | Extract `SearchBar` inline component or move to `src/components/` |
| Skeleton dimensions mismatch actual card sizes | Low | Match `height`/`borderRadius` to the card styles in existing code |
| `loading` flicker on re-focus | Low | `useFocusEffect` sets loading only when cache is cold; warm cache returns instantly |

---

## Security Considerations

- Search is pure client-side filtering — no network calls
- No PII exposure from search feature

---

## Next Steps

- Phase 03 (Feature Enhancements) depends on Phase 01 storage fixes being in place
- After this phase: update `docs/codebase-summary.md` to reflect new components/patterns
