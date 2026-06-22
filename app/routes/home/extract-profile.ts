import OpenAI from "openai";

import { UserProfileSchema } from "./profile-schema";

import { extractProfilePrompt } from "./prompt";

const client = new OpenAI({
  apiKey: process.env.SENSENOVA_API_KEY,

  // baseURL: "https://open.bigmodel.cn/api/paas/v4/"
  baseURL: "https://token.sensenova.cn/v1"
});

//TODO: 自然语言 -> ai通过prompts理解 -> 结构化JSON -> Zod 校验

export async function extractProfile(
  message: string
) {
  const response =
    await client.chat.completions.create({
      // model: "glm-4.5",
      model: "sensenova-6.7-flash-lite",

      response_format: {
        type: "json_object"
      },

      messages: [
        {
          role: "system",
          content: extractProfilePrompt
        },
        {
          role: "user",
          content: message
        }
      ]
    });

  const content = response.choices[0].message.content;

  const parsed = JSON.parse(content!);
  console.log('AI: ', parsed);
  return UserProfileSchema.parse(parsed);
}