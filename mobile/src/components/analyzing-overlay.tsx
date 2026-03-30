/**
 * AnalyzingOverlay — Semi-transparent overlay shown during food analysis.
 *
 * Cycles through 4 informational steps every 3s to keep the user
 * engaged during the 10-30s API call. Holds at the last step if
 * the API takes longer than 12s (4 × 3s).
 */

import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useThemeColors, FontSize, Spacing } from "../utils/theme";

const STEPS = [
  { icon: "📸", text: "Capturing image details..." },
  { icon: "🔍", text: "Identifying food items..." },
  { icon: "⚕️", text: "Calculating nutrition..." },
  { icon: "✅", text: "Almost done!" },
] as const;

const STEP_INTERVAL_MS = 3000;

export function AnalyzingOverlay() {
  const colors = useThemeColors();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // Advance step but hold at the last one if API takes longer than 12s
      setStepIndex((prev) =>
        prev < STEPS.length - 1 ? prev + 1 : prev
      );
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const step = STEPS[stepIndex];

  return (
    <View style={styles.overlay}>
      <Text style={styles.icon}>{step.icon}</Text>
      <ActivityIndicator
        size="large"
        color={colors.textOnPrimary}
        style={styles.spinner}
      />
      <Text style={[styles.text, { color: colors.textOnPrimary }]}>{step.text}</Text>
      <Text style={styles.subtext}>
        Step {stepIndex + 1} of {STEPS.length}
      </Text>
      {/* Step-dot progress row — filled dots = completed steps */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i <= stepIndex ? colors.textOnPrimary : "rgba(255,255,255,0.3)" },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 40, marginBottom: Spacing.sm },
  spinner: { marginBottom: Spacing.md },
  text: { fontSize: FontSize.lg, fontWeight: "700", textAlign: "center" },
  subtext: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.6)", marginTop: Spacing.xs },
  dotsRow: { flexDirection: "row", gap: 8, marginTop: Spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
