import type { Route } from "./+types/index";

// {data} content-type会自动使用application/json，返回的内容会被自动解析为json对象
// import { data } from "react-router";
// import { Controller, useForm } from "react-hook-form";
// import * as z from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";

import { ServerApiFindProduct } from "server/ai-chat/product.api";

import { extractProfile } from "./extract-profile";

import {
  recommendChairs,
  explainRecommendation,
  explainCompare,
  findCompareProducts,
  compareProducts,
  extractCompareProducts,
} from "./score";

import { getMissingFields } from "./getMissingFields";

import { getSession, commitSession } from "./server";

import { mergeProfile } from "./mergeProfile";

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import {
  generateConversation,
  resolveReference,
  getReferencedProducts,
  explainProductReference,
} from "./conversation";

import { prisma } from "prisma/lib/prisma";

// ============================================================
// 类型
// ============================================================

type ChatProfile = {
  budget?: number;
  dailyHours?: number;
  usage?: string;
};

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

// ============================================================
// 返回 AI Stream
// ============================================================

/**
 * Cookie 现在只保存 chatSessionId。
 *
 * 所以这两个函数已经不再负责限制 Cookie 大小，
 * 而是作为数据库数据的保护措施。
 */

function limitRecentProducts(products: any[]) {
  return products.slice(0, 10);
}

function limitMessages(messages: any[]) {
  return messages
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: String(message.content).slice(0, 2000),
    }));
}

/**
 * 保存到数据库之前，只保存商品真正需要的字段。
 *
 * 不把 Shopify 返回的大量原始数据全部塞进数据库。
 */
function createRecentProducts(products: any[]) {
  return products.map((product: any) => ({
    id: String(product.id),
    title: product.title,
    handle: product.handle,
    price: product.price,
    image: product.image,
  }));
}

// ============================================================
// Session helpers
// ============================================================

/**
 * 获取当前 ChatSession。
 *
 * Cookie 里面只保存：
 *
 * chatSessionId
 *
 * 真正的数据全部在 Prisma / Neon。
 */
async function getOrCreateChatSession(session: any) {
  const chatSessionId = session.get("chatSessionId");

  // ----------------------------------------------------------
  // Cookie 中已经有 sessionId
  // ----------------------------------------------------------

  if (chatSessionId) {
    const existingSession = await prisma.chatSession.findUnique({
      where: {
        id: chatSessionId,
      },
    });

    if (existingSession) {
      return existingSession;
    }
  }

  // ----------------------------------------------------------
  // 没有 session，创建新的
  // ----------------------------------------------------------

  const newSession = await prisma.chatSession.create({
    data: {},
  });

  session.set("chatSessionId", newSession.id);

  return newSession;
}

// ============================================================
// Message helpers
// ============================================================

async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
) {
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role,
      content: String(content).slice(0, 10000),
    },
  });
}

async function getChatMessages(sessionId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return messages.reverse().map((message) => ({
    role: message.role as "user" | "assistant",
    content: message.content,
  }));
}

// ============================================================
// Profile helpers
// ============================================================

async function getChatProfile(
  sessionId: string,
): Promise<ChatProfile> {
  const chatSession = await prisma.chatSession.findUnique({
    where: {
      id: sessionId,
    },
    select: {
      profile: true,
    },
  });

  return (chatSession?.profile ?? {}) as ChatProfile;
}

async function saveChatProfile(
  sessionId: string,
  profile: ChatProfile,
) {
  await prisma.chatSession.update({
    where: {
      id: sessionId,
    },
    data: {
      profile,
    },
  });
}

// ============================================================
// Recent Products helpers
// ============================================================

async function getRecentProducts(sessionId: string) {
  const products = await prisma.chatProduct.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return products.reverse().map((item) => item.product);
}

async function saveRecentProducts(
  sessionId: string,
  products: any[],
) {
  const limitedProducts = limitRecentProducts(
    createRecentProducts(products),
  );

  // ----------------------------------------------------------
  // 当前设计只保留最近一次推荐的商品
  //
  // 这样数据库不会无限增长。
  // ----------------------------------------------------------

  await prisma.chatProduct.deleteMany({
    where: {
      sessionId,
    },
  });

  if (limitedProducts.length === 0) {
    return;
  }

  for (const product of limitedProducts) {
    await prisma.chatProduct.create({
      data: {
        sessionId,
        product,
      },
    });
  }
}

// ============================================================
// 返回结果
// ============================================================

