import dotenv from "dotenv";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { registerUserEvents } from "./userEvents.js";
import Conversation from "../models/Conversation.js";
import { registerChatEvents } from "./chatEvents.js";
import {
  getOnlineUserIds,
  noteUserConnected,
  noteUserDisconnected,
} from "./presenceStore.js";

dotenv.config();

export function initializeSocket(server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
    },
  });

  //auth middlewares

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Autherntication error: invalid token"));
      }

      //attach the user data to socket

      let userData = decoded.user;
      socket.data = userData;
      socket.data.userId = userData.id;
      next();
    });
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    console.log(`user connected: ${userId},username:${socket.data.name}`);

    // Presence: increment connection count and broadcast online.
    const presence = noteUserConnected(userId);
    socket.emit("presenceInit", { onlineUserIds: getOnlineUserIds() });
    io.emit("presenceUpdate", {
      userId: String(userId),
      online: presence.online,
      lastSeen: presence.lastSeen,
    });

    // Allow clients to request a fresh presence snapshot (screens may mount later).
    socket.on("presenceGet", () => {
      socket.emit("presenceInit", { onlineUserIds: getOnlineUserIds() });
    });

    registerUserEvents(io, socket);
    registerChatEvents(io, socket);

    //join all the conversations the user is part of
    try {
      const conversations = await Conversation.find({
        participants: userId,
      }).select("_id");

      conversations.forEach((conversation) => {
        socket.join(conversation._id.toString());
      });
    } catch (error) {
      console.log("Error joining conversations: ", error);
    }

    socket.on("disconnect", () => {
      console.log(`user disconnected: ${userId}`);
      noteUserDisconnected(userId)
        .then((p) => {
          io.emit("presenceUpdate", {
            userId: String(userId),
            online: p.online,
            lastSeen: p.lastSeen,
          });
        })
        .catch(() => {});
    });
  });

  return io;
}
