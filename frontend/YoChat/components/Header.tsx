import { StyleSheet, View } from "react-native";
import React from "react";
import { HeaderProps } from "@/types";
import Typo from "./Typo";
import { spacingX, spacingY } from "@/constants/theme";

const Header = ({ title = "", leftIcon, rightIcon, style }: HeaderProps) => {
  return (
    <View style={[styles.container, style]}>
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

      {title && (
        <Typo variant="title" style={styles.title}>
          {title}
        </Typo>
      )}
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._7,
  },
  title: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    zIndex: 10,
    paddingHorizontal: spacingX._40,
  },
  leftIcon: {
    alignSelf: "flex-start",
    zIndex: 20,
    flex: 1,
  },
  rightIcon: {
    alignSelf: "flex-end",
    zIndex: 30,
  },
});
