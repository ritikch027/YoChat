import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import {
  RenderModeType,
  RtcSurfaceView,
  VideoSourceType,
} from "react-native-agora";
import * as Icons from "phosphor-react-native";

import Avatar from "@/components/Avatar";
import Typo from "@/components/Typo";
import { useCall } from "@/contexts/callContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";

function ControlButton({
  icon,
  label,
  onPress,
  danger = false,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.controlBtn,
        danger ? styles.controlBtnDanger : active ? styles.controlBtnActive : null,
      ]}
    >
      {icon}
      <Typo size={12} color={colors.white}>
        {label}
      </Typo>
    </Pressable>
  );
}

export default function CallOverlay() {
  const theme = useAppTheme();
  const {
    currentCall,
    remoteRtcUid,
    localJoined,
    isMuted,
    isSpeakerOn,
    isVideoEnabled,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
    toggleMute,
    toggleSpeaker,
    toggleVideo,
    switchCamera,
  } = useCall();

  if (!currentCall) return null;

  const isIncomingRinging =
    currentCall.direction === "incoming" && currentCall.status === "ringing";
  const isVideoCall = currentCall.mediaType === "video";

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: theme.colors.surfaceBg }]}>
        <View style={styles.topSection}>
          {isVideoCall && currentCall.status !== "ringing" ? (
            <View style={styles.videoStage}>
              {remoteRtcUid ? (
                <RtcSurfaceView
                  style={styles.remoteVideo}
                  canvas={{
                    uid: remoteRtcUid,
                    sourceType: VideoSourceType.VideoSourceRemote,
                    renderMode: RenderModeType.RenderModeHidden,
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.placeholderCard,
                    { backgroundColor: theme.colors.surfaceElevated },
                  ]}
                >
                  <Avatar size={90} uri={currentCall.peer.avatar ?? null} />
                  <Typo size={18} color={theme.colors.textPrimary} fontWeight={"700"}>
                    {currentCall.peer.name}
                  </Typo>
                  <Typo size={14} color={theme.colors.textSecondary}>
                    Waiting for video...
                  </Typo>
                </View>
              )}

              {localJoined && isVideoEnabled ? (
                <RtcSurfaceView
                  style={styles.localPreview}
                  zOrderMediaOverlay={true}
                  canvas={{
                    uid: 0,
                    sourceType: VideoSourceType.VideoSourceCamera,
                    renderMode: RenderModeType.RenderModeHidden,
                  }}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.audioStage}>
              <Avatar size={112} uri={currentCall.peer.avatar ?? null} />
              <Typo size={24} color={theme.colors.textPrimary} fontWeight={"700"}>
                {currentCall.peer.name}
              </Typo>
            </View>
          )}

          <Typo size={16} color={theme.colors.textSecondary}>
            {currentCall.statusLabel}
          </Typo>
        </View>

        <View style={styles.bottomSection}>
          {isIncomingRinging ? (
            <View style={styles.actionRow}>
              <ControlButton
                label="Decline"
                danger={true}
                onPress={rejectIncomingCall}
                icon={<Icons.PhoneXIcon size={22} color={colors.white} weight="fill" />}
              />
              <ControlButton
                label="Accept"
                active={true}
                onPress={acceptIncomingCall}
                icon={<Icons.PhoneCallIcon size={22} color={colors.white} weight="fill" />}
              />
            </View>
          ) : (
            <View style={styles.actionRow}>
              <ControlButton
                label={isMuted ? "Unmute" : "Mute"}
                active={isMuted}
                onPress={toggleMute}
                icon={
                  isMuted ? (
                    <Icons.MicrophoneSlashIcon size={22} color={colors.white} weight="fill" />
                  ) : (
                    <Icons.MicrophoneIcon size={22} color={colors.white} weight="fill" />
                  )
                }
              />
              <ControlButton
                label={isSpeakerOn ? "Speaker" : "Earpiece"}
                active={isSpeakerOn}
                onPress={toggleSpeaker}
                icon={<Icons.SpeakerHighIcon size={22} color={colors.white} weight="fill" />}
              />
              {isVideoCall ? (
                <ControlButton
                  label={isVideoEnabled ? "Video on" : "Video off"}
                  active={isVideoEnabled}
                  onPress={toggleVideo}
                  icon={
                    isVideoEnabled ? (
                      <Icons.VideoCameraIcon size={22} color={colors.white} weight="fill" />
                    ) : (
                      <Icons.VideoCameraSlashIcon size={22} color={colors.white} weight="fill" />
                    )
                  }
                />
              ) : null}
              {isVideoCall ? (
                <ControlButton
                  label="Flip"
                  onPress={switchCamera}
                  icon={<Icons.CameraRotateIcon size={22} color={colors.white} weight="fill" />}
                />
              ) : null}
              <ControlButton
                label="End"
                danger={true}
                onPress={endCurrentCall}
                icon={<Icons.PhoneDisconnectIcon size={22} color={colors.white} weight="fill" />}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._20,
    paddingBottom: spacingY._30,
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacingY._15,
  },
  audioStage: {
    alignItems: "center",
    gap: spacingY._15,
  },
  videoStage: {
    width: "100%",
    flex: 1,
    minHeight: 320,
    borderRadius: radius._30,
    overflow: "hidden",
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
  },
  localPreview: {
    position: "absolute",
    right: spacingX._15,
    top: spacingY._15,
    width: 110,
    height: 180,
    borderRadius: radius._20,
    overflow: "hidden",
  },
  placeholderCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacingY._12,
    borderRadius: radius._20,
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._20,
  },
  bottomSection: {
    gap: spacingY._15,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacingX._12,
  },
  controlBtn: {
    minWidth: 84,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._10,
    borderRadius: radius._20,
    backgroundColor: "#1F2937",
    alignItems: "center",
    gap: spacingY._5,
  },
  controlBtnActive: {
    backgroundColor: "#0F766E",
  },
  controlBtnDanger: {
    backgroundColor: "#B91C1C",
  },
});
