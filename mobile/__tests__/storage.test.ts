/**
 * Unit tests for StorageService.
 * AsyncStorage is mocked globally in setup.ts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageService } from "../src/services/storage";
import type { MealEntry } from "../src/services/storage";

// Helper to create a minimal MealEntry
function makeMeal(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "meal-1",
    timestamp: "2024-03-15T12:00:00.000Z",
    imageUri: "file:///photo.jpg",
    nutrition: { calories: 350, food_name: "Test Food" },
    processingTimeMs: 1500,
    ...overrides,
  };
}

// Reset mocks and internal cache between tests
beforeEach(() => {
  jest.clearAllMocks();
  // Force cache invalidation by accessing private property
  (storageService as any).cache = null;
});

// ---------------------------------------------------------------------------
// getAllMeals
// ---------------------------------------------------------------------------
describe("getAllMeals", () => {
  it("returns empty array when storage is empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const result = await storageService.getAllMeals();
    expect(result).toEqual([]);
  });

  it("returns parsed meals from storage", async () => {
    const meals = [makeMeal({ id: "a" }), makeMeal({ id: "b" })];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(meals));
    const result = await storageService.getAllMeals();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("a");
  });

  it("returns empty array on JSON parse failure", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("invalid json{{{");
    const result = await storageService.getAllMeals();
    expect(result).toEqual([]);
  });

  it("uses in-memory cache on second call", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([makeMeal()]));
    await storageService.getAllMeals();
    await storageService.getAllMeals();
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// saveMeal
// ---------------------------------------------------------------------------
describe("saveMeal", () => {
  it("adds meal to front of list", async () => {
    const existing = [makeMeal({ id: "old" })];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));
    await storageService.saveMeal(makeMeal({ id: "new" }));
    const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(saved[0].id).toBe("new");
    expect(saved[1].id).toBe("old");
  });

  it("respects MAX_MEALS cap (200)", async () => {
    const existing = Array.from({ length: 200 }, (_, i) => makeMeal({ id: `m${i}` }));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));
    await storageService.saveMeal(makeMeal({ id: "overflow" }));
    const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(saved).toHaveLength(200);
    expect(saved[0].id).toBe("overflow");
  });
});

// ---------------------------------------------------------------------------
// getMealsByDate
// ---------------------------------------------------------------------------
describe("getMealsByDate", () => {
  it("filters meals by date prefix", async () => {
    const meals = [
      makeMeal({ id: "a", timestamp: "2024-03-15T10:00:00Z" }),
      makeMeal({ id: "b", timestamp: "2024-03-16T10:00:00Z" }),
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(meals));
    const result = await storageService.getMealsByDate("2024-03-15");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("returns empty array when no meals match", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([]));
    const result = await storageService.getMealsByDate("2024-01-01");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMealById
// ---------------------------------------------------------------------------
describe("getMealById", () => {
  it("finds meal by id", async () => {
    const meals = [makeMeal({ id: "target" }), makeMeal({ id: "other" })];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(meals));
    const result = await storageService.getMealById("target");
    expect(result?.id).toBe("target");
  });

  it("returns null when meal not found", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([]));
    const result = await storageService.getMealById("missing");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDailySummary
// ---------------------------------------------------------------------------
describe("getDailySummary", () => {
  it("aggregates calories and macros for the day", async () => {
    const meals = [
      makeMeal({
        id: "m1",
        timestamp: "2024-03-15T08:00:00Z",
        nutrition: { calories: 300, protein: 20, carbohydrates: 40, fat: 10 },
      }),
      makeMeal({
        id: "m2",
        timestamp: "2024-03-15T12:00:00Z",
        nutrition: { calories: 200, protein: 10, carbohydrates: 25, fat: 5 },
      }),
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(meals));
    const summary = await storageService.getDailySummary("2024-03-15");
    expect(summary.totalCalories).toBe(500);
    expect(summary.totalProtein).toBe(30);
    expect(summary.mealCount).toBe(2);
    expect(summary.date).toBe("2024-03-15");
  });

  it("returns zeros for a day with no meals", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([]));
    const summary = await storageService.getDailySummary("2024-01-01");
    expect(summary.totalCalories).toBe(0);
    expect(summary.mealCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deleteMeal
// ---------------------------------------------------------------------------
describe("deleteMeal", () => {
  it("removes the correct meal", async () => {
    const meals = [makeMeal({ id: "keep" }), makeMeal({ id: "delete-me" })];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(meals));
    await storageService.deleteMeal("delete-me");
    const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("keep");
  });
});

// ---------------------------------------------------------------------------
// clearHistory
// ---------------------------------------------------------------------------
describe("clearHistory", () => {
  it("removes all meals from storage", async () => {
    await storageService.clearHistory();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@nutrivision_meals");
    // invalidateCache sets cache to null (forces re-read on next getAllMeals call)
    expect((storageService as any).cache).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDailyGoal / setDailyGoal
// ---------------------------------------------------------------------------
describe("getDailyGoal", () => {
  it("returns default 2000 when not set", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const goal = await storageService.getDailyGoal();
    expect(goal).toBe(2000);
  });

  it("returns persisted goal", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("2500");
    const goal = await storageService.getDailyGoal();
    expect(goal).toBe(2500);
  });

  it("returns default for invalid stored value", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("not-a-number");
    const goal = await storageService.getDailyGoal();
    expect(goal).toBe(2000);
  });
});

describe("setDailyGoal", () => {
  it("persists the goal as string", async () => {
    await storageService.setDailyGoal(1800);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@nutrivision_daily_goal", "1800");
  });
});
