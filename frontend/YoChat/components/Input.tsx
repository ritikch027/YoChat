import { radius, spacingX } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { InputProps } from "@/types";
import { verticalScale } from "@/utils/styling";
import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

const Input = (props: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.container,
        props.containerStyle && props.containerStyle,
        isFocused && { borderColor: theme.colors.primary },
        { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.surfaceBorder },
      ]}
    >
      {props.icon && props.icon}
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary }, props.inputStyle]}
        placeholderTextColor={theme.scheme === "dark" ? "rgba(245,245,244,0.45)" : "rgba(87,83,78,0.6)"}
        ref={props.inputRef && props.inputRef}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {props.rightIcon && props.rightIcon}
    </View>
  );
};

export default Input;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: verticalScale(56),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingRight: spacingX._20,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._15,
    gap: spacingX._10,
  },
  input: {
    flex: 1,
    fontSize: verticalScale(16),
    fontWeight: "400",
  },
});
