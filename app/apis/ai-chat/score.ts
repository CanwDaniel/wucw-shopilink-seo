import OpenAI from "openai";
import { recommendationExplainPrompt, comparePrompt, compareExtractPrompt } from "./prompt";

type UserProfile = {
  budget?: number;
  dailyHours?: number;
  usage?: string;
};

type Chair = {
  id: string;
  title: string;
  price: number;
  minDailyHours: number;
  recommendedUsage: string[];
};

function scoreChair(profile: UserProfile, chair: Chair) {
  let score = 0;

  if (profile.budget && chair.price <= profile.budget) {
    score += 30;
  }

  if (profile.dailyHours && chair.minDailyHours <= profile.dailyHours) {
    score += 30;
  }

  if (profile.usage && chair.recommendedUsage.includes(profile.usage)) {
    score += 40;
  }

  return score;
}

// TODO: recommendChairs
export function recommendChairs(profile: UserProfile, chairs: any) {
  return (
    chairs
      .map((chair: any) => ({
        ...chair,
        // score: scoreChair(profile, chair),
        role: "assistant",
      }))
      // .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  );
}

// TODO: explainRecommendation
export async function explainRecommendation({profile, products }: {profile: any; products: any[]}) {
  const client = new OpenAI({
    apiKey: process.env.SENSENOVA_API_KEY,
    // apiKey: process.env.GLM_API_KEY,
    baseURL: "https://token.sensenova.cn/v1",
    // baseURL: "https://open.bigmodel.cn/api/paas/v4",
  });

  const response = await client.chat.completions.create({
    model: "sensenova-6.8-flash-lite",
    // model: "glm-4-flash",

    response_format: { type: "json_object" },

    messages: [
      {
        role: "system",
        content: recommendationExplainPrompt,
      },
      {
        role: "user",
        content: JSON.stringify({ profile, products }),
      },
    ],
  });

  return response.choices[0].message.content;
}

// TODO: compareProducts
export function compareProducts({profile,products}: {profile: any;products: any[]}) {
  const result = products.map((product) => {
    let reasons=[];
    let score = 0;

    if (profile.dailyHours >= 8) {
      if (product.lumbarSupport) {
        score += 3;
        reasons.push("适合长时间久坐");
      }
    }

    if (profile.usage === "programming") {
      if (product.material === "mesh") {
        score += 2;
        reasons.push("透气性更适合办公");
      }
    }

    if(profile.usage==="gaming") {
      if(product.headrest) {
        score += 2;
        reasons.push(
          "包裹感更适合游戏体验"
        );
      }
    }

    return {
      product,
      score,
      reasons
    };
  });

  const sorted = result.sort((a, b) => b.score - a.score);

  return {
    winner: sorted[0],
    products: sorted,
  };
}

export async function explainCompare({profile, products}: {profile: any; products: any[]}) {
  const client = new OpenAI({
    apiKey: process.env.SENSENOVA_API_KEY,
    // apiKey: process.env.GLM_API_KEY,
    baseURL: "https://token.sensenova.cn/v1",
    // baseURL: "https://open.bigmodel.cn/api/paas/v4",
  });

  const response = await client.chat.completions.create({
    model: "sensenova-6.8-flash-lite",
    // model: "glm-4-flash",

    response_format: { type: "json_object" },

    messages: [
      {
        role: "system",
        content: comparePrompt,
      },
      {
        role: "user",
        content: JSON.stringify({ profile, products }),
      },
    ],
  });
  
  return response.choices[0].message.content;
}

// TODO: findCompareProducts
export function findCompareProducts({names, products}:{names: string[], products: any[]}) {
  return products.filter(product => {
    return names.some(name => product.title.toLowerCase().includes(name.toLowerCase()))
  })
};

// TODO: extractCompareProducts
export async function extractCompareProducts(chat:string) {
  const client = new OpenAI({
    apiKey: process.env.SENSENOVA_API_KEY,
    // apiKey: process.env.GLM_API_KEY,
    baseURL: "https://token.sensenova.cn/v1",
    // baseURL: "https://open.bigmodel.cn/api/paas/v4",
  });

  const response = await client.chat.completions.create({
    model: "sensenova-6.8-flash-lite",
    // model: "glm-4-flash",

    response_format: { type: "json_object" },

    messages: [
      {
        role: "system",
        content: compareExtractPrompt,
      },
      {
        role: "user",
        content: chat,
      },
    ],
  });
  
  return JSON.parse(response.choices[0].message.content || '')?.products || [];
}