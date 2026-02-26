import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

async function requireConversationParticipant(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId).select(
    "_id participants"
  );
  if (!conversation) return { ok: false, error: "CONVERSATION_NOT_FOUND" };

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === String(userId)
  );
  if (!isParticipant) return { ok: false, error: "FORBIDDEN" };

  return { ok: true, conversation };
}
export function registerChatEvents(io, socket) {
  socket.on("getConversations", async () => {
    console.log("getConversations event");

    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("getConversations", {
          success: false,
          msg: "Unauthorized",
        });
        return;
      }

      //fetch all the conversations the user is a part of

      const conversations = await Conversation.find({
        participants: userId,
      })
        .sort({ updatedAt: -1 })
        .populate({
          path: "lastMessage",
          select: "content senderId attachment createdAt",
        })
        .populate({
          path: "participants",
          select: "name avatar email username",
        })
        .lean();

      socket.emit("getConversations", {
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.log("getConversation error: ", error);
      socket.emit("getConversations", {
        success: false,
        msg: "Failed to get conversation",
      });
    }
  });

  socket.on("newConversation", async (data) => {
    console.log("newConversation event: ", data);

    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("newConversation", {
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const rawParticipants = Array.isArray(data?.participants)
        ? data.participants.map(String)
        : [];
      const participants = Array.from(new Set(rawParticipants));

      // Enforce that creator is always a participant.
      if (!participants.includes(String(userId))) participants.push(String(userId));

      if (data.type == "direct") {
        if (participants.length !== 2) {
          socket.emit("newConversation", {
            success: false,
            message: "Direct conversation must have exactly 2 participants",
          });
          return;
        }

        const existingConversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: participants, $size: 2 },
        })
          .populate({
            path: "participants",
            select: "name avatar email username",
          })
          .lean();

        if (existingConversation) {
          socket.emit("newConversation", {
            success: true,
            data: { ...existingConversation, isNew: false },
          });
          return;
        }
      }
      // create new conversations
      const conversation = await Conversation.create({
        type: data.type,
        participants,
        name: data.name || "",
        avatar: data.avatar || "",
        createdBy: userId,
      });
      // get all the online users

      const connectedSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => participants.includes(String(s.data.userId))
      );

      //join this conversation by all online participants

      connectedSockets.forEach((participantSocket) => {
        participantSocket.join(conversation._id.toString());
      });

      // send conversation data back(populated)

      const populatedConversation = await Conversation.findById(
        conversation._id
      )
        .populate({
          path: "participants",
          select: "name avatar email username",
        })
        .lean();

      if (!populatedConversation) {
        throw new Error("Failed to populate conversation");
      }

      //emit conversation to all aprticipants

      io.to(conversation._id.toString()).emit("newConversation", {
        success: true,
        data: { ...populatedConversation, isNew: true },
      });
    } catch (error) {
      console.log("newConversation error: ", error);
      socket.emit("newConversation", {
        success: false,
        message: "Failed to create conversation",
      });
    }
  });

  socket.on("newMessage", async (data) => {
    console.log("newMessage event: ", data);
    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("newMessage", {
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const conversationId = data?.conversationId;
      if (!conversationId) {
        socket.emit("newMessage", {
          success: false,
          message: "Missing conversationId",
        });
        return;
      }

      const membership = await requireConversationParticipant(conversationId, userId);
      if (!membership.ok) {
        socket.emit("newMessage", {
          success: false,
          message: membership.error,
        });
        return;
      }

      const message = await Message.create({
        conversationId,
        senderId: userId,
        content: (data?.content || "").toString(),
        attachment: data?.attachment ? String(data.attachment) : "",
      });
      io.to(String(conversationId)).emit("newMessage", {
        success: true,
        data: {
          id: message._id,
          content: message.content,
          sender: {
            id: String(userId),
            name: socket.data.name,
            avatar: socket.data.avatar,
          },
          attachment: message.attachment || null,
          createdAt: message.createdAt?.toISOString?.() || new Date().toISOString(),
          conversationId: String(conversationId),
        },
      });

      // update conversation's last message
      console.log("updating last message");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.log("newMessage error: ", error);
      socket.emit("newMessage", {
        success: false,
        message: "Failed to send message",
      });
    }
  });

  socket.on("typing", async (data) => {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const conversationId = data?.conversationId;
      if (!conversationId) return;

      const membership = await requireConversationParticipant(conversationId, userId);
      if (!membership.ok) return;

      const isTyping = !!data?.isTyping;
      socket.to(String(conversationId)).emit("typing", {
        conversationId: String(conversationId),
        user: { id: String(userId), name: socket.data.name },
        isTyping,
        at: new Date().toISOString(),
      });
    } catch (e) {
      // ignore
    }
  });
  socket.on("getMessages", async (data) => {
    console.log("getMessages event: ", data);
    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("getMessages", {
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const conversationId = data?.conversationId;
      if (!conversationId) {
        socket.emit("getMessages", {
          success: false,
          message: "Missing conversationId",
        });
        return;
      }

      const membership = await requireConversationParticipant(conversationId, userId);
      if (!membership.ok) {
        socket.emit("getMessages", {
          success: false,
          message: membership.error,
        });
        return;
      }

      const messages = await Message.find({
        conversationId,
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "senderId",
          select: "name avatar",
        })
        .lean();

      const messageWithSender = messages.map((message) => ({
        ...message,
        id: message._id,
        sender: {
          id: message.senderId?._id?.toString?.() || "",
          name: message.senderId?.name || "Unknown",
          avatar: message.senderId?.avatar || null,
        },
      }));

      socket.emit("getMessages", {
        success: true,
        data: messageWithSender,
      });
    } catch (error) {
      console.log("getMessage error: ", error);
      socket.emit("getMessages", {
        success: false,
        message: "Failed to get message",
      });
    }
  });
}
