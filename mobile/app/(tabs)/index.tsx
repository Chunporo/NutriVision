/**
 * Home Screen — Daily summary + quick capture FAB.
 *
 * Shows today's calorie intake via a circular gauge (ONT-inspired), macro
 * breakdown with ring-accent cards, and a FAB-style camera button.
 * Phase 2+: Animated circular gauge, staggered macro card entrance.
 */

import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { storageService, DailySummary } from "../../src/services/storage";
import {
  useThemeColors,
  Colors,
  Elevation,
  FontSize,
  Radius,
  Spacing,
  AnimationDuration,
} from "../../src/utils/theme";
import { getTodayDate, getGreeting } from "../../src/utils/helpers";
import { CircularCalorieGauge } from "../../src/components/circular-calorie-gauge";

// Macro card definitions (order determines stagger index)
const MACRO_CARDS = [
  { label: "Protein", colorKey: "proteinColor" as const, icon: "fish" as const },
  { label: "Carbs",   colorKey: "carbsColor"   as const, icon: "nutrition" as const },
  { label: "Fat",     colorKey: "fatColor"      as const, icon: "water" as const },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const greeting = getGreeting();

  // Shared animation values for staggered macro card entrance
  const macro0Opacity    = useSharedValue(0);
  const macro0TranslateY = useSharedValue(20);
  const macro1Opacity    = useSharedValue(0);
  const macro1TranslateY = useSharedValue(20);
  const macro2Opacity    = useSharedValue(0);
  const macro2TranslateY = useSharedValue(20);

  const macroAnimValues = [
    { opacity: macro0Opacity, translateY: macro0TranslateY },
    { opacity: macro1Opacity, translateY: macro1TranslateY },
    { opacity: macro2Opacity, translateY: macro2TranslateY },
  ];

  /** Trigger staggered macro card fade+slide-in animation */
  const animateMacros = () => {
    macroAnimValues.forEach(({ opacity, translateY }, i) => {
      opacity.value    = 0;
      translateY.value = 20;
      const delay = i * AnimationDuration.staggerDelay;
      opacity.value    = withDelay(delay, withTiming(1,  { duration: 400, easing: Easing.out(Easing.cubic) }));
      translateY.value = withDelay(delay, withTiming(0,  { duration: 400, easing: Easing.out(Easing.cubic) }));
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [s, g] = await Promise.all([
      storageService.getDailySummary(getTodayDate()),
      storageService.getDailyGoal(),
    ]);
    setSummary(s);
    setDailyGoal(g);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      animateMacros();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Invalidate cache to force re-read from AsyncStorage on pull-to-refresh
    storageService.invalidateCache();
    const [s, g] = await Promise.all([
      storageService.getDailySummary(getTodayDate()),
      storageService.getDailyGoal(),
    ]);
    setSummary(s);
    setDailyGoal(g);
    setRefreshing(false);
  };

  const caloriesLeft = dailyGoal - (summary?.totalCalories || 0);
  const progress = (summary?.totalCalories || 0) / dailyGoal;

  const macroValues = [
    summary?.totalProtein || 0,
    summary?.totalCarbs   || 0,
    summary?.totalFat     || 0,
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>{greeting.emoji} {greeting.text}</Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {new Date().toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{greeting.subtitle}</Text>
      </View>

      {/* Daily Calorie Card — skeleton while loading, then gauge hero widget */}
      {loading ? (
        <>
          {/* Calorie card placeholder — matches card height */}
          <View style={[styles.calorieCard, styles.skeletonBlock, { backgroundColor: colors.surfaceSecondary }]} />
          {/* Macro row placeholder — three equal-width blocks */}
          <View style={[styles.macroRow, { marginBottom: Spacing.lg }]}>
            <View style={[styles.macroCardWrapper, styles.skeletonMacro, { backgroundColor: colors.surfaceSecondary }]} />
            <View style={[styles.macroCardWrapper, styles.skeletonMacro, { backgroundColor: colors.surfaceSecondary }]} />
            <View style={[styles.macroCardWrapper, styles.skeletonMacro, { backgroundColor: colors.surfaceSecondary }]} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.calorieCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
            <Text style={[styles.calorieTitle, { color: colors.textSecondary }]}>Today's Calories</Text>

            {/* Gauge row: stat | ring | stat */}
            <View style={styles.gaugeRow}>
              {/* Left stat — consumed */}
              <View style={styles.gaugeStat}>
                <Text style={[styles.gaugeStatValue, { color: colors.text }]}>{summary?.totalCalories || 0}</Text>
                <Text style={[styles.gaugeStatLabel, { color: colors.textSecondary }]}>Consumed</Text>
              </View>

              {/* Circular SVG-free arc gauge */}
              <CircularCalorieGauge
                progress={progress}
                size={140}
                centerLabel={`${dailyGoal}\nkcal`}
              />

              {/* Right stat — remaining / over */}
              <View style={styles.gaugeStat}>
                <Text style={[
                  styles.gaugeStatValue,
                  { color: colors.text },
                  caloriesLeft < 0 && { color: Colors.error },
                ]}>
                  {Math.abs(Math.round(caloriesLeft))}
                </Text>
                <Text style={[styles.gaugeStatLabel, { color: colors.textSecondary }]}>
                  {caloriesLeft >= 0 ? "Remaining" : "Over goal"}
                </Text>
              </View>
            </View>
          </View>

          {/* Macro Cards — staggered fade+slide entrance */}
          <View style={styles.macroRow}>
            {MACRO_CARDS.map((card, i) => (
              <AnimatedMacroCard
                key={card.label}
                label={card.label}
                value={macroValues[i]}
                color={Colors[card.colorKey]}
                icon={card.icon}
                opacityValue={macroAnimValues[i].opacity}
                translateYValue={macroAnimValues[i].translateY}
              />
            ))}
          </View>
        </>
      )}

      {/* Quick Stats — pill/chip row */}
      <View style={styles.statsRow}>
        <View style={[styles.statsPill, { backgroundColor: colors.primaryBg }]}>
          <Ionicons name="restaurant" size={16} color={colors.primary} />
          <Text style={[styles.statsText, { color: colors.primary }]}>
            {summary?.mealCount || 0} meal
            {(summary?.mealCount || 0) !== 1 ? "s" : ""} logged today
          </Text>
        </View>
      </View>

      {/* Zero-state hint — shown when no meals logged today */}
      {!loading && (summary?.mealCount ?? 0) === 0 && (
        <Text style={[styles.zeroHint, { color: colors.textSecondary }]}>
          📷 Log your first meal to start tracking!
        </Text>
      )}

      {/* FAB-style Capture — label + circular button row */}
      <View style={styles.fabContainer}>
        <Text style={[styles.fabLabel, { color: colors.textSecondary }]}>Analyze Food</Text>
        <Pressable
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary }, pressed && styles.fabPressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/camera");
          }}
          accessibilityRole="button"
          accessibilityLabel="Analyze food — take a photo or pick from gallery"
        >
          <Ionicons name="camera" size={28} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      {/* Settings link */}
      <Pressable
        style={styles.settingsLink}
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Ionicons name="settings-outline" size={18} color={colors.textTertiary} />
        <Text style={[styles.settingsText, { color: colors.textTertiary }]}>Settings</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// MacroCard — ring-accent icon instead of border-top stripe
// ---------------------------------------------------------------------------

function MacroCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.macroCard, { backgroundColor: colors.surface }]}>
      {/* Small ring circle wrapping the icon — ONT-inspired */}
      <View style={[styles.macroIconRing, { borderColor: color }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.macroValue, { color: colors.text }]}>{value}g</Text>
      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/**
 * AnimatedMacroCard — Wraps MacroCard in an Animated.View driven by shared values.
 * Extracted from HomeScreen to avoid calling useAnimatedStyle inside a .map() loop,
 * which would violate the Rules of Hooks.
 */
