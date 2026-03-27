import { useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView } from "react-native";
import { ChevronLeft, Check } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useNutrition } from "@/src/store/nutrition-store";
import { THEME } from "@/src/lib/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useNutrition();

  const [name, setName] = useState(profile?.name || "");
  const [calories, setCalories] = useState(String(profile?.targets?.calories ?? 2450));
  const [protein, setProtein] = useState(String(profile?.targets?.protein ?? 145));
  const [carbs, setCarbs] = useState(String(profile?.targets?.carbs ?? 280));
  const [fat, setFat] = useState(String(profile?.targets?.fat ?? 75));

  const handleSave = () => {
    if (!name.trim()) return;

    updateProfile({
      name: name.trim(),
      targets: {
        calories: Number(calories) || 2450,
        protein: Number(protein) || 145,
        carbs: Number(carbs) || 280,
        fat: Number(fat) || 75,
      }
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/settings");
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/settings")}>
          <ChevronLeft color="#1E293B" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable style={[styles.saveButton, !name.trim() && styles.disabledSave]} onPress={handleSave} disabled={!name.trim()}>
          <Check color="#FFF" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
          <View style={styles.inputCard}>
             <Text style={styles.label}>FULL NAME</Text>
             <TextInput 
               style={styles.textInput} 
               placeholder="Your Name" 
               placeholderTextColor="#94A3B8"
               value={name}
               onChangeText={setName}
             />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY TARGETS</Text>

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
  rowBase: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
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
});