async function handleResult(
  recommendation: any,
  session: any,
  successRecommendation: object = {},
) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({
        type: "data-recommendation",

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

// ============================================================
// Action
// ============================================================

export async function action({ request }: Route.ActionArgs) {
  // ==========================================================
  // 1. 获取当前用户消息
  // ==========================================================

  const bodyData = await request.json();

  const length = bodyData?.messages?.length - 1;

  const partLength =
    bodyData?.messages?.[length]?.parts?.length - 1;

  const chat =
    bodyData?.messages?.[length]?.parts?.[partLength]?.text;

  const userMessage: ChatHistoryMessage = {
    role: "user",
    content: String(chat),
  };

  try {
    // ========================================================
    // 2. 获取 Cookie session
    // ========================================================

    const session = await getSession(
      request.headers.get("Cookie"),
    );

    // ========================================================
    // 3. 获取 / 创建 ChatSession
    // ========================================================

    const chatSession = await getOrCreateChatSession(session);

    const chatSessionId = chatSession.id;

    // ========================================================
    // 4. 从数据库读取之前的数据
    // ========================================================

    const previousProfile =
      await getChatProfile(chatSessionId);

    const previousMessages =
      await getChatMessages(chatSessionId);

    const recentProducts =
      await getRecentProducts(chatSessionId);

    // ========================================================
    // 5. 提取用户新的需求
    // ========================================================

    const extractedProfile = await extractProfile({
      message: String(chat),
      history: previousMessages,
    });

    // ========================================================
    // 6. 判断当前消息是否引用之前商品
    //
    // 例如：
    //
    // "第一款怎么样？"
    // "刚才那个怎么样？"
    // "这两个哪个好？"
    //
    // 这里不能直接使用 recentProducts[0]
    //
    // 必须先让 AI 判断用户指的是哪个商品
    // ========================================================

    const reference = await resolveReference({
      message: String(chat),
      history: previousMessages,
      recentProducts,
    });

    // ========================================================
    // 7. 保存用户消息
    // ========================================================

    previousMessages.push(userMessage);

    await saveMessage(
      chatSessionId,
      "user",
      String(chat),
    );

    // ========================================================
    // 8. 合并用户画像
    // ========================================================

    const profile = mergeProfile(
      previousProfile,
      extractedProfile ?? {},
    );

    await saveChatProfile(
      chatSessionId,
      profile,
    );

    // ========================================================
    // 9. 如果当前消息引用了之前的商品
    //
    // 优先处理商品引用
    //
    // "第一款怎么样？"
    //
    // 不应该重新推荐商品
    // ========================================================

    if (
      reference.type === "product" &&
      reference.productIds?.length
    ) {
      const targetProducts = getReferencedProducts({
        reference,
        recentProducts,
      });

      // ------------------------------------------------------
      // 找不到商品
      // ------------------------------------------------------

      if (targetProducts.length === 0) {
        const message =
          "我找到你说的是之前推荐的商品，不过当前商品信息已经不在上下文里了。你可以再告诉我一下是哪一款。";

        previousMessages.push({
          role: "assistant",
          content: message,
        });

        await saveMessage(
          chatSessionId,
          "assistant",
          message,
        );

        return handleResult(
          message,
          session,
        );
      }

      // ------------------------------------------------------
      // 找到商品
      // ------------------------------------------------------

      const targetProduct = targetProducts[0];

      const explanation =
        await explainProductReference({
          profile,
          history: limitMessages(previousMessages),
          product: targetProduct,
          message: String(chat),
        });

      previousMessages.push({
        role: "assistant",
        content: explanation,
      });

      await saveMessage(
        chatSessionId,
        "assistant",
        explanation,
      );

      return handleResult(
        explanation,
        session,
        {
          comprehension: `你问的是刚才推荐的「${
            targetProduct.title ?? "这款"
          }」。`,

          product: targetProduct,
        },
      );
    }

    // ========================================================
    // 10. 多商品引用
    //
    // 例如：
    //
    // "第一款和第二款哪个好？"
    //
    // "刚才那两个怎么选？"
    // ========================================================

    if (
      reference.type === "products" &&
      reference.productIds?.length
    ) {
      const targetProducts = getReferencedProducts({
        reference,
        recentProducts,
      });

      // ------------------------------------------------------
      // 商品数量不足
      // ------------------------------------------------------

      if (targetProducts.length < 2) {
        const message =
          "我知道你是在比较刚才推荐的商品，不过现在没能准确确定你指的是哪两款。你可以告诉我商品名称，或者说一下第一款、第二款。";

        previousMessages.push({
          role: "assistant",
          content: message,
        });

        await saveMessage(
          chatSessionId,
          "assistant",
          message,
        );

        return handleResult(
          message,
          session,
        );
      }

      // ------------------------------------------------------
      // 正式比较
      // ------------------------------------------------------

      const comparison = compareProducts({
        profile,
        products: targetProducts,
      });

      const data = {
        profile,
        products: [comparison.winner.product] as any,
      };

      const compare = await explainCompare(data);

      previousMessages.push({
        role: "assistant",
        content: compare,
      });

      await saveMessage(
        chatSessionId,
        "assistant",
        compare,
      );

      return handleResult(
        compare,
        session,
        {
          comprehension: `你是在比较刚才提到的 ${targetProducts
            .map((item: any) => item.title)
            .join(" 和 ")}。`,

          comparison,

          compare,
        },
      );
    }

    // ========================================================
    // 11. 到这里说明：
    //
    // 当前消息不是明确的商品引用
    //
    // 所以才进入正常 conversation
    // ========================================================

    const missing = getMissingFields(profile);

    const conversation = await generateConversation({
      profile,
      missingFields: missing,
      chat: String(chat),
    });

    // ========================================================
    // 12. 根据 conversation action 决定下一步
    // ========================================================

    switch (conversation.action) {
      // ======================================================
      // CONTINUE
      // ======================================================

      case "continue": {
        previousMessages.push({
          role: "assistant",
          content: conversation.message,
        });

        await saveMessage(
          chatSessionId,
          "assistant",
          conversation.message,
        );

        return handleResult(
          conversation.message,
          session,
        );
      }

      // ======================================================
      // RECOMMEND
      // ======================================================

      case "recommend": {
        const { origin } = new URL(request.url);

        const chairs = await fetch(
          `${origin}/api/aiproduct/search`,
          {
            method: "POST",
          },
        );

        if (!chairs.ok) {
          throw new Error(
            `Product search failed: ${chairs.status}`,
          );
        }

        const chairsData = await chairs.json();

        // ----------------------------------------------------
        // 根据 profile 推荐商品
        // ----------------------------------------------------

        const products = recommendChairs(
          profile,
          chairsData,
        );

        // ----------------------------------------------------
        // AI 生成推荐解释
        // ----------------------------------------------------

        const explanation =
          await explainRecommendation({
            profile,
            products,
          });

        // ----------------------------------------------------
        // 保存最近推荐商品
        //
        // 后面：
        //
        // "第一款怎么样？"
        //
        // 就从数据库找
        // ----------------------------------------------------

        await saveRecentProducts(
          chatSessionId,
          products,
        );

        // ----------------------------------------------------
        // 保存 assistant 消息
        // ----------------------------------------------------

        previousMessages.push({
          role: "assistant",
          content: conversation.message,
        });

        await saveMessage(
          chatSessionId,
          "assistant",
          conversation.message,
        );

        // ----------------------------------------------------
        // 返回
        // ----------------------------------------------------

        return handleResult(
          products,
          session,
          {
            comprehension: conversation.message,
            explanation,
          },
        );
      }

      // ======================================================
      // COMPARE
      // ======================================================

      case "compare": {
        const { origin } = new URL(request.url);

        const cpchairs = await fetch(
          `${origin}/api/aiproduct/search`,
          {
            method: "POST",
          },
        );

        if (!cpchairs.ok) {
          throw new Error(
            `Product search failed: ${cpchairs.status}`,
          );
        }

        const cpchairsData = await cpchairs.json();

        const cpproducts = recommendChairs(
          profile,
          cpchairsData,
        );

        // ----------------------------------------------------
        // 从用户当前消息里提取商品名称
        //
        // 例如：
        //
        // "Secretlab 和 DXRacer 哪个好？"
        // ----------------------------------------------------

        const names =
          await extractCompareProducts(
            String(chat),
          );

        // ----------------------------------------------------
        // 根据名称寻找商品
        // ----------------------------------------------------

        const targetProducts =
          findCompareProducts({
            names,
            products: cpproducts,
          });

        // ----------------------------------------------------
        // 如果明确比较的商品不足
        // ----------------------------------------------------

        if (
          !targetProducts ||
          targetProducts.length < 2
        ) {
          const message =
            "可以帮你比较，不过我现在还没能准确找到你说的那两款。你可以直接告诉我商品名称。";

          previousMessages.push({
            role: "assistant",
            content: message,
          });

          await saveMessage(
            chatSessionId,
            "assistant",
            message,
          );

          return handleResult(
            message,
            session,
          );
        }

        // ----------------------------------------------------
        // 比较
        // ----------------------------------------------------

        const comparison = compareProducts({
          profile,
          products: targetProducts,
        });

        const data = {
          profile,
          products: [comparison.winner.product] as any,
        };

        const compare =
          await explainCompare(data);

        previousMessages.push({
          role: "assistant",
          content: compare,
        });

        await saveMessage(
          chatSessionId,
          "assistant",
          compare,
        );

        return handleResult(
          compare,
          session,
          {
            comprehension:
              conversation.message,

            comparison,

            compare,
          },
        );
      }

      default: {
        const message =
          "好的，我继续根据你的需求帮你筛选。";

        previousMessages.push({
          role: "assistant",
          content: message,
        });

        await saveMessage(
          chatSessionId,
          "assistant",
          message,
        );

        return handleResult(
          message,
          session,
        );
      }
    }
  } catch (error) {
    console.log("error::", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "AI chat error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
