import type { Route } from "./+types/index";

// {data} content-type会自动使用application/json，返回的内容会被自动解析为json对象
// import { data } from "react-router";

// import { Controller, useForm } from "react-hook-form";

// import * as z from "zod";

// import { zodResolver } from "@hookform/resolvers/zod";

import { ServerApiFindProduct } from "server/ai-chat/product.api";

import { extractProfile } from "./extract-profile";

import { recommendChairs, explainRecommendation, explainCompare } from "./score";

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

  try {
    // todo: 这里需要通过shopify获取，但需要发送查询的条件
    // const chairs = await ServerApiFindProduct();

    const session = await getSession(request.headers.get("Cookie"));

    const previousProfile = session.get("profile") ?? {};

    const extractedProfile = await extractProfile(`${chat}`);

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
    });

    switch (conversation.action) {
      // TODO：收集字段
      case "continue":
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

        return handleResult(products, session, { comprehension: conversation.message, explanation });

        // const recommendation = recommendChairs(profile, chairsData);
        // return handleResult(recommendation, session, conversation.message);

      // TODO：比较
      case "compare":
        const { origin: cporigin } = new URL(request.url);

        const cpchairs = await fetch(`${cporigin}/api/aiproduct/search`, {
          method: "POST",
        });

        const cpchairsData = await cpchairs.json();

        const cpproducts = recommendChairs(profile, cpchairsData);

        const compare = await explainCompare({profile, products: cpproducts});

        return handleResult(products, session, { comprehension: '', compare });
    }
  } catch (error) {
    console.log("error::", error);
  }
}
