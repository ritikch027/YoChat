import dotenv from "dotenv";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation.js";
import { registerUserEvents } from "./controllers/user.controller.js";
import { registerConversationEvents } from "./controllers/conversation.controller.js";
import { registerMessageEvents } from "./controllers/message.controller.js";
import {
  registerPresenceOnConnect,
  registerPresenceOnDisconnect,
} from "./controllers/presence.controller.js";

dotenv.config();

export function initializeSocket(server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
    },
    // Helps detect "app killed / network lost" faster on mobile.
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  //auth middlewares

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
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

    registerPresenceOnConnect(io, socket);
    registerUserEvents(io, socket);
    registerConversationEvents(io, socket);
    registerMessageEvents(io, socket);

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
      registerPresenceOnDisconnect(io, userId);
    });
  });

  return io;
}
