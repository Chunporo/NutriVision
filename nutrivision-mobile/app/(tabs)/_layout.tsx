import { Tabs } from "expo-router";
import { Platform, View, StyleSheet } from "react-native";
import { Home, ScrollText, Aperture, PieChart, User } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#8FAE83",
        tabBarInactiveTintColor: "#64748B", // slate-500
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Home color={color} size={20} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <ScrollText color={color} size={20} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: () => (
            <View style={styles.scanButton}>
              <Aperture color="#FFF" size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <PieChart color={color} size={20} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <User color={color} size={20} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 24,
    marginHorizontal: 24,
    elevation: 0,
    backgroundColor: "#1A2E2C",
    borderRadius: 9999,
    height: 72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    borderTopWidth: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 48,
    height: "100%",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 4,
    width: 16,
    height: 2,
    backgroundColor: "#8FAE83",
    borderRadius: 2,
    shadowColor: "#8FAE83",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#8FAE83",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8FAE83",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
