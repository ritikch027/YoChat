import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Platform,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import * as ImagePicker from "expo-image-picker";
import Input from "@/components/Input";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import Button from "@/components/Button";
import { verticalScale } from "@/utils/styling";
import {
  getConversations,
  newConversation,
  presenceGet,
  presenceInit,
  presenceUpdate,
} from "@/socket/socketEvents";
import { uploadFileToCloudinary } from "@/services/imageService";
import { searchUsers } from "@/services/usernameService";
import moment from "moment";

// ─── Design tokens ────────────────────────────────────────────────────────────
const PALETTE = {
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  border: "#ECEEF2",
  primary: "#5B6EF5",
  primaryLight: "#EEF0FE",
  green: "#22C55E",
  greenLight: "#DCFCE7",
  neutral300: "#D1D5DB",
  neutral500: "#6B7280",
  neutral700: "#374151",
  black: "#111827",
  white: "#FFFFFF",
  shadow: "rgba(17,24,39,0.08)",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SearchBar = ({
  value,
  onChangeText,
  loading,
}: {
  value: string;
  onChangeText: (t: string) => void;
  loading: boolean;
}) => (
  <View style={sb.wrapper}>
    {/* magnifier icon — drawn with pure View */}
    <View style={sb.iconWrap}>
      <View style={sb.lens} />
      <View style={sb.handle} />
    </View>
    <TextInput
      style={sb.input}
      placeholder="Search by name or @username…"
      placeholderTextColor={PALETTE.neutral500}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
    />
    {loading && (
      <ActivityIndicator
        size="small"
        color={PALETTE.primary}
        style={{ marginRight: 12 }}
      />
    )}
    {!loading && value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText("")} style={sb.clearBtn}>
        <Text style={sb.clearText}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
);

const sb = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 50,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 20,
    height: 20,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  lens: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: PALETTE.neutral500,
    position: "absolute",
    top: 0,
    left: 0,
  },
  handle: {
    width: 6,
    height: 2,
    backgroundColor: PALETTE.neutral500,
    borderRadius: 1,
    position: "absolute",
    bottom: 0,
    right: 0,
    transform: [{ rotate: "45deg" }],
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: PALETTE.black,
    fontWeight: "400",
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PALETTE.neutral300,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  clearText: { fontSize: 10, color: PALETTE.neutral700, fontWeight: "700" },
});

// ─── Chip row for selected participants ───────────────────────────────────────
const SelectedChips = ({
  participants,
  userById,
  onRemove,
}: {
  participants: string[];
  userById: Record<string, any>;
  onRemove: (id: string) => void;
}) => {
  if (participants.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 8, maxHeight: 50 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
    >
      {participants.map((id) => {
        const user = userById[String(id)];
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onRemove(id)}
            style={chip.wrap}
          >
            <Avatar size={26} uri={user?.avatar} />
            <Text style={chip.name} numberOfLines={1}>
              {user?.name?.split(" ")[0] ?? "User"}
            </Text>
            <Text style={chip.x}>✕</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const chip = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.primaryLight,
    borderRadius: 20,
    maxHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: PALETTE.primary + "33",
  },
  name: {
    fontSize: 13,
    color: PALETTE.primary,
    fontWeight: "600",
    maxWidth: 70,
  },
  x: { fontSize: 10, color: PALETTE.primary, fontWeight: "700" },
});

// ─── Contact row ──────────────────────────────────────────────────────────────
const ContactRow = ({
  user,
  isSelected,
  isGroupMode,
  presence,
  onPress,
}: {
  user: any;
  isSelected: boolean;
  isGroupMode: boolean;
  presence: { online: boolean; lastSeen?: string | null };
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const statusText = presence.online
    ? "Online"
    : presence.lastSeen
      ? `Last seen ${moment(presence.lastSeen).fromNow()}`
      : "Offline";

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[cr.row, isSelected && cr.rowSelected]}
        onPress={handlePress}
      >
        <View style={cr.avatarWrap}>
          <Avatar size={48} uri={user.avatar} />
          <View
            style={[cr.dot, presence.online ? cr.dotOnline : cr.dotOffline]}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={cr.name}>{user.name}</Text>
          <Text style={cr.meta} numberOfLines={1}>
            {user?.username ? `@${user.username}  · ` : ""}
            <Text style={[cr.status, presence.online && cr.statusOnline]}>
              {statusText}
            </Text>
          </Text>
        </View>

        {isGroupMode && (
          <View style={[cr.checkOuter, isSelected && cr.checkOuterSel]}>
            {isSelected && <View style={cr.checkInner} />}
          </View>
        )}

        {!isGroupMode && (
          <View style={cr.arrow}>
            <Text style={cr.arrowText}>›</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  rowSelected: {
    borderColor: PALETTE.primary,
    backgroundColor: PALETTE.primaryLight,
  },
  avatarWrap: { position: "relative" },
  dot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PALETTE.surface,
  },
  dotOnline: { backgroundColor: PALETTE.green },
  dotOffline: { backgroundColor: PALETTE.neutral300 },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: PALETTE.black,
    marginBottom: 2,
  },
  meta: { fontSize: 12.5, color: PALETTE.neutral500 },
  status: { color: PALETTE.neutral500 },
  statusOnline: { color: PALETTE.green, fontWeight: "600" },
  checkOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.neutral300,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  checkOuterSel: {
    borderColor: PALETTE.primary,
    backgroundColor: PALETTE.primary,
  },
  checkInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PALETTE.white,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE.bg,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  arrowText: { fontSize: 20, color: PALETTE.neutral500, marginTop: -2 },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ query }: { query: string }) => (
  <View style={es.wrap}>
    <View style={es.icon}>
      <Text style={es.emoji}>{query ? "🔍" : "👥"}</Text>
    </View>
    <Text style={es.title}>
      {query ? "No results found" : "No recent chats yet"}
    </Text>
    <Text style={es.sub}>
      {query
        ? `Try searching for a different name or @username`
        : `Search to start a new conversation`}
    </Text>
  </View>
);

