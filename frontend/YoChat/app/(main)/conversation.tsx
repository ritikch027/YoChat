import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import * as Icons from "phosphor-react-native";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/authContext";
import { scale, verticalScale } from "@/utils/styling";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import MessageItem from "@/components/MessageItem";
import Input from "@/components/Input";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import Loading from "@/components/Loading";
import { uploadFileToCloudinary } from "@/services/imageService";
import { getMessages, newMessage, typing } from "@/socket/socketEvents";
import { MessageProps, ResponseProps } from "@/types";

const Conversation = () => {
  const { user: currentUser } = useAuth();
  const {
    id: conversationId,
    name,
    participants: stringifiedParticipants,
    avatar,
    type,
  } = useLocalSearchParams();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string } | null>(
    null
  );
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const isTypingRef = useRef(false);
  const typingStopTimerRef = useRef<any>(null);
  const remoteTypingTimersRef = useRef<Record<string, any>>({});
  const participants = JSON.parse(stringifiedParticipants as string);

  let conversationAvatar = avatar;
  let isDirect = type == "direct";
  const otherParticipant = isDirect
    ? participants.find((p: any) => p._id != currentUser?.id)
    : null;
  if (isDirect && otherParticipant)
    conversationAvatar = otherParticipant.avatar;

  let conversationName = isDirect ? otherParticipant.name : name;
  const conversationUsername =
    isDirect && otherParticipant?.username ? `@${otherParticipant.username}` : null;

  useEffect(() => {
    newMessage(newMessageHandler);
    getMessages(getMessageHandler);
    typing(handleTyping);

    getMessages({ conversationId });

    return () => {
      newMessage(newMessageHandler, true);
      getMessages(getMessageHandler, true);
      typing(handleTyping, true);
    };
  }, []);

  const handleTyping = (res: any) => {
    if (!res?.conversationId || String(res.conversationId) !== String(conversationId))
      return;

    const fromUserId = String(res?.user?.id || "");
    if (!fromUserId || fromUserId === String(currentUser?.id)) return;

    const name = String(res?.user?.name || "Someone");
    const isTyping = !!res?.isTyping;

    setTypingUsers((prev) => {
      const next = { ...prev };
      if (isTyping) next[fromUserId] = name;
      else delete next[fromUserId];
      return next;
    });

    if (remoteTypingTimersRef.current[fromUserId]) {
      clearTimeout(remoteTypingTimersRef.current[fromUserId]);
    }

    if (isTyping) {
      remoteTypingTimersRef.current[fromUserId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[fromUserId];
          return next;
        });
      }, 2500);
    }
  };

  const newMessageHandler = (res: ResponseProps) => {
    setLoading(false);
    console.log("got new Message res: ", res);
    if (res.success) {
      if (res.data.conversationId == conversationId) {
        setMessages((prev) => [res.data as MessageProps, ...prev]);
      }
    } else {
      Alert.alert("Error", res.msg);
    }
  };
  const getMessageHandler = (res: ResponseProps) => {
    console.log("got getMessage res: ", res);
    if (res.success) setMessages(res.data);
  };

  const onPickFile = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      // allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }
  };

  const onSend = async () => {
    if (!message.trim() && !selectedFile) return;
    if (!currentUser) return;
    setLoading(true);

    try {
      if (isTypingRef.current) {
        typing({ conversationId, isTyping: false });
        isTypingRef.current = false;
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);

      let attachment = null;
      if (selectedFile) {
        const uploadResult = await uploadFileToCloudinary(
          selectedFile,
          "message-attachments"
        );
        if (uploadResult.success) {
          attachment = uploadResult.data;
        } else {
          setLoading(false);
          Alert.alert("Error", "Could not send the image!");
        }
      }

      newMessage({
        conversationId,
        sender: {
          id: currentUser?.id,
          name: currentUser?.name,
          avatar: currentUser?.avatar,
        },
        content: message?.trim(),
        attachment,
      });

      setMessage("");
      setSelectedFile(null);
    } catch (error) {
      console.log("Error seinding message", error);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const onChangeMessage = (text: string) => {
    setMessage(text);

    if (!conversationId) return;

    if (!isTypingRef.current && text.trim().length > 0) {
      typing({ conversationId, isTyping: true });
      isTypingRef.current = true;
    }

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        typing({ conversationId, isTyping: false });
        isTypingRef.current = false;
      }
    }, 800);
  };

  const typingLabel = (() => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and others are typing...`;
  })();

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.5}>
      <KeyboardAvoidingView
        behavior={Platform.OS == "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* header */}
        <Header
          style={styles.header}
          leftIcon={
            <View style={styles.headerLeft}>
              <BackButton />
              <Avatar
                size={40}
                uri={conversationAvatar as string}
                isGroup={type == "group"}
              />
              <View style={{ flex: 1 }}>
                <Typo
                  color={colors.white}
                  size={22}
                  fontWeight={"400"}
                  textProps={{ numberOfLines: 1 }}
                >
                  {conversationName}
                </Typo>
                <Typo size={13} color={colors.neutral200} textProps={{ numberOfLines: 1 }}>
                  {typingLabel || conversationUsername || ""}
                </Typo>
              </View>
            </View>
          }
          rightIcon={
            <TouchableOpacity
              activeOpacity={0.7}
              // style={{ marginBottom: verticalScale(7) }}
            >
              <Icons.DotsThreeOutlineVerticalIcon
                weight="fill"
                color={colors.white}
              />
            </TouchableOpacity>
          }
        />

        {/* messages */}
        <View style={styles.content}>
          <FlatList
            data={messages}
            inverted={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            renderItem={({ item }) => {
              return <MessageItem item={item} isDirect={isDirect} />;
            }}
            keyExtractor={(item) => item.id}
          />

          <View style={styles.footer}>
            <Input
              value={message}
              onChangeText={onChangeMessage}
              containerStyle={{
                paddingLeft: spacingX._10,
                paddingRight: scale(65),
                borderWidth: 0,
              }}
              placeholder="Type Message"
              icon={
                <TouchableOpacity
                  style={styles.inputIcon}
                  activeOpacity={0.6}
                  onPress={onPickFile}
                >
                  <Icons.PlusIcon
                    size={verticalScale(22)}
                    weight="bold"
                    color={colors.black}
                  />
                  {selectedFile && selectedFile.uri && (
                    <Image
                      source={selectedFile.uri}
                      style={styles.selectedFile}
                    />
                  )}
                </TouchableOpacity>
              }
            />
            <View style={styles.inputRightIcon}>
              <TouchableOpacity
                style={styles.inputIcon}
                onPress={onSend}
                activeOpacity={0.6}
              >
                {loading ? (
                  <Loading size="small" color={colors.black} />
                ) : (
                  <Icons.PaperPlaneTiltIcon
                    size={verticalScale(22)}
                    weight="fill"
                    color={colors.black}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

export default Conversation;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacingX._15,
    paddingTop: spacingY._10,
    paddingBottom: spacingY._15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
  },
  inputRightIcon: {
    position: "absolute",
    right: scale(10),
    top: verticalScale(15),
    paddingLeft: spacingX._12,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.neutral300,
  },
  selectedFile: {
    position: "absolute",
    height: verticalScale(38),
    width: verticalScale(38),
    borderRadius: radius.full,
    alignSelf: "center",
  },
  content: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius._50,
    borderTopRightRadius: radius._50,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: spacingX._15,
  },
  inputIcon: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 8,
  },
  footer: {
    paddingTop: spacingY._7,
    paddingBottom: verticalScale(22),
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: spacingY._20,
    paddingBottom: spacingY._10,
    gap: spacingY._12,
  },
  plusIcon: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 8,
  },
});
