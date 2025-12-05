import User from "../models/User.js";
import { generateToken } from "../utils/token.js";
import validateUsername from "../utils/username.js";

// GET /username/check?username=ritik
export const checkUsername = async (req, res) => {
  try {
    const raw = req.query.username || "";
    const { ok, reason, username, usernameSearch } = validateUsername(raw);

    if (!ok) {
      return res.json({
        username: raw,
        isValid: false,
        isAvailable: false,
        reason,
      });
    }

    const existing = await User.findOne({ usernameSearch });

    return res.json({
      username,
      isValid: true,
      isAvailable: !existing,
      reason: existing ? "TAKEN" : "OK",
    });
  } catch (err) {
    console.error("checkUsername error", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// PATCH /me/username  (Auth required)
export const updateMyUsername = async (req, res) => {
  try {
    const userId = req.user._id; // from your auth middleware (JWT)
    const raw = (req.body.username || "").trim();

    // allow removing username
    if (raw === "") {
      const updated = await User.findByIdAndUpdate(
        userId,
        { $set: { username: null, usernameSearch: null } },
        { new: true }
      ).select("-password");

      return res.json({
        success: true,
        user: updated,
      });
    }

    const { ok, reason, username, usernameSearch } = validateUsername(raw);

    if (!ok) {
      return res.status(400).json({
        success: false,
        error: reason,
      });
    }

    // check if someone else already has it
    const existing = await User.findOne({
      usernameSearch,
      _id: { $ne: userId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "USERNAME_TAKEN",
      });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { username, usernameSearch } },
      { new: true }
    ).select("-password");

    // 🔥 generate a fresh token with updated username
    const token = generateToken(updated);

    return res.json({
      success: true,
      user: updated,
      token, // 👈 send new token to frontend
    });
  } catch (err) {
    console.error("updateMyUsername error", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};

// GET /users/by-username/:username
export const getUserByUsername = async (req, res) => {
  try {
    const raw = (req.params.username || "").trim();
    if (!raw) return res.status(400).json({ error: "USERNAME_REQUIRED" });

    const usernameSearch = raw.toLowerCase();

    const user = await User.findOne({ usernameSearch }).select(
      "_id name username avatar" // adapt to your fields
    );

    if (!user) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    res.json({ user });
  } catch (err) {
    console.error("getUserByUsername error", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
};
