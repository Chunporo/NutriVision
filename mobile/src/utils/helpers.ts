/**
 * Utility helpers for formatting nutrition data for display.
 */

/**
 * Format a number as a calorie string.
 */
export function formatCalories(value: number | string | undefined): string {
  if (value === undefined || value === null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `${Math.round(num)} kcal`;
}

/**
 * Format a macro value with unit (e.g., "12.5 g").
 */
export function formatGrams(value: number | string | undefined): string {
  if (value === undefined || value === null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `${num.toFixed(1)} g`;
}

/**
 * Format a confidence score as percentage.
 */
export function formatConfidence(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Format a timestamp into a friendly time string.
 */
export function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format a timestamp into a friendly date string.
 */
export function formatDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// VL model field extractors
// ---------------------------------------------------------------------------

type Nutrition = Record<string, unknown>;

/**
 * Extract the dish / food name from VL model output.
 * VL primary field is `dish_name`; falls back to `food_name`.
 */
export function extractDishName(n: Nutrition): string {
  return (
    (n.dish_name as string) ||
    (n.food_name as string) ||
    ""
  );
}

/**
 * Extract macros from VL model output.
 * VL nests macros inside `nutritional_summary` with `_g` suffixes:
 *   protein_g, carbohydrate_g, fat_g
 * Falls back to flat top-level fields used by other models.
 */
export function extractMacros(n: Nutrition): {
  protein: number | undefined;
  carbs: number | undefined;
  fat: number | undefined;
} {
  const s = n.nutritional_summary as Nutrition | undefined;

  function pick(...keys: string[]): number | undefined {
    for (const src of [s, n]) {
      if (!src) continue;
      for (const k of keys) {
        const v = src[k];
        if (v !== undefined && v !== null) {
          const num = typeof v === "string" ? parseFloat(v) : Number(v);
          if (!isNaN(num)) return num;
        }
      }
    }
    return undefined;
  }

  return {
    protein: pick("protein_g",     "protein"),
    carbs:   pick("carbohydrate_g","carbohydrates", "carbs"),
    fat:     pick("fat_g",         "fat"),
  };
}

/**
 * Extract portion_size object from VL output as a sorted array of
 * { name, grams } entries, ready for display.
 */
export function extractPortions(n: Nutrition): Array<{ name: string; grams: number }> {
  const ps = n.portion_size;
  if (!ps || typeof ps !== "object" || Array.isArray(ps)) return [];
  return Object.entries(ps as Record<string, unknown>)
    .map(([name, val]) => ({
      name,
      grams: typeof val === "number" ? val : parseFloat(String(val)),
    }))
    .filter((p) => !isNaN(p.grams));
}

/**
 * Extract dish metadata: food_type and cooking_method.
 */
export function extractFoodMeta(n: Nutrition): {
  foodType: string | undefined;
  cookingMethod: string | undefined;
} {
  return {
    foodType:      (n.food_type      as string) || undefined,
    cookingMethod: (n.cooking_method as string) || undefined,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a value to a positive number, or return NaN.
 */
function toPositiveNum(val: unknown): number {
  if (val === undefined || val === null) return NaN;
  const n = typeof val === "string" ? parseFloat(val) : Number(val);
  return isNaN(n) || n < 0 ? NaN : n;
}

/**
 * Extract a total calorie number from the variable VL model output.
 *
 * The Qwen3-VL LoRA returns calories nested inside a `nutritional_summary`
 * sub-object (e.g. nutritional_summary.calories_kcal). This function checks
 * that sub-object first, then falls back to flat top-level fields, then sums
 * from an items array if present.
 */
export function extractCalories(nutrition: Record<string, unknown>): number {
  // 1. VL model primary output: nutrition.nutritional_summary.*
  const summary = nutrition.nutritional_summary as
    | Record<string, unknown>
    | undefined;
  if (summary && typeof summary === "object") {
    const summaryFields = [
      "calories_kcal",
      "calories",
      "total_calories",
      "totalCalories",
      "energy_kcal",
      "energy",
      "kcal",
    ];
    for (const f of summaryFields) {
      const n = toPositiveNum(summary[f]);
      if (!isNaN(n)) return n;
    }
  }

  // 2. Flat top-level fields
  const topFields = [
    "calories",
    "total_calories",
    "totalCalories",
    "calories_kcal",
    "energy",
    "energy_kcal",
    "kcal",
  ];
  for (const f of topFields) {
    const n = toPositiveNum(nutrition[f]);
    if (!isNaN(n)) return n;
  }

  // 3. Sum from items array
  const items = nutrition.items as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(items)) {
    let total = 0;
    for (const item of items) {
      const cal =
        item.calories ?? item.calories_kcal ?? item.energy ?? item.energy_kcal;
      const n = toPositiveNum(cal);
      if (!isNaN(n)) total += n;
    }
    if (total > 0) return total;
  }

  return 0;
}

/**
 * Time-of-day greeting with emoji and motivational subtitle.
 * Used on the Home screen header to replace the static app title.
 */
export function getGreeting(): { text: string; emoji: string; subtitle: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "🌅", subtitle: "Start your day strong!" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "☀️", subtitle: "Keep fueling your body!" };
  if (hour >= 17 && hour < 21) return { text: "Good evening", emoji: "🌇", subtitle: "How was your day?" };
  return { text: "Good night", emoji: "🌙", subtitle: "Rest well tonight!" };
}

/**
 * Build a formatted nutrition summary for native share sheet.
 * Only contains nutrition data — no PII or API keys.
 */
export function buildShareText(
  dishName: string,
  calories: number,
  macros: { protein?: number; carbs?: number; fat?: number },
  multiplier: number,
  timestamp: string
): string {
  const scale = (v?: number) => (v !== undefined ? Math.round(v * multiplier) : undefined);
  const fmt = (v?: number) => (v !== undefined ? `${v}g` : "—");

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
