/**
 * Local storage service for meal history.
 *
 * Persists analysis results in AsyncStorage so users can
 * track meals and daily calorie intake over time.
 *
 * Implements size-aware storage to avoid exceeding the ~6 MB
 * AsyncStorage limit: drops oldest meals once MAX_MEALS is reached.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { NutritionData } from "./api";
import { extractCalories, extractMacros } from "../utils/helpers";

const MEALS_KEY = "@nutrivision_meals";
const DAILY_GOAL_KEY = "@nutrivision_daily_goal";

const MAX_MEALS = 200; // cap to stay within storage limits

export interface MealEntry {
  id: string;
  timestamp: string;
  imageUri: string;
  nutrition: NutritionData;
  processingTimeMs: number;
  notes?: string;
}

export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  meals: MealEntry[];
}

class StorageService {
  private cache: MealEntry[] | null = null;
  private cacheTimestamp = 0;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /** Invalidate the in-memory cache (forces re-read on next getAllMeals call). */
  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get all meals with in-memory caching and TTL.
   */
  async getAllMeals(): Promise<MealEntry[]> {
    // Return cache if it's fresh
    if (this.cache !== null && Date.now() - this.cacheTimestamp < StorageService.CACHE_TTL_MS) {
      return this.cache;
    }

    const raw = await AsyncStorage.getItem(MEALS_KEY);
    if (!raw) {
      this.cache = [];
      this.cacheTimestamp = Date.now();
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as MealEntry[];
      this.cache = Array.isArray(parsed) ? parsed : [];
      this.cacheTimestamp = Date.now();
      return this.cache;
    } catch {
      this.cache = [];
      this.cacheTimestamp = Date.now();
      return [];
    }
  }

  /**
   * Persist the meal list and update cache only on successful write.
   * Throws if AsyncStorage write fails so callers can surface the error.
   */
  private async persist(meals: MealEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(meals));
      this.cache = meals;
      this.cacheTimestamp = Date.now();
    } catch (e: any) {
      // Cache not updated — remains consistent with previous persisted state
      throw new Error(`Failed to save meal history: ${e?.message ?? e}`);
    }
  }

  /**
   * Save a meal analysis to history.
   * Drops oldest entries when exceeding MAX_MEALS.
   */
  async saveMeal(meal: MealEntry): Promise<void> {
    // Copy to avoid mutating the cached array before write succeeds
    const meals = [...(await this.getAllMeals())];
    meals.unshift(meal); // newest first

    // Trim if over limit
    if (meals.length > MAX_MEALS) {
      meals.length = MAX_MEALS;
    }

    await this.persist(meals);
  }

  /**
   * Get meals for a specific date (YYYY-MM-DD).
   */
  async getMealsByDate(date: string): Promise<MealEntry[]> {
    const meals = await this.getAllMeals();
    return meals.filter((m) => m.timestamp.startsWith(date));
  }

  /**
   * Get a meal by its ID.
   */
  async getMealById(id: string): Promise<MealEntry | null> {
    const meals = await this.getAllMeals();
    return meals.find((m) => m.id === id) ?? null;
  }

  /**
   * Get a daily summary for a specific date.
   * Uses the same extractCalories/extractMacros helpers as the UI so
   * VL model output (nested nutritional_summary with _g suffixes) is
   * handled correctly — not just flat top-level fields.
   */
  async getDailySummary(date: string): Promise<DailySummary> {
    const meals = await this.getMealsByDate(date);

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const meal of meals) {
      const n = meal.nutrition;
      totalCalories += extractCalories(n);
      const macros = extractMacros(n);
      totalProtein += macros.protein ?? 0;
      totalCarbs   += macros.carbs   ?? 0;
      totalFat     += macros.fat     ?? 0;
    }

    return {
      date,
      totalCalories: Math.round(totalCalories),
      totalProtein:  Math.round(totalProtein),
      totalCarbs:    Math.round(totalCarbs),
      totalFat:      Math.round(totalFat),
      mealCount: meals.length,
      meals,
    };
  }

  /**
   * Delete a meal by ID.
   */
  async deleteMeal(mealId: string): Promise<void> {
    const meals = await this.getAllMeals();
    const filtered = meals.filter((m) => m.id !== mealId);
    await this.persist(filtered);
  }

  /**
   * Clear all meal history.
   */
  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(MEALS_KEY);
    this.invalidateCache();
  }

  /**
   * Get daily calorie goal.
   */
  async getDailyGoal(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(DAILY_GOAL_KEY);
      if (raw) {
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {
      // ignore
    }
    return 2000;
  }

  /**
   * Set daily calorie goal.
   */
  async setDailyGoal(goal: number): Promise<void> {
    await AsyncStorage.setItem(DAILY_GOAL_KEY, String(goal));
  }
}

export const storageService = new StorageService();
export default storageService;
