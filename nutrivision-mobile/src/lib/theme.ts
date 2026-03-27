export const THEME = {
  colors: {
    primary: "#8FAE83",     // Sage Green from wireframe
    primaryLight: "rgba(143, 174, 131, 0.1)", // Light green for progress background
    primaryDark: "#7A9E6D",
    secondary: "#FFFFFF",    // White for cards and nav
    accent: "#8FAE83",       // Keeping it consistent with sage green for now
    background: "#F7F9F6",   // App background from wireframe
    surface: "#FFFFFF",      // White cards
    error: "#EF4444",
    macros: {
      calories: "#8FAE83",   
      protein: "#8B5CF6",    
      carbs: "#F43F5E",      
      fat: "#F59E0B",        
    },
    text: {
      primary: "#0F172A",    // Slate 900
      secondary: "#64748B",  // Slate 500
      muted: "#94A3B8",      // Slate 400
      onPrimary: "#FFFFFF",
      onSecondary: "#0F172A",
    },
    input: {
      background: "#FFFFFF",
      border: "#F1F5F9",     // Slate 100
      focused: "#8FAE83",
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    pill: 9999,
  },
  typography: {
    h1: {
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 42,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
      color: "#64748B",
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
    }
  }
};
