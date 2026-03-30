/**
 * Results Screen — Shows the analysis result after food capture.
 *
 * Displays food name, calories, and a quick summary with an option
 * to view full nutritional details.
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { storageService, MealEntry } from "../src/services/storage";
import { useThemeColors, Colors, Elevation, FontSize, Radius, Spacing, AnimationDuration } from "../src/utils/theme";
import { buildShareText, extractCalories, extractDishName, extractMacros, formatTime } from "../src/utils/helpers";
import { QuickMacroCard } from "../src/components/quick-macro-card";

export default function ResultsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const [meal, setMeal] = useState<MealEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiplier, setMultiplier] = useState<0.5 | 1 | 1.5 | 2>(1);

  // Animation hooks MUST be above all early returns (Rules of Hooks)
  const [displayCalories, setDisplayCalories] = useState(0);
  const animatedCalories = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!mealId) {
        setLoading(false);
        return;
      }
      const found = await storageService.getMealById(mealId);
      if (!cancelled) {
        setMeal(found);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mealId]);

  // Animate calorie counter whenever the meal data changes
  const calories = meal ? extractCalories(meal.nutrition) : 0;
  const scaledCalories = Math.round(calories * multiplier);

  // Animate on initial meal load; update directly (no re-animation) on multiplier change
  useEffect(() => {
    if (!meal) return;
    animatedCalories.value = 0;
    animatedCalories.value = withTiming(scaledCalories, {
      duration: AnimationDuration.counter,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal, calories]);

  // Sync multiplier changes directly without re-animating (avoids jarring re-trigger)
  useEffect(() => {
    if (!meal) return;
    animatedCalories.value = scaledCalories;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal, multiplier]);

  useAnimatedReaction(
    () => Math.round(animatedCalories.value),
    (current) => { runOnJS(setDisplayCalories)(current); }
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!meal) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Result not found.</Text>
        <Pressable style={styles.linkButton} onPress={() => router.replace("/")}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const n = meal.nutrition;
  const dishName = extractDishName(n);
  const macros = extractMacros(n);
  const scaledMacros = {
    protein: macros.protein !== undefined ? macros.protein * multiplier : undefined,
    carbs:   macros.carbs   !== undefined ? macros.carbs   * multiplier : undefined,
    fat:     macros.fat     !== undefined ? macros.fat     * multiplier : undefined,
  };
  const items = (n.items as Array<Record<string, unknown>>) || [];
  const foodType = n.food_type as string | undefined;
  const cookingMethod = n.cooking_method as string | undefined;

  // Check if VL model returned an error
  const hasError = !!n.error;

  const handleShare = async () => {
    const text = buildShareText(dishName, calories, macros, multiplier, meal.timestamp);
    await Share.share({ message: text });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Image — taller hero, lg radius */}
      {meal.imageUri && (
        <Image source={{ uri: meal.imageUri }} style={styles.image} />
      )}

      {/* Success / Warning Banner — pill badge style */}
      {hasError ? (
        <View style={[styles.warningBanner, { backgroundColor: colors.warningBg }]}>
          <Ionicons name="warning" size={24} color={Colors.warning} />
          <Text style={styles.warningText}>Partial Results</Text>
          <Text style={[styles.warningSubtext, { color: colors.textSecondary }]}>
            Model returned incomplete data: {n.error}
          </Text>
        </View>
      ) : (
        <View style={styles.successBannerRow}>
          <View style={[styles.successBadge, { backgroundColor: colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.successText}>Analysis Complete!</Text>
          </View>
          <Text style={[styles.timeText, { color: colors.textTertiary }]}>
            {formatTime(meal.timestamp)} · {meal.processingTimeMs}ms
          </Text>
        </View>
      )}

      {/* Main Result Card — L2, lg radius, more vertical padding */}
      <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.foodName, { color: colors.text }]}>
          {dishName || (items[0]?.name as string) || "Food Detected"}
        </Text>

        {/* Dish metadata badges — pill shape */}
        {(foodType || cookingMethod) && (
          <View style={styles.metaRow}>
            {foodType && (
              <View style={[styles.metaBadge, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="restaurant" size={12} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{foodType}</Text>
              </View>
            )}
            {cookingMethod && (
              <View style={[styles.metaBadge, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="flame" size={12} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{cookingMethod}</Text>
              </View>
            )}
          </View>
        )}

        {/* Calorie hero number */}
        <View style={styles.calorieBlock}>
          <Text style={styles.calorieNumber}>{displayCalories}</Text>
          <Text style={styles.calorieLabel}>kcal</Text>
        </View>

        {/* Portion multiplier preset buttons */}
        <View style={styles.portionRow}>
          <Text style={[styles.portionLabel, { color: colors.textSecondary }]}>Portion:</Text>
          {([0.5, 1, 1.5, 2] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.portionBtn, { borderColor: colors.border }, multiplier === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setMultiplier(m)}
            >
              <Text style={[styles.portionBtnText, { color: multiplier === m ? colors.textOnPrimary : colors.textSecondary }]}>
                {m}×
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Quick Macros — scaled by portion multiplier */}
        <View style={styles.macroRow}>
          {scaledMacros.protein !== undefined && (
            <QuickMacroCard label="Protein" value={scaledMacros.protein} color={Colors.proteinColor} surfaceColor={colors.surfaceSecondary} textColor={colors.text} secondaryColor={colors.textSecondary} />
          )}
          {scaledMacros.carbs !== undefined && (
            <QuickMacroCard label="Carbs" value={scaledMacros.carbs} color={Colors.carbsColor} surfaceColor={colors.surfaceSecondary} textColor={colors.text} secondaryColor={colors.textSecondary} />
          )}
          {scaledMacros.fat !== undefined && (
            <QuickMacroCard label="Fat" value={scaledMacros.fat} color={Colors.fatColor} surfaceColor={colors.surfaceSecondary} textColor={colors.text} secondaryColor={colors.textSecondary} />
          )}
        </View>
      </View>

      {/* Food Items (if multiple) */}
      {items.length > 1 && (
        <View style={[styles.itemsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Detected Items</Text>
          {items.map((item, i) => (
            <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.itemName, { color: colors.text }]}>
                {(item.name as string) || `Item ${i + 1}`}
              </Text>
              <Text style={styles.itemCal}>
                {item.calories != null ? `${item.calories} kcal` : "—"}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <Pressable
        style={({ pressed }) => [styles.detailsButton, { backgroundColor: colors.primary }, pressed && styles.buttonPressed]}
        onPress={() => router.push({ pathname: "/details", params: { mealId: meal.id } })}
        accessibilityRole="button"
        accessibilityLabel="View full nutritional details"
      >
        <Ionicons name="list" size={20} color={colors.textOnPrimary} />
        <Text style={[styles.detailsButtonText, { color: colors.textOnPrimary }]}>View Full Details</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.shareButton, { borderColor: colors.primary }, pressed && styles.buttonPressed]}
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Share nutrition results"
      >
        <Ionicons name="share-outline" size={20} color={colors.primary} />
        <Text style={[styles.shareButtonText, { color: colors.primary }]}>Share Results</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.homeButton, { backgroundColor: colors.surface, borderColor: colors.primary }, pressed && styles.buttonPressed]}
        onPress={() => router.replace("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel="Return to home screen"
      >
        <Ionicons name="home" size={20} color={colors.primary} />
        <Text style={[styles.homeButtonText, { color: colors.primary }]}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  emptyText: { fontSize: FontSize.md },
  linkButton: { marginTop: Spacing.sm },
  linkText: { fontSize: FontSize.md, fontWeight: "600" },

  image: { width: "100%", height: 240, borderRadius: Radius.lg, marginBottom: Spacing.md },

  successBannerRow: { alignItems: "center", marginBottom: Spacing.lg, gap: Spacing.xs },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  successText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.success },
  timeText: { fontSize: FontSize.xs },

  warningBanner: {
    alignItems: "center",
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warningText: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.warning, marginTop: Spacing.xs },
  warningSubtext: { fontSize: FontSize.sm, textAlign: "center", marginTop: 4 },

  resultCard: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
    ...Elevation.l2,
  },
  foodName: { fontSize: FontSize.xxl, fontWeight: "800", textAlign: "center" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, justifyContent: "center", marginTop: Spacing.sm },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  metaText: { fontSize: FontSize.xs },

  calorieBlock: { flexDirection: "row", alignItems: "baseline", marginTop: Spacing.md, marginBottom: Spacing.lg },
  calorieNumber: { fontSize: 56, fontWeight: "800", color: Colors.caloriesColor },
  calorieLabel: { fontSize: 22, color: Colors.caloriesColor, marginLeft: Spacing.xs, fontWeight: "600" },

  macroRow: { flexDirection: "row", width: "100%", justifyContent: "space-around" },

  // Portion multiplier preset buttons
  portionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginVertical: Spacing.md },
  portionLabel: { fontSize: FontSize.sm, fontWeight: "600" },
  portionBtn: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  portionBtnText: { fontSize: FontSize.sm, fontWeight: "700" },

  itemsCard: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: "700", marginBottom: Spacing.md },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  itemName: { fontSize: FontSize.md },
  itemCal: { fontSize: FontSize.md, fontWeight: "600", color: Colors.caloriesColor },

  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 56,
    ...Elevation.l3,
  },
  detailsButtonText: { fontSize: FontSize.lg, fontWeight: "700" },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
    minHeight: 56,
  },
  shareButtonText: { fontSize: FontSize.lg, fontWeight: "700" },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1.5,
    minHeight: 56,
  },
  homeButtonText: { fontSize: FontSize.lg, fontWeight: "700" },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
