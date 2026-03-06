import Conversation from "../../models/Conversation.js";

export async function requireConversationParticipant(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId).select(
    "_id participants"
  );
  if (!conversation) return { ok: false, error: "CONVERSATION_NOT_FOUND" };

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === String(userId)
  );
  if (!isParticipant) return { ok: false, error: "FORBIDDEN" };

  return { ok: true, conversation };
}

