import User from "../models/User.js";

// In-memory presence store (per server instance).
// If you scale to multiple instances, move this to Redis or similar.
const presenceByUserId = new Map(); // userId -> { sockets: number, lastSeen: Date|null }

export function getPresence(userId) {
  const entry = presenceByUserId.get(String(userId));
  return {
    online: !!entry && entry.sockets > 0,
    lastSeen: entry?.lastSeen || null,
  };
}

export function getOnlineUserIds() {
  const online = [];
  for (const [userId, entry] of presenceByUserId.entries()) {
    if (entry?.sockets > 0) online.push(userId);
  }
  return online;
}

export function noteUserConnected(userId) {
  const id = String(userId);
  const entry = presenceByUserId.get(id) || { sockets: 0, lastSeen: null };
  entry.sockets += 1;
  presenceByUserId.set(id, entry);
  return getPresence(id);
}

export async function noteUserDisconnected(userId) {
  const id = String(userId);
  const entry = presenceByUserId.get(id) || { sockets: 0, lastSeen: null };
  entry.sockets = Math.max(0, (entry.sockets || 0) - 1);

  // Only mark lastSeen when the last socket disconnects.
  if (entry.sockets === 0) {
    entry.lastSeen = new Date();
    // Best-effort persistence for "last seen".
    try {
      await User.findByIdAndUpdate(id, { $set: { lastSeen: entry.lastSeen } });
    } catch (e) {
      // ignore
    }
  }

  presenceByUserId.set(id, entry);
  return getPresence(id);
}

export function hydrateLastSeenFromDb(userId, lastSeen) {
  const id = String(userId);
  const entry = presenceByUserId.get(id) || { sockets: 0, lastSeen: null };
  if (!entry.lastSeen && lastSeen) entry.lastSeen = lastSeen;
  presenceByUserId.set(id, entry);
}

