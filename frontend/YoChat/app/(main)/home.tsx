import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { useAuth } from "@/contexts/authContext";
import Button from "@/components/Button";
import * as Icons from "phosphor-react-native";
import {
  getConversations,
  newConversation,
  newMessage,
  testSocket,
} from "@/socket/socketEvents";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import ConversationItem from "@/components/ConversationItem";
import Loading from "@/components/Loading";
import { ConversationProps, ResponseProps } from "@/types";

const Home = () => {
  const { user: currentUser, signOut } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationProps[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  // console.log("user: ",user);

  useEffect(() => {
    getConversations(processConversations);
    newConversation(NewConversationHandler);
    newMessage(newMessageHandler);
    // console.log("before calling");
    setLoading(true);
    getConversations(null);
    return () => {
      getConversations(processConversations, true);
      newConversation(NewConversationHandler, true);
      newMessage(newMessageHandler, true);
    };
  }, []);

  const processConversations = (res: ResponseProps) => {
    // console.log("called");
    // console.log("got res ", res);
    setLoading(false);
    if (res.success) {
      setConversations(res.data);
    }
  };

  const NewConversationHandler = (res: ResponseProps) => {
    if (res.success && res.data.isNew) {
      setConversations((prev) => [...prev, res.data]);
    }
  };
  const newMessageHandler = (res: ResponseProps) => {
    if (res.success) {
      let conversationId = res.data.conversationId;
      setConversations((prev) => {
        let updatedConversations = prev.map((item) => {
          if (item._id == conversationId) item.lastMessage = res.data;
          return item;
        });
        return updatedConversations;
      });
    }
  };

  let directConversations = conversations
    .filter((item: ConversationProps) => item.type == "direct")
    .sort((a: ConversationProps, b: ConversationProps) => {
      const aDate = a?.lastMessage?.createdAt || a.createdAt;
      const bDate = b?.lastMessage?.createdAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  let groupConversations = conversations
    .filter((item: ConversationProps) => item.type == "group")
    .sort((a: ConversationProps, b: ConversationProps) => {
      const aDate = a?.lastMessage?.createdAt || a.createdAt;
      const bDate = b?.lastMessage?.createdAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.4}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Typo
              color={colors.neutral200}
              size={19}
              textProps={{ numberOfLines: 1 }}
            >
              Welcome Back,{" "}
              <Typo color={colors.white} size={20} fontWeight={"800"}>
                {currentUser?.name}
              </Typo>{" "}
              👋
            </Typo>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.settingIcon}
            onPress={() => router.push("/(modals)/profileModal")}
          >
            <Icons.GearSixIcon
              color={colors.white}
              weight="fill"
              size={verticalScale(22)}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacingY._20 }}
          >
            <View style={styles.navBar}>
              <View style={styles.tabs}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedTab(0)}
                  style={[
                    styles.tabStyle,
                    selectedTab == 0 && styles.activeTabStyle,
                  ]}
                >
                  <Typo>Direct Messages</Typo>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedTab(1)}
                  style={[
                    styles.tabStyle,
                    selectedTab == 1 && styles.activeTabStyle,
                  ]}
                >
                  <Typo>Groups</Typo>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.conversationList}>
              {selectedTab == 0 &&
                directConversations.map((item: ConversationProps, index) => {
                  return (
                    <ConversationItem
                      item={item}
                      key={index}
                      router={router}
                      showDivider={directConversations.length != index + 1}
                    />
                  );
                })}
              {selectedTab == 1 &&
                groupConversations.map((item: any, index) => {
                  return (
                    <ConversationItem
                      item={item}
                      key={index}
                      router={router}
                      showDivider={groupConversations.length != index + 1}
                    />
                  );
                })}

              {!loading &&
                selectedTab == 0 &&
                directConversations.length == 0 && (
                  <Typo style={{ textAlign: "center" }}>
                    You don{"'"}t have any messages
                  </Typo>
                )}
              {!loading &&
                selectedTab == 1 &&
                groupConversations.length == 0 && (
                  <Typo style={{ textAlign: "center" }}>
                    You haven{"'"}t joined any groups yet!
                  </Typo>
                )}

              {loading && <Loading />}
            </View>
          </ScrollView>
        </View>
      </View>

      <Button
        style={styles.floatingButton}
        onPress={() =>
          router.push({
            pathname: "/(modals)/NewConversationModal",
            params: { isGroup: selectedTab },
          })
        }
      >
        <Icons.PlusIcon
          color={colors.black}
          weight="bold"
          size={verticalScale(24)}
        />
      </Button>
    </ScreenWrapper>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacingX._20,
    gap: spacingY._15,
    paddingTop: spacingY._15,
    paddingBottom: spacingY._20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius._50,
    borderTopRightRadius: radius._50,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: spacingX._20,
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
    backgroundColor: colors.neutral100,
  },
  activeTabStyle: {
    backgroundColor: colors.primaryLight,
  },
  conversationList: {
    paddingVertical: spacingY._20,
  },
  settingIcon: {
    padding: spacingY._10,
    backgroundColor: colors.neutral700,
    borderRadius: radius.full,
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
