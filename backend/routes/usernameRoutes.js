// backend/routes/usernameRoutes.js
import { Router } from "express";

import {
  checkUsername,
  updateMyUsername,
  getUserByUsername,
} from "../controllers/usernameController.js";
const router = Router();

import { auth } from "../middleware/auth.js"; // your JWT auth middleware

// public: check if username is valid & free
router.get("/username/check", checkUsername);

// logged-in user: set/change/remove their username
router.patch("/me/username", auth, updateMyUsername);

// public: resolve @username -> user info
router.get("/users/by-username/:username", getUserByUsername);

export default router;
