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
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // Denormalized preview of the replied message (avoids extra queries on render).
    replySnapshot: {
      type: new mongoose.Schema(
        {
          id: { type: String, default: "" },
          senderName: { type: String, default: "" },
          content: { type: String, default: "" },
          attachment: { type: String, default: "" },
          createdAt: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    reactions: {
      type: [
        new mongoose.Schema(
          {
            emoji: { type: String, required: true },
            userIds: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
              },
            ],
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
