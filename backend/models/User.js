import { Schema, model } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  avatar: { type: String, default: "" },
}); 

const User = model("User", UserSchema);

export default User;
