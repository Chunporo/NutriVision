import { useState } from "react";
import { Pressable, StyleSheet, Text, View, Image, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, Camera as CameraIcon, Image as ImageIcon, Check } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useNutrition } from "@/src/store/nutrition-store";
import { THEME } from "@/src/lib/theme";

export default function AddScreen() {
  const router = useRouter();
  const { predictUploadAndStore, latestPrediction, loading, error, clearError } = useNutrition();
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedFileUri) return;
    clearError();
    setSuccess(null);
    try {
      const entry = await predictUploadAndStore(selectedFileUri);
      setSuccess(`Saved: ${entry.dish_name}`);
    } catch {
      setSuccess(null);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedFileUri(result.assets[0].uri);
      setSuccess(null);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      mediaTypes: ["images"],
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedFileUri(result.assets[0].uri);
      setSuccess(null);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.iconButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
        >
          <ChevronLeft color="#1E293B" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Meal</Text>
        <Pressable 
          style={[styles.saveButton, (!selectedFileUri || loading) && styles.disabledSave]}
          onPress={handleAnalyze}
          disabled={!selectedFileUri || loading}
        >
          <Check color="#FFF" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Image Preview Area */}
        {selectedFileUri ? (
          <View style={styles.imageSection}>
            <Image source={{ uri: selectedFileUri }} style={styles.previewImage} />
            <View style={styles.captureOverlay}>
              <View style={styles.overlayRow}>
                <Pressable style={styles.overlayButton} onPress={handleTakePhoto}>
                  <CameraIcon color="#FFF" size={20} />
                  <Text style={styles.overlayButtonText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.overlayButton} onPress={handlePickImage}>
                  <ImageIcon color="#FFF" size={20} />
                  <Text style={styles.overlayButtonText}>Gallery</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <View style={styles.placeholderRow}>
              <Pressable style={styles.circleIcon} onPress={handleTakePhoto}>
                <CameraIcon color="#1A2E2C" size={24} />
              </Pressable>
              <Pressable style={styles.circleIcon} onPress={handlePickImage}>
                <ImageIcon color="#1A2E2C" size={24} />
              </Pressable>
            </View>
            <Text style={styles.placeholderText}>Add or Capture Food Photo</Text>
          </View>
        )}

        {loading && (
          <Text style={styles.loadingText}>Analyzing nutritional content...</Text>
        )}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        {success && (
          <Text style={styles.successText}>{success}</Text>
        )}

        {/* Nutritional Inputs (Preview) */}
        {latestPrediction && !loading ? (
          <View style={styles.resultsSection}>
            <View style={styles.inputCard}>
               <Text style={styles.inputLabel}>MEAL NAME</Text>
               <Text style={styles.valueLarge}>{latestPrediction.dish_name}</Text>
            </View>

            <Text style={[styles.inputLabel, { marginLeft: 8 }]}>NUTRITIONAL DATA</Text>

            <View style={[styles.inputCard, styles.macroRow]}>
               <Text style={styles.inputLabel}>CALORIES</Text>
               <View style={styles.macroValueContainer}>
                 <Text style={[styles.numInput, { color: "#8FAE83" }]}>{Math.round(latestPrediction.nutritional_summary.calories_kcal)}</Text>
                 <Text style={styles.macroUnit}>kcal</Text>
               </View>
            </View>

            <View style={[styles.inputCard, styles.macroRow]}>
               <Text style={styles.inputLabel}>PROTEIN</Text>
               <View style={styles.macroValueContainer}>
                 <Text style={[styles.numInput, { color: "#A78BFA" }]}>{Math.round(latestPrediction.nutritional_summary.protein_g)}</Text>
                 <Text style={styles.macroUnit}>g</Text>
               </View>
            </View>

            <View style={[styles.inputCard, styles.macroRow]}>
               <Text style={styles.inputLabel}>CARBOHYDRATES</Text>
               <View style={styles.macroValueContainer}>
                 <Text style={[styles.numInput, { color: "#FB923C" }]}>{Math.round(latestPrediction.nutritional_summary.carbohydrate_g)}</Text>
                 <Text style={styles.macroUnit}>g</Text>
               </View>
            </View>

            <View style={[styles.inputCard, styles.macroRow]}>
               <Text style={styles.inputLabel}>FAT</Text>
               <View style={styles.macroValueContainer}>
                 <Text style={[styles.numInput, { color: "#0EA5E9" }]}>{Math.round(latestPrediction.nutritional_summary.fat_g)}</Text>
                 <Text style={styles.macroUnit}>g</Text>
               </View>
            </View>
          </View>
        ) : null}
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
    paddingBottom: 120, // space for nav
    gap: 24,
  },
  imageSection: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
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
  captureOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    alignItems: "center",
  },
  overlayRow: {
    flexDirection: "row",
    gap: 12,
  },
  overlayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  overlayButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  resultsSection: {
    gap: 12,
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
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  valueLarge: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
    marginTop: 4,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  macroValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  numInput: {
    fontSize: 28,
    fontWeight: "700",
  },
  macroUnit: {
    fontSize: 12,
    fontWeight: "400",
    color: "#94A3B8",
  },
  loadingText: {
    textAlign: "center",
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 12,
  },
  errorText: {
    textAlign: "center",
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 12,
  },
  successText: {
    textAlign: "center",
    color: "#8FAE83",
    fontWeight: "700",
    marginTop: 12,
  },
});
