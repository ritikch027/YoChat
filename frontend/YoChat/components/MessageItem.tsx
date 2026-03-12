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
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import Avatar from "./Avatar";
import Typo from "./Typo";
import moment from "moment";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import ReactionPicker, { ReactionPickerAnchor } from "./ReactionPicker";
import ReactionDetailsModal from "./ReactionDetailsModal";

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

          <Pressable
            ref={bubbleRef}
            delayLongPress={250}
            onLongPress={openReactionPicker}
            style={[
              styles.messageBubble,
              isMe ? styles.myBubble : styles.theirBubble,
              reactionsSummary.length > 0 && styles.bubbleWithReactions,
            ]}
          >
            {!isMe && !isDirect && (
              <Typo color={colors.neutral900} size={13} fontWeight={"600"}>
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
                style={styles.replyQuote}
              >
                <View style={styles.replyQuoteAccent} />
                <View style={{ flex: 1 }}>
                  <Typo size={12} fontWeight={"700"} color={colors.neutral800}>
                    {item.replySnapshot.senderName || "User"}
                  </Typo>
                  <Typo
                    size={12}
                    color={colors.neutral600}
                    textProps={{ numberOfLines: 1 }}
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
                    color={colors.neutral500}
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
            {item.content && <Typo size={14}>{item.content}</Typo>}

            <Typo
              style={{ alignSelf: "flex-end" }}
              size={11}
              fontWeight={"500"}
              color={colors.neutral600}
            >
              {formattedDate}
            </Typo>

            {reactionsSummary.length > 0 && (
              <View
                pointerEvents="box-none"
                style={styles.reactionsOverlay}
              >
                <View style={styles.reactionsOverlayInner}>
                  {reactionsSummary.map((r) => (
                    <Pressable
                      key={r.emoji}
                      hitSlop={6}
                      disabled={isDirect}
                      onPress={() => openReactionDetails(r.emoji)}
                      style={[
                        styles.reactionChip,
                        r.reactedByMe && styles.reactionChipMine,
                        isDirect && styles.reactionPillDisabled,
                      ]}
                    >
                      <Typo size={12}>{r.emoji}</Typo>
                      <Typo size={11} color={colors.neutral700} fontWeight={"700"}>
                        {r.count}
                      </Typo>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </Pressable>
        </View>
      </Animated.View>

      <ReactionPicker
        visible={reactionPickerVisible}
        anchor={reactionAnchor}
        isMe={isMe}
        reactedEmojis={reactedEmojisByMe}
        onRequestClose={() => setReactionPickerVisible(false)}
        onSelect={(emoji) => {
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
    backgroundColor: colors.neutral200,
  },
  messageBubble: {
    padding: spacingX._10,
    borderRadius: radius._15,
    gap: spacingY._5,
  },
  bubbleWithReactions: {
    paddingBottom: spacingY._12,
  },
  reactionPillDisabled: {
    opacity: 0.85,
  },
  reactionsOverlay: {
    position: "absolute",
    bottom: -verticalScale(14),
    zIndex: 10,
    left: spacingX._7,
  },
  reactionsOverlayInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacingX._7,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._5,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._3,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._5,
    borderRadius: radius.full,
    backgroundColor: colors.neutral100,
  },
  reactionChipMine: {
    backgroundColor: colors.neutral200,
  },
  replyQuote: {
    flexDirection: "row",
    gap: spacingX._7,
    paddingVertical: spacingY._7,
    paddingHorizontal: spacingX._7,
    minWidth: scale(140),
    borderRadius: radius._10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  replyQuoteAccent: {
    width: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
  },
  myBubble: {
    backgroundColor: colors.myBubble,
  },
  theirBubble: {
    backgroundColor: colors.otherBubble,
  },
});
