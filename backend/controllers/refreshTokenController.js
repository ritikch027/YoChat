import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import jwt from "jsonwebtoken";

export const refreshToken = async (req, res) => {
  try {
    const incoming = String(req?.body?.refreshToken || "");
    if (!incoming) {
      return res
        .status(400)
        .json({ success: false, message: "Missing refreshToken" });
    }

    let decoded;
    try {
      decoded = jwt.verify(incoming, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const userId = String(decoded?.sub || "");
    if (!userId || decoded?.typ !== "refresh") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const user = await User.findById(userId);
    if (!user || !user.refreshTokenHash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    if (
      user.refreshTokenExpiresAt &&
      new Date(user.refreshTokenExpiresAt).getTime() < Date.now()
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token expired" });
    }

    const ok = await bcrypt.compare(incoming, user.refreshTokenHash);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );
    await user.save();

    return res.json({ success: true, token: accessToken, refreshToken });
  } catch (err) {
    console.error("refreshToken error", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
