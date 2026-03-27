import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { Plus, Calendar, Inbox, Utensils } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useNutrition } from "@/src/store/nutrition-store";
import { THEME } from "@/src/lib/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const { entries, deleteEntry } = useNutrition();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.iconButton}
          onPress={() => router.push("/manual-add")}
        >
          <Plus color="#1A2E2C" size={20} strokeWidth={2.5} />
        </Pressable>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerDate}>TUESDAY, OCT 24</Text>
          <Text style={styles.headerTitle}>History Log</Text>
        </View>

        <Pressable style={styles.iconButton}>
          <Calendar color="#64748B" size={20} />
        </Pressable>
      </View>

      {/* Calendar Strip Placeholder */}
      <View style={styles.calendarStrip}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
           const isActive = day === 'Tue';
           return (
             <View key={day} style={[styles.dayCard, isActive && styles.dayCardActive]}>
               <Text style={[styles.dayName, isActive && styles.textWhite]}>{day}</Text>
               <Text style={[styles.dayNum, isActive && styles.textWhite]}>{23 + i}</Text>
             </View>
           );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
             <Inbox color="#94A3B8" size={48} />
             <Text style={styles.emptyTitle}>Nothing here yet</Text>
             <Text style={styles.emptyText}>Track your first meal to start your history log.</Text>
          </View>
        ) : (
          entries.map((entry) => (
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
              <Pressable style={styles.deleteBtn} onPress={() => deleteEntry(entry.id)}>
                <Text style={styles.deleteIcon}>×</Text>
              </Pressable>
            </Pressable>
          ))
        )}
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  headerCenter: {
    alignItems: "center",
  },
  headerDate: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  calendarStrip: {
    flexDirection: "row",
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 24,
  },
  dayCard: {
    width: 42,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F8FAFC",
  },
  dayCardActive: {
    backgroundColor: "#8FAE83",
    shadowColor: "#8FAE83",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dayName: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#94A3B8",
    marginBottom: 4,
  },
  dayNum: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  textWhite: {
    color: "#FFF",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120, // space for nav
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
    marginRight: 12,
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
  deleteBtn: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 24,
    fontWeight: "600",
    color: "#EF4444",
  },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2E2C",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
});
