import React, { useMemo } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
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

        <View style={[styles.card, style]}>
          <View style={styles.header}>
            <Typo size={16} fontWeight={"800"} color={colors.neutral900}>
              {emoji} Reactions
            </Typo>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Typo size={18} fontWeight={"800"} color={colors.neutral700}>
                ×
              </Typo>
            </Pressable>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Avatar size={36} uri={item.avatar} />
                <Typo size={14} fontWeight={"600"} color={colors.neutral900}>
                  {item.name}
                </Typo>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ paddingVertical: spacingY._12 }}>
                <Typo size={13} color={colors.neutral600}>
                  No reactions yet.
                </Typo>
              </View>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
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
    backgroundColor: colors.white,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    maxHeight: "70%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral100,
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
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});

