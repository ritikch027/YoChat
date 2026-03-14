import { colors } from "@/constants/theme";
import { BackButtonProps } from "@/types";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

const BackButton = ({
  style,
  iconSize = 26,
  color = colors.white,
}: BackButtonProps) => {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
      style={[styles.button, style]}
    >
      <CaretLeftIcon size={verticalScale(iconSize)} color={color} />
    </Pressable>
  );
};

export default BackButton;

const styles = StyleSheet.create({
  button: {},
});
