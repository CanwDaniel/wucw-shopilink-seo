import OpenAI from "openai";

import type {
  AIResponse,
  ChatMessage,
  ReferenceResolution,
} from "./profile-schema";

import { referencePrompt } from "./prompt";

type Profile = {
  budget?: number;
  dailyHours?: number;
  usage?: string;
};

type ConversationState = "collecting" | "ready" | "recommending";

type GenerateConversationParams = {
  profile: Profile;
  missingFields: string[];
  chat: string;
};

// ============================================================
// 判断用户意图
// ============================================================

function detectIntent(chat: string) {
  const compareWords = [
    "比较",
    "哪个好",
    "区别",
    "差别",
    "哪个适合",
    "哪个好用",
  ];

  if (compareWords.some((word) => chat.includes(word))) {
    return "compare";
  }

  return null;
}

// ============================================================
// 根据使用场景生成一些自然的说明
// ============================================================

function getUsageAdvice(usage?: string) {
  if (usage === "programming") {
    return `
程序员通常需要长时间保持坐姿，
所以我会更关注腰托、坐垫支撑和透气性。
`;
  }

  if (usage === "gaming") {
    return `
如果主要是游戏，
除了舒适度，我也会关注包裹感、靠背角度和长时间体验。
`;
  }

  return `
不同使用场景，对电竞椅的要求其实差别很大。
`;
}

// ============================================================
// 判断当前对话处于哪个阶段
// ============================================================

function getConversationState(missingFields: string[]): ConversationState {
  if (missingFields.length === 0) {
    return "ready";
  }

  return "collecting";
}

// ============================================================
// 生成正常对话
//
// 这个函数保留你原来的逻辑
// ============================================================

export function generateConversation({
  profile,
  missingFields,
  chat,
}: GenerateConversationParams): AIResponse {
  const intent = detectIntent(chat);

  // ==========================================================
  // 信息对比
  // ==========================================================

  if (intent === "compare") {
    return {
      message: "我帮你从你的使用场景分析一下这两款的区别。",

      action: "compare",

      profile,
    };
  }

  const state = getConversationState(missingFields);

  // ==========================================================
  // 信息收集阶段
  // ==========================================================

  if (missingFields.includes("usage")) {
    return {
      message:
        "当然可以 😊 不同使用场景适合的电竞椅差别还是挺大的。比如办公更关注久坐舒适度，游戏可能更关注包裹感。你平时主要是办公、写代码，还是玩游戏比较多？",

      action: "continue",
    };
  }

  if (missingFields.includes("dailyHours")) {
    return {
      message: `${getUsageAdvice(profile.usage)}, 你平时一天大概会坐多久呢？`,

      action: "continue",
    };
  }

  if (missingFields.includes("budget")) {
    return {
      message: `10小时左右已经属于重度久坐了。

这种情况下，我不建议只看电竞外观，
腰托支撑、坐垫舒适度和长期耐用性会更重要。

你的预算大概希望控制在多少范围？`,

      action: "continue",
    };
  }

  // ==========================================================
  // 信息收集完成，可以进入推荐流程
  // ==========================================================

  if (state === "ready") {
    return {
      message: `我已经了解你的需求了 😊 根据你的情况：

- ${profile.usage}
- 每天约 ${profile.dailyHours} 小时
- 预算 ${profile.budget} 元

我会优先帮你筛选适合长时间使用的电竞椅。`,

      action: "recommend",

      profile,
    };
  }

  return {
    message: "空的",

    action: "recommend",
  };
}

// ============================================================
// 判断用户当前消息是否引用了之前推荐的商品
//
// 例如：
//
// "第一款怎么样？"
// "刚才那个怎么样？"
// "这个怎么样？"
// "第一款和第二款哪个好？"
//
// 注意：
//
// 这里 AI 只负责判断“用户指的是谁”。
// 真正的商品对象由程序从 recentProducts 中寻找。
// ============================================================

