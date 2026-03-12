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
import { useLocalSearchParams, useRouter } from "expo-router";
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
import {
  getMessages,
  newMessage,
  presenceGet,
  presenceInit,
  presenceUpdate,
  presenceUsers,
  typing,
} from "@/socket/socketEvents";
import { MessageProps, ResponseProps } from "@/types";
import TypingMessageItem from "@/components/TypingMessageItem";
import moment from "moment";

const Conversation = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const {
    id: conversationId,
    name,
    participants: stringifiedParticipants,
    avatar,
    type,
  } = useLocalSearchParams();
  const [messageState, setMessageState] = useState<{
    conversationId: string | null;
    items: MessageProps[];
  }>({ conversationId: null, items: [] });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ uri: string } | null>(
    null,
  );
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [presence, setPresence] = useState<
    Record<string, { online: boolean; lastSeen?: string | null }>
  >({});
  const [replyDraft, setReplyDraft] = useState<{
    id: string;
    senderName: string;
    content: string;
    attachment?: string | null;
  } | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingEmitAtRef = useRef(0);
  const typingStopTimerRef = useRef<any>(null);
  const remoteTypingTimersRef = useRef<Record<string, any>>({});

  const conversationIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const pendingGetMessagesKindRef = useRef<
    Record<string, "replace" | "append">
  >({});
  const loadingMessagesForRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<any> | null>(null);

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
  const otherUserId = isDirect
    ? String(otherParticipant?._id ?? otherParticipant?.id ?? "")
    : "";
  const isOtherOnline = isDirect
    ? (presence[otherUserId]?.online ?? !!otherParticipant?.online) &&
      !!otherUserId
    : false;
  const otherLastSeen = isDirect
    ? presence[otherUserId]?.lastSeen || null
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
      }, 1000);
    }
  }, []);

  const processPresenceInit = useCallback((res: any) => {
    const onlineUserIds: string[] = res?.onlineUserIds || [];
    setPresence((prev) => {
      const next = { ...prev };
      onlineUserIds.forEach((id) => {
        next[String(id)] = { ...(next[String(id)] || {}), online: true };
      });
      return next;
    });
  }, []);

  const processPresenceUpdate = useCallback((res: any) => {
    const userId = String(res?.userId || "");
    if (!userId) return;
    setPresence((prev) => ({
      ...prev,
      [userId]: {
        online: !!res?.online,
        lastSeen: res?.lastSeen || prev[userId]?.lastSeen || null,
      },
    }));
  }, []);

  const handlePresenceUsers = useCallback((res: any) => {
    if (!res?.success || !res?.data) return;
    setPresence((prev) => {
      const next = { ...prev };
      Object.entries(res.data).forEach(([id, p]: any) => {
        next[String(id)] = {
          online: !!p?.online,
          lastSeen: p?.lastSeen || next[String(id)]?.lastSeen || null,
        };
      });
      return next;
    });
  }, []);

  const newMessageHandler = useCallback((res: ResponseProps) => {
    setLoading(false);
    if (res.success) {
      if (
        conversationIdRef.current &&
        String(res.data.conversationId) === String(conversationIdRef.current)
      ) {
        setMessageState((prev) => {
          const activeId = conversationIdRef.current
            ? String(conversationIdRef.current)
            : null;
          if (!activeId || prev.conversationId !== activeId) return prev;
          return {
            conversationId: prev.conversationId,
            items: [res.data as MessageProps, ...prev.items],
          };
        });
      }
    } else {
      Alert.alert("Error", res.message);
    }
  }, []);

  const getMessageHandler = useCallback((res: ResponseProps) => {
    const requestId = res?.requestId ? String(res.requestId) : null;
    const kind = requestId
      ? pendingGetMessagesKindRef.current[requestId] || "replace"
      : "replace";

    if (requestId) delete pendingGetMessagesKindRef.current[requestId];

    if (kind === "replace") {
      // Only end the "initial load" spinner for the latest replace request.
      if (
        !loadingMessagesForRef.current ||
        loadingMessagesForRef.current === requestId
      ) {
        setLoadingMessages(false);
        loadingMessagesForRef.current = null;
      }
    }

    if (res.success) {
      const page = Array.isArray(res.data) ? (res.data as MessageProps[]) : [];
      if (kind === "append") {
        setMessageState((prev) => {
          const activeId = conversationIdRef.current
            ? String(conversationIdRef.current)
            : null;
          if (!activeId || prev.conversationId !== activeId) return prev;
          return {
            conversationId: prev.conversationId,
            items: [...prev.items, ...page],
          };
        });
        setLoadingMore(false);
      } else {
        const activeId = conversationIdRef.current
          ? String(conversationIdRef.current)
          : conversationId
            ? String(conversationId)
            : null;
        setMessageState({ conversationId: activeId, items: page });
      }
      setHasMore(!!res?.hasMore);
      setNextCursor(
        res?.nextCursor
          ? String(res.nextCursor)
          : page.length > 0
            ? String((page[page.length - 1] as any).id)
            : null,
      );
    } else {
      if (kind === "replace") setLoadingMessages(false);
      setLoadingMore(false);
    }
  }, []);

  const requestMessagesPage = useCallback(
    (opts: { kind: "replace" | "append"; cursor?: string | null }) => {
      const activeConversationId = conversationIdRef.current;
      if (!activeConversationId) return;

      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      pendingGetMessagesKindRef.current[requestId] = opts.kind;
      if (opts.kind === "replace") {
        loadingMessagesForRef.current = requestId;
        setLoadingMessages(true);
      }

      getMessages({
        conversationId: activeConversationId,
        limit: 20,
        cursor: opts.cursor || null,
        requestId,
      });
    },
    [],
  );

  useEffect(() => {
    newMessage(newMessageHandler);
    getMessages(getMessageHandler);
    typing(handleTyping);
    presenceInit(processPresenceInit);
    presenceUpdate(processPresenceUpdate);
    presenceGet();
    presenceUsers(handlePresenceUsers);

    return () => {
      newMessage(newMessageHandler, true);
      getMessages(getMessageHandler, true);
      typing(handleTyping, true);
      presenceInit(processPresenceInit, true);
      presenceUpdate(processPresenceUpdate, true);
      presenceUsers(handlePresenceUsers, true);

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
  }, [
    getMessageHandler,
    handleTyping,
    newMessageHandler,
    handlePresenceUsers,
    processPresenceInit,
    processPresenceUpdate,
  ]);

  useEffect(() => {
    if (!conversationId) return;

    Object.values(remoteTypingTimersRef.current).forEach((t) =>
      clearTimeout(t),
    );
    remoteTypingTimersRef.current = {};
    setTypingUsers({});
    setReplyDraft(null);

    const cid = String(conversationId);
    setMessageState({ conversationId: cid, items: [] });
    setLoadingMessages(true);
    setLoadingMore(false);
    setHasMore(true);
    setNextCursor(null);
    pendingGetMessagesKindRef.current = {};
    loadingMessagesForRef.current = null;

    requestMessagesPage({ kind: "replace" });
  }, [conversationId, requestMessagesPage]);

  const setReplyFromMessage = useCallback((m: MessageProps) => {
    const senderName = m?.sender?.name ? String(m.sender.name) : "User";
    const content = (m?.content || "").toString();
    const attachment = m?.attachment ? String(m.attachment) : null;
    setReplyDraft({
      id: String(m.id),
      senderName,
      content,
      attachment,
    });
  }, []);

  const toggleReactionForMessage = useCallback(
    (messageId: string, emoji: string) => {
      const uid = currentUserIdRef.current;
      if (!uid) return;
      const targetId = String(messageId || "");
      const selectedEmoji = String(emoji || "");
      if (!targetId || !selectedEmoji) return;

      setMessageState((prev) => {
        const activeId = conversationIdRef.current
          ? String(conversationIdRef.current)
          : null;
        if (!activeId || prev.conversationId !== activeId) return prev;

        return {
          conversationId: prev.conversationId,
          items: prev.items.map((m) => {
            if (String(m.id) !== targetId) return m;

            const reactions = Array.isArray(m.reactions) ? m.reactions : [];
            const idx = reactions.findIndex((r) => r?.emoji === selectedEmoji);

            if (idx < 0) {
              return {
                ...m,
                reactions: [...reactions, { emoji: selectedEmoji, userIds: [uid] }],
              };
            }

            const entry = reactions[idx];
            const userIds = Array.isArray(entry?.userIds) ? entry.userIds : [];
            const hasReacted = userIds.some((id) => String(id) === String(uid));
            const nextUserIds = hasReacted
              ? userIds.filter((id) => String(id) !== String(uid))
              : [...userIds, uid];

            const nextReactions =
              nextUserIds.length === 0
                ? reactions.filter((_, i) => i !== idx)
                : reactions.map((r, i) =>
                    i === idx ? { ...r, userIds: nextUserIds } : r,
                  );

            return { ...m, reactions: nextReactions };
          }),
        };
      });
    },
    [],
  );
  const typingLabel = (() => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and others are typing...`;
  })();

  const scrollToMessageId = useCallback(
    (messageId: string) => {
      const id = String(messageId || "");
      if (!id) return;

      const idxInItems = messageState.items.findIndex(
        (m) => String(m.id) === id,
      );
      if (idxInItems < 0) {
        Alert.alert("Reply", "That message isn't loaded yet.");
        return;
      }

      // FlatList data includes an optional typing row at index 0.
      const listIndex = typingLabel ? idxInItems + 1 : idxInItems;

      try {
        listRef.current?.scrollToIndex({
          index: listIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        // Fallback handled by onScrollToIndexFailed
      }
    },
    [messageState.items, typingLabel],
  );

  const MessagesSkeleton = () => {
    const items = Array.from({ length: 8 }).map((_, idx) => idx);
    return (
      <View style={styles.skeletonWrap}>
        {items.map((i) => {
          const isMine = i % 3 === 0;
          return (
            <View
              key={i}
              style={[
                styles.skeletonRow,
                { justifyContent: isMine ? "flex-end" : "flex-start" },
              ]}
            >
              <View
                style={[
                  styles.skeletonBubble,
                  isMine ? styles.skeletonMine : styles.skeletonOther,
                ]}
              />
            </View>
          );
        })}
      </View>
    );
  };

  useEffect(() => {
    if (!otherUserId) return;
    presenceUsers({ userIds: [otherUserId] });
  }, [otherUserId]);

  const onLoadMore = useCallback(() => {
    if (loadingMore) return;
    if (!hasMore) return;
    if (!nextCursor) return;

    setLoadingMore(true);
    requestMessagesPage({ kind: "append", cursor: nextCursor });
  }, [hasMore, loadingMore, nextCursor, requestMessagesPage]);

  const onPickFile = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
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
        lastTypingEmitAtRef.current = 0;
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
        replyTo: replyDraft?.id || null,
      });

      setMessage("");
      setSelectedFile(null);
      setReplyDraft(null);
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
        lastTypingEmitAtRef.current = 0;
      }
      return;
    }

    if (!isTypingRef.current && text.trim().length > 0) {
      typing({ conversationId, isTyping: true });
      isTypingRef.current = true;
      lastTypingEmitAtRef.current = Date.now();
    } else if (isTypingRef.current) {
      // Keep-alive: receivers drop typing after a timeout, so re-emit while user keeps typing.
      const now = Date.now();
      if (now - lastTypingEmitAtRef.current >= 1200) {
        typing({ conversationId, isTyping: true });
        lastTypingEmitAtRef.current = now;
      }
    }

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        typing({ conversationId, isTyping: false });
        isTypingRef.current = false;
        lastTypingEmitAtRef.current = 0;
      }
    }, 800);
  };

  const statusLine = (() => {
    if (typingLabel) return typingLabel;
    if (isDirect) {
      if (isOtherOnline) return "Online";
      if (otherLastSeen) return `Last seen ${moment(otherLastSeen).fromNow()}`;
      return "Offline";
    }
    return "";
  })();

  const subtitleLine = (() => {
    if (type === "group") return `${participants.length} members`;
    if (conversationUsername && statusLine)
      return `${conversationUsername} • ${statusLine}`;
    return conversationUsername || statusLine || "";
  })();

  const onPressHeaderDetails = useCallback(() => {
    if (isDirect) {
      if (!otherUserId) return;
      router.push({
        pathname: "/(main)/user/[id]",
        params: {
          id: otherUserId,
          name: conversationName,
          username: otherParticipant?.username ?? "",
          email: otherParticipant?.email ?? "",
          avatar: conversationAvatar ?? "",
          online: isOtherOnline ? "1" : "0",
          lastSeen: otherLastSeen ? moment(otherLastSeen).fromNow() : "",
        },
      });
      return;
    }

    const cid = conversationId ? String(conversationId) : "";
    if (!cid) return;
    router.push({
      pathname: "/(main)/group/[id]",
      params: {
        id: cid,
        name: conversationName,
        avatar: conversationAvatar ?? "",
        participants: JSON.stringify(participants),
      },
    });
  }, [
    conversationAvatar,
    conversationId,
    conversationName,
    isDirect,
    isOtherOnline,
    otherLastSeen,
    otherParticipant?.email,
    otherParticipant?.username,
    otherUserId,
    participants,
    router,
  ]);

  type TypingListItem = {
    id: string;
    kind: "typing";
  };
  type ConversationListItem = MessageProps | TypingListItem;

  const listData: ConversationListItem[] = useMemo(() => {
    const cid = conversationId ? String(conversationId) : null;
    const items = messageState.conversationId === cid ? messageState.items : [];

    if (!typingLabel) return items;
    return [
      { id: `typing-${String(conversationId ?? "")}`, kind: "typing" },
      ...items,
    ];
  }, [
    messageState.conversationId,
    messageState.items,
    typingLabel,
    conversationId,
  ]);

  const isTypingItem = (item: ConversationListItem): item is TypingListItem => {
    return (item as TypingListItem).kind === "typing";
  };

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
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.headerDetailsTap}
                onPress={onPressHeaderDetails}
              >
                <View style={styles.headerAvatarWrap}>
                  <Avatar
                    size={40}
                    uri={conversationAvatar as string}
                    isGroup={String(type) === "group"}
                  />
                  {isOtherOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Typo
                    color={colors.white}
                    size={20}
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
                    {subtitleLine}
                  </Typo>
                </View>
              </TouchableOpacity>
            </View>
          }
          rightIcon={
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ marginBottom: verticalScale(7) }}
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
          {loadingMessages && messageState.items.length === 0 ? (
            <MessagesSkeleton />
          ) : (
            <FlatList
              ref={(r) => {
                listRef.current = r;
              }}
              data={listData}
              inverted={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesContent}
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.2}
              onScrollToIndexFailed={(info) => {
                // Retry after measurement (RN recommendation).
                setTimeout(() => {
                  const target = Math.min(
                    info.index,
                    info.highestMeasuredFrameIndex || info.index,
                  );
                  listRef.current?.scrollToIndex({
                    index: target,
                    animated: true,
                    viewPosition: 0.5,
                  });
                }, 60);
              }}
              ListFooterComponent={
                loadingMore ? (
                  <View style={{ paddingVertical: spacingY._10 }}>
                    <Loading size="small" color={colors.black} />
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                if (isTypingItem(item)) {
                  return (
                    <TypingMessageItem
                      label={typingLabel}
                      isDirect={isDirect}
                    />
                  );
                }
                return (
                  <MessageItem
                    item={item}
                    isDirect={isDirect}
                    onReply={setReplyFromMessage}
                    onPressReplyQuote={scrollToMessageId}
                    onToggleReaction={toggleReactionForMessage}
                  />
                );
              }}
              keyExtractor={(item) => item.id}
            />
          )}

          <View style={styles.footer}>
            {replyDraft && (
              <View style={styles.replyBar}>
                <View style={styles.replyAccent} />
                <View style={{ flex: 1 }}>
                  <Typo size={12} fontWeight={"700"} color={colors.neutral800}>
                    Replying to {replyDraft.senderName}
                  </Typo>
                  <Typo
                    size={12}
                    color={colors.neutral600}
                    textProps={{ numberOfLines: 1 }}
                  >
                    {replyDraft.attachment
                      ? "Image"
                      : replyDraft.content || "Message"}
                  </Typo>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setReplyDraft(null)}
                  style={styles.replyClose}
                >
                  <Icons.XIcon
                    size={14}
                    weight="bold"
                    color={colors.neutral700}
                  />
                </TouchableOpacity>
              </View>
            )}
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
  headerDetailsTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
  },
  headerAvatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: verticalScale(12),
    height: verticalScale(12),
    borderRadius: radius.full,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: colors.neutral900,
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
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._10,
    borderRadius: radius._15,
    backgroundColor: colors.neutral100,
    marginBottom: spacingY._7,
  },
  replyAccent: {
    width: 3,
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
  },
  replyClose: {
    height: 28,
    width: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral200,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: spacingY._20,
    paddingBottom: spacingY._10,
    gap: spacingY._12,
  },
  skeletonWrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingTop: spacingY._20,
    paddingBottom: spacingY._10,
    gap: spacingY._12,
  },
  skeletonRow: {
    flexDirection: "row",
  },
  skeletonBubble: {
    height: verticalScale(26),
    borderRadius: radius._15,
    backgroundColor: colors.neutral100,
  },
  skeletonMine: {
    width: "55%",
    backgroundColor: colors.neutral200,
  },
  skeletonOther: {
    width: "70%",
    backgroundColor: colors.neutral100,
  },
  plusIcon: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: 8,
  },
});
