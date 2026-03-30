/**
 * QuickMacroCard — Compact macro nutrient display pill.
 *
 * Extracted from results.tsx to keep that screen under 200 lines.
 * Shows a colored dot, the macro value, and its label.
 */

import { View, Text, StyleSheet } from "react-native";
import { FontSize, Spacing, Radius } from "../utils/theme";
import { formatGrams } from "../utils/helpers";

export interface QuickMacroCardProps {
  label: string;
  value: number | undefined;
  color: string;
  surfaceColor: string;
  textColor: string;
  secondaryColor: string;
}

export function QuickMacroCard({
  label,
  value,
  color,
  surfaceColor,
  textColor,
  secondaryColor,
}: QuickMacroCardProps) {
  return (
    <View
      style={[styles.macroItem, { backgroundColor: surfaceColor }]}
      accessibilityLabel={`${label}: ${formatGrams(value)}`}
    >
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={[styles.macroValue, { color: textColor }]}>{formatGrams(value)}</Text>
      <Text style={[styles.macroLabel, { color: secondaryColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  macroItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 80,
  },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  macroValue: { fontSize: FontSize.md, fontWeight: "700" },
  macroLabel: { fontSize: FontSize.xs, marginTop: 2 },
});
