import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { radius, shadows, spacingX, spacingY } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import Avatar from "./Avatar";
import Typo from "./Typo";

type UserLookup = Record<string, { name: string; avatar: string | null }>;

const ReactionDetailsModal = ({
  visible,
  emoji,
  userIds,
  userLookup,
  onClose,
  style,
}: {
  visible: boolean;
  emoji: string;
  userIds: string[];
  userLookup: UserLookup;
  onClose: () => void;
  style?: ViewStyle;
}) => {
  const theme = useAppTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  }, [anim, visible]);

  const data = useMemo(() => {
    const unique = Array.from(new Set((userIds || []).map((id) => String(id))));
    return unique.map((id) => {
      const u = userLookup?.[id];
      return {
        id,
        name: u?.name ? String(u.name) : "User",
        avatar: u?.avatar ?? null,
      };
    });
  }, [userIds, userLookup]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.card,
            style,
            {
              backgroundColor: theme.colors.surfaceCard,
              borderColor: theme.colors.surfaceBorder,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
              opacity: anim,
              shadowOpacity: theme.scheme === "dark" ? 0.32 : 0.16,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              { borderBottomColor: theme.scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
            ]}
          >
            <Typo variant="body" style={{ fontWeight: "800" }}>
              {emoji} Reactions
            </Typo>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.colors.surfaceElevated, opacity: pressed ? 0.7 : 1 },
              ]}
              hitSlop={10}
            >
              <Typo size={18} fontWeight={"900"} color={theme.colors.textSecondary}>
                ×
              </Typo>
            </Pressable>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => (
              <View
                style={[
                  styles.sep,
                  {
                    backgroundColor:
                      theme.scheme === "dark"
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                  },
                ]}
              />
            )}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Avatar size={36} uri={item.avatar} />
                <Typo variant="body" style={{ fontSize: 14, fontWeight: "600" }}>
                  {item.name}
                </Typo>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ paddingVertical: spacingY._12 }}>
                <Typo variant="chat_meta">No reactions yet.</Typo>
              </View>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ReactionDetailsModal;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: spacingX._15,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderRadius: radius._15,
    borderWidth: 1,
    maxHeight: "70%",
    overflow: "hidden",
    ...(shadows.modal as any),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    paddingVertical: spacingY._7,
  },
  sep: {
    height: 1,
  },
});