const es = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PALETTE.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emoji: { fontSize: 30 },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: PALETTE.black,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: PALETTE.neutral500,
    textAlign: "center",
    lineHeight: 20,
  },
});

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ label, count }: { label: string; count: number }) => (
  <View style={sl.row}>
    <Text style={sl.text}>{label}</Text>
    {count > 0 && (
      <View style={sl.badge}>
        <Text style={sl.badgeText}>{count}</Text>
      </View>
    )}
  </View>
);

const sl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  text: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.neutral500,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  badge: {
    backgroundColor: PALETTE.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: PALETTE.primary },
});

// ─── Main component ───────────────────────────────────────────────────────────
const NewConversationModal = () => {
  const { isGroup } = useLocalSearchParams();
  const isGroupMode = isGroup == "1";
  const router = useRouter();

  const [groupAvatar, setGroupAvatar] = useState<{ uri: string } | null>(null);
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [selectedUserById, setSelectedUserById] = useState<Record<string, any>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [presence, setPresence] = useState<
    Record<string, { online: boolean; lastSeen?: string | null }>
  >({});
  const { user: currentUser, token } = useAuth();

  useEffect(() => {
    getConversations(processGetConversations);
    newConversation(processNewConversation);
    presenceInit(processPresenceInit);
    presenceUpdate(processPresenceUpdate);
    presenceGet();
    getConversations(null);
    return () => {
      getConversations(processGetConversations, true);
      newConversation(processNewConversation, true);
      presenceInit(processPresenceInit, true);
      presenceUpdate(processPresenceUpdate, true);
    };
  }, []);

  const processNewConversation = (res: any) => {
    setIsLoading(false);
    if (res.success) {
      router.back();
      router.push({
        pathname: "/(main)/conversation",
        params: {
          id: res.data._id,
          name: res.data.name,
          avatar: res.data.avatar,
          type: res.data.type,
          participants: JSON.stringify(res.data.participants),
        },
      });
    } else {
      Alert.alert("Error", res.message);
    }
  };

  const processGetConversations = (res: any) => {
    if (res.success) setRecentConversations(res.data || []);
  };

  const processPresenceInit = (res: any) => {
    const onlineUserIds: string[] = res?.onlineUserIds || [];
    setPresence((prev) => {
      const next = { ...prev };
      onlineUserIds.forEach((id) => {
        next[String(id)] = { ...(next[String(id)] || {}), online: true };
      });
      return next;
    });
  };

  const processPresenceUpdate = (res: any) => {
    const userId = String(res?.userId || "");
    if (!userId) return;
    setPresence((prev) => ({
      ...prev,
      [userId]: {
        online: !!res?.online,
        lastSeen: res?.lastSeen || prev[userId]?.lastSeen || null,
      },
    }));
  };

  const toggleParticipant = (user: any) => {
    const userId = String(user?.id || "");
    if (!userId) return;

    setSelectedParticipants((prev) => {
      const isSelected = prev.includes(userId);
      setSelectedUserById((prevUsers) => {
        const next = { ...prevUsers };
        if (isSelected) delete next[userId];
        else next[userId] = user;
        return next;
      });
      return isSelected ? prev.filter((id) => id !== userId) : [...prev, userId];
    });
  };

  const onSelectUser = (user: any) => {
    if (!currentUser) {
      Alert.alert("Authentication", "Please login to start a conversation");
      return;
    }
    if (isGroupMode) {
      toggleParticipant(user);
    } else {
      newConversation({
        type: "direct",
        participants: [currentUser.id, user.id],
      });
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || !currentUser || selectedParticipants.length < 2)
      return;
    setIsLoading(true);
    try {
      let avatar: any = null;
      if (groupAvatar) {
        const uploadResult = await uploadFileToCloudinary(
          groupAvatar,
          "group-avatar",
        );
        if (uploadResult.success) avatar = uploadResult.data;
      }
      newConversation({
        type: "group",
        participants: [currentUser.id, ...selectedParticipants],
        name: groupName,
        avatar,
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onPickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setGroupAvatar(result.assets[0]);
  };

  useEffect(() => {
    if (!token) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const id = setTimeout(async () => {
      try {
        const users = await searchUsers(token, trimmed);
        const currentId = currentUser?.id ? String(currentUser.id) : "";

        setSearchResults(
          (users || [])
            .filter((u: any) => String(u?._id || "") !== currentId)
            .slice(0, 8)
            .map((u: any) => ({
              id: u._id,
              name: u.name,
              avatar: u.avatar,
              username: u.username,
              online: u.online,
              lastSeen: u.lastSeen,
            })),
        );
      } catch (err: any) {
        console.log("searchUsers error:", err?.response?.data || err.message);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [query, token, currentUser?.id]);

  const recentChatUsers = React.useMemo(() => {
    if (!currentUser?.id) return [];
    const currentId = String(currentUser.id);

    const bestByUserId = new Map<
      string,
      {
        id: string;
        name: string;
        avatar: string | null;
        username?: string | null;
        online?: boolean;
        lastSeen?: string | null;
        lastChatAt: number;
      }
    >();

    (recentConversations || []).forEach((c: any) => {
      // Only use direct conversations for the "recent chats" user list.
      // Otherwise a single group chat would expand into many unrelated users.
      if (String(c?.type) !== "direct") return;
      const parts: any[] = Array.isArray(c?.participants) ? c.participants : [];
      const updatedAt =
        (c?.lastMessage?.createdAt && Date.parse(String(c.lastMessage.createdAt))) ||
        (c?.updatedAt && Date.parse(String(c.updatedAt))) ||
        (c?.createdAt && Date.parse(String(c.createdAt))) ||
        0;

      parts.forEach((p: any) => {
        const id = String(p?._id || p?.id || "");
        if (!id || id === currentId) return;

        const prev = bestByUserId.get(id);
        if (!prev || updatedAt > prev.lastChatAt) {
          bestByUserId.set(id, {
            id,
            name: String(p?.name || "User"),
            avatar: p?.avatar ?? null,
            username: p?.username ?? null,
            online: p?.online,
            lastSeen: p?.lastSeen ?? null,
            lastChatAt: updatedAt,
          });
        }
      });
    });

    return Array.from(bestByUserId.values()).sort(
      (a, b) => b.lastChatAt - a.lastChatAt,
    );
  }, [currentUser?.id, recentConversations]);

  const data = query.trim() ? searchResults : recentChatUsers;

  const getUserPresence = (user: any) => {
    const id = String(user?.id || "");
    const live = id ? presence[id] : undefined;
    return {
      online: live?.online ?? !!user?.online,
      lastSeen: live?.lastSeen ?? user?.lastSeen ?? null,
    };
  };

  const chipUserById = React.useMemo(() => {
    const map: Record<string, any> = { ...selectedUserById };
    recentChatUsers.forEach((u: any) => {
      const id = String(u?.id || "");
      if (id && !map[id]) map[id] = u;
    });
    searchResults.forEach((u: any) => {
      const id = String(u?.id || "");
      if (id && !map[id]) map[id] = u;
    });
    return map;
  }, [recentChatUsers, searchResults, selectedUserById]);

  const showCreateBtn = isGroupMode && selectedParticipants.length >= 2;

  return (
    <ScreenWrapper isModal={true}>
      <View style={s.container}>
        {/* ── Header ── */}
        <Header
          style={{ marginVertical: 20 }}
          title={isGroupMode ? "New Group" : "New Message"}
          leftIcon={<BackButton color={PALETTE.black} />}
        />

        {/* ── Group info (avatar + name) ── */}
        {isGroupMode && (
          <View style={s.groupCard}>
            <TouchableOpacity
              onPress={onPickImage}
              style={s.avatarBtn}
              activeOpacity={0.8}
            >
              <Avatar uri={groupAvatar?.uri || null} size={68} isGroup={true} />
              <View style={s.cameraChip}>
                <Text style={s.cameraEmoji}>📷</Text>
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TextInput
                style={s.groupNameInput}
                placeholder="Group name…"
                placeholderTextColor={PALETTE.neutral500}
                value={groupName}
                onChangeText={setGroupName}
              />
              <Text
                style={[
                  s.groupHint,
                  selectedParticipants.length >= 2 && s.groupHintReady,
                ]}
              >
                {selectedParticipants.length} of 2+ members selected
              </Text>
            </View>
          </View>
        )}

        {/* ── Selected chips ── */}
        {isGroupMode && (
          <SelectedChips
            participants={selectedParticipants}
            userById={chipUserById}
            onRemove={(id) => toggleParticipant({ id })}
          />
        )}

        {/* ── Search bar ── */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          loading={searchLoading}
        />

        {/* ── List ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.list,
            {
              paddingBottom: showCreateBtn ? verticalScale(110) : spacingY._20,
            },
          ]}
        >
          {data.length > 0 && (
            <SectionLabel
              label={query.trim() ? "Search results" : "Recent chats"}
              count={data.length}
            />
          )}

          {data.length === 0 && !searchLoading && <EmptyState query={query} />}

          {data.map((user: any, index: number) => (
            <ContactRow
              key={user.id ?? index}
              user={user}
              isSelected={selectedParticipants.includes(user.id)}
              isGroupMode={isGroupMode}
              presence={getUserPresence(user)}
              onPress={() => onSelectUser(user)}
            />
          ))}
        </ScrollView>

        {/* ── Create group button ── */}
        {showCreateBtn && (
          <View style={s.fab}>
            <TouchableOpacity
              style={[
                s.fabBtn,
                (!groupName.trim() || isLoading) && s.fabBtnDisabled,
              ]}
              onPress={createGroup}
              disabled={!groupName.trim() || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={PALETTE.white} />
              ) : (
                <>
                  <Text style={s.fabText}>Create Group</Text>
                  <Text style={s.fabArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

export default NewConversationModal;

// ─── Root styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
    paddingHorizontal: spacingX._15,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarBtn: { position: "relative" },
  cameraChip: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: PALETTE.surface,
  },
  cameraEmoji: { fontSize: 12 },
  groupNameInput: {
    height: 36,
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.black,
    borderBottomWidth: 2,
    borderBottomColor: PALETTE.primary,
    paddingVertical: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
    marginBottom: 4,
  },
  groupHint: {
    fontSize: 12,
    color: PALETTE.neutral500,
    fontWeight: "500",
  },
  groupHintReady: {
    color: PALETTE.green,
  },
  list: {
    paddingTop: 4,
  },
  fab: {
    position: "absolute",
    bottom: 0,
    left: spacingX._15,
    right: spacingX._15,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    paddingTop: 12,
    backgroundColor: PALETTE.bg,
  },
  fabBtn: {
    backgroundColor: PALETTE.primary,
    borderRadius: 18,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: PALETTE.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  fabBtnDisabled: {
    backgroundColor: PALETTE.neutral300,
    shadowOpacity: 0,
  },
  fabText: {
    color: PALETTE.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  fabArrow: {
    color: PALETTE.white,
    fontSize: 20,
    fontWeight: "300",
  },
});
