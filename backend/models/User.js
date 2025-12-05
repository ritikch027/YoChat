import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    avatar: { type: String, default: "" },
    username: {
      type: String,
      trim: true,
    },
    usernameSearch: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true, // Mongo index, but because of sparse it only applies if value exists
      sparse: true, // allow many users with null/undefined (no username)
    },
  },
  { timestamps: true }
);

UserSchema.index({ usernameSearch: 1 }, { unique: true, sparse: true });
const User = model("User", UserSchema);

export default User;
