import OpenAI from "openai";

// TODO： 用户画像
import { UserProfileSchema } from "./profile-schema";

// TODO：根据字段匹配推荐
import { extractProfilePrompt } from "./prompt";

const client = new OpenAI({
  apiKey: process.env.SENSENOVA_API_KEY,

  baseURL: "https://token.sensenova.cn/v1",
});

//TODO: 自然语言 -> ai通过prompts理解 -> 结构化JSON -> Zod 校验
export async function extractProfile(message: string) {
  const response = await client.chat.completions.create({
    model: "sensenova-6.7-flash-lite",

    response_format: {
      type: "json_object",
    },

    messages: [
      {
        role: "system",
        content: extractProfilePrompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });
  
  if(response?.choices && response.choices[0]) {
    try {
      const content = response.choices[0].message.content;
    
      const parsed = JSON.parse(content!);
      
      const result = Object.fromEntries(
        Object.entries(parsed).filter(([_, v]) => v !== null),
      );
      
      return UserProfileSchema.parse(result);
    } catch (error) {
      console.error(error);
      return null;
    }
  } else {
    return null;
  }
}
