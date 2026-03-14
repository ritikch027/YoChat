import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { radius, shadows, spacingX, spacingY } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import Typo from "./Typo";

const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export type ReactionPickerAnchor = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const ReactionPicker = ({
  visible,
  anchor,
  isMe,
  reactedEmojis,
  onSelect,
  onRequestClose,
  reactions = DEFAULT_REACTIONS,
}: {
  visible: boolean;
  anchor: ReactionPickerAnchor | null;
  isMe: boolean;
  reactedEmojis: string[];
  onSelect: (emoji: string) => void;
  onRequestClose: () => void;
  reactions?: string[];
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
      friction: 7,
      tension: 90,
    }).start();
  }, [anim, visible]);

  const layout = useMemo(() => {
    if (!anchor) return null;

    const { width: screenW, height: screenH } = Dimensions.get("window");
    const pillH = 44;
    const itemSize = 36;
    const horizontalPadding = 10;
    const pillW = horizontalPadding * 2 + reactions.length * itemSize;

    const idealLeft = isMe
      ? anchor.x + anchor.w - pillW
      : anchor.x + Math.min(10, anchor.w / 2);
    const left = clamp(idealLeft, 10, Math.max(10, screenW - pillW - 10));

    const preferTop = anchor.y - pillH - 10;
    const preferBottom = anchor.y + anchor.h + 10;
    const top =
      preferTop > 60
        ? preferTop
        : clamp(preferBottom, 60, Math.max(60, screenH - pillH - 20));

    return { left, top, pillW, pillH } satisfies {
      left: number;
      top: number;
      pillW: number;
      pillH: number;
    };
  }, [anchor, isMe, reactions.length]);

  const pickerStyle = useMemo(() => {
    if (!layout) return null;
    return {
      left: layout.left,
      top: layout.top,
      width: layout.pillW,
      height: layout.pillH,
    } satisfies ViewStyle;
  }, [layout]);

  if (!layout) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onRequestClose} />

        <Animated.View
          style={[
            styles.picker,
            pickerStyle,
            {
              backgroundColor: theme.colors.surfaceElevated,
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
            },
          ]}
        >
          {reactions.map((emoji) => {
            const selected = reactedEmojis.includes(emoji);
            return (
              <Pressable
                key={emoji}
                onPress={() => onSelect(emoji)}
                style={({ pressed }) => [
                  styles.reactionItem,
                  {
                    backgroundColor: selected ? theme.colors.chipBg : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                android_ripple={{
                  color:
                    theme.scheme === "dark"
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(0,0,0,0.08)",
                  borderless: true,
                }}
              >
                <Typo size={18}>{emoji}</Typo>
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ReactionPicker;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  picker: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacingX._10,
    paddingVertical: spacingY._7,
    borderRadius: radius.full,
    borderWidth: 1,
    ...(shadows.modal as any),
  },
  reactionItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
