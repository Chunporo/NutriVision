import { useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView } from "react-native";
import { ChevronLeft, Check, Camera, Image as ImageIcon, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useNutrition } from "@/src/store/nutrition-store";
import { THEME } from "@/src/lib/theme";

export default function ManualAddScreen() {
  const router = useRouter();
  const { addManualEntry } = useNutrition();

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("250");
  const [time, setTime] = useState("");
  const [calories, setCalories] = useState("350");
  const [protein, setProtein] = useState("24");
  const [carbs, setCarbs] = useState("45");
  const [fat, setFat] = useState("12");

  const handleSave = () => {
    if (!name.trim()) return;
    
    addManualEntry({
      dish_name: name,
      nutritional_summary: {
        calories_kcal: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbohydrate_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
      },
      image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c", // Fallback generic food image
      food_type: "Manual Entry",
      cooking_method: "Unspecified",
      portion_size: { weight: weight + "g" },
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/history");
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/history")}>
          <ChevronLeft color="#1E293B" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Food</Text>
        <Pressable style={[styles.saveButton, !name.trim() && styles.disabledSave]} onPress={handleSave} disabled={!name.trim()}>
          <Check color="#FFF" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Image Placeholder */}
        <Pressable style={styles.imagePlaceholder}>
          <View style={styles.placeholderRow}>
            <View style={styles.circleIcon}><Camera color="#1A2E2C" size={24} /></View>
            <View style={styles.circleIcon}><ImageIcon color="#1A2E2C" size={24} /></View>
          </View>
          <Text style={styles.placeholderText}>Add or Capture Food Photo</Text>
        </Pressable>

        {/* Basic Info */}
        <View style={styles.section}>
          <View style={styles.inputCard}>
             <Text style={styles.label}>MEAL NAME</Text>
             <TextInput 
               style={styles.textInput} 
               placeholder="E.g. Chicken Caesar" 
               placeholderTextColor="#94A3B8"
               value={name}
               onChangeText={setName}
             />
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.inputCard, styles.flex1]}>
               <Text style={styles.label}>WEIGHT</Text>
               <View style={styles.rowBase}>
                 <TextInput style={styles.textInputSmall} value={weight} onChangeText={setWeight} keyboardType="numeric" />
                 <Text style={styles.unitText}>g</Text>
               </View>
            </View>
            <View style={[styles.inputCard, styles.flex1]}>
               <Text style={styles.label}>TIME</Text>
               <TextInput style={styles.textInputSmall} placeholder="08:30" placeholderTextColor="#94A3B8" value={time} onChangeText={setTime} />
            </View>
          </View>
        </View>

        {/* Nutritional Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NUTRITIONAL DATA</Text>

          <View style={styles.macroCard}>
             <Text style={styles.label}>CALORIES</Text>
             <View style={styles.rowBase}>
               <TextInput style={[styles.numInput, { color: "#8FAE83" }]} value={calories} onChangeText={setCalories} keyboardType="numeric" />
               <Text style={styles.unitTextDef}>kcal</Text>
             </View>
          </View>

          <View style={styles.macroCard}>
             <Text style={styles.label}>PROTEIN</Text>
             <View style={styles.rowBase}>
               <TextInput style={[styles.numInput, { color: "#A78BFA" }]} value={protein} onChangeText={setProtein} keyboardType="numeric" />
               <Text style={styles.unitTextDef}>g</Text>
             </View>
          </View>

          <View style={styles.macroCard}>
             <Text style={styles.label}>CARBS</Text>
             <View style={styles.rowBase}>
               <TextInput style={[styles.numInput, { color: "#FB923C" }]} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
               <Text style={styles.unitTextDef}>g</Text>
             </View>
          </View>

          <View style={styles.macroCard}>
             <Text style={styles.label}>FAT</Text>
             <View style={styles.rowBase}>
               <TextInput style={[styles.numInput, { color: "#0EA5E9" }]} value={fat} onChangeText={setFat} keyboardType="numeric" />
               <Text style={styles.unitTextDef}>g</Text>
             </View>
          </View>
        </View>

        {/* Record Food Button */}
        <Pressable style={styles.recordButton} onPress={handleSave}>
          <Text style={styles.recordButtonText}>RECORD FOOD</Text>
          <ArrowRight color="#FFF" size={20} />
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F9F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#8FAE83",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8FAE83",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  disabledSave: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 24,
    backgroundColor: "rgba(26, 46, 44, 0.05)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(26, 46, 44, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderRow: {
    flexDirection: "row",
    gap: 16,
  },
  circleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94A3B8",
    paddingHorizontal: 8,
  },
  inputCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
  },
  macroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
  },
  flex1: {
    flex: 1,
  },
  gridRow: {
    flexDirection: "row",
    gap: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
    padding: 0,
  },
  textInputSmall: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
    padding: 0,
    flex: 1,
  },
  rowBase: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  unitTextDef: {
    fontSize: 12,
    fontWeight: "400",
    color: "#94A3B8",
  },
  numInput: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "right",
    padding: 0,
    minWidth: 80,
  },
  recordButton: {
    backgroundColor: "#1A2E2C",
    borderRadius: 28,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    marginTop: 16,
  },
  recordButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 2,
  },
});