function AnimatedMacroCard({
  label,
  value,
  color,
  icon,
  opacityValue,
  translateYValue,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  opacityValue: ReturnType<typeof useSharedValue<number>>;
  translateYValue: ReturnType<typeof useSharedValue<number>>;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacityValue.value,
    transform: [{ translateY: translateYValue.value }],
  }));
  return (
    <Animated.View style={[styles.macroCardWrapper, animStyle]}>
      <MacroCard label={label} value={value} color={color} icon={icon} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },

  // Header
  header: { marginBottom: Spacing.section },
  greeting: { fontSize: FontSize.hero, fontWeight: "800" },
  date: { fontSize: 14, marginTop: Spacing.xs },
  subtitle: { fontSize: FontSize.sm, marginTop: Spacing.xs },

  // Calorie card
  calorieCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    ...Elevation.l2,
  },
  calorieTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },

  // Gauge row
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gaugeStat: { alignItems: "center", flex: 1 },
  gaugeStatValue: { fontSize: FontSize.xl, fontWeight: "800" },
  gaugeStatLabel: { fontSize: FontSize.xs, marginTop: 4, textAlign: "center" },

  // Macro row
  macroRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },
  macroCardWrapper: { flex: 1 },

  // Skeleton placeholders
  skeletonBlock: { height: 168, marginBottom: Spacing.lg },
  skeletonMacro: { height: 88, borderRadius: Radius.md },
  macroCard: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    ...Elevation.l1,
  },
  macroIconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  macroValue: { fontSize: FontSize.xl, fontWeight: "700", marginTop: 4 },
  macroLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Stats
  statsRow: { flexDirection: "row", marginBottom: Spacing.xxl },
  statsPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignSelf: "flex-start",
    gap: Spacing.sm,
  },
  statsText: { fontSize: FontSize.md, fontWeight: "600" },
  zeroHint: { fontSize: FontSize.sm, textAlign: "center", marginBottom: Spacing.md },

  // FAB row
  fabContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  fabLabel: { fontSize: FontSize.md, fontWeight: "700" },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    ...Elevation.l4,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },

  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  settingsText: { fontSize: FontSize.sm },
});
