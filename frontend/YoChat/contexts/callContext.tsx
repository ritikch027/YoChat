import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import {
  ConnectionChangedReasonType,
  ConnectionStateType,
  RtcConnection,
} from "react-native-agora";

import CallOverlay from "@/components/CallOverlay";
import {
  addAgoraEventHandler,
  AGORA_DISCONNECTED_REASONS,
  AGORA_DISCONNECTED_STATES,
  joinAgoraChannel,
  leaveAgoraChannel,
  setAgoraMuted,
  setAgoraSpeaker,
  setAgoraVideoEnabled,
  switchAgoraCamera,
} from "@/services/agoraService";
import {
  acceptCall,
  endCall,
  onAcceptedCall,
  onCallError,
  onEndedCall,
  onIncomingCall,
  onMissedCall,
  onOutgoingCall,
  onRejectedCall,
  rejectCall,
  startCall,
} from "@/socket/callEvents";
import {
  CallContextValue,
  CallInvitePayload,
  CallSessionPayload,
} from "@/types";

const CallContext = createContext<CallContextValue>({
  currentCall: null,
  remoteRtcUid: null,
  localJoined: false,
  isMuted: false,
  isSpeakerOn: true,
  isVideoEnabled: true,
  placeCall: () => {},
  acceptIncomingCall: () => {},
  rejectIncomingCall: () => {},
  endCurrentCall: () => {},
  toggleMute: () => {},
  toggleSpeaker: () => {},
  toggleVideo: () => {},
  switchCamera: () => {},
});

