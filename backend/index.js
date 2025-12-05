import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import { initializeSocket } from "./socket/socket.js";
import usernameRoutes from "./routes/usernameRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/auth", authRoutes);
app.use("/api", usernameRoutes);
const server = http.createServer(app);

initializeSocket(server);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.use(
  cors({
    origin: "*", // Your frontend URL
    credentials: true,
  })
);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
  });
