export type NutritionSummary = {
  calories_kcal: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
};

export type NutritionPrediction = {
  dish_name: string;
  food_type: string;
  cooking_method: string;
  nutritional_summary: NutritionSummary;
  portion_size: Record<string, number | string>;
};

export type FoodEntry = {
  id: string;
  dish_name: string;
  food_type: string;
  cooking_method: string;
  nutritional_summary: NutritionSummary;
  portion_size: Record<string, number | string>;
  image_url?: string | null;
  created_at: string;
};

export type InsightSummary = {
  total_entries: number;
  avg_calories_kcal: number;
  avg_protein_g: number;
  avg_carbohydrate_g: number;
  avg_fat_g: number;
};
