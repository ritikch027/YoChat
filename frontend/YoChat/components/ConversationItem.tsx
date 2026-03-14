import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import moment from "moment";
import { spacingX, spacingY } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import Avatar from "./Avatar";
import Typo from "./Typo";
import { ConversationListItemProps } from "@/types";
import { useAuth } from "@/contexts/authContext";

const ConversationItem = ({ item, showDivider, router }: ConversationListItemProps) => {
  const { user: currentUser } = useAuth();
  const theme = useAppTheme();

  const lastMessage: any = item.lastMessage;
  const isDirect = item.type == "direct";
  let avatar = item.avatar;
  const otherParticipant = isDirect
    ? item.participants.find((p) => p._id != currentUser?.id)
    : null;

  if (otherParticipant && isDirect) avatar = otherParticipant?.avatar;

  const getLastMessageDate = () => {
    if (!lastMessage?.createdAt) return null;
    const messageDate = moment(lastMessage?.createdAt);
    const today = moment();

    if (messageDate.isSame(today, "day")) return messageDate.format("h:mm A");
    if (messageDate.isSame(today, "year")) return messageDate.format("MMM D");
    return messageDate.format("MMM D, YYYY");
  };

  const getLastMessageContent = () => {
    if (!lastMessage) return "Say hi 👋";
    return lastMessage?.attachment ? "Image" : lastMessage.content;
  };

  const openConversation = () => {
    router.push({
      pathname: "/(main)/conversation",
      params: {
        id: item._id,
        name: item.name,
        avatar: isDirect ? otherParticipant?.avatar : item.avatar,
        type: item.type,
        participants: JSON.stringify(item.participants),
      },
    });
  };

  const openAvatar = () => {
    if (!avatar) return;
    router.push({
      pathname: "/(modals)/attachment",
      params: { uri: String(avatar) },
    });
  };

  return (
    <View>
      <Pressable
        onPress={openConversation}
        style={({ pressed }) => [
          styles.conversationItem,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Pressable
          onPress={openAvatar}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          hitSlop={8}
        >
          <Avatar uri={avatar} size={47} isGroup={item.type == "group"} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Typo variant="body" style={{ fontSize: 17, fontWeight: "600" }}>
              {isDirect ? otherParticipant?.name : item?.name}
            </Typo>
            {item.lastMessage && <Typo variant="chat_meta">{getLastMessageDate()}</Typo>}
          </View>

          <Typo
            textProps={{ numberOfLines: 1 }}
            variant="chat_meta"
            style={{ color: theme.colors.textSecondary }}
          >
            {getLastMessageContent()}
          </Typo>
        </View>
      </Pressable>

      {showDivider && (
        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                theme.scheme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.07)",
            },
          ]}
        />
      )}
    </View>
  );
};

export default ConversationItem;

const styles = StyleSheet.create({
  conversationItem: {
    gap: spacingX._10,
    marginVertical: spacingY._12,
    flexDirection: "row",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: 1,
    width: "95%",
    alignSelf: "center",
  },
});

