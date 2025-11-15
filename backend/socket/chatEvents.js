import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
export function registerChatEvents(io, socket) {
  socket.on("getConversations", async () => {
    console.log("getConversations event");

    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("getConersations", {
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
          select: "name avatar email",
        })
        .lean();

      socket.emit("getConversations", {
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.log("getConversation error: ", error);
      socket.emit("getConversation", {
        success: false,
        message: "Failed to get conversation",
      });
    }
  });

  socket.on("newConversation", async (data) => {
    console.log("newConversation event: ", data);

    try {
      if (data.type == "direct") {
        const existingConversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: data.participants, $size: 2 },
        })
          .populate({
            path: "participants",
            select: "name avatar email",
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
        participants: data.participants,
        name: data.name || "",
        avatar: data.avatar || "",
        createdBy: socket.data.userId,
      });
      // get all the online users

      const connectedSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => data.participants.includes(s.data.userId)
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
          select: "name avatar email",
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
      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.sender.id,
        content: data.content,
        attachment: data.attachment,
      });
      io.to(data.conversationId).emit("newMessage", {
        success: true,
        data: {
          id: message._id,
          content: data.content,
          sender: {
            id: data.sender.id,
            name: data.sender.name,
            avatar: data.sender.avatar,
          },
          attachment: data.attachment,
          createdAt: new Date().toISOString(),
          conversationId: data.conversationId,
        },
      });

      // update conversation's last message
      console.log("updating last message");
      await Conversation.findByIdAndUpdate(data.conversationId, {
        lastMessage: message._id,
      });
    } catch (error) {
      console.log("newMessage error: ", error);
      socket.emit("newMessage", {
        success: false,
        message: "Failed to send message",
      });
    }
  });
  socket.on("getMessages", async (data) => {
    console.log("getMessages event: ", data);
    try {
      const messages = await Message.find({
        conversationId: data.conversationId,
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
          id: message.senderId._id,
          name: message.senderId.name,
          avatar: message.senderId.avatar,
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
