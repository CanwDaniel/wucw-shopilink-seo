import { ConversationStage, type ConversationState } from "./conversation-types";

export function createConversationState(): ConversationState {
  return {
    profile: {},
    messages: [],
    stage: ConversationStage.CollectingProfile,
  };
}