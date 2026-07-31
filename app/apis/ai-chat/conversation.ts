import type { AIResponse } from './profile-schema';

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

function detectIntent(chat:string) {
  const compareWords=[
    "比较",
    "哪个好",
    "区别",
    "差别",
    "哪个适合",
    "哪个好用"
  ];

  if(compareWords.some(word => chat.includes(word))){
    return "compare";
  }

  return null;
}

function getUsageAdvice(usage?: string) {
  if (usage === "programming") {
    return ` 程序员通常需要长时间保持坐姿， 所以我会更关注腰托、坐垫支撑和透气性。`;
  }

  if (usage === "gaming") {
    return `如果主要是游戏， 除了舒适度，我也会关注包裹感、靠背角度和长时间体验。`;
  }

  return `不同使用场景，对电竞椅的要求其实差别很大。`;
}

function getConversationState(missingFields: string[]): ConversationState {
  if (missingFields.length === 0) {
    return "ready";
  }

  return "collecting";
}

export function generateConversation({profile, missingFields, chat}: GenerateConversationParams): AIResponse {
  const intent = detectIntent(chat);

  // 信息对比
  if(intent === "compare") {
    return {
      message: "我帮你从你的使用场景分析一下这两款的区别。",
      action: "compare",
      profile
    }
  }
  
  const state = getConversationState(missingFields);

  // 信息收集阶段
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

        你的预算大概希望控制在多少范围？
        `,

      action: "continue",
    };
  }

  // 信息收集完成，可以进入推荐流程。
  if (state === "ready") {
    return {
      message: `我已经了解你的需求了 😊 根据你的情况：
                  - ${profile.usage}
                  - 每天约 ${profile.dailyHours} 小时
                  - 预算 ${profile.budget} 元
                  我会优先帮你筛选适合长时间使用的电竞椅。
                `,
      action: "recommend",
    };
  }
  
  return { message: "空的", action: "recommend" };
}
