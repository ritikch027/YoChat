import Conversation from "../../models/Conversation.js";

export function registerConversationEvents(io, socket) {
  socket.on("getConversations", async () => {
    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("getConversations", {
          success: false,
          msg: "Unauthorized",
        });
        return;
      }

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

      const conversation = await Conversation.create({
        type: data.type,
        participants,
        name: data.name || "",
        avatar: data.avatar || "",
        createdBy: userId,
      });

      const connectedSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => participants.includes(String(s.data.userId))
      );

      connectedSockets.forEach((participantSocket) => {
        participantSocket.join(conversation._id.toString());
      });

      const populatedConversation = await Conversation.findById(conversation._id)
        .populate({
          path: "participants",
          select: "name avatar email username",
        })
        .lean();

      if (!populatedConversation) {
        throw new Error("Failed to load newly created conversation");
      }

      io.to(conversation._id.toString()).emit("newConversation", {
        success: true,
        data: { ...populatedConversation, isNew: true },
      });
    } catch (error) {
      console.log("newConversation error: ", error);
      socket.emit("newConversation", {
        success: false,
        msg: "Failed to create conversation",
      });
    }
  });
}

