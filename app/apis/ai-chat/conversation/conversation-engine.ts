import { extractProfile } from "../extract-profile";
import { mergeProfile } from "../mergeProfile";
import { getMissingFields } from "../getMissingFields";

import { buildQuestion } from "./question-builder";

import { createAssistantMessage, createUserMessage } from "./message-builder";

import type {
  ConversationInput,
  ConversationResult,
} from "./conversation-types";

import { ConversationStage } from "./conversation-types";

import { recommendChairs } from "../score";

export async function reply(
  input: ConversationInput,
): Promise<ConversationResult> {
  const extractedProfile = await extractProfile(input.message);
  const profile = mergeProfile(input.state.profile, extractedProfile);
  const messages = [...input.state.messages, createUserMessage(input.message)];
  const missing = getMissingFields(profile);

  if (missing.length === 0) {
    const question = buildQuestion(missing);

    messages.push(createAssistantMessage(question));

    return {
      state: {
        ...input.state,
        profile,
        messages,
        stage: ConversationStage.CollectingProfile,
      },

      reply: question,
    };
  }

  const recommendations = recommendChairs(profile, input.chairs);

  const reply = `根据你的需求，我为你挑选了 ${recommendations.length} 款电竞椅。`;

  messages.push(createAssistantMessage(reply));

  return {
    state: {
      ...input.state,
      profile,
      messages,
      stage: ConversationStage.Recommended,
    },
    reply,
    recommendations,
  };
}
