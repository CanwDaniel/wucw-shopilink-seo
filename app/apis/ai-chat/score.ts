import OpenAI from "openai";
import { recommendationExplainPrompt, comparePrompt } from "./prompt";

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
    apiKey: process.env.GLM_API_KEY,
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
  });

  const response = await client.chat.completions.create({
    model: "glm-4-flash",

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
    let score = 0;

    if (profile.dailyHours >= 8) {
      if (product.lumbarSupport) {
        score += 3;
      }
    }

    if (profile.usage === "programming") {
      if (product.material === "mesh") {
        score += 2;
      }
    }

    return {
      ...product,
      compareScore: score,
    };
  });

  const sorted = result.sort((a, b) => b.compareScore - a.compareScore);

  return {
    winner: sorted[0],
    products: sorted,
  };
}

export async function explainCompare({profile, products}: {profile: any;products: any[]}) {
  const client = new OpenAI({
    apiKey: process.env.GLM_API_KEY,
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
  });

  const response = await client.chat.completions.create({
    model: "glm-4-flash",

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