export async function resolveReference({
  message,
  history,
  recentProducts,
}: {
  message: string;
  history: ChatMessage[];
  recentProducts: any[];
}): Promise<ReferenceResolution> {
  // ==========================================================
  // 没有最近商品
  //
  // 没有商品就不需要让 AI 判断引用
  // ==========================================================

  if (!recentProducts || recentProducts.length === 0) {
    return {
      type: "none",
    };
  }

  // ==========================================================
  // 不需要把全部聊天记录都给模型
  //
  // 最近 10 条足够处理：
  //
  // "第一款"
  // "刚才那个"
  // "这两个"
  // ==========================================================

  const recentHistory = history.slice(-10);

  // ==========================================================
  // 创建 Reference Prompt
  // ==========================================================

  const prompt = referencePrompt

    .replace("{{message}}", message)

    .replace("{{history}}", JSON.stringify(recentHistory))

    .replace("{{recentProducts}}", JSON.stringify(recentProducts));

  // ==========================================================
  // SenseNova
  //
  // 使用你现在项目已经在使用的 SDK
  // ==========================================================

  const client = new OpenAI({
    apiKey: process.env.SENSENOVA_API_KEY,

    baseURL: "https://token.sensenova.cn/v1",
  });

  try {
    const response = await client.chat.completions.create({
      model: "sensenova-6.8-flash-lite",

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "user",

          content: prompt,
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;

    // ========================================================
    // AI 没返回内容
    // ========================================================

    if (!content) {
      return {
        type: "none",
      };
    }

    // ========================================================
    // 解析 JSON
    // ========================================================

    try {
      const result = JSON.parse(content);

      // ======================================================
      // 防止模型返回非法 type
      // ======================================================

      if (
        result?.type !== "none" &&
        result?.type !== "product" &&
        result?.type !== "products"
      ) {
        return {
          type: "none",
        };
      }

      // ======================================================
      // 如果是商品引用，必须有 productIds
      // ======================================================

      if (result.type === "product" || result.type === "products") {
        if (
          !Array.isArray(result.productIds) ||
          result.productIds.length === 0
        ) {
          return {
            type: "none",
          };
        }
      }

      return result;
    } catch (error) {
      console.error("resolveReference JSON parse error:", error);

      return {
        type: "none",
      };
    }
  } catch (error) {
    console.error("resolveReference error:", error);

    return {
      type: "none",
    };
  }
}

// ============================================================
// 根据 AI 判断出来的 productIds
// 从 recentProducts 里面真正找到商品
//
// 非常重要：
//
// AI 不直接操作商品。
// AI 只返回 ID。
// 商品对象由你的程序决定。
//
// 例如：
//
// AI:
// {
//   type: "product",
//   productIds: ["101"]
// }
//
// 程序：
// recentProducts.find(product => product.id === "101")
// ============================================================

export function getReferencedProducts({
  reference,
  recentProducts,
}: {
  reference: ReferenceResolution;
  recentProducts: any[];
}) {
  if (
    !reference ||
    reference.type === "none" ||
    !reference.productIds ||
    reference.productIds.length === 0
  ) {
    return [];
  }

  const productIds = reference.productIds.map((id) => String(id));

  return recentProducts.filter((product) =>
    productIds.includes(String(product.id)),
  );
}

// ============================================================
// AI 解释用户正在询问的某一个商品
//
// 例如：
//
// 用户：
// "第一款怎么样？"
//
// resolveReference:
// {
//   type: "product",
//   productIds: ["101"]
// }
//
// 找到 product 后
// ↓
// explainProductReference()
// ============================================================

export async function explainProductReference({
  profile,
  history,
  product,
  message,
}: {
  profile: Profile;
  history: ChatMessage[];
  product: any;
  message: string;
}): Promise<string> {
  const recentHistory = history.slice(-10);

  const prompt = `
你是一名自然、专业的电竞椅购物助手。

用户正在继续询问之前推荐的一款电竞椅。

请结合：

1. 用户画像
2. 之前聊天记录
3. 当前商品
4. 用户当前问题

自然地回答用户。

不要像商品详情页一样机械罗列参数。

重点告诉用户：

1. 这款是否适合他
2. 为什么适合或者不适合
3. 这款最大的优势
4. 这款最大的不足
5. 如果不太适合，可以告诉他应该考虑什么方向

不要编造商品不存在的信息。

如果商品数据里没有某个参数，
不要自己猜。

如果用户只是问：

“这个怎么样？”

就直接围绕这款商品进行评价。

如果用户问：

“值得买吗？”

就结合用户需求告诉他是否值得。

如果用户问：

“适合我吗？”

就重点结合用户画像回答。

---

用户画像：

${JSON.stringify(profile)}

---

最近聊天记录：

${JSON.stringify(recentHistory)}

---

当前商品：

${JSON.stringify(product)}

---

用户当前问题：

${message}

请直接自然地回答用户。
`;

  // ==========================================================
  // 使用你现在的 SenseNova
  // ==========================================================

  const client = new OpenAI({
    apiKey: process.env.SENSENOVA_API_KEY,

    baseURL: "https://token.sensenova.cn/v1",
  });

  try {
    const response = await client.chat.completions.create({
      model: "sensenova-6.8-flash-lite",

      messages: [
        {
          role: "user",

          content: prompt,
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return "我已经找到你刚才提到的这款了，不过暂时没能生成详细分析。";
    }

    return content;
  } catch (error) {
    console.error("explainProductReference error:", error);

    return "我已经找到你刚才提到的这款了，不过暂时没能生成详细分析。";
  }
}
