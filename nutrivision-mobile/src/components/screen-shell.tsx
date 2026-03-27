import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "@/src/lib/theme";

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ScreenShell({ title, subtitle, children }: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView 
      contentInsetAdjustmentBehavior="automatic" 
      style={styles.root} 
      contentContainerStyle={[
        styles.content, 
        { paddingTop: insets.top + THEME.spacing.lg, paddingBottom: insets.bottom + THEME.spacing.xl }
      ]}
    >
      <View style={styles.header}>
        <Text selectable style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    paddingHorizontal: THEME.spacing.lg,
    gap: THEME.spacing.md,
  },
  header: {
    gap: THEME.spacing.xs,
    marginBottom: THEME.spacing.sm,
  },
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.text.primary,
  },
  subtitle: {
    ...THEME.typography.subtitle,
  },
});
