import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { AvatarProps } from "@/types";
import { verticalScale } from "@/utils/styling";
import { colors, radius } from "@/constants/theme";
import { Image } from "expo-image";
import { getAvatarPath } from "@/services/imageService";
import { useRouter } from "expo-router";
const Avatar = ({ uri, size = 40, style, isGroup = false }: AvatarProps) => {
  const router = useRouter();
  const openAvatar = () => {
    if (!uri) return;
    router.push({
      pathname: "/(modals)/attachment",
      params: { uri: String(uri) },
    });
  };
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={openAvatar}
      style={[
        styles.avatar,
        { height: verticalScale(size), width: verticalScale(size) },
        style,
      ]}
    >
      <Image
        style={{ flex: 1 }}
        source={getAvatarPath(uri, isGroup)}
        contentFit="cover"
        transition={100}
      />
    </TouchableOpacity>
  );
};

export default Avatar;

const styles = StyleSheet.create({
  avatar: {
    alignSelf: "center",
    backgroundColor: colors.neutral200,
    height: verticalScale(47),
    width: verticalScale(47),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.neutral100,
    overflow: "hidden",
  },
});
