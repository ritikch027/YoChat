import { typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { TypoProps } from "@/types";
import { verticalScale } from "@/utils/styling";
import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";

const Typo = ({
  size = 16,
  color,
  fontWeight = "400",
  children,
  style,
  textProps = {},
  variant,
}: TypoProps) => {
  const theme = useAppTheme();

  const base = (() => {
    if (variant === "chat_message") {
      return {
        size: typography.chat.messageSize,
        lineHeight: typography.chat.messageLineHeight,
        fontWeight: "400" as TextStyle["fontWeight"],
        color: theme.colors.textPrimary,
      };
    }
    if (variant === "chat_meta") {
      return {
        size: typography.chat.metaSize,
        lineHeight: typography.chat.metaLineHeight,
        fontWeight: "500" as TextStyle["fontWeight"],
        color: theme.colors.textSecondary,
      };
    }
    if (variant === "title") {
      return {
        size: 20,
        lineHeight: 26,
        fontWeight: "700" as TextStyle["fontWeight"],
        color: theme.colors.textPrimary,
      };
    }
    if (variant === "body") {
      return {
        size: 16,
        lineHeight: 22,
        fontWeight: "400" as TextStyle["fontWeight"],
        color: theme.colors.textPrimary,
      };
    }
    return null;
  })();

  const textStyle: TextStyle = {
    fontSize: verticalScale(base?.size ?? size),
    lineHeight: verticalScale(base?.lineHeight ?? Math.round(size * 1.25)),
    color: color ?? base?.color ?? theme.colors.textPrimary,
    fontWeight: (base?.fontWeight ?? fontWeight) as TextStyle["fontWeight"],
  };
  return (
    <Text style={[textStyle, style]} {...textProps}>
      {children}
    </Text>
  );
};

export default Typo;

const styles = StyleSheet.create({});
