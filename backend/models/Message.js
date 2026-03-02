import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: String,
    attachment: String,
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
