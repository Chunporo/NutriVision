import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { api } from "@/src/lib/api";
import { FoodEntry, InsightSummary, NutritionPrediction } from "@/src/lib/types";

export type UserProfile = {
  name: string;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
};

type NutritionState = {
  entries: FoodEntry[];
  profile: UserProfile;
  latestPrediction: NutritionPrediction | null;
  loading: boolean;
  error: string | null;
  // Computed property getters
  getInsights: () => InsightSummary;
  // Actions
  refresh: () => Promise<void>;
  predictAndStore: (imageUrl: string) => Promise<FoodEntry>;
  predictUploadAndStore: (fileUri: string, imageUrl?: string) => Promise<FoodEntry>;
  addManualEntry: (entry: Omit<FoodEntry, "id" | "created_at">) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  clearPrediction: () => void;
  clearError: () => void;
  deleteEntry: (id: string) => void;
  exportData: () => Promise<void>;
  importData: () => Promise<void>;
};

export const useNutrition = create<NutritionState>()(
  persist(
    (set, get) => ({
      entries: [],
      profile: {
        name: "User",
        targets: { calories: 2450, protein: 145, carbs: 280, fat: 75 },
      },
      latestPrediction: null,
      loading: false,
      error: null,

      getInsights: () => {
        const { entries } = get();
        if (entries.length === 0) {
          return {
            total_entries: 0,
            avg_calories_kcal: 0,
            avg_protein_g: 0,
            avg_carbohydrate_g: 0,
            avg_fat_g: 0,
          };
        }

        const totals = entries.reduce(
          (acc, entry) => ({
            calories_kcal: acc.calories_kcal + entry.nutritional_summary.calories_kcal,
            protein_g: acc.protein_g + entry.nutritional_summary.protein_g,
            carbohydrate_g: acc.carbohydrate_g + entry.nutritional_summary.carbohydrate_g,
            fat_g: acc.fat_g + entry.nutritional_summary.fat_g,
          }),
          { calories_kcal: 0, protein_g: 0, carbohydrate_g: 0, fat_g: 0 }
        );

        return {
          total_entries: entries.length,
          avg_calories_kcal: totals.calories_kcal / entries.length,
          avg_protein_g: totals.protein_g / entries.length,
          avg_carbohydrate_g: totals.carbohydrate_g / entries.length,
          avg_fat_g: totals.fat_g / entries.length,
        };
      },

      refresh: async () => {
        set({ error: null });
        return;
      },

      predictAndStore: async (imageUrl: string) => {
        set({ loading: true, error: null });
        try {
          const prediction = await api.predict(imageUrl);
          const newEntry: FoodEntry = {
            id: uuidv4(),
            ...prediction,
            image_url: imageUrl,
            created_at: new Date().toISOString(),
          };
          set((state) => ({
            latestPrediction: prediction,
            entries: [newEntry, ...state.entries],
            loading: false,
          }));
          return newEntry;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Unable to analyze food",
            loading: false,
          });
          throw err;
        }
      },

      predictUploadAndStore: async (fileUri: string, imageUrl?: string) => {
        set({ loading: true, error: null });
        try {
          const prediction = await api.predictUpload(fileUri, imageUrl);
          const newEntry: FoodEntry = {
            id: uuidv4(),
            ...prediction,
            image_url: imageUrl ?? fileUri,
            created_at: new Date().toISOString(),
          };
          set((state) => ({
            latestPrediction: prediction,
            entries: [newEntry, ...state.entries],
            loading: false,
          }));
          return newEntry;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Unable to analyze food from upload",
            loading: false,
          });
          throw err;
        }
      },

      updateProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates }
      })),

      addManualEntry: (entryData) => {
        const newEntry: FoodEntry = {
          id: uuidv4(),
          created_at: new Date().toISOString(),
          ...entryData
        };
        set((state) => ({
          entries: [newEntry, ...state.entries],
        }));
      },

      clearPrediction: () => set({ latestPrediction: null }),
      clearError: () => set({ error: null }),
      
      deleteEntry: (id: string) => {
        set((state) => ({
          entries: state.entries.filter(e => e.id !== id)
        }));
      },

      exportData: async () => {
        try {
          const { entries } = get();
          const dataStr = JSON.stringify(entries, null, 2);
          // @ts-expect-error: documentDirectory exists in runtime
          const fileUri = `${FileSystem.documentDirectory}NutriVision_Export.json`;
          // @ts-expect-error: writeAsStringAsync exists
          await FileSystem.writeAsStringAsync(fileUri, dataStr, { encoding: FileSystem.EncodingType.UTF8 });
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
          } else {
            throw new Error("Sharing is not available on this device");
          }
        } catch (err) {
           set({ error: err instanceof Error ? err.message : "Export failed" });
        }
      },

      importData: async () => {
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: "application/json",
            copyToCacheDirectory: true,
          });
          
          if (result.canceled || !result.assets || result.assets.length === 0) {
            return;
          }

          const fileUri = result.assets[0].uri;
          // @ts-expect-error: readAsStringAsync exists
          const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
          
          const importedEntries = JSON.parse(content) as FoodEntry[];
          if (!Array.isArray(importedEntries)) {
            throw new Error("Invalid file format");
          }

          set((state) => {
            const currentIds = new Set(state.entries.map(e => e.id));
            const newEntries = importedEntries.filter(e => !currentIds.has(e.id));
            return {
              entries: [...newEntries, ...state.entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            };
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Import failed" });
        }
      }
    }),
    {
      name: "nutrivision-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
