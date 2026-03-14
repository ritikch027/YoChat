import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useMemo, useRef, useState } from "react";
import { MessageProps } from "@/types";
import { useAuth } from "@/contexts/authContext";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { scale, verticalScale } from "@/utils/styling";
import Avatar from "./Avatar";
import Typo from "./Typo";
import moment from "moment";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import ReactionPicker, { ReactionPickerAnchor } from "./ReactionPicker";
import ReactionDetailsModal from "./ReactionDetailsModal";
import * as Haptics from "expo-haptics";

const MessageItem = ({
  item,
  isDirect,
  onReply,
  onPressReplyQuote,
  onToggleReaction,
  reactionUsersById,
}: {
  item: MessageProps;
  isDirect: boolean;
  onReply?: (m: MessageProps) => void;
  onPressReplyQuote?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  reactionUsersById?: Record<string, { name: string; avatar: string | null }>;
}) => {
  const { user: currentUser } = useAuth();
  const theme = useAppTheme();
  const router = useRouter();
  const isMe = currentUser?.id === item?.sender?.id;
  const bubbleRef = useRef<View>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<ReactionPickerAnchor | null>(
    null,
  );
  const [reactionDetailsVisible, setReactionDetailsVisible] = useState(false);
  const [reactionDetailsEmoji, setReactionDetailsEmoji] = useState<string>("");
  const [reactionDetailsUserIds, setReactionDetailsUserIds] = useState<string[]>([]);

  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeFiredRef = useRef(false);
  const swipeEnabled = !!onReply;
  const SWIPE_MAX = scale(86);
  const SWIPE_TRIGGER = 52;

  const formattedDate = moment(item.createdAt).isSame(moment(), "day")
    ? moment(item.createdAt).format("h:mm A")
    : moment(item.createdAt).format("MMM D, h:mm A");

  const attachmentSize = useMemo(() => {
    const maxW = scale(240);
    const maxH = verticalScale(260);
    const fallback = { w: verticalScale(180), h: verticalScale(180) };
    if (!naturalSize?.w || !naturalSize?.h) return fallback;

    const factor = Math.min(maxW / naturalSize.w, maxH / naturalSize.h, 1);
    return {
      w: Math.max(scale(140), Math.round(naturalSize.w * factor)),
      h: Math.max(verticalScale(140), Math.round(naturalSize.h * factor)),
    };
  }, [naturalSize]);

  const reactionsSummary = useMemo(() => {
    const uid = currentUser?.id ? String(currentUser.id) : null;
    const list = Array.isArray(item?.reactions) ? item.reactions : [];

    return list
      .filter((r) => r?.emoji && Array.isArray(r.userIds) && r.userIds.length > 0)
      .map((r) => ({
        emoji: String(r.emoji),
        count: r.userIds.length,
        userIds: r.userIds.map((id) => String(id)),
        reactedByMe: uid ? r.userIds.some((id) => String(id) === uid) : false,
      }))
      .sort((a, b) => b.count - a.count);
  }, [currentUser?.id, item?.reactions]);

  const reactedEmojisByMe = useMemo(() => {
    return reactionsSummary.filter((r) => r.reactedByMe).map((r) => r.emoji);
  }, [reactionsSummary]);

  const openReactionPicker = () => {
    if (!bubbleRef.current) return;

    bubbleRef.current.measureInWindow((x, y, w, h) => {
      if (![x, y, w, h].every((n) => typeof n === "number" && isFinite(n))) return;
      setReactionAnchor({ x, y, w, h });
      setReactionPickerVisible(true);
    });
  };

  const openReactionDetails = (emoji: string) => {
    if (isDirect) return; // only in groups

    const selectedEmoji = String(emoji || "");
    if (!selectedEmoji) return;

    const match = reactionsSummary.find((r) => r.emoji === selectedEmoji);
    const ids = match?.userIds || [];

    setReactionDetailsEmoji(selectedEmoji);
    setReactionDetailsUserIds(ids);
    setReactionDetailsVisible(true);
  };

  const panResponder = useMemo(() => {
    if (!swipeEnabled) {
      return PanResponder.create({
        onMoveShouldSetPanResponder: () => false,
        onPanResponderMove: () => {},
        onPanResponderRelease: () => {},
      });
    }

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => {
        if (!swipeEnabled) return false;
        if (g.dx <= 0) return false; // only swipe right
        if (Math.abs(g.dx) < 8) return false;
        return Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
      },
      onPanResponderGrant: () => {
        swipeX.stopAnimation();
        swipeFiredRef.current = false;
      },
      onPanResponderMove: (_evt, g) => {
        const dx = Math.max(0, Math.min(SWIPE_MAX, g.dx));
        swipeX.setValue(dx);

        if (!swipeFiredRef.current && g.dx >= SWIPE_TRIGGER) {
          swipeFiredRef.current = true;
          onReply?.(item);
          Animated.timing(swipeX, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderRelease: () => {
        Animated.timing(swipeX, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(swipeX, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start();
      },
    });
  }, [SWIPE_MAX, SWIPE_TRIGGER, item, onReply, swipeEnabled, swipeX]);

  return (
    <View style={styles.swipeWrap}>
      <Animated.View
        style={{ transform: [{ translateX: swipeX }] }}
        {...(swipeEnabled ? panResponder.panHandlers : {})}
      >
        <View
          style={[
            styles.messageContainer,
            isMe ? styles.myMessage : styles.theirMessage,
            reactionsSummary.length > 0 && styles.messageWithReactions,
          ]}
        >
          {!isMe && !isDirect && (
            <Avatar
              size={30}
              uri={item?.sender?.avatar}
              style={styles.messageAvatar}
            />
          )}

          <View style={styles.bubbleColumn}>
            <Pressable
              ref={bubbleRef}
              delayLongPress={250}
              onLongPress={openReactionPicker}
              style={[
                styles.messageBubble,
                { backgroundColor: isMe ? theme.colors.bubbleMe : theme.colors.bubbleOther },
              ]}
            >
              {!isMe && !isDirect && (
                <Typo size={13} fontWeight={"600"} color={theme.colors.textPrimary}>
                  {item.sender.name}
                </Typo>
              )}

              {item.replySnapshot && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={!onPressReplyQuote || !item.replySnapshot?.id}
                  onPress={() => {
                    const id = item.replySnapshot?.id
                      ? String(item.replySnapshot.id)
                      : "";
                    if (!id) return;
                    onPressReplyQuote?.(id);
                  }}
                  style={[styles.replyQuote, { backgroundColor: theme.colors.chipBg }]}
                >
                  <View
                    style={[
                      styles.replyQuoteAccent,
                      { backgroundColor: theme.colors.primaryDark },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Typo size={12} fontWeight={"700"} color={theme.colors.textPrimary}>
                      {item.replySnapshot.senderName || "User"}
                    </Typo>
                    <Typo
                      variant="chat_meta"
                      textProps={{ numberOfLines: 1 }}
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {item.replySnapshot.attachment
                        ? "Image"
                        : item.replySnapshot.content || "Message"}
                    </Typo>
                  </View>
                  {!!onPressReplyQuote && (
                    <Icons.CaretRightIcon
                      size={16}
                      weight="bold"
                      color={theme.colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>
              )}

            {item.attachment && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/(modals)/attachment",
                    params: { uri: String(item.attachment) },
                  })
                }
              >
                <Image
                  source={item.attachment}
                  contentFit="cover"
                  style={[
                    styles.attachment,
                    { width: attachmentSize.w, height: attachmentSize.h },
                  ]}
                  transition={100}
                  onLoad={(e: any) => {
                    const w = e?.source?.width;
                    const h = e?.source?.height;
                    if (
                      typeof w === "number" &&
                      typeof h === "number" &&
                      w > 0 &&
                      h > 0
                    ) {
                      setNaturalSize({ w, h });
                    }
                  }}
                />
              </TouchableOpacity>
            )}
            {item.content && (
              <Typo variant="chat_message" style={{ color: theme.colors.textPrimary }}>
                {item.content}
              </Typo>
            )}

            {reactionsSummary.length > 0 && (
              <View
                style={[
                  styles.reactionsRow,
                  { alignSelf: isMe ? "flex-end" : "flex-start" },
                ]}
              >
                {reactionsSummary.map((r) => (
                  <Pressable
                    key={r.emoji}
                    hitSlop={6}
                    disabled={isDirect}
                    onPress={() => openReactionDetails(r.emoji)}
                    style={({ pressed }) => [
                      styles.reactionPill,
                      {
                        backgroundColor: r.reactedByMe
                          ? theme.colors.chipBgMine
                          : theme.colors.chipBg,
                        opacity: pressed ? 0.7 : 1,
                      },
                      isDirect && styles.reactionPillDisabled,
                    ]}
                  >
                    <Typo size={12}>{r.emoji}</Typo>
                    <Typo
                      variant="chat_meta"
                      style={{ color: theme.colors.textSecondary, fontWeight: "800" }}
                    >
                      {r.count}
                    </Typo>
                  </Pressable>
                ))}
              </View>
            )}
            </Pressable>

            <Typo
              variant="chat_meta"
              style={[
                styles.timestamp,
                { alignSelf: isMe ? "flex-end" : "flex-start" },
              ]}
            >
              {formattedDate}
            </Typo>
          </View>
        </View>
      </Animated.View>

      <ReactionPicker
        visible={reactionPickerVisible}
        anchor={reactionAnchor}
        isMe={isMe}
        reactedEmojis={reactedEmojisByMe}
        onRequestClose={() => setReactionPickerVisible(false)}
        onSelect={(emoji) => {
          Haptics.selectionAsync().catch(() => {});
          onToggleReaction?.(String(item.id), emoji);
          setReactionPickerVisible(false);
        }}
      />

      <ReactionDetailsModal
        visible={reactionDetailsVisible}
        emoji={reactionDetailsEmoji}
        userIds={reactionDetailsUserIds}
        userLookup={reactionUsersById || {}}
        onClose={() => setReactionDetailsVisible(false)}
      />
    </View>
  );
};

export default MessageItem;

const styles = StyleSheet.create({
  swipeWrap: {
    position: "relative",
  },
  messageContainer: {
    flexDirection: "row",
    gap: spacingX._7,
    maxWidth: "80%",
  },
  bubbleColumn: {
    flexShrink: 1,
    gap: spacingY._5,
  },
  messageWithReactions: {
    marginBottom: spacingY._12,
  },
  myMessage: {
    alignSelf: "flex-end",
  },
  theirMessage: {
    alignSelf: "flex-start",
  },
  messageAvatar: {
    alignSelf: "flex-end",
  },
  attachment: {
    borderRadius: radius._10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  messageBubble: {
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._7,
    borderRadius: radius._20,
    gap: spacingY._7,
  },
  timestamp: {
    paddingHorizontal: spacingX._7,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingX._7,
    marginTop: spacingY._5,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._3,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._5,
    borderRadius: radius.full,
  },
  reactionPillDisabled: {
    opacity: 0.85,
  },
  replyQuote: {
    flexDirection: "row",
    gap: spacingX._7,
    paddingVertical: spacingY._7,
    paddingHorizontal: spacingX._7,
    minWidth: scale(140),
    borderRadius: radius._10,
  },
  replyQuoteAccent: {
    width: 3,
    borderRadius: radius.full,
  },
});
