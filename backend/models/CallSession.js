import { Schema, model } from "mongoose";

const CallSessionSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    callerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    calleeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channelName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ringing", "accepted", "rejected", "missed", "ended"],
      default: "ringing",
      index: true,
    },
    callerRtcUid: {
      type: Number,
      required: true,
    },
    calleeRtcUid: {
      type: Number,
      required: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    endReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

CallSessionSchema.index({ callerId: 1, calleeId: 1, status: 1, createdAt: -1 });

const CallSession = model("CallSession", CallSessionSchema);

export default CallSession;
