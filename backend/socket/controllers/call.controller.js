import CallSession from "../../models/CallSession.js";
import { buildRtcToken, createRtcUid } from "../../utils/agoraRtc.js";
import { requireConversationParticipant } from "../utils/requireConversationParticipant.js";

const USER_ROOM_PREFIX = "user:";
const CALL_RING_TIMEOUT_MS = 45_000;

function getUserRoom(userId) {
  return `${USER_ROOM_PREFIX}${String(userId)}`;
}

function isValidMediaType(mediaType) {
  return mediaType === "audio" || mediaType === "video";
}

function createJoinInfo(channelName, uid) {
  const { appId, token, expiresAt } = buildRtcToken({ channelName, uid });
  return { appId, token, expiresAt };
}

function buildSessionPayload({
  session,
  peer,
  rtcUid,
  rtcToken,
  tokenExpiresAt,
  appId,
  direction,
}) {
  return {
    callId: String(session._id),
    conversationId: String(session.conversationId),
    channelName: String(session.channelName),
    mediaType: String(session.mediaType),
    status: String(session.status),
    direction,
    rtcUid: Number(rtcUid),
    rtcToken,
    appId,
    tokenExpiresAt,
    peer,
    startedAt: session.startedAt ? session.startedAt.toISOString() : null,
    createdAt: session.createdAt ? session.createdAt.toISOString() : new Date().toISOString(),
  };
}

async function markMissedIfUnanswered(io, callId) {
  const session = await CallSession.findById(callId);
  if (!session || session.status !== "ringing") return;

  session.status = "missed";
  session.endedAt = new Date();
  session.endReason = "missed";
  await session.save();

  const payload = {
    callId: String(session._id),
    conversationId: String(session.conversationId),
    reason: "missed",
    endedAt: session.endedAt.toISOString(),
  };

  io.to(getUserRoom(session.callerId)).emit("call:missed", payload);
  io.to(getUserRoom(session.calleeId)).emit("call:missed", payload);
}

