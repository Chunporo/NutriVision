import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { Calendar, Utensils } from "lucide-react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { useNutrition } from "@/src/store/nutrition-store";
import { THEME } from "@/src/lib/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { entries, getInsights, deleteEntry, profile } = useNutrition();

  const insights = getInsights();
  const caloriesGoal = profile?.targets?.calories || 2450;
  const caloriesConsumed = Math.round(insights?.avg_calories_kcal ?? 0);
  const progress = Math.min(caloriesConsumed / caloriesGoal, 1);
  
  // Calculate SVG arc for progress
  // M 10,50 A 40,40 0 0 1 90,50
  // Length of half circle is pi * r = 3.14159 * 40 ≈ 125.6
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
             <Image source={{ uri: "https://ui-avatars.com/api/?name=User&background=8FAE83&color=fff" }} style={styles.avatar} />
          </View>
          <View>
            <Text style={styles.headerDate}>{today.toUpperCase()}</Text>
            <Text style={styles.headerGreeting}>Good morning, {profile?.name?.split(" ")[0] || "User"}</Text>
          </View>
        </View>
        <Pressable style={styles.iconButton}>
          <Calendar color="#64748B" size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Calories Progress Card */}
        <View style={[styles.macroCard, styles.calCard]}>
          <View style={styles.svgContainer}>
            <Svg width={192} height={96} viewBox="0 0 100 50">
              <Path d="M 10,50 A 40,40 0 0 1 90,50" fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
              <Path 
                d="M 10,50 A 40,40 0 0 1 90,50" 
                fill="none" 
                stroke="#8FAE83" 
                strokeWidth="8" 
                strokeLinecap="round" 
                strokeDasharray="125.6" 
                strokeDashoffset={125.6 - (125.6 * progress)} 
              />
            </Svg>
          </View>
          <View style={styles.calTextContainer}>
            <Text style={styles.calLabel}>CALORIES</Text>
            <Text style={styles.calValue}>{caloriesConsumed}<Text style={styles.calUnit}> kcal</Text></Text>
            <Text style={styles.calGoal}>of {caloriesGoal} kcal goal</Text>
          </View>
        </View>

        {/* Macros Grid */}
        <View style={styles.macrosGrid}>
          {/* Protein */}
          <View style={[styles.macroCard, styles.smallMacroCard]}>
            <Text style={styles.smallMacroLabel}>PROTEIN</Text>
            <Text style={styles.smallMacroValue}>{Math.round(insights.avg_protein_g)}<Text style={styles.smallMacroUnit}>g</Text></Text>
            <View style={styles.macroTrack}>
              <View style={[styles.macroFill, { backgroundColor: "#A78BFA", width: `${Math.min((insights.avg_protein_g / 150) * 100, 100)}%` }]} />
            </View>
          </View>

          {/* Carbs */}
          <View style={[styles.macroCard, styles.smallMacroCard]}>
            <Text style={styles.smallMacroLabel}>CARBS</Text>
            <Text style={styles.smallMacroValue}>{Math.round(insights.avg_carbohydrate_g)}<Text style={styles.smallMacroUnit}>g</Text></Text>
            <View style={styles.macroTrack}>
              <View style={[styles.macroFill, { backgroundColor: "#FB923C", width: `${Math.min((insights.avg_carbohydrate_g / 300) * 100, 100)}%` }]} />
            </View>
          </View>

          {/* Fat */}
          <View style={[styles.macroCard, styles.smallMacroCard]}>
            <Text style={styles.smallMacroLabel}>FAT</Text>
            <Text style={styles.smallMacroValue}>{Math.round(insights.avg_fat_g)}<Text style={styles.smallMacroUnit}>g</Text></Text>
            <View style={styles.macroTrack}>
              <View style={[styles.macroFill, { backgroundColor: "#0EA5E9", width: `${Math.min((insights.avg_fat_g / 80) * 100, 100)}%` }]} />
            </View>
          </View>
        </View>

        {/* Today's Log */}
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>Today's Log</Text>
          <Pressable onPress={() => router.push("/history")}>
            <Text style={styles.logViewAll}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.logList}>
          {entries.slice(0, 3).map((entry) => (
             <Pressable key={entry.id} style={styles.foodEntry}>
               <View style={styles.foodIconContainer}>
                 <Utensils color="#94A3B8" size={24} />
               </View>
               <View style={styles.foodInfo}>
                 <Text style={styles.foodTitle}>{entry.dish_name}</Text>
               </View>
               <View style={styles.foodRight}>
                 <Text style={styles.foodKcal}>{Math.round(entry.nutritional_summary.calories_kcal)} <Text style={styles.foodKcalSmall}>kcal</Text></Text>
                 <Text style={styles.foodTime}>{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
               </View>
             </Pressable>
          ))}
          {entries.length === 0 && (
            <Text style={styles.emptyText}>No meals logged today yet.</Text>
          )}
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
    paddingBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FFF",
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
  headerDate: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120, // space for nav
  },
  macroCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
  },
  calCard: {
    backgroundColor: "#F1F8EE",
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  calTextContainer: {
    alignItems: "center",
    marginTop: -8,
  },
  calLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 2,
    marginBottom: 4,
  },
  calValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  calUnit: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
  },
  calGoal: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  macrosGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  smallMacroCard: {
    flex: 1,
    padding: 16,
  },
  smallMacroLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 4,
  },
  smallMacroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  smallMacroUnit: {
    fontSize: 10,
    fontWeight: "400",
    color: "#64748B",
  },
  macroTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  macroFill: {
    height: "100%",
    borderRadius: 2,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  logViewAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8FAE83",
  },
  logList: {
    gap: 12,
  },
  foodEntry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 15,
  },
  foodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  foodInfo: {
    flex: 1,
  },
  foodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  foodRight: {
    alignItems: "flex-end",
  },
  foodKcal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  foodKcalSmall: {
    fontSize: 10,
    fontWeight: "400",
    color: "#94A3B8",
  },
  foodTime: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 10,
    fontStyle: "italic",
  },
});
