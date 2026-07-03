import type { Route } from "./+types/index";

import type { ProductType } from "types/product.type";

import { data } from "react-router";

import { Controller, useForm } from "react-hook-form";

import * as z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";

import { ServerApiFindProduct } from "server/ai-chat/product.api";

import { extractProfile } from "./ai-chat/extract-profile";

import { recommendChairs } from "./ai-chat/score";

import { getMissingFields } from "./ai-chat/getMissingFields";

import { getSession, commitSession } from "./ai-chat/server";

import { mergeProfile } from "./ai-chat/mergeProfile";

import AiChatUi from "./ai-chat-ui/index";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const { chat } = Object.fromEntries(formData);

  try {
    const chairs = await ServerApiFindProduct();

    const session = await getSession(request.headers.get("Cookie"));

    const previousProfile = session.get("profile") ?? {};

    const extractedProfile = await extractProfile(`${chat}`);

    const profile = mergeProfile(previousProfile, extractedProfile);

    session.set("profile", profile);

    const missing = getMissingFields(profile);

    if (missing.length > 0) {
      return data(
        {
          success: false,
          message: false,
          missingFields: "你的预算和使用场景是什么?",
        },
        {
          headers: { "Set-Cookie": await commitSession(session) },
        },
      );
    }

    const recommendation = recommendChairs(profile, chairs);

    return data(
      {
        success: true,
        message: JSON.stringify(recommendation),
      },
      {
        headers: { "Set-Cookie": await commitSession(session) },
      },
    );
  } catch (error) {
    console.log("error::", error);
  }
}

export default function AiChat() {
   const formSchema = z.object({
    chat: z.string()
      .min(1, "Username is required.")
      .pipe(
        z.string()
          .min(3, "Bug title must be at least 3 characters.")
      ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      chat: "",
    }
  });

  return (
    <AiChatUi></AiChatUi>
  );
}
