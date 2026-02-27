import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
    null,
  );
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const isTypingRef = useRef(false);
  const typingStopTimerRef = useRef<any>(null);
  const remoteTypingTimersRef = useRef<Record<string, any>>({});

  const conversationIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId ? String(conversationId) : null;
  }, [conversationId]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ? String(currentUser.id) : null;
  }, [currentUser?.id]);

  const participants = useMemo(() => {
    try {
      return JSON.parse(String(stringifiedParticipants ?? "[]"));
    } catch {
      return [];
    }
  }, [stringifiedParticipants]);

  let conversationAvatar = avatar;
  let isDirect = String(type) === "direct";
  const otherParticipant = isDirect
    ? currentUser?.id
      ? participants.find((p: any) => String(p?._id) !== String(currentUser.id))
      : null
    : null;
  if (isDirect && otherParticipant)
    conversationAvatar = otherParticipant.avatar;

  let conversationName = isDirect
    ? (otherParticipant?.name ?? "Unknown")
    : String(name ?? "Group");
  const conversationUsername =
    isDirect && otherParticipant?.username
      ? `@${otherParticipant.username}`
      : null;

  const handleTyping = useCallback((res: any) => {
    const activeConversationId = conversationIdRef.current;
    if (
      !activeConversationId ||
      !res?.conversationId ||
      String(res.conversationId) !== String(activeConversationId)
    ) {
      return;
    }

    const fromUserId = String(res?.user?.id || "");
    const currentId = currentUserIdRef.current;
    if (!fromUserId || (currentId && fromUserId === String(currentId))) return;

    const name = String(res?.user?.name || "Someone");
    const isTypingNow = !!res?.isTyping;

    setTypingUsers((prev) => {
      const next = { ...prev };
      if (isTypingNow) next[fromUserId] = name;
      else delete next[fromUserId];
      return next;
    });

    if (remoteTypingTimersRef.current[fromUserId]) {
      clearTimeout(remoteTypingTimersRef.current[fromUserId]);
    }
    if (isTypingNow) {
      remoteTypingTimersRef.current[fromUserId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[fromUserId];
          return next;
        });
      }, 2500);
    }
  }, []);

  const newMessageHandler = useCallback((res: ResponseProps) => {
    setLoading(false);
    console.log("got new Message res: ", res);
    if (res.success) {
      if (
        conversationIdRef.current &&
        String(res.data.conversationId) === String(conversationIdRef.current)
      ) {
        setMessages((prev) => [res.data as MessageProps, ...prev]);
      }
    } else {
      Alert.alert("Error", res.msg);
    }
  }, []);

  const getMessageHandler = useCallback((res: ResponseProps) => {
    console.log("got getMessage res: ", res);
    if (res.success) setMessages(res.data);
  }, []);

  useEffect(() => {
    newMessage(newMessageHandler);
    getMessages(getMessageHandler);
    typing(handleTyping);

    return () => {
      newMessage(newMessageHandler, true);
      getMessages(getMessageHandler, true);
      typing(handleTyping, true);

      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      Object.values(remoteTypingTimersRef.current).forEach((t) =>
        clearTimeout(t),
      );
      remoteTypingTimersRef.current = {};

      const activeConversationId = conversationIdRef.current;
      if (activeConversationId && isTypingRef.current) {
        typing({ conversationId: activeConversationId, isTyping: false });
        isTypingRef.current = false;
      }
    };
  }, [getMessageHandler, handleTyping, newMessageHandler]);

  useEffect(() => {
    if (!conversationId) return;

    Object.values(remoteTypingTimersRef.current).forEach((t) =>
      clearTimeout(t),
    );
    remoteTypingTimersRef.current = {};
    setTypingUsers({});

    getMessages({ conversationId });
  }, [conversationId]);

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
          "message-attachments",
        );
        if (uploadResult.success) {
          attachment = uploadResult.data;
        } else {
          Alert.alert("Error", "Could not send the image!");
          return;
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

    if (text.trim().length === 0) {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (isTypingRef.current) {
        typing({ conversationId, isTyping: false });
        isTypingRef.current = false;
      }
      return;
    }

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                isGroup={String(type) === "group"}
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
                <Typo
                  size={13}
                  color={colors.neutral200}
                  textProps={{ numberOfLines: 1 }}
                >
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
