import { StyleSheet, TouchableOpacity, View } from "react-native";
import React, { useMemo, useState } from "react";
import { MessageProps } from "@/types";
import { useAuth } from "@/contexts/authContext";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import Avatar from "./Avatar";
import Typo from "./Typo";
import moment from "moment";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

const MessageItem = ({
  item,
  isDirect,
}: {
  item: MessageProps;
  isDirect: boolean;
}) => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const isMe = currentUser?.id === item?.sender?.id;
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
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
  return (
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

      <View
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
              style={[styles.attachment, { width: attachmentSize.w, height: attachmentSize.h }]}
              transition={100}
              onLoad={(e: any) => {
                const w = e?.source?.width;
                const h = e?.source?.height;
                if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
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
      </View>
    </View>
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
  myBubble: {
    backgroundColor: colors.myBubble,
  },
  theirBubble: {
    backgroundColor: colors.otherBubble,
  },
});
