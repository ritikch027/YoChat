import { scale, verticalScale } from "@/utils/styling";
import { ColorSchemeName } from "react-native";

export const colors = {
  primary: "#facc15",
  primaryLight: "#fef08a",
  primaryDark: "#eab308",
  text: "#292524",
  white: "#fff",
  black: "#000",
  rose: "#ef4444",
  otherBubble: "#FFF1BF",
  myBubble: "#FFE1CC",
  green: "#16a34a",
  neutral50: "#fafaf9",
  neutral100: "#f5f5f4",
  neutral200: "#e7e5e4",
  neutral300: "#d6d3d1",
  neutral350: "#CCCCCC",
  neutral400: "#a8a29e",
  neutral500: "#78716c",
  neutral600: "#57534e",
  neutral700: "#44403c",
  neutral800: "#292524",
  neutral900: "#1c1917",
};

export const darkColors = {
  ...colors,
  text: "#f5f5f4",
  white: "#0b0b0c",
  black: "#ffffff",
  neutral50: "#0b0b0c",
  neutral100: "#121214",
  neutral200: "#1c1c20",
  neutral300: "#2a2a2f",
  neutral350: "#2f2f35",
  neutral400: "#3a3a42",
  neutral500: "#6b6b75",
  neutral600: "#8b8b95",
  neutral700: "#b5b5bd",
  neutral800: "#dedee3",
  neutral900: "#f5f5f4",
  otherBubble: "#1b1a13",
  myBubble: "#1a1410",
};

export const spacingX = {
  _3: scale(3),
  _5: scale(5),
  _7: scale(7),
  _10: scale(10),
  _12: scale(12),
  _15: scale(15),
  _20: scale(20),
  _25: scale(25),
  _30: scale(30),
  _35: scale(35),
  _40: scale(40),
};

export const spacingY = {
  _5: verticalScale(5),
  _7: verticalScale(7),
  _10: verticalScale(10),
  _12: verticalScale(12),
  _15: verticalScale(15),
  _17: verticalScale(17),
  _20: verticalScale(20),
  _25: verticalScale(25),
  _30: verticalScale(30),
  _35: verticalScale(35),
  _40: verticalScale(40),
  _50: verticalScale(50),
  _60: verticalScale(60),
};

export const radius = {
  _3: verticalScale(3),
  _6: verticalScale(6),
  _10: verticalScale(10),
  _12: verticalScale(12),
  _15: verticalScale(15),
  _17: verticalScale(17),
  _20: verticalScale(20),
  _30: verticalScale(30),
  _40: verticalScale(40),
  _50: verticalScale(50),
  _60: verticalScale(60),
  _70: verticalScale(70),
  _80: verticalScale(80),
  _90: verticalScale(90),
  full: 200,
};

export type AppTheme = ReturnType<typeof getTheme>;

export const shadows = {
  modal: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
};

export const typography = {
  chat: {
    messageSize: 15,
    messageLineHeight: 20,
    metaSize: 12,
    metaLineHeight: 16,
  },
};

export const getTheme = (scheme: ColorSchemeName = "light") => {
  const isDark = scheme === "dark";
  const c = isDark ? darkColors : colors;

  return {
    scheme: isDark ? "dark" : "light",
    colors: {
      ...c,
      surfaceBg: isDark ? "#0b0b0c" : c.neutral900,
      surfaceCard: isDark ? "#121214" : c.white,
      surfaceElevated: isDark ? "#1c1c20" : c.white,
      surfaceBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      textPrimary: isDark ? "#f5f5f4" : c.neutral900,
      textSecondary: isDark ? "rgba(245,245,244,0.72)" : c.neutral600,
      icon: isDark ? "#f5f5f4" : c.neutral900,
      onPrimary: colors.neutral900,
      bubbleMe: isDark ? "#1a1410" : c.myBubble,
      bubbleOther: isDark ? "#1b1a13" : c.otherBubble,
      chipBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      chipBgMine: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.12)",
    },
    spacingX,
    spacingY,
    radius,
    shadows,
    typography,
  };
};
