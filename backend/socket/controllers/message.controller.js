import mongoose from "mongoose";
import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";
import { requireConversationParticipant } from "../utils/requireConversationParticipant.js";

export function registerMessageEvents(io, socket) {
  socket.on("newMessage", async (data) => {
    console.log("newMessage event", data);
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
    const requestId = data?.requestId ? String(data.requestId) : null;
    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("getMessages", {
          success: false,
          message: "Unauthorized",
          requestId,
        });
        return;
      }

      const conversationId = data?.conversationId;
      if (!conversationId) {
        socket.emit("getMessages", {
          success: false,
          message: "Missing conversationId",
          requestId,
        });
        return;
      }

      const membership = await requireConversationParticipant(conversationId, userId);
      if (!membership.ok) {
        socket.emit("getMessages", {
          success: false,
          message: membership.error,
          requestId,
        });
        return;
      }

      const limit = Math.max(
        1,
        Math.min(50, Number.isFinite(Number(data?.limit)) ? Number(data.limit) : 20)
      );

      let cursorId = null;
      if (data?.cursor) {
        try {
          cursorId = new mongoose.Types.ObjectId(String(data.cursor));
        } catch {
          cursorId = null;
        }
      }

      const query = { conversationId };
      if (cursorId) query._id = { $lt: cursorId };

      const messages = await Message.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate({
          path: "senderId",
          select: "name avatar",
        })
        .lean();

      const hasMore = messages.length > limit;
      const page = hasMore ? messages.slice(0, limit) : messages;

      const messageWithSender = page.map((message) => ({
        ...message,
        id: message._id,
        sender: {
          id: message.senderId?._id?.toString?.() || "",
          name: message.senderId?.name || "Unknown",
          avatar: message.senderId?.avatar || null,
        },
      }));

      const nextCursor =
        messageWithSender.length > 0
          ? String(messageWithSender[messageWithSender.length - 1].id)
          : null;

      socket.emit("getMessages", {
        success: true,
        data: messageWithSender,
        hasMore,
        nextCursor,
        requestId,
      });
    } catch (error) {
      console.log("getMessage error: ", error);
      socket.emit("getMessages", {
        success: false,
        message: "Failed to get message",
        requestId,
      });
    }
  });
}

