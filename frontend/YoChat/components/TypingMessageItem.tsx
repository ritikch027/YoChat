import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import Typo from "@/components/Typo";

const TypingMessageItem = ({
  label,
  isDirect,
}: {
  label?: string | null;
  isDirect: boolean;
}) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeLoop = (value: Animated.Value, delayMs: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(value, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.delay(250),
        ]),
      );
    };

    const a1 = makeLoop(dot1, 0);
    const a2 = makeLoop(dot2, 120);
    const a3 = makeLoop(dot3, 240);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.messageContainer} accessibilityLabel={label ?? "Typing"}>
      <View style={styles.messageBubble}>
        {!isDirect && !!label && (
          <Typo color={colors.neutral900} size={12} fontWeight={"600"}>
            {label}
          </Typo>
        )}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
      </View>
    </View>
  );
};

export default TypingMessageItem;

const styles = StyleSheet.create({
  messageContainer: {
    alignSelf: "flex-start",
    maxWidth: "80%",
  },
  messageBubble: {
    padding: spacingX._10,
    borderRadius: radius._15,
    gap: spacingY._5,
    backgroundColor: colors.otherBubble,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    paddingVertical: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.neutral600,
  },
});

