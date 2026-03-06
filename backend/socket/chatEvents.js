import { registerConversationEvents } from "./controllers/conversation.controller.js";
import { registerMessageEvents } from "./controllers/message.controller.js";

// Backward-compat wrapper for older imports.
export function registerChatEvents(io, socket) {
  registerConversationEvents(io, socket);
  registerMessageEvents(io, socket);
}