export function registerCallEvents(io, socket) {
  socket.on("call:start", async (data) => {
    try {
      const callerId = socket.data.userId;
      const conversationId = data?.conversationId ? String(data.conversationId) : "";
      const calleeId = data?.targetUserId ? String(data.targetUserId) : "";
      const mediaType = data?.mediaType ? String(data.mediaType) : "";

      if (!callerId) {
        socket.emit("call:error", { message: "Unauthorized" });
        return;
      }

      if (!conversationId || !calleeId || !isValidMediaType(mediaType)) {
        socket.emit("call:error", { message: "Missing conversationId/targetUserId/mediaType" });
        return;
      }

      if (String(callerId) === calleeId) {
        socket.emit("call:error", { message: "Cannot call yourself" });
        return;
      }

      const membership = await requireConversationParticipant(conversationId, callerId);
      if (!membership.ok) {
        socket.emit("call:error", { message: membership.error });
        return;
      }

      const conversation = membership.conversation;
      const participants = Array.isArray(conversation?.participants)
        ? conversation.participants.map((item) => String(item))
        : [];

      if (conversation?.type !== "direct" || participants.length !== 2) {
        socket.emit("call:error", { message: "Calls are currently supported only in direct chats" });
        return;
      }

      if (!participants.includes(calleeId)) {
        socket.emit("call:error", { message: "Target user is not part of this conversation" });
        return;
      }

      const activeCall = await CallSession.findOne({
        status: { $in: ["ringing", "accepted"] },
        $or: [
          { callerId },
          { calleeId: callerId },
          { callerId: calleeId },
          { calleeId },
        ],
      }).lean();

      if (activeCall) {
        socket.emit("call:error", { message: "One of the users is already on another call" });
        return;
      }

      const calleeRoom = getUserRoom(calleeId);
      const calleeSockets = io.sockets.adapter.rooms.get(calleeRoom);
      if (!calleeSockets || calleeSockets.size === 0) {
        socket.emit("call:error", { message: "User is offline" });
        return;
      }

      const callerRtcUid = createRtcUid();
      const calleeRtcUid = createRtcUid();
      const channelName = `yochat_${conversationId}_${Date.now()}`;

      const session = await CallSession.create({
        conversationId,
        callerId,
        calleeId,
        channelName,
        mediaType,
        callerRtcUid,
        calleeRtcUid,
        status: "ringing",
      });

      const callerJoinInfo = createJoinInfo(channelName, callerRtcUid);
      const calleeJoinInfo = createJoinInfo(channelName, calleeRtcUid);

      socket.emit(
        "call:outgoing",
        buildSessionPayload({
          session,
          direction: "outgoing",
          rtcUid: callerRtcUid,
          rtcToken: callerJoinInfo.token,
          tokenExpiresAt: callerJoinInfo.expiresAt,
          appId: callerJoinInfo.appId,
          peer: {
            id: calleeId,
            name: String(data?.targetUserName || "User"),
            avatar: data?.targetUserAvatar ? String(data.targetUserAvatar) : null,
          },
        }),
      );

      io.to(calleeRoom).emit(
        "call:incoming",
        buildSessionPayload({
          session,
          direction: "incoming",
          rtcUid: calleeRtcUid,
          rtcToken: calleeJoinInfo.token,
          tokenExpiresAt: calleeJoinInfo.expiresAt,
          appId: calleeJoinInfo.appId,
          peer: {
            id: String(callerId),
            name: String(socket.data?.name || "User"),
            avatar: socket.data?.avatar ? String(socket.data.avatar) : null,
          },
        }),
      );

      setTimeout(() => {
        markMissedIfUnanswered(io, session._id).catch((error) => {
          console.log("markMissedIfUnanswered error:", error);
        });
      }, CALL_RING_TIMEOUT_MS);
    } catch (error) {
      console.log("call:start error:", error);
      socket.emit("call:error", { message: "Failed to start call" });
    }
  });

  socket.on("call:accept", async (data) => {
    try {
      const userId = socket.data.userId;
      const callId = data?.callId ? String(data.callId) : "";

      if (!userId || !callId) {
        socket.emit("call:error", { message: "Missing callId" });
        return;
      }

      const session = await CallSession.findById(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call not found" });
        return;
      }

      if (String(session.calleeId) !== String(userId)) {
        socket.emit("call:error", { message: "Only the callee can accept this call" });
        return;
      }

      if (session.status !== "ringing") {
        socket.emit("call:error", { message: "Call is no longer ringing" });
        return;
      }

      session.status = "accepted";
      session.startedAt = new Date();
      await session.save();

      const payload = {
        callId: String(session._id),
        conversationId: String(session.conversationId),
        status: "accepted",
        startedAt: session.startedAt.toISOString(),
      };

      io.to(getUserRoom(session.callerId)).emit("call:accepted", payload);
      io.to(getUserRoom(session.calleeId)).emit("call:accepted", payload);
    } catch (error) {
      console.log("call:accept error:", error);
      socket.emit("call:error", { message: "Failed to accept call" });
    }
  });

  socket.on("call:reject", async (data) => {
    try {
      const userId = socket.data.userId;
      const callId = data?.callId ? String(data.callId) : "";
      const reason = data?.reason ? String(data.reason) : "declined";

      if (!userId || !callId) {
        socket.emit("call:error", { message: "Missing callId" });
        return;
      }

      const session = await CallSession.findById(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call not found" });
        return;
      }

      const isParticipant =
        String(session.callerId) === String(userId) ||
        String(session.calleeId) === String(userId);
      if (!isParticipant) {
        socket.emit("call:error", { message: "Forbidden" });
        return;
      }

      if (session.status !== "ringing") return;

      session.status = "rejected";
      session.endReason = reason;
      session.endedAt = new Date();
      await session.save();

      const payload = {
        callId: String(session._id),
        conversationId: String(session.conversationId),
        status: "rejected",
        reason,
        endedAt: session.endedAt.toISOString(),
      };

      io.to(getUserRoom(session.callerId)).emit("call:rejected", payload);
      io.to(getUserRoom(session.calleeId)).emit("call:rejected", payload);
    } catch (error) {
      console.log("call:reject error:", error);
      socket.emit("call:error", { message: "Failed to reject call" });
    }
  });

  socket.on("call:end", async (data) => {
    try {
      const userId = socket.data.userId;
      const callId = data?.callId ? String(data.callId) : "";
      const reason = data?.reason ? String(data.reason) : "ended";

      if (!userId || !callId) {
        socket.emit("call:error", { message: "Missing callId" });
        return;
      }

      const session = await CallSession.findById(callId);
      if (!session) {
        socket.emit("call:error", { message: "Call not found" });
        return;
      }

      const isParticipant =
        String(session.callerId) === String(userId) ||
        String(session.calleeId) === String(userId);
      if (!isParticipant) {
        socket.emit("call:error", { message: "Forbidden" });
        return;
      }

      if (session.status === "ended" || session.status === "rejected" || session.status === "missed") {
        return;
      }

      session.status = "ended";
      session.endReason = reason;
      session.endedAt = new Date();
      await session.save();

      const payload = {
        callId: String(session._id),
        conversationId: String(session.conversationId),
        status: "ended",
        reason,
        endedAt: session.endedAt.toISOString(),
      };

      io.to(getUserRoom(session.callerId)).emit("call:ended", payload);
      io.to(getUserRoom(session.calleeId)).emit("call:ended", payload);
    } catch (error) {
      console.log("call:end error:", error);
      socket.emit("call:error", { message: "Failed to end call" });
    }
  });
}
