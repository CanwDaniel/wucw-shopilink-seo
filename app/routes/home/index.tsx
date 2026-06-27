import type { Route } from "./+types/index";
import type { ProductType } from "types/product.type";
import { useEffect } from 'react';
import { data, useLoaderData, useFetcher } from 'react-router';
import { Controller, useForm } from "react-hook-form";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ServerToolAuth } from 'server/tool/auth.tool';
import { ServerApiFindUser } from 'server/users/find.api';
import { ServerApiFindProduct } from 'server/ai-chat/product.api';

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Spinner } from "~/components/ui/spinner"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "~/components/ui/card"

import { extractProfile } from './extract-profile';

import { recommendChairs } from "./score";

import { getMissingFields } from './getMissingFields';

import { getSession, commitSession } from "./server";

import { mergeProfile } from "./mergeProfile";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const { chat } = Object.fromEntries(formData);

  try {
    const chairs = await ServerApiFindProduct();

    const session = await getSession(
      request.headers.get("Cookie")
    );

    const previousProfile = session.get("profile") ?? {};

    const extractedProfile = await extractProfile(`${chat}`);
    
    const profile = mergeProfile(
      previousProfile,
      extractedProfile
    );
    
    session.set("profile", profile);

    const missing = getMissingFields(profile);
    
    if(missing.length > 0) {
      
      return data({
        success: false,
        message: false,
        missingFields: "你的预算和使用场景是什么?", 
      }, {
        headers: { "Set-Cookie": await commitSession(session) }
      });
    }

    const recommendation = recommendChairs(profile, chairs);
    
    return data({
      success: true,
      message: JSON.stringify(recommendation),
    }, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  } catch (error) {
    console.log('error::', error);
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  const isVerify = await ServerToolAuth(`${token}`);

  let userId: string | null = null;
  if (isVerify && typeof isVerify !== 'string') {
    userId = isVerify.userId ?? null;

    if (userId) {
      const userInfo = await ServerApiFindUser({ userId });

      if (userInfo.success) {
        return userInfo.data;
      }
    }
  } else {
    console.error("Token verification failed or returned invalid format");
  }
}

export function ResultCard({ products }: {products: ProductType}) {
  return (
    <Card className="w-xs mt-2">
      <CardHeader>
        <CardTitle>
          <p>{products.title}</p>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p>price: { `${products.price}` }</p>
        <p className="mt-1">material: { products.material }</p>
        <p className="mt-1">minDailyHours: { `${products.minDailyHours}` }</p>
        <CardDescription className="mt-1">
          recommendedUsage:
          { products.recommendedUsage.map((rec, index) => <p key={index}>{ rec }</p>) }
        </CardDescription>
        <CardDescription className="mt-1">
          reasons:
          <p>"预算符合要求"</p>
          <p>"适合程序员"</p>
          <p>"支持长时间久坐"</p>
        </CardDescription>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
 
  useEffect(() => {
    if (loaderData) {
      localStorage.setItem("userInfo", JSON.stringify(loaderData));
    }
  }, [loaderData]);

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

  async function formSubmit(data: z.infer<typeof formSchema>) {
    fetcher.submit(data, { method: "post" })
  }

  return (
    <>
      <fetcher.Form onSubmit={form.handleSubmit(formSubmit)}>
        <FieldGroup className="w-xs">
          <Controller
            name="chat"
            control={form.control}
            render={
              ({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="fieldgroup-chat">Chat</FieldLabel>
                  <Input {...field} id="fieldgroup-chat" aria-invalid={fieldState.invalid} placeholder="" />
                </Field>
              )}
          />

          <Field orientation="horizontal">
            <Button type="submit" className="cursor-pointer">Submit</Button>
          </Field>
        </FieldGroup>
      </fetcher.Form>

      {fetcher.state === 'submitting'
          ? (<Spinner className="size-4" />)
          : (fetcher?.data?.message ? JSON.parse(fetcher?.data?.message).map((item: ProductType, index: number) => {
            const key = item.id ? String(item.id) : `product-${index}`;
            return (
              <ResultCard key={key} products={ item }/>
            )
          }) : fetcher?.data?.missingFields)}
    </>
  )
}