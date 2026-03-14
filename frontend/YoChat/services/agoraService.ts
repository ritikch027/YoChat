import {
  ChannelProfileType,
  ClientRoleType,
  ConnectionChangedReasonType,
  ConnectionStateType,
  createAgoraRtcEngine,
  IRtcEngineEventHandler,
  IRtcEngine,
  VideoSourceType,
} from "react-native-agora";

import { AGORA_APP_ID } from "@/constants";

let engine: IRtcEngine | null = null;
let initializedAppId = "";

function ensureEngine() {
  if (!AGORA_APP_ID) {
    throw new Error("Missing EXPO_PUBLIC_AGORA_APP_ID");
  }

  if (!engine) {
    engine = createAgoraRtcEngine();
  }

  if (initializedAppId !== AGORA_APP_ID) {
    engine.initialize({ appId: AGORA_APP_ID });
    initializedAppId = AGORA_APP_ID;
  }

  return engine;
}

export function addAgoraEventHandler(handler: IRtcEngineEventHandler) {
  const rtcEngine = ensureEngine();
  rtcEngine.registerEventHandler(handler);
  return () => rtcEngine.unregisterEventHandler(handler);
}

export function joinAgoraChannel({
  token,
  channelName,
  rtcUid,
  mediaType,
}: {
  token: string;
  channelName: string;
  rtcUid: number;
  mediaType: "audio" | "video";
}) {
  const rtcEngine = ensureEngine();

  rtcEngine.enableAudio();
  rtcEngine.setEnableSpeakerphone(true);

  if (mediaType === "video") {
    rtcEngine.enableVideo();
    rtcEngine.startPreview(VideoSourceType.VideoSourceCamera);
  } else {
    rtcEngine.stopPreview(VideoSourceType.VideoSourceCamera);
    rtcEngine.disableVideo();
  }

  rtcEngine.joinChannel(token, channelName, rtcUid, {
    channelProfile: ChannelProfileType.ChannelProfileCommunication,
    clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    publishMicrophoneTrack: true,
    publishCameraTrack: mediaType === "video",
    autoSubscribeAudio: true,
    autoSubscribeVideo: mediaType === "video",
  });
}

export function leaveAgoraChannel() {
  if (!engine) return;
  try {
    engine.stopPreview(VideoSourceType.VideoSourceCamera);
  } catch {}
  try {
    engine.leaveChannel();
  } catch {}
}

export function setAgoraMuted(muted: boolean) {
  if (!engine) return;
  engine.muteLocalAudioStream(muted);
}

export function setAgoraSpeaker(enabled: boolean) {
  if (!engine) return;
  engine.setEnableSpeakerphone(enabled);
}

export function setAgoraVideoEnabled(enabled: boolean) {
  if (!engine) return;
  engine.enableLocalVideo(enabled);
  engine.muteLocalVideoStream(!enabled);
  if (enabled) {
    engine.enableVideo();
    engine.startPreview(VideoSourceType.VideoSourceCamera);
  } else {
    engine.stopPreview(VideoSourceType.VideoSourceCamera);
  }
}

export function switchAgoraCamera() {
  if (!engine) return;
  engine.switchCamera();
}

export const AGORA_DISCONNECTED_STATES = new Set<ConnectionStateType>([
  ConnectionStateType.ConnectionStateDisconnected,
  ConnectionStateType.ConnectionStateFailed,
]);

export const AGORA_DISCONNECTED_REASONS = new Set<ConnectionChangedReasonType>([
  ConnectionChangedReasonType.ConnectionChangedJoinFailed,
  ConnectionChangedReasonType.ConnectionChangedInterrupted,
  ConnectionChangedReasonType.ConnectionChangedLeaveChannel,
  ConnectionChangedReasonType.ConnectionChangedBannedByServer,
]);
