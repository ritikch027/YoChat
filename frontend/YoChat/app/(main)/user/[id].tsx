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

export default function UserDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const name = String(params?.name ?? "User");
  const usernameRaw = params?.username ? String(params.username) : "";
  const username = usernameRaw
    ? usernameRaw.startsWith("@")
      ? usernameRaw
      : `@${usernameRaw}`
    : "";
  const email = params?.email ? String(params.email) : "";
  const avatar = params?.avatar ? String(params.avatar) : null;
  const online = String(params?.online ?? "0") === "1";
  const lastSeen = params?.lastSeen ? String(params.lastSeen) : "";

  const status = useMemo(() => {
    if (online) return "Online";
    if (lastSeen) return `Last seen ${lastSeen}`;
    return "Offline";
  }, [lastSeen, online]);

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.5}>
      <View style={styles.container}>
        <Header
          style={styles.header}
          leftIcon={
            <View style={styles.headerLeft}>
              <BackButton />
              <Typo color={colors.white} size={20} fontWeight={"600"}>
                Profile
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
            <Avatar uri={avatar} size={104} />
            {online && <View style={styles.onlineDot} />}
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
          {username ? (
            <Typo
              size={14}
              color={colors.neutral200}
              textProps={{ numberOfLines: 1 }}
            >
              {username}
            </Typo>
          ) : null}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: online ? "#22C55E" : colors.neutral400 },
              ]}
            />
            <Typo size={13} color={colors.white}>
              {status}
            </Typo>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionChip,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.back()}
            >
              <Icons.ChatTeardropDotsIcon
                size={18}
                color={colors.white}
                weight="fill"
              />
              <Typo size={13} color={colors.white} fontWeight={"700"}>
                Message
              </Typo>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionChipSecondary,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {}}
            >
              <Icons.BellSimpleSlashIcon
                size={18}
                color={colors.white}
                weight="fill"
              />
              <Typo size={13} color={colors.white} fontWeight={"700"}>
                Mute
              </Typo>
            </Pressable>
          </View>
        </View>

        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacingY._20 }}
          >
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icons.EnvelopeSimpleIcon
                  size={18}
                  color={colors.neutral600}
                  weight="fill"
                />
                <Typo size={12} color={colors.neutral600} fontWeight={"800"}>
                  EMAIL
                </Typo>
              </View>
              <Typo
                size={16}
                color={colors.neutral900}
                textProps={{ numberOfLines: 1 }}
              >
                {email || "—"}
              </Typo>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icons.IdentificationCardIcon
                  size={18}
                  color={colors.neutral600}
                  weight="fill"
                />
                <Typo size={12} color={colors.neutral600} fontWeight={"800"}>
                  USERNAME
                </Typo>
              </View>
              <Typo size={16} color={colors.neutral900}>
                {username || "—"}
              </Typo>
            </View>
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
    paddingBottom: spacingY._20,
  },
  avatarRing: {
    position: "relative",
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  onlineDot: {
    position: "absolute",
    bottom: 6,
    right: 6,
    height: 14,
    width: 14,
    borderRadius: radius.full,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: colors.neutral900,
  },
  statusPill: {
    marginTop: spacingY._10,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._7,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
  },
  statusDot: {
    height: 8,
    width: 8,
    borderRadius: radius.full,
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
  section: {
    gap: 6,
    paddingVertical: spacingY._12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral100,
  },
});
