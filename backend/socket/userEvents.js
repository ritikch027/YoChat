import { Server as SocketIOServer } from "socket.io";
import User from "../models/User.js";
import { generateToken } from "../utils/token.js";
import { getPresence } from "./presenceStore.js";

export function registerUserEvents(io, socket) {
  socket.on("testSocket", (data) => {
    console.log("testSocket triggered");
    socket.emit("testSocket", { msg: "its working!!!" });
  });

  socket.on("updateProfile", async (data) => {
    console.log("updateprofile event: ", data);
    const userId = socket.data.userId;
    if (!userId) {
      return socket.emit("updateProfile", {
        success: false,
        message: "unauthorised access",
      });
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name: data.name, avatar: data.avatar },
        { new: true } //will return the user with updated values
      );

      if (!updatedUser) {
        return socket.emit("updateProfile", {
          success: false,
          message: "User not found.",
        });
      }

      //gen token with updated values

      const newToken = generateToken(updatedUser);
      socket.data.name = updatedUser.name;
      socket.data.avatar = updatedUser.avatar;

      socket.emit("updateProfile", {
        success: true,
        data: {
          token: newToken,
          message: "profile updated successfully",
        },
      });
    } catch (err) {
      console.log("error updating the profile ", err);
      socket.emit("updateProfile", {
        success: false,
        message: "Error updating profile",
      });
    }
  });

  socket.on("getContacts", async () => {
    try {
      const currentUserId = socket.data.userId;
      if (!currentUserId) {
        socket.emit("getContacts", {
          success: false,
          msg: "Unauthorized",
        });
        return;
      }

      const users = await User.find(
        { _id: { $ne: currentUserId } },
        { password: 0 } //exclude password field
      ).lean(); //will fetch js objects

      const contacts = users.map((user) => {
        const presence = getPresence(user._id);
        return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username || null,
        avatar: user.avatar || "",
        online: presence.online,
        lastSeen: presence.lastSeen || user.lastSeen || null,
        };
      });

      socket.emit("getContacts", {
        success: true,
        data: contacts,
      });
    } catch (error) {
      console.log("getContacts: ", error);
      socket.emit("getContacts", {
        success: false,
        msg: "Failed to fetch contacts",
      });
    }
  });
}
