import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
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
  getContacts,
  newConversation,
  presenceGet,
  presenceInit,
  presenceUpdate,
} from "@/socket/socketEvents";
import { uploadFileToCloudinary } from "@/services/imageService";
import { searchUsers } from "@/services/usernameService";
import moment from "moment";
const NewConversationModal = () => {
  const { isGroup } = useLocalSearchParams();
  const isGroupMode = isGroup == "1";
  const router = useRouter();
  const [groupAvatar, setGroupAvatar] = useState<{ uri: string } | null>(null);
  const [groupName, setGroupName] = useState("");
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [presence, setPresence] = useState<
    Record<string, { online: boolean; lastSeen?: string | null }>
  >({});
  const { user: currentUser, token } = useAuth();

  useEffect(() => {
    getContacts(processGetContacts);
    newConversation(processNewConversation);
    presenceInit(processPresenceInit);
    presenceUpdate(processPresenceUpdate);
    presenceGet();
    getContacts(null);
    return () => {
      getContacts(processGetContacts, true);
      newConversation(processNewConversation, true);
      presenceInit(processPresenceInit, true);
      presenceUpdate(processPresenceUpdate, true);
    };
  }, []);

  const processGetContacts = (res: any) => {
    // console.log("got contacts: ", res);
    if (res.success) {
      setContacts(res.data);
    }
  };
  const processNewConversation = (res: any) => {
    console.log("new Conversation: ", res.data.participants);
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
      console.log("Error fetching/creating conversation: ", res.msg);
      Alert.alert("Error", res.msg);
    }
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
    setSelectedParticipants((prev: any) => {
      if (prev.includes(user.id)) {
        return prev.filter((id: string) => id != user.id);
      }

      return [...prev, user.id];
    });
  };

  const onSelectUser = (user: any) => {
    if (!currentUser) {
      Alert.alert("Authentication", "Pleaselogin to start a conversation");
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
          "group-avatar"
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
      console.log("Error creating group: ", error);
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onPickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      // allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setGroupAvatar(result.assets[0]);
    }
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

        // Normalize to match your contacts shape
        const normalized = users.map((u) => ({
          id: u._id,
          name: u.name,
          avatar: u.avatar,
          username: u.username,
          online: u.online,
          lastSeen: u.lastSeen,
        }));

        setSearchResults(normalized);
      } catch (err: any) {
        console.log("searchUsers error:", err?.response?.data || err.message);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(id);
  }, [query, token]);

  const data = query.trim() ? searchResults : contacts;

  const getUserPresence = (user: any) => {
    const id = String(user?.id || "");
    const live = id ? presence[id] : undefined;
    const online = live?.online ?? !!user?.online;
    const lastSeen = live?.lastSeen ?? user?.lastSeen ?? null;
    return { online, lastSeen };
  };

  return (
    <ScreenWrapper isModal={true}>
      <View style={styles.container}>
        <Header
          title={isGroupMode ? "New Group" : "Select User"}
          leftIcon={<BackButton color={colors.black} />}
        />
        <TextInput
          placeholder="Search by username or name (e.g. @ritik)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 12,
          }}
        />

        {searchLoading && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <ActivityIndicator />
            <Text style={{ marginLeft: 8 }}>Searching…</Text>
          </View>
        )}

        {isGroupMode && (
          <View style={styles.groupInfoIndicator}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity activeOpacity={0.9} onPress={onPickImage}>
                <Avatar
                  uri={groupAvatar?.uri || null}
                  size={100}
                  isGroup={true}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.groupNameContainer}>
              <Input
                placeholder="Group name"
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.contactList,
            {
              paddingBottom:
                isGroupMode && selectedParticipants.length >= 2
                  ? verticalScale(100)
                  : spacingY._20,
            },
          ]}
        >
          {data.map((user: any, index) => {
            const isSelected = selectedParticipants.includes(user.id);
            const p = getUserPresence(user);
            const statusText = p.online
              ? "Online"
              : p.lastSeen
                ? `Last seen ${moment(p.lastSeen).fromNow()}`
                : "Offline";
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                key={index}
                style={[styles.contactRow]}
                onPress={() => onSelectUser(user)}
              >
                <Avatar size={45} uri={user.avatar} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 10,
                        backgroundColor: p.online ? colors.green : colors.neutral400,
                      }}
                    />
                    <Typo fontWeight={"600"}>{user.name}</Typo>
                  </View>
                  <Typo size={13} color={colors.neutral600}>
                    {user?.username ? `@${user.username}  ` : ""}
                    {statusText}
                  </Typo>
                </View>
                {isGroupMode && (
                  <View style={styles.selectionIndicator}>
                    <View
                      style={[styles.checkBox, isSelected && styles.checked]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isGroupMode && selectedParticipants.length >= 2 && (
          <View style={styles.createGroupButton}>
            <Button
              onPress={createGroup}
              disabled={!groupName.trim()}
              loading={isLoading}
            >
              <Typo fontWeight={"bold"} size={17}>
                Create Group
              </Typo>
            </Button>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

export default NewConversationModal;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacingX._15,
    flex: 1,
  },
  groupInfoIndicator: {
    alignItems: "center",
    marginTop: spacingY._10,
  },
  avatarContainer: {
    marginBottom: spacingY._20,
  },
  groupNameContainer: {
    width: "100%",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingY._10,
    paddingVertical: radius._10,
  },
  contactList: {
    gap: spacingY._5,
    marginTop: spacingY._10,
    paddingTop: spacingY._10,
    // paddingBottom: verticalScale(100),
  },
  selectionIndicator: {
    marginLeft: "auto",
    marginRight: spacingX._10,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  checked: {
    backgroundColor: colors.primary,
  },
  createGroupButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacingX._15,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
  },
});
