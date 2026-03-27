import { Pressable, StyleSheet, Text, View, Image, ScrollView } from "react-native";
import { ChevronLeft, ChevronRight, Settings, Upload, Download } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useNutrition } from "@/src/store/nutrition-store";
import { THEME } from "@/src/lib/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { exportData, importData, error, profile } = useNutrition();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.iconButton} 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push("/");
          }}
        >
          <ChevronLeft color="#1E293B" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Name Card */}
        <View style={[styles.profileCard, { backgroundColor: "rgba(143,174,131,0.1)", borderWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
          <View style={styles.userInfoRow}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: "https://ui-avatars.com/api/?name=User&background=8FAE83&color=fff" }} style={styles.avatar} />
            </View>
            <View>
              <Text style={styles.userName}>{profile?.name || "User Name"}</Text>
            </View>
          </View>
        </View>

        {/* Targets Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Targets</Text>
          <View style={[styles.profileCard, styles.targetsGrid]}>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Calories</Text>
              <Text style={[styles.targetValue, { color: "#8FAE83" }]}>{profile?.targets?.calories || 2450} <Text style={styles.targetUnit}>kcal</Text></Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Protein</Text>
              <Text style={[styles.targetValue, { color: "#A78BFA" }]}>{profile?.targets?.protein || 145} <Text style={styles.targetUnit}>g</Text></Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Carbs</Text>
              <Text style={[styles.targetValue, { color: "#FB923C" }]}>{profile?.targets?.carbs || 280} <Text style={styles.targetUnit}>g</Text></Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Fat</Text>
              <Text style={[styles.targetValue, { color: "#0EA5E9" }]}>{profile?.targets?.fat || 75} <Text style={styles.targetUnit}>g</Text></Text>
            </View>
          </View>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.optionRow} onPress={() => router.push("/edit-profile")}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconBox}>
                <Settings color="#64748B" size={20} />
              </View>
              <Text style={styles.optionText}>Edit Profile</Text>
            </View>
            <ChevronRight color="#CBD5E1" size={20} />
          </Pressable>

          <Pressable style={styles.optionRow} onPress={importData}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconBox}>
                <Upload color="#64748B" size={20} />
              </View>
              <Text style={styles.optionText}>Import Data</Text>
            </View>
            <ChevronRight color="#CBD5E1" size={20} />
          </Pressable>

          <Pressable style={styles.optionRow} onPress={exportData}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconBox}>
                <Download color="#64748B" size={20} />
              </View>
              <Text style={styles.optionText}>Export Data</Text>
            </View>
            <ChevronRight color="#CBD5E1" size={20} />
          </Pressable>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120, // space for floating nav
  },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    marginBottom: 24,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: "#FFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  targetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 24,
    columnGap: 40,
  },
  targetItem: {
    width: "40%",
  },
  targetLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  targetUnit: {
    fontSize: 10,
    fontWeight: "400",
    opacity: 0.5,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  versionText: {
    fontSize: 10,
    color: "#CBD5E1",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
});
