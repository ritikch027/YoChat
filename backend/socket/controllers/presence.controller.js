import User from "../../models/User.js";
import {
  getPresence,
  getOnlineUserIds,
  noteUserConnected,
  noteUserDisconnected,
} from "../presenceStore.js";

export function registerPresenceOnConnect(io, socket) {
  const userId = socket.data.userId;

  const presence = noteUserConnected(userId);
  socket.emit("presenceInit", { onlineUserIds: getOnlineUserIds() });
  io.emit("presenceUpdate", {
    userId: String(userId),
    online: presence.online,
    lastSeen: presence.lastSeen,
  });

  socket.on("presenceGet", () => {
    socket.emit("presenceInit", { onlineUserIds: getOnlineUserIds() });
  });

  socket.on("presenceGetUsers", async (payload) => {
    try {
      const requestId = payload?.requestId ? String(payload.requestId) : null;
      const userIds = Array.isArray(payload?.userIds)
        ? payload.userIds.map(String).filter(Boolean)
        : [];

      if (userIds.length === 0) {
        socket.emit("presenceUsers", {
          success: false,
          message: "Missing userIds",
          requestId,
        });
        return;
      }

      const statuses = {};
      const dbUsers = await User.find({ _id: { $in: userIds } })
        .select("_id lastSeen")
        .lean();
      const lastSeenById = new Map(
        dbUsers.map((u) => [String(u._id), u.lastSeen || null])
      );

      userIds.forEach((id) => {
        const live = getPresence(id);
        const lastSeen = live.lastSeen || lastSeenById.get(String(id)) || null;
        statuses[String(id)] = {
          online: !!live.online,
          lastSeen: lastSeen ? new Date(lastSeen).toISOString() : null,
        };
      });

      socket.emit("presenceUsers", { success: true, data: statuses, requestId });
    } catch (e) {
      socket.emit("presenceUsers", {
        success: false,
        message: "Failed to get presence",
      });
    }
  });
}

export function registerPresenceOnDisconnect(io, userId) {
  noteUserDisconnected(userId)
    .then((p) => {
      io.emit("presenceUpdate", {
        userId: String(userId),
        online: p.online,
        lastSeen: p.lastSeen,
      });
    })
    .catch(() => {});
}

