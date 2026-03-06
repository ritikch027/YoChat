import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenWrapper from "@/components/ScreenWrapper";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import * as Icons from "phosphor-react-native";

type Participant = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  username?: string | null;
  avatar?: string | null;
};

export default function GroupDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const name = String(params?.name ?? "Group");
  const avatar = params?.avatar ? String(params.avatar) : null;
  const participantsRaw = params?.participants ? String(params.participants) : "[]";

  const participants: Participant[] = useMemo(() => {
    try {
      const parsed = JSON.parse(participantsRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [participantsRaw]);

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.5}>
      <View style={styles.container}>
        <Header
          style={styles.header}
          leftIcon={
            <View style={styles.headerLeft}>
              <BackButton />
              <Typo color={colors.white} size={20} fontWeight={"600"}>
                Group details
              </Typo>
            </View>
          }
          rightIcon={
            <Pressable
              onPress={() => router.back()}
              style={styles.closeBtn}
              hitSlop={10}
            >
              <Icons.XIcon color={colors.white} weight="bold" size={18} />
            </Pressable>
          }
        />

        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <Avatar uri={avatar} size={104} isGroup={true} />
          </View>
          <Typo
            size={24}
            fontWeight={"800"}
            color={colors.white}
            textProps={{ numberOfLines: 1 }}
            style={{ marginTop: spacingY._10 }}
          >
            {name}
          </Typo>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Icons.UsersThreeIcon
                size={16}
                color={colors.white}
                weight="fill"
              />
              <Typo size={13} color={colors.white}>
                {participants.length} member{participants.length === 1 ? "" : "s"}
              </Typo>
            </View>
            <View style={styles.metaPillMuted}>
              <Icons.LockSimpleIcon
                size={16}
                color={colors.white}
                weight="fill"
              />
              <Typo size={13} color={colors.white}>
                Private
              </Typo>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionChip,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {}}
            >
              <Icons.UserPlusIcon
                size={18}
                color={colors.white}
                weight="fill"
              />
              <Typo size={13} color={colors.white} fontWeight={"700"}>
                Add
              </Typo>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionChipSecondary,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {}}
            >
              <Icons.ImageIcon
                size={18}
                color={colors.white}
                weight="fill"
              />
              <Typo size={13} color={colors.white} fontWeight={"700"}>
                Media
              </Typo>
            </Pressable>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sectionHeader}>
            <Icons.UsersIcon size={18} color={colors.neutral600} weight="fill" />
            <Typo size={12} color={colors.neutral600} fontWeight={"800"}>
              MEMBERS
            </Typo>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacingY._20 }}
          >
            {participants.map((p, idx) => {
              const id = String(p?._id ?? p?.id ?? "");
              const username = p?.username
                ? `@${String(p.username).replace(/^@/, "")}`
                : "";
              return (
                <View key={id || String(idx)} style={styles.memberRow}>
                  <Avatar uri={p?.avatar ?? null} size={44} />
                  <View style={{ flex: 1 }}>
                    <Typo
                      size={16}
                      fontWeight={"800"}
                      color={colors.neutral900}
                      textProps={{ numberOfLines: 1 }}
                    >
                      {p?.name || "User"}
                    </Typo>
                    <Typo
                      size={13}
                      color={colors.neutral500}
                      textProps={{ numberOfLines: 1 }}
                    >
                      {username || p?.email || ""}
                    </Typo>
                  </View>
                  <View style={styles.chev}>
                    <Icons.CaretRightIcon
                      size={18}
                      color={colors.neutral400}
                      weight="bold"
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._15 },
  header: {
    paddingTop: spacingY._10,
    paddingBottom: spacingY._10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
  },
  closeBtn: {
    height: 34,
    width: 34,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  hero: {
    alignItems: "center",
    paddingBottom: spacingY._15,
  },
  avatarRing: {
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  metaRow: {
    marginTop: spacingY._10,
    flexDirection: "row",
    gap: spacingX._10,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._7,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  metaPillMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._7,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  actionRow: {
    marginTop: spacingY._15,
    flexDirection: "row",
    gap: spacingX._10,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  actionChipSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._10,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius._50,
    borderTopRightRadius: radius._50,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._15,
    paddingTop: spacingY._15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    paddingBottom: spacingY._10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
    paddingVertical: spacingY._12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  chev: {
    height: 28,
    width: 28,
    borderRadius: radius.full,
    backgroundColor: colors.neutral50,
    justifyContent: "center",
    alignItems: "center",
  },
});
