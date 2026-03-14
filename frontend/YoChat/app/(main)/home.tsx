import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import Button from "@/components/Button";
import ConversationItem from "@/components/ConversationItem";
import Loading from "@/components/Loading";
import { useAuth } from "@/contexts/authContext";
import { useThemeMode } from "@/contexts/themeContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { ConversationProps, ResponseProps } from "@/types";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { getConversations, newConversation, newMessage } from "@/socket/socketEvents";

const Home = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const { resolvedScheme, setMode } = useThemeMode();

  const [conversations, setConversations] = useState<ConversationProps[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const processConversations = (res: ResponseProps) => {
    setLoading(false);
    if (res.success) setConversations(res.data);
  };

  const NewConversationHandler = (res: ResponseProps) => {
    if (res.success && res.data.isNew) {
      setConversations((prev) => [...prev, res.data]);
    }
  };

  const newMessageHandler = (res: ResponseProps) => {
    if (res.success) {
      const conversationId = res.data.conversationId;
      setConversations((prev) =>
        prev.map((item) => {
          if (item._id === conversationId) item.lastMessage = res.data;
          return item;
        }),
      );
    }
  };

  useEffect(() => {
    getConversations(processConversations);
    newConversation(NewConversationHandler);
    newMessage(newMessageHandler);
    setLoading(true);
    getConversations(null);
    return () => {
      getConversations(processConversations, true);
      newConversation(NewConversationHandler, true);
      newMessage(newMessageHandler, true);
    };
  }, []);

  const [directConversations, groupConversations] = useMemo(() => {
    const sortByLast = (a: ConversationProps, b: ConversationProps) => {
      const aDate = a?.lastMessage?.createdAt || a.createdAt;
      const bDate = b?.lastMessage?.createdAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    };

    const direct = conversations
      .filter((item: ConversationProps) => item.type === "direct")
      .sort(sortByLast);
    const groups = conversations
      .filter((item: ConversationProps) => item.type === "group")
      .sort(sortByLast);

    return [direct, groups];
  }, [conversations]);

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.4}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Typo color={colors.neutral200} size={18} textProps={{ numberOfLines: 1 }}>
              Welcome back,{" "}
              <Typo color={colors.white} size={19} fontWeight={"800"}>
                {currentUser?.name}
              </Typo>{" "}
              👋
            </Typo>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            onPress={() => setMode(resolvedScheme === "dark" ? "light" : "dark")}
            onLongPress={() => setMode("system")}
          >
            {resolvedScheme === "dark" ? (
              <Icons.MoonStarsIcon
                color={theme.colors.textPrimary}
                weight="fill"
                size={verticalScale(22)}
              />
            ) : (
              <Icons.SunDimIcon
                color={theme.colors.textPrimary}
                weight="fill"
                size={verticalScale(22)}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surfaceElevated }]}
            onPress={() => router.push("/(modals)/profileModal")}
          >
            <Icons.GearSixIcon
              color={theme.colors.textPrimary}
              weight="fill"
              size={verticalScale(22)}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.content, { backgroundColor: theme.colors.surfaceCard }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacingY._15 }}
          >
            <View style={styles.navBar}>
              <View style={styles.tabs}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setSelectedTab(0)}
                  style={[
                    styles.tabStyle,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.surfaceBorder,
                    },
                    selectedTab === 0 && {
                      backgroundColor: theme.colors.primaryLight,
                      borderColor: "transparent",
                    },
                  ]}
                >
                  <Typo variant="chat_meta" style={{ color: theme.colors.textPrimary, fontWeight: "800" }}>
                    Direct
                  </Typo>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setSelectedTab(1)}
                  style={[
                    styles.tabStyle,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.surfaceBorder,
                    },
                    selectedTab === 1 && {
                      backgroundColor: theme.colors.primaryLight,
                      borderColor: "transparent",
                    },
                  ]}
                >
                  <Typo variant="chat_meta" style={{ color: theme.colors.textPrimary, fontWeight: "800" }}>
                    Groups
                  </Typo>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.conversationList}>
              {selectedTab === 0 &&
                directConversations.map((item: ConversationProps, index) => (
                  <ConversationItem
                    item={item}
                    key={item._id || String(index)}
                    router={router}
                    showDivider={directConversations.length !== index + 1}
                  />
                ))}

              {selectedTab === 1 &&
                groupConversations.map((item: ConversationProps, index) => (
                  <ConversationItem
                    item={item}
                    key={item._id || String(index)}
                    router={router}
                    showDivider={groupConversations.length !== index + 1}
                  />
                ))}

              {!loading && selectedTab === 0 && directConversations.length === 0 && (
                <Typo variant="chat_meta" style={{ textAlign: "center", color: theme.colors.textSecondary }}>
                  You don&apos;t have any messages.
                </Typo>
              )}

              {!loading && selectedTab === 1 && groupConversations.length === 0 && (
                <Typo variant="chat_meta" style={{ textAlign: "center", color: theme.colors.textSecondary }}>
                  You haven&apos;t joined any groups yet.
                </Typo>
              )}

              {loading && <Loading />}
            </View>
          </ScrollView>
        </View>
      </View>

      <Button
        style={[styles.floatingButton, { backgroundColor: theme.colors.primary }]}
        onPress={() =>
          router.push({
            pathname: "/(modals)/NewConversationModal",
            params: { isGroup: selectedTab },
          })
        }
      >
        <Icons.PlusIcon
          color={theme.colors.icon}
          weight="bold"
          size={verticalScale(24)}
        />
      </Button>
    </ScreenWrapper>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacingX._20,
    gap: spacingX._10,
    paddingTop: spacingY._15,
    paddingBottom: spacingY._15,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: radius._50,
    borderTopRightRadius: radius._50,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: spacingX._20,
  },
  iconBtn: {
    padding: spacingY._10,
    borderRadius: radius.full,
  },
  navBar: {
    flexDirection: "row",
    gap: spacingX._15,
    alignItems: "center",
    paddingHorizontal: spacingX._10,
  },
  tabs: {
    flexDirection: "row",
    gap: spacingX._10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabStyle: {
    paddingVertical: spacingY._10,
    paddingHorizontal: spacingX._20,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  conversationList: {
    paddingVertical: spacingY._15,
  },
  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: "absolute",
    bottom: verticalScale(30),
    right: verticalScale(30),
  },
});
