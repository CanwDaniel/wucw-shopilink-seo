import OpenAI from "openai";

// TODO： 用户画像
import { UserProfileSchema } from "./profile-schema";

// TODO：根据字段匹配推荐
import { extractProfilePrompt } from "./prompt";

const client = new OpenAI({
  apiKey: process.env.SENSENOVA_API_KEY,
  // apiKey: process.env.GLM_API_KEY,

  baseURL: "https://token.sensenova.cn/v1",
  // baseURL: "https://open.bigmodel.cn/api/paas/v4",
});

//TODO: 自然语言 -> ai通过prompts理解 -> 结构化JSON -> Zod 校验
//TODO: 自然聊天 -> 用户画像 -> 推荐 -> 推荐解释 -> 商品比较
//TODO: 自然聊天 -> extract-profile -> mergeProfile -> conversation -> recommendation/compare
export async function extractProfile({ message, history }: { message: string, history: [] }) {
  const msg = {
    message,
    history
  };

  const response = await client.chat.completions.create({
    model: "sensenova-6.7-flash-lite",
    // model: "glm-4-flash",

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
        content: JSON.stringify(msg),
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
