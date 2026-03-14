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
import { colors, spacingX, spacingY } from "@/constants/theme";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import { useAppTheme } from "@/hooks/useAppTheme";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/authContext";
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
// (theme-driven; no local palette)

// ─── Sub-components ───────────────────────────────────────────────────────────

const SearchBar = ({
  value,
  onChangeText,
  loading,
}: {
  value: string;
  onChangeText: (t: string) => void;
  loading: boolean;
}) => {
  const theme = useAppTheme();
  return (
  <View
    style={[
      sb.wrapper,
      {
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.surfaceBorder,
      },
    ]}
  >
    {/* magnifier icon — drawn with pure View */}
    <View style={sb.iconWrap}>
      <View style={[sb.lens, { borderColor: theme.colors.textSecondary }]} />
      <View style={[sb.handle, { backgroundColor: theme.colors.textSecondary }]} />
    </View>
    <TextInput
      style={[sb.input, { color: theme.colors.textPrimary }]}
      placeholder="Search by name or @username…"
      placeholderTextColor={theme.colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
    />
    {loading && (
      <ActivityIndicator
        size="small"
        color={theme.colors.primary}
        style={{ marginRight: 12 }}
      />
    )}
    {!loading && value.length > 0 && (
      <TouchableOpacity
        onPress={() => onChangeText("")}
        style={[sb.clearBtn, { backgroundColor: theme.colors.chipBg }]}
      >
        <Text style={sb.clearText}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
  );
};

const sb = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 50,
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
    position: "absolute",
    top: 0,
    left: 0,
  },
  handle: {
    width: 6,
    height: 2,
    borderRadius: 1,
    position: "absolute",
    bottom: 0,
    right: 0,
    transform: [{ rotate: "45deg" }],
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  clearText: { fontSize: 10, fontWeight: "700" },
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
  const theme = useAppTheme();
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
            style={[
              chip.wrap,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.colors.surfaceBorder,
              },
            ]}
          >
            <Avatar size={26} uri={user?.avatar} />
            <Text
              style={[chip.name, { color: theme.colors.primaryDark }]}
              numberOfLines={1}
            >
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
    borderRadius: 20,
    maxHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 70,
  },
  x: { fontSize: 10, fontWeight: "700" },
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
  const theme = useAppTheme();

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
          style={[
            cr.row,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.surfaceBorder,
            },
            isSelected && {
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.primaryLight,
            },
          ]}
          onPress={handlePress}
        >
          <View style={cr.avatarWrap}>
            <Avatar size={48} uri={user.avatar} />
            <View
              style={[
                cr.dot,
                { borderColor: theme.colors.surfaceElevated },
                presence.online ? cr.dotOnline : cr.dotOffline,
              ]}
            />
          </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[cr.name, { color: theme.colors.textPrimary }]}>{user.name}</Text>
          <Text style={[cr.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {user?.username ? `@${user.username}  · ` : ""}
            <Text
              style={[
                cr.status,
                { color: theme.colors.textSecondary },
                presence.online && { color: theme.colors.green, fontWeight: "600" },
              ]}
            >
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
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  rowSelected: {
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
  },
  dotOnline: { backgroundColor: "#22C55E" },
  dotOffline: { backgroundColor: "rgba(0,0,0,0.18)" },
  name: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  meta: { fontSize: 12.5 },
  status: {},
  statusOnline: { fontWeight: "600" },
  checkOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  checkOuterSel: {
    borderColor: "transparent",
  },
  checkInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  arrowText: { fontSize: 20, marginTop: -2 },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ query }: { query: string }) => {
  const theme = useAppTheme();
  return (
  <View style={es.wrap}>
    <View style={[es.icon, { backgroundColor: theme.colors.primaryLight }]}>
      <Text style={es.emoji}>{query ? "🔍" : "👥"}</Text>
    </View>
    <Text style={[es.title, { color: theme.colors.textPrimary }]}>
      {query ? "No results found" : "No recent chats yet"}
    </Text>
    <Text style={[es.sub, { color: theme.colors.textSecondary }]}>
      {query
        ? `Try searching for a different name or @username`
        : `Search to start a new conversation`}
    </Text>
  </View>
  );
};

const es = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emoji: { fontSize: 30 },
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ label, count }: { label: string; count: number }) => {
  const theme = useAppTheme();
  return (
    <View style={sl.row}>
      <Text style={[sl.text, { color: theme.colors.textSecondary }]}>{label}</Text>
      {count > 0 && (
        <View style={[sl.badge, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[sl.badgeText, { color: theme.colors.primaryDark }]}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
};

const sl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

// ─── Main component ───────────────────────────────────────────────────────────
  const NewConversationModal = () => {
  const { isGroup } = useLocalSearchParams();
  const isGroupMode = String(isGroup) === "1";
  const router = useRouter();
  const theme = useAppTheme();

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
  const fabDisabled = !groupName.trim() || isLoading;

  return (
    <ScreenWrapper isModal={true}>
      <View style={[s.container, { backgroundColor: theme.colors.surfaceCard }]}>
        {/* ── Header ── */}
        <Header
          style={{ marginVertical: 20 }}
          title={isGroupMode ? "New Group" : "New Message"}
          leftIcon={<BackButton color={theme.colors.textPrimary} />}
        />

        {/* ── Group info (avatar + name) ── */}
        {isGroupMode && (
          <View
            style={[
              s.groupCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.surfaceBorder,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onPickImage}
              style={s.avatarBtn}
              activeOpacity={0.8}
            >
              <Avatar uri={groupAvatar?.uri || null} size={68} isGroup={true} />
              <View
                style={[
                  s.cameraChip,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.surfaceElevated,
                  },
                ]}
              >
                <Text style={s.cameraEmoji}>📷</Text>
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[
                  s.groupNameInput,
                  {
                    color: theme.colors.textPrimary,
                    borderBottomColor: theme.colors.primaryDark,
                  },
                ]}
                placeholder="Group name…"
                placeholderTextColor={theme.colors.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
              />
                <Text
                  style={[
                    s.groupHint,
                    { color: theme.colors.textSecondary },
                    selectedParticipants.length >= 2 && [
                      s.groupHintReady,
                      { color: theme.colors.green },
                    ],
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
          <View style={[s.fab, { backgroundColor: theme.colors.surfaceCard }]}>
            <TouchableOpacity
              style={[
                s.fabBtn,
                fabDisabled && s.fabBtnDisabled,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.surfaceBorder,
                },
              ]}
              onPress={createGroup}
              disabled={fabDisabled}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <>
                  <Text style={[s.fabText, { color: theme.colors.onPrimary }]}>
                    Create Group
                  </Text>
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
    paddingHorizontal: spacingX._15,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1.5,
  },
  avatarBtn: { position: "relative" },
  cameraChip: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  cameraEmoji: { fontSize: 12 },
  groupNameInput: {
    height: 36,
    fontSize: 16,
    fontWeight: "700",
    borderBottomWidth: 2,
    paddingVertical: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
    marginBottom: 4,
  },
  groupHint: {
    fontSize: 12,
    fontWeight: "500",
  },
  groupHintReady: {},
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
  },
  fabBtn: {
    borderRadius: 18,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  fabBtnDisabled: {
    opacity: 0.7,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  fabArrow: {
    color: colors.neutral900,
    fontSize: 20,
    fontWeight: "300",
  },
});
