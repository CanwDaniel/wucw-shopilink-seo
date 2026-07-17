import type { ProductType } from "types/product.type";
import type { UserProfile } from "../profile-schema";

export type ConversationRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
}

export enum ConversationStage {
  CollectingProfile = "collecting_profile",
  ReadyToRecommend = "ready_to_recommend",
  Recommended = "recommended",
  Comparing = "comparing",
  Finished = "finished",
}

export interface ConversationState {
  profile: UserProfile;
  messages: ChatMessage[];
  stage: ConversationStage;
}

export interface ConversationInput {
  message: string;
  state: ConversationState;
  chairs: ProductType[];
}

export interface ConversationResult {
  state: ConversationState;
  reply: string;
  recommendations?: ProductType[];
}
