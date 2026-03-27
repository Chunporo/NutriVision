import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Calendar, Zap } from "lucide-react-native";

import { useNutrition } from "@/src/store/nutrition-store";
import { THEME } from "@/src/lib/theme";

type TabType = "gen" | "cal" | "pro" | "car" | "fat";

export default function InsightsScreen() {
  const { getInsights, profile } = useNutrition();
  const insights = getInsights();
  const [activeTab, setActiveTab] = useState<TabType>("gen");

  const tabs = [
    { id: "gen", label: "General" },
    { id: "cal", label: "Calories" },
    { id: "pro", label: "Protein" },
    { id: "car", label: "Carbs" },
    { id: "fat", label: "Fat" },
  ];

  const goals = { 
    cal: profile?.targets?.calories || 2450, 
    pro: profile?.targets?.protein || 145, 
    car: profile?.targets?.carbs || 280, 
    fat: profile?.targets?.fat || 75 
  };

  const renderMacroProgress = (name: string, val: number, goal: number, unit: string, color: string) => {
    const pct = Math.min((val / goal) * 100, 100);
    return (
      <View style={styles.macroProgressWrapper}>
        <View style={styles.macroProgressHeader}>
          <Text style={styles.macroName}>{name}</Text>
          <Text style={styles.macroValuesLarge}>
            {Math.round(val)} / {goal} <Text style={styles.macroUnitSmall}>{unit}</Text>
          </Text>
        </View>
        <View style={styles.macroProgressBg}>
          <View style={[styles.macroProgressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const renderBarChart = (title: string, avg: number, color: string) => {
    const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    return (
      <View>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{title} Trend</Text>
          <Text style={styles.chartAvgText}>
            {Math.round(avg)} <Text style={styles.chartAvgLabel}>avg</Text>
          </Text>
        </View>
        <View style={styles.barChartContainer}>
          {days.map((day, i) => {
            const h = 30 + Math.random() * 60;
            return (
              <View key={day} style={styles.barCol}>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { height: `${h}%`, backgroundColor: day === 'WED' ? color : '#E2E8F0' }]} />
                </View>
                <Text style={styles.barLabel}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Your Insights</Text>
        <Pressable style={styles.iconButton}>
          <Calendar color="#64748B" size={20} />
        </Pressable>
      </View>

      <Text style={styles.subText}>Weekly Patterns</Text>

      {/* Tabs Menu */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <Pressable
                key={t.id}
                style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
                onPress={() => setActiveTab(t.id as TabType)}
              >
                <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {activeTab === "gen" ? (
            <View>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Macro Goal Balance</Text>
                <Text style={styles.consistentText}>85% CONSISTENT</Text>
              </View>
              <View style={styles.progressList}>
                {renderMacroProgress("Calories", insights.avg_calories_kcal, goals.cal, "kcal", "#8FAE83")}
                {renderMacroProgress("Protein", insights.avg_protein_g, goals.pro, "g", "#A78BFA")}
                {renderMacroProgress("Carbs", insights.avg_carbohydrate_g, goals.car, "g", "#FB923C")}
                {renderMacroProgress("Fat", insights.avg_fat_g, goals.fat, "g", "#0EA5E9")}
              </View>
            </View>
          ) : activeTab === "cal" ? (
            renderBarChart("Daily Calories", insights.avg_calories_kcal, "#8FAE83")
          ) : activeTab === "pro" ? (
            renderBarChart("Daily Protein", insights.avg_protein_g, "#A78BFA")
          ) : activeTab === "car" ? (
            renderBarChart("Daily Carbs", insights.avg_carbohydrate_g, "#FB923C")
          ) : (
            renderBarChart("Daily Fat", insights.avg_fat_g, "#0EA5E9")
          )}
        </View>

        {/* Insight Highlight */}
        <View style={[styles.card, styles.highlightCard]}>
          <View style={styles.highlightIconBox}>
            <Zap color="#8FAE83" size={24} />
          </View>
          <View style={styles.highlightTextContainer}>
            <Text style={styles.highlightTitle}>Protein consistency is up</Text>
            <Text style={styles.highlightBody}>You reached 90% of your target 5 days this week.</Text>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
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
  subText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tabsWrapper: {
    marginBottom: 16,
  },
  tabsContainer: {
    paddingHorizontal: 24,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  tabButtonActive: {
    backgroundColor: "#1A2E2C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tabButtonInactive: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFF",
  },
  tabTextInactive: {
    color: "#94A3B8",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120, // nav scale
    gap: 24,
  },
  card: {
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
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  consistentText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8FAE83",
  },
  chartAvgText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  chartAvgLabel: {
    fontSize: 10,
    fontWeight: "400",
    opacity: 0.4,
  },
  progressList: {
    gap: 20,
  },
  macroProgressWrapper: {
    width: "100%",
  },
  macroProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  macroName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  macroValuesLarge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2E2C",
  },
  macroUnitSmall: {
    fontSize: 10,
    fontWeight: "400",
    color: "#94A3B8",
  },
  macroProgressBg: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  macroProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  barChartContainer: {
    flexDirection: "row",
    height: 120,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 16,
  },
  barCol: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flex: 1,
  },
  barBg: {
    width: 14,
    height: 100,
    backgroundColor: "#F1F5F9",
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  highlightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#8FAE83",
  },
  highlightIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(143,174,131,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  highlightTextContainer: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2E2C",
    marginBottom: 4,
  },
  highlightBody: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
});