function getStatusLabel(session: Pick<CallSessionPayload, "direction" | "status">) {
  if (session.status === "ringing") {
    return session.direction === "incoming" ? "Incoming call" : "Calling...";
  }
  if (session.status === "connecting") return "Connecting...";
  if (session.status === "active") return "Connected";
  if (session.status === "ended") return "Call ended";
  if (session.status === "rejected") return "Call declined";
  if (session.status === "missed") return "Missed call";
  return "Call";
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [currentCall, setCurrentCall] = useState<CallSessionPayload | null>(null);
  const [remoteRtcUid, setRemoteRtcUid] = useState<number | null>(null);
  const [localJoined, setLocalJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [joinedCallId, setJoinedCallId] = useState<string | null>(null);

  const resetLocalState = useCallback(() => {
    setJoinedCallId(null);
    setRemoteRtcUid(null);
    setLocalJoined(false);
    setIsMuted(false);
    setIsSpeakerOn(true);
    setIsVideoEnabled(true);
  }, []);

  const leaveAndClearCall = useCallback(
    (nextStatus?: CallSessionPayload["status"]) => {
      leaveAgoraChannel();
      resetLocalState();

      if (!nextStatus) {
        setCurrentCall(null);
        return;
      }

      setCurrentCall((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus,
              statusLabel: getStatusLabel({ ...prev, status: nextStatus }),
            }
          : prev,
      );

      setTimeout(() => {
        setCurrentCall(null);
      }, 1200);
    },
    [resetLocalState],
  );

  const hydrateCall = useCallback((session: any) => {
    const next: CallSessionPayload = {
      ...session,
      status: session?.status || "ringing",
      statusLabel: getStatusLabel({
        direction: session?.direction || "incoming",
        status: session?.status || "ringing",
      }),
    };
    setCurrentCall(next);
    setIsVideoEnabled(next.mediaType === "video");
  }, []);

  const joinRtcIfNeeded = useCallback(
    (session: CallSessionPayload) => {
      if (!session?.rtcToken || !session?.channelName) return;
      if (joinedCallId === session.callId) return;

      joinAgoraChannel({
        token: session.rtcToken,
        channelName: session.channelName,
        rtcUid: session.rtcUid,
        mediaType: session.mediaType,
      });
      setJoinedCallId(session.callId);
    },
    [joinedCallId],
  );

  useEffect(() => {
    const removeAgoraEvents = addAgoraEventHandler({
      onJoinChannelSuccess: () => {
        setLocalJoined(true);
        setCurrentCall((prev) =>
          prev
            ? {
                ...prev,
                status: "active",
                statusLabel: getStatusLabel({ ...prev, status: "active" }),
              }
            : prev,
        );
      },
      onUserJoined: (_connection, uid) => {
        setRemoteRtcUid(Number(uid));
      },
      onUserOffline: () => {
        setRemoteRtcUid(null);
      },
      onConnectionStateChanged: (
        _connection: RtcConnection,
        state: ConnectionStateType,
        reason: ConnectionChangedReasonType,
      ) => {
        if (
          AGORA_DISCONNECTED_STATES.has(state) &&
          AGORA_DISCONNECTED_REASONS.has(reason)
        ) {
          leaveAndClearCall("ended");
        }
      },
    });

    return () => {
      removeAgoraEvents();
    };
  }, [leaveAndClearCall]);

  useEffect(() => {
    const handleIncoming = (payload: any) => {
      if (currentCall) {
        rejectCall({ callId: payload?.callId, reason: "busy" });
        return;
      }
      hydrateCall(payload);
    };

    const handleOutgoing = (payload: any) => {
      hydrateCall(payload);
    };

    const handleAccepted = (payload: any) => {
      setCurrentCall((prev) => {
        if (!prev || prev.callId !== String(payload?.callId || "")) return prev;
        const next: CallSessionPayload = {
          ...prev,
          status: "connecting",
          statusLabel: getStatusLabel({ ...prev, status: "connecting" }),
        };
        joinRtcIfNeeded(next);
        return next;
      });
    };

    const handleRejected = (payload: any) => {
      if (currentCall?.callId !== String(payload?.callId || "")) return;
      leaveAndClearCall("rejected");
    };

    const handleEnded = (payload: any) => {
      if (currentCall?.callId !== String(payload?.callId || "")) return;
      leaveAndClearCall("ended");
    };

    const handleMissed = (payload: any) => {
      if (currentCall?.callId !== String(payload?.callId || "")) return;
      leaveAndClearCall("missed");
    };

    const handleError = (payload: any) => {
      const message = payload?.message ? String(payload.message) : "Call failed";
      Alert.alert("Call", message);
      leaveAndClearCall();
    };

    onIncomingCall(handleIncoming);
    onOutgoingCall(handleOutgoing);
    onAcceptedCall(handleAccepted);
    onRejectedCall(handleRejected);
    onEndedCall(handleEnded);
    onMissedCall(handleMissed);
    onCallError(handleError);

    return () => {
      onIncomingCall(handleIncoming, true);
      onOutgoingCall(handleOutgoing, true);
      onAcceptedCall(handleAccepted, true);
      onRejectedCall(handleRejected, true);
      onEndedCall(handleEnded, true);
      onMissedCall(handleMissed, true);
      onCallError(handleError, true);
    };
  }, [currentCall, hydrateCall, joinRtcIfNeeded, leaveAndClearCall]);

  const placeCall = useCallback((payload: CallInvitePayload) => {
    startCall(payload);
  }, []);

  const acceptIncomingCall = useCallback(() => {
    setCurrentCall((prev) => {
      if (!prev) return prev;
      const next: CallSessionPayload = {
        ...prev,
        status: "connecting",
        statusLabel: getStatusLabel({ ...prev, status: "connecting" }),
      };
      joinRtcIfNeeded(next);
      acceptCall({ callId: prev.callId });
      return next;
    });
  }, [joinRtcIfNeeded]);

  const rejectIncomingCall = useCallback(() => {
    if (!currentCall) return;
    rejectCall({ callId: currentCall.callId, reason: "declined" });
    leaveAndClearCall();
  }, [currentCall, leaveAndClearCall]);

  const endCurrentCall = useCallback(() => {
    if (!currentCall) return;
    endCall({ callId: currentCall.callId, reason: "ended" });
    leaveAndClearCall("ended");
  }, [currentCall, leaveAndClearCall]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      setAgoraMuted(next);
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      setAgoraSpeaker(next);
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      const next = !prev;
      setAgoraVideoEnabled(next);
      return next;
    });
  }, []);

  const switchCamera = useCallback(() => {
    switchAgoraCamera();
  }, []);

  return (
    <CallContext.Provider
      value={{
        currentCall,
        remoteRtcUid,
        localJoined,
        isMuted,
        isSpeakerOn,
        isVideoEnabled,
        placeCall,
        acceptIncomingCall,
        rejectIncomingCall,
        endCurrentCall,
        toggleMute,
        toggleSpeaker,
        toggleVideo,
        switchCamera,
      }}
    >
      {children}
      <CallOverlay />
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
