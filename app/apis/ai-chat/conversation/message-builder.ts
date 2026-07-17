import type { ChatMessage, ConversationRole } from "./conversation-types";
import crypto from 'node:crypto';

function createMessage(role: ConversationRole, content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function createUserMessage(content: string) {
  return createMessage("user", content);
}

export function createAssistantMessage(content: string) {
  return createMessage("assistant", content);
}
