/**
 * History Screen — List of past meal analyses grouped by date.
 */

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect, useRouter } from "expo-router";

import { storageService, MealEntry } from "../../src/services/storage";
import { useThemeColors, Colors, Elevation, FontSize, Radius, Spacing } from "../../src/utils/theme";
import {
  extractCalories,
  formatDate,
  formatTime,
} from "../../src/utils/helpers";

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadMeals = useCallback(async () => {
    const all = await storageService.getAllMeals();
    setMeals(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Invalidate cache so getAllMeals re-reads from AsyncStorage
    storageService.invalidateCache();
    await loadMeals();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Meal", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await storageService.deleteMeal(id);
          loadMeals();
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear History",
      "This will delete all saved meals. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await storageService.clearHistory();
            setMeals([]);
          },
        },
      ]
    );
  };

  // Filter by search query — memoized to avoid re-filtering on every render
  const query = searchQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return meals;
    return meals.filter((m) => {
      const name = (
        (m.nutrition.dish_name as string) ||
        (m.nutrition.food_name as string) ||
        (m.nutrition.items as any)?.[0]?.name ||
        ""
      ).toLowerCase();
      return name.includes(query);
    });
  }, [meals, query]);

  // Group by date
  const grouped: { date: string; data: MealEntry[] }[] = [];
  let currentDate = "";
  for (const meal of filtered) {
    const date = meal.timestamp.split("T")[0];
    if (date !== currentDate) {
      currentDate = date;
      grouped.push({ date, data: [] });
    }
    grouped[grouped.length - 1].data.push(meal);
  }

  if (meals.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        {/* Icon circle placeholder — replaces plain emoji */}
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryBg }]}>
          <Ionicons name="restaurant-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No meals logged yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Log your first meal and let AI analyze your nutrition
        </Text>
        <Pressable
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/camera")}
          accessibilityRole="button"
          accessibilityLabel="Log your first meal"
        >
          <Ionicons name="camera" size={20} color={colors.textOnPrimary} />
          <Text style={[styles.emptyCtaText, { color: colors.textOnPrimary }]}>Log Your First Meal</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
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

      {/* No search results */}
      {query.length > 0 && filtered.length === 0 && (
        <View style={styles.noResults}>
          <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
            No meals match "{searchQuery}"
          </Text>
        </View>
      )}

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: group }) => (
          <View style={styles.dateGroup}>
            {/* Date header — section pill */}
            <View style={[styles.dateHeaderPill, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.dateHeaderText, { color: colors.primaryDark }]}>{formatDate(group.date)}</Text>
            </View>
            {group.data.map((meal) => (
              <Swipeable
                key={meal.id}
                renderRightActions={() => (
                  <Pressable
                    style={styles.swipeDeleteAction}
                    onPress={() => handleDelete(meal.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete meal"
                  >
                    <Ionicons name="trash" size={22} color={colors.textOnPrimary} />
                    <Text style={styles.swipeDeleteText}>Delete</Text>
                  </Pressable>
                )}
                overshootRight={false}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.mealCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && styles.mealCardPressed,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/details",
                      params: { mealId: meal.id },
                    })
                  }
                  onLongPress={() => handleDelete(meal.id)}
                >
                {meal.imageUri ? (
                  <Image
                    source={{ uri: meal.imageUri }}
                    style={styles.mealImage}
                  />
                ) : (
                  <View style={[styles.mealImage, styles.placeholderImage, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={colors.textTertiary}
                    />
                  </View>
                )}
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
                    {meal.nutrition.food_name ||
                      (meal.nutrition.items as any)?.[0]?.name ||
                      "Food Analysis"}
                  </Text>
                  <Text style={[styles.mealTime, { color: colors.textTertiary }]}>
                    {formatTime(meal.timestamp)}
                  </Text>
                </View>
                {/* Calorie badge — pill style */}
                <View style={[styles.calorieBadge, { backgroundColor: colors.errorBg }]}>
                  <Text style={[styles.calorieBadgeText, { color: Colors.caloriesColor }]}>
                    {Math.round(extractCalories(meal.nutrition))} kcal
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
                </Pressable>
              </Swipeable>
            ))}
          </View>
        )}
      />

      {meals.length > 0 && (
        <Pressable style={styles.clearButton} onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
          <Text style={styles.clearText}>Clear History</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.lg, paddingBottom: 80 },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, paddingVertical: 0 },
  noResults: { alignItems: "center", padding: Spacing.xl },
  noResultsText: { fontSize: FontSize.md },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxxl,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: "700", marginTop: Spacing.lg },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    minHeight: 56,
    ...Elevation.l3,
  },
  emptyCtaText: { fontSize: FontSize.lg, fontWeight: "700" },

  // Date group
  dateGroup: { marginBottom: Spacing.lg },
  dateHeaderPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  dateHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Meal card
  mealCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    ...Elevation.l2,
  },
  mealCardPressed: { opacity: 0.7 },
  mealImage: { width: 56, height: 56, borderRadius: 10 },
  placeholderImage: { alignItems: "center", justifyContent: "center" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: FontSize.md, fontWeight: "600" },
  mealTime: { fontSize: FontSize.xs, marginTop: 2 },

  // Calorie badge
  calorieBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  calorieBadgeText: { fontSize: FontSize.sm, fontWeight: "700" },

  // Swipe delete
  swipeDeleteAction: {
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 14,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  swipeDeleteText: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.textOnPrimary },

  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    gap: Spacing.xs,
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
  },
  clearText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: "600" },
});
