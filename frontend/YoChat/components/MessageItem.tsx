import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
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
import { Swipeable } from "react-native-gesture-handler";
import * as Icons from "phosphor-react-native";
import ReactionPicker, { ReactionPickerAnchor } from "./ReactionPicker";

const MessageItem = ({
  item,
  isDirect,
  onReply,
  onPressReplyQuote,
  onToggleReaction,
}: {
  item: MessageProps;
  isDirect: boolean;
  onReply?: (m: MessageProps) => void;
  onPressReplyQuote?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}) => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const isMe = currentUser?.id === item?.sender?.id;
  const swipeRef = useRef<Swipeable>(null);
  const bubbleRef = useRef<View>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<ReactionPickerAnchor | null>(
    null,
  );

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

  const renderReplyAction = () => (
    <View style={styles.replyActionWrap}>
      <View style={styles.replyActionPill}>
        <Icons.ArrowBendUpLeftIcon size={18} weight="fill" color={colors.white} />
        <Typo size={12} color={colors.white} fontWeight={"700"}>
          Reply
        </Typo>
      </View>
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      enabled={!!onReply}
      renderLeftActions={renderReplyAction}
      leftThreshold={50}
      friction={2}
      onSwipeableOpen={() => {
        swipeRef.current?.close();
        onReply?.(item);
      }}
    >
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.theirMessage,
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
                const id = item.replySnapshot?.id ? String(item.replySnapshot.id) : "";
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

          {reactionsSummary.length > 0 && (
            <View
              style={[
                styles.reactionsRow,
                { alignSelf: isMe ? "flex-end" : "flex-start" },
              ]}
            >
              {reactionsSummary.map((r) => (
                <View
                  key={r.emoji}
                  style={[
                    styles.reactionPill,
                    r.reactedByMe && styles.reactionPillMine,
                  ]}
                >
                  <Typo size={12}>{r.emoji}</Typo>
                  <Typo size={11} color={colors.neutral700} fontWeight={"700"}>
                    {r.count}
                  </Typo>
                </View>
              ))}
            </View>
          )}

          <Typo
            style={{ alignSelf: "flex-end" }}
            size={11}
            fontWeight={"500"}
            color={colors.neutral600}
          >
            {formattedDate}
          </Typo>
        </Pressable>
      </View>

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
    </Swipeable>
  );
};

export default MessageItem;

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: "row",
    gap: spacingX._7,
    maxWidth: "80%",
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
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingX._7,
    marginTop: spacingY._3,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._3,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._3,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  reactionPillMine: {
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  replyQuote: {
    flexDirection: "row",
    gap: spacingX._7,
    paddingVertical: spacingY._7,
    paddingHorizontal: spacingX._7,
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
  replyActionWrap: {
    justifyContent: "center",
    paddingHorizontal: spacingX._10,
  },
  replyActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    backgroundColor: colors.neutral900,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._7,
    borderRadius: radius.full,
  },
});
