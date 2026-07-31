import type { Route } from "./+types/index";

// {data} content-type会自动使用application/json，返回的内容会被自动解析为json对象
// import { data } from "react-router";

// import { Controller, useForm } from "react-hook-form";

// import * as z from "zod";

// import { zodResolver } from "@hookform/resolvers/zod";

import { ServerApiFindProduct } from "server/ai-chat/product.api";

import { extractProfile } from "./extract-profile";

import { recommendChairs, explainRecommendation, explainCompare, findCompareProducts, compareProducts, extractCompareProducts } from "./score";

import { getMissingFields } from "./getMissingFields";

import { getSession, commitSession } from "./server";

import { mergeProfile } from "./mergeProfile";

import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

import { generateConversation } from "./conversation";

async function handleResult(recommendation: string, session: any, successRecommendation: object = {}) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({
        type: "data-recommendation", // 自定义数据类型
        data: {
          recommendation,
          successRecommendation,
          success: true,
        },
      });
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  // 根据前端的content-type来判断是表单提交还是json提交
  // const formData = await request.formData();
  // const { chat } = Object.fromEntries(formData);

  const bodyData = await request.json();

  const lenght = bodyData?.messages.length - 1;
  const partlenght = bodyData?.messages[lenght]?.parts.length - 1;
  const chat = bodyData?.messages[lenght]?.parts[partlenght]?.text;
  const userMessage = { role:"user", content:String(chat) };

  try {
    // todo: 这里需要通过shopify获取，但需要发送查询的条件
    // const chairs = await ServerApiFindProduct();

    const session = await getSession(request.headers.get("Cookie"));

    const previousProfile = session.get("profile") ?? {};

    const previousMessages = session.get("messages") ?? [];

    // const extractedProfile = await extractProfile(`${chat}`);

    // TODO： 🌟🌟🌟🌟🌟这里还是要注意测试下，对于历史聊天还是不是很 intelligent
    const extractedProfile = await extractProfile({ message: `${chat}`, history: previousMessages });

    previousMessages.push(userMessage);

    // todo：合并之前已经整理的字段
    let profile;

    if (extractedProfile) {
      profile = mergeProfile(previousProfile, extractedProfile);

      session.set("profile", profile);
    }

    const missing = getMissingFields(profile);

    const conversation = generateConversation({
      profile,
      missingFields: missing,
      chat: String(chat)
    });

    switch (conversation.action) {
      // TODO：收集字段
      case "continue":
        previousMessages.push({
          role: "assistant",
          content: conversation.message
        });

        return handleResult(conversation.message, session);

      // TODO：推荐产品
      case "recommend":
        // 通过提供的profile去查找符合的产品
        const { origin } = new URL(request.url);

        const chairs = await fetch(`${origin}/api/aiproduct/search`, {
          method: "POST",
        });

        const chairsData = await chairs.json();

        const products = recommendChairs(profile, chairsData);

        const explanation = await explainRecommendation({profile, products});

        previousMessages.push({
          role: "assistant",
          content: conversation.message
        });

        // TODO: 这里有点奇怪，ai提示的是直接去拿上一个产品，那不是还得自己去判断当前用户是不是在问上一个产品
        // session.set("lastProducts", products);

        return handleResult(products, session, { comprehension: conversation.message, explanation });

      // TODO：比较
      case "compare":        
        const { origin: cporigin } = new URL(request.url);

        const cpchairs = await fetch(`${cporigin}/api/aiproduct/search`, {
          method: "POST",
        });

        const cpchairsData = await cpchairs.json();
        
        const cpproducts = recommendChairs(profile, cpchairsData);

        const names = await extractCompareProducts(String(chat));
        
        const targetProducts = findCompareProducts({ names, products: cpproducts });
        
        const comparison = compareProducts({profile, products: targetProducts});

        const data = {
          profile,
          products: [comparison.winner.product] as any
        }
        
        const compare = await explainCompare(data);

        // session.set("lastProducts", products);

        previousMessages.push({
          role: "assistant",
          content: compare
        });

        return handleResult(data.products, session, { comprehension: '', comparison, compare });
    }
  } catch (error) {
    console.log("error::", error);
  }
}
