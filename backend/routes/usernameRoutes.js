// backend/routes/usernameRoutes.js
import { Router } from "express";

import {
  checkUsername,
  updateMyUsername,
  getUserByUsername,
  searchUsers,  
} from "../controllers/usernameController.js";
const router = Router();

import { auth } from "../middleware/auth.js"; // your JWT auth middleware

// public: check if username is valid & free
router.get("/username/check", checkUsername);

// logged-in user: set/change/remove their username
router.patch("/me/username", auth, updateMyUsername);

// public: resolve @username -> user info
router.get("/users/by-username/:username", getUserByUsername);


// 🔍 search users (require auth)
router.get("/users/search", auth, searchUsers);

export default router;
