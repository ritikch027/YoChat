import { Pressable, StyleSheet } from "react-native";
import React from "react";
import { AvatarProps } from "@/types";
import { verticalScale } from "@/utils/styling";
import { radius } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Image } from "expo-image";
import { getAvatarPath } from "@/services/imageService";
import { useRouter } from "expo-router";
const Avatar = ({ uri, size = 40, style, isGroup = false }: AvatarProps) => {
  const router = useRouter();
  const theme = useAppTheme();
  const openAvatar = () => {
    if (!uri) return;
    router.push({
      pathname: "/(modals)/attachment",
      params: { uri: String(uri) },
    });
  };
  return (
    <Pressable
      onPress={openAvatar}
      style={[
        styles.avatar,
        {
          backgroundColor: theme.colors.chipBg,
          borderColor: theme.colors.surfaceBorder,
        },
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
    </Pressable>
  );
};

export default Avatar;

const styles = StyleSheet.create({
  avatar: {
    alignSelf: "center",
    height: verticalScale(47),
    width: verticalScale(47),
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: "hidden",
  },
});
